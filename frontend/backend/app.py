# app.py
import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# ====================================
# 載入環境變數
# ====================================
load_dotenv()

# ====================================
# 載入 OpenAI Client
# ====================================
try:
    from openai import OpenAI

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    openai_client = None

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
# 入口
# ====================================
if __name__ == "__main__":
    print("🚀 Flask 啟動：http://127.0.0.1:8000")
    print("📌 API：/energy-news /chat /ask_web /ask_pdf /ask_av /ask_table")
    app.run(host="127.0.0.1", port=8000, debug=True)
