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

    # === 合併內容 ===
    full_text = "\n\n".join(pages)

    # === 建立 Prompt ===
    prompt = f"""
你是 PDF 文件分析助手，請根據下列 PDF 內容回答問題：

【PDF 內容】
{full_text}

【問題】
{question}

請用清楚易懂的方式回答。
"""

    client = current_app.config["OPENAI_CLIENT"]
    if not client:
        return "未設定 OPENAI_API_KEY，無法分析 PDF。", []

    # === 呼叫 OpenAI ===
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    answer = resp.choices[0].message.content
    sources = [f"PDF 頁數：{len(pages)} 頁"]

    return answer, sources
