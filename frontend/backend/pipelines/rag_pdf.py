import tempfile
import json
import re
from pypdf import PdfReader
from flask import current_app


# ===============================
# 🔹 智慧判斷：只要提到「下載」或「匯出」就進 structured
# ===============================
def detect_structured_intent(question: str):
    if not question:
        return False

    question = question.lower()

    trigger_words = [
        "報告",
        "pdf",
        "匯出",
        "下載",
        "簡報",
    ]

    return any(word in question for word in trigger_words)


# ===============================
# 🔹 防止 GPT 多吐字
# ===============================
def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text


# ===============================
# 🔹 檔名安全處理
# ===============================
def sanitize_filename(name):
    name = re.sub(r"[^\w\u4e00-\u9fff\[\]\(\)\-_]", "_", name)
    return name


# ===============================
# 🔹 主程式
# ===============================
def qa_over_pdf(question, file):

    # === 暫存 PDF ===
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        pdf_path = tmp.name

    # === 讀取 PDF ===
    try:
        reader = PdfReader(pdf_path)
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as e:
        return f"PDF 讀取失敗：{e}", [], None

    full_text = "\n\n".join(pages)[:30000]

    client = current_app.config.get("OPENAI_CLIENT")
    if not client:
        return "未設定 OPENAI_API_KEY，無法分析 PDF。", [], None

    structured_mode = detect_structured_intent(question)
    print("Question:", question)
    print("Structured mode:", structured_mode)

    # ===============================
    # 🔹 一般分析模式
    # ===============================
    if not structured_mode:

        prompt = f"""
你是專業 PDF 分析助理。

請根據 PDF 內容回答問題。
請使用清楚條列式 Markdown 結構回答。

【PDF內容】
{full_text}

【問題】
{question}
"""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        answer = resp.choices[0].message.content.strip()
        sources = [f"PDF 總頁數：{len(pages)} 頁"]

        return answer, sources, None

    # ===============================
    # 🔹 結構化報告模式
    # ===============================
    else:

        structured_prompt = f"""
你現在在一個可以生成並下載 PDF 的系統中。

請將以下 PDF 內容整理為正式研究報告。

請輸出純 JSON，格式如下：

{{
  "title": "",
  "sections": [
    {{
      "heading": "",
      "content": ""
    }}
  ],
  "conclusion": ""
}}

⚠️ 僅輸出 JSON，不要其他文字。

【PDF內容】
{full_text}

【需求】
{question}
"""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": structured_prompt}],
            temperature=0.2,
        )

        raw = resp.choices[0].message.content.strip()
        cleaned_json = extract_json(raw)

        try:
            structured_data = json.loads(cleaned_json)
        except Exception as e:
            return f"JSON 解析失敗：{e}", [], None

        # ===============================
        # 🔹 智慧檔名生成
        # ===============================
        original_filename = file.filename
        base_name = original_filename.rsplit(".", 1)[0]
        base_name = sanitize_filename(base_name)

        if "更難" in question:
            suffix = "加強版"
        elif "優化" in question:
            suffix = "優化版"
        elif "整理" in question:
            suffix = "正式報告"
        else:
            suffix = "報告版"

        new_filename = f"{base_name}_{suffix}.pdf"

        sources = [f"PDF 總頁數：{len(pages)} 頁"]

        estimated_size = round(len(cleaned_json) / 1024, 1)

        answer_text = f"""
好的，我已經幫你完成整理與報告排版 📄✨

📁 檔名：{new_filename}  
📄 來源頁數：{len(pages)} 頁  
📦 預估內容大小：約 {estimated_size} KB  

你可以在下方點擊「生成報告 PDF」下載完整檔案。
"""

        return (
            answer_text.strip(),
            sources,
            {
                "file_name": new_filename,
                "data": structured_data,
            },
        )
