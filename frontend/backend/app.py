# app.py
import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io

load_dotenv()

from openai import OpenAI
openai_client = OpenAI()

from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
from pipelines.rag_av import qa_over_av

from chat import chat_bp
from tables import tables_bp

# 🔥 加回 scheduler
from scheduler import start_scheduler


app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024

app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    QA_OVER_AV=qa_over_av,
)

app.register_blueprint(chat_bp)
app.register_blueprint(tables_bp)


# 🔥 Debug 模式安全啟動 Scheduler
if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    print("🔥 Scheduler starting...")
    start_scheduler()


# ====================================
# 1. Web 問答
# ====================================
@app.route("/ask_web", methods=["POST"])
def ask_web():
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    url = (data.get("url") or "").strip() or None

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400

    answer, sources = qa_over_web(question, url=url)
    return jsonify({"answer": answer, "sources": sources})


# ====================================
# 2. PDF 問答
# ====================================
@app.route("/ask_pdf", methods=["POST"])
def ask_pdf():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400
    if not file:
        return jsonify({"error": "❌ 請上傳 PDF 檔案"}), 400

    answer, sources, structured_data = qa_over_pdf(question, file)

    return jsonify({
        "answer": answer,
        "sources": sources,
        "structured_data": structured_data
    })


# ====================================
# 3. AV 問答
# ====================================
@app.route("/ask_av", methods=["POST"])
def ask_av():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400
    if not file:
        return jsonify({"error": "❌ 請上傳音訊或影片檔案"}), 400

    answer, sources = qa_over_av(question, file)
    return jsonify({"answer": answer, "sources": sources})


# ====================================
# 4. 生成 PDF
# ====================================
@app.route("/export_pdf", methods=["POST"])
def export_pdf():
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.pagesizes import A4

    data = request.get_json()

    structured_data = data.get("structured_data")
    file_name = data.get("file_name", "AI_Report.pdf")

    if not structured_data:
        return jsonify({"error": "沒有收到 structured_data"}), 400

    if isinstance(structured_data, str):
        structured_data = json.loads(structured_data)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(
        Paragraph(structured_data.get("title", "AI Report"), styles["Heading1"])
    )
    elements.append(Spacer(1, 12))

    for section in structured_data.get("sections", []):
        elements.append(Paragraph(section.get("heading", ""), styles["Heading2"]))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(section.get("content", ""), styles["BodyText"]))
        elements.append(Spacer(1, 12))

    elements.append(Paragraph("Conclusion", styles["Heading2"]))
    elements.append(
        Paragraph(structured_data.get("conclusion", ""), styles["BodyText"])
    )

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=file_name,
        mimetype="application/pdf",
    )


# ====================================
# 入口
# ====================================
if __name__ == "__main__":
    print("🚀 Flask 啟動：http://127.0.0.1:8000")
    print("📌 API：/chat /ask_web /ask_pdf /ask_av /export_pdf")
    app.run(host="127.0.0.1", port=8000, debug=True)