# app.py
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

# === 載入環境變數 ===
load_dotenv()

# === （可選）載入 OpenAI Client ===
try:
    from openai import OpenAI

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    openai_client = None

# === 載入 RAG 管線 ===
from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
from pipelines.rag_av import qa_over_av

# === 載入其他藍圖（Blueprint） ===
from chat import chat_bp
from tables import tables_bp

# === 建立 Flask 應用程式 ===
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024  # 允許最大上傳 512MB

# 將共用依賴放入 app.config，讓各 Blueprint 可使用 current_app 存取
app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    QA_OVER_AV=qa_over_av,
)

# === 註冊各功能模組（Blueprint） ===
app.register_blueprint(chat_bp)  # /chat
app.register_blueprint(tables_bp)  # /ask_table


# === 首頁 ===
@app.route("/")
def index():
    return render_template("index.html")


# =========================
# 🔹 RAG 問答路由（Web / PDF / AV）
# =========================


# ---- 1️⃣ 網頁內容問答 ----
@app.route("/ask_web", methods=["POST"])
def ask_web():
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    url = (data.get("url") or "").strip() or None

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400

    answer, sources = qa_over_web(question, url=url)
    return jsonify({"answer": answer, "sources": sources})


# ---- 2️⃣ PDF 問答 ----
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


# ---- 3️⃣ 音訊 / 影片 問答 ----
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


# =========================
# 🚀 主程式入口
# =========================
if __name__ == "__main__":
    print("伺服器啟動中：http://127.0.0.1:8000")
    print("可用 API：/ask_web, /ask_pdf, /ask_av, /ask_table, /chat")
    app.run(host="127.0.0.1", port=8000, debug=True)
