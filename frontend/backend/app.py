# app.py
import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from pptx import Presentation
import io

# ====================================
# 載入環境變數
# ====================================
load_dotenv()

# ====================================
# 載入 OpenAI Client
# ====================================
from openai import OpenAI

openai_client = OpenAI()  # 讓 SDK 自己吃環境變數


# ====================================
# 載入 RAG pipeline
# ====================================
from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
from pipelines.rag_av import qa_over_av

# ====================================
# 藍圖 Blueprint
# ====================================
from chat import chat_bp
from tables import tables_bp

# ====================================
# 建立 Flask App
# ====================================
app = Flask(__name__)
CORS(app)
from scheduler import start_scheduler

start_scheduler()

app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024  # 512MB

app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    QA_OVER_AV=qa_over_av,
)

# ====================================
# Blueprint 註冊
# ====================================
app.register_blueprint(chat_bp)
app.register_blueprint(tables_bp)

# ====================================
# 0. 能源署最新公告（✔ 正式版：讀取爬蟲快取）
# ====================================
NEWS_CACHE_FILE = "energy_news_cache.json"


@app.route("/energy-news", methods=["GET"])
def energy_news():
    """
    能源署最新公告
    資料來源：Selenium 同步之官網公告（快取）
    """
    try:
        with open(NEWS_CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        items = data.get("items", [])

        return jsonify(
            {
                "count": len(items),
                "source": data.get("source", "經濟部能源署"),
                "synced_at": data.get("synced_at"),
                "items": items,
            }
        )

    except FileNotFoundError:
        return jsonify(
            {
                "count": 0,
                "source": "經濟部能源署",
                "items": [],
                "note": "尚未進行公告同步",
            }
        )

    except Exception as e:
        return jsonify(
            {
                "count": 0,
                "source": "經濟部能源署",
                "items": [],
                "note": "公告資料讀取失敗",
            }
        )


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

    answer, sources = qa_over_pdf(question, file)
    return jsonify({"answer": answer, "sources": sources})


# ====================================
# 3. 音訊 / 影片 問答
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
# 4. 生成 PDF 報告
# ====================================
@app.route("/export_pdf", methods=["POST"])
def export_pdf():
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase import pdfmetrics
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    import io

    data = request.get_json()
    content = data.get("content", "")

    buffer = io.BytesIO()

    pdfmetrics.registerFont(TTFont("NotoSans", "NotoSansTC-Regular.ttf"))

    doc = SimpleDocTemplate(buffer)
    style = ParagraphStyle(name="Normal", fontName="NotoSans", fontSize=12, leading=18)

    story = []

    for line in content.split("\n"):
        story.append(Paragraph(line, style))
        story.append(Spacer(1, 0.2 * inch))

    doc.build(story)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="AI_Report.pdf",
        mimetype="application/pdf",
    )


# ====================================
# 5. 生成 PPT 簡報
# ====================================
@app.route("/export_ppt", methods=["POST"])
def export_ppt():
    from pptx import Presentation
    import io

    data = request.get_json()
    content = data.get("content", "")

    prs = Presentation()

    slides = content.split("\n## ")

    for slide_content in slides:
        slide_content = slide_content.strip()
        if not slide_content:
            continue

        lines = slide_content.split("\n")
        title = lines[0].replace("## ", "").strip()
        body = "\n".join(lines[1:]).strip()

        slide_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(slide_layout)

        slide.shapes.title.text = title
        slide.placeholders[1].text = body[:1000]

    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="AI_Report.pptx",
        mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


# ====================================
# 入口
# ====================================
if __name__ == "__main__":
    print("🚀 Flask 啟動：http://127.0.0.1:8000")
    print("📌 API：/energy-news /chat /ask_web /ask_pdf /ask_av /ask_table")
    app.run(host="127.0.0.1", port=8000, debug=True)
