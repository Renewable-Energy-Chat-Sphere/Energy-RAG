# pipelines/rag_pdf.py
import tempfile
from pypdf import PdfReader
from flask import current_app


def qa_over_pdf(question, file):
    # === 暫存 PDF ===
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        pdf_path = tmp.name

    # === 讀取 PDF 文字 ===
    try:
        reader = PdfReader(pdf_path)
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as e:
        return f"PDF 讀取失敗：{e}", []

    # ⚠️ 限制字數避免 token 爆掉
    full_text = "\n\n".join(pages)[:30000]

    # === 智能 Prompt（不強制詢問生成文件）===
    prompt = f"""
你是「能源資料智能 PDF 分析助理」。

請根據提供的 PDF 內容回答問題。

請使用以下 Markdown 結構輸出：

# 📄 AI Intelligent PDF Analysis

---

## 🔎 文件重點摘要
- 條列式重點（最多 5 點）

---

## 📌 問題解析
用 2–4 句說明推論過程。

---

## 🎯 最終結論
給出明確結論（若涉及數據，保留原始單位與年份）。

---

⚠️ 若本次回答屬於完整分析報告、結構化整理或考卷設計，
可在最後額外加上一句：
「若需要，我可以協助您生成簡報（PPT）或報告（PDF）檔案。」

⚠️ 若只是一般知識問答或簡短回答，請勿主動詢問生成文件。

【PDF 內容開始】
{full_text}
【PDF 內容結束】

【問題】
{question}
"""

    client = current_app.config.get("OPENAI_CLIENT")
    if not client:
        return "未設定 OPENAI_API_KEY，無法分析 PDF。", []

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        answer = resp.choices[0].message.content.strip()

    except Exception as e:
        return f"PDF 分析失敗：{e}", []

    sources = [f"PDF 總頁數：{len(pages)} 頁"]

    return answer, sources
