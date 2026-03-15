# app.py
import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import requests

from datetime import datetime

load_dotenv()

from openai import OpenAI

openai_client = OpenAI()

from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
#from pipelines.rag_av import qa_over_av

from chat import chat_bp
from tables import tables_bp

# 🔥 加回 scheduler
from scheduler import start_scheduler


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024

app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    #QA_OVER_AV=qa_over_av,
)

app.register_blueprint(chat_bp)
app.register_blueprint(tables_bp)


from bs4 import BeautifulSoup  # 加在最上面 import 區


@app.route("/dashboard", methods=["GET"])
def dashboard():
    try:
        url = "https://www.taipower.com.tw/"
        res = requests.get(url, timeout=8)

        soup = BeautifulSoup(res.text, "html.parser")

        # 找首頁即時用電數字
        load = soup.find("span", {"id": "lblLoad"})
        if load:
            current_load = float(load.text.replace(",", ""))
        else:
            current_load = 180000  # fallback

        now = datetime.now()

        return {
            "power": current_load,
            "renewable": 25,
            "peak": current_load + 5000,
            "carbon": round(current_load * 0.45, 2),
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
        }

    except Exception as e:
        print("🔥 error:", e)
        return {
            "power": 0,
            "renewable": 0,
            "peak": 0,
            "carbon": 0,
            "timestamp": "error",
        }


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

    return jsonify(
        {"answer": answer, "sources": sources, "structured_data": structured_data}
    )


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

    try:

        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from xml.sax.saxutils import escape

        data = request.get_json()

        print("收到資料:", data)

        structured_data = data.get("structured_data", {})
        file_name = data.get("file_name", "AI_Report.pdf")

        print("structured_data:", structured_data)

        if "data" in structured_data:
            structured_data = {
                "title": "AI Analysis Report",
                "sections": [
                    {
                        "heading": "Data",
                        "content": json.dumps(structured_data["data"], ensure_ascii=False)
                    }
                ],
                "conclusion": "Generated automatically by Energy RAG."
            }

        buffer = io.BytesIO()

        font_path = os.path.join(os.path.dirname(__file__), "NotoSansTC-Regular.ttf")

        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont("NotoSansTC", font_path))
            font_name = "NotoSansTC"
        else:
            font_name = "Helvetica"

        styles = getSampleStyleSheet()

        styles["Normal"].fontName = font_name
        styles["Heading1"].fontName = font_name
        styles["Heading2"].fontName = font_name
        styles["BodyText"].fontName = font_name

        doc = SimpleDocTemplate(buffer, pagesize=A4)

        elements = []

        elements.append(
            Paragraph(escape(structured_data.get("title", "AI Report")), styles["Heading1"])
        )

        elements.append(Spacer(1, 12))

        for section in structured_data.get("sections", []):

            elements.append(
                Paragraph(escape(section.get("heading", "")), styles["Heading2"])
            )

            elements.append(Spacer(1, 6))

            content = section.get("content", "")

            if not isinstance(content, str):
                content = json.dumps(content, ensure_ascii=False)

            elements.append(
                Paragraph(escape(content), styles["BodyText"])
            )

            elements.append(Spacer(1, 12))

        elements.append(Paragraph("Conclusion", styles["Heading2"]))

        elements.append(
            Paragraph(escape(structured_data.get("conclusion", "")), styles["BodyText"])
        )

        doc.build(elements)

        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=file_name,
            mimetype="application/pdf"
        )

    except Exception as e:

        print("🔥 export_pdf crash:", e)

        return jsonify({
            "error": str(e)
        }), 500
@app.route("/export_excel", methods=["POST"])
def export_excel():

    from openpyxl import Workbook
    from flask import request, send_file
    import io

    data = request.get_json()
    table = data.get("structured_data", {})
    if not table:
        return jsonify({"error": "沒有表格資料"}), 400

    wb = Workbook()
    ws = wb.active
    ws.title = "AI Table"

    columns = table.get("columns", [])
    rows = table.get("rows", [])

    if columns:
        ws.append(columns)

    for r in rows:
        if isinstance(r, list):
            ws.append(r)

    # header
    ws.append(columns)

    # data
    for r in rows:
        ws.append(r)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="AI_Table.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# ====================================
# 5. 能源署公告 API
# ====================================
@app.route("/energy-news", methods=["GET"])
def get_energy_news():
    try:
        with open("energy_news_cache.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        print("讀取公告錯誤:", e)
        return jsonify({"source": "經濟部能源署", "items": []})


# ====================================
# 入口
# ====================================
if __name__ == "__main__":
    print("🚀 Flask 啟動：http://127.0.0.1:8000")
    print("📌 API：/chat /ask_web /ask_pdf /ask_av /export_pdf")
    app.run(host="127.0.0.1", port=8000, debug=True)
