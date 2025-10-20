# app.py
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

load_dotenv()

# ===== 可選：OpenAI Client =====
try:
    from openai import OpenAI

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    openai_client = None

# ===== Pipelines =====
from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
from pipelines.rag_av import qa_over_av

# ===== Blueprints =====
from chat import chat_bp
from tables import tables_bp

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024  # 512MB

# 將依賴放進 app.config，讓 blueprint 用 current_app 取得
app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    QA_OVER_AV=qa_over_av,
)

# 註冊 Blueprints
app.register_blueprint(chat_bp)  # /chat
app.register_blueprint(tables_bp)  # /ask_table


@app.route("/")
def index():
    return render_template("index.html")


# =========================
# RAG routes（保留在這支）
# =========================
@app.route("/ask_web", methods=["POST"])
def ask_web():
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    url = (data.get("url") or "").strip() or None
    if not question:
        return jsonify({"error": "question is required"}), 400
    answer, sources = qa_over_web(question, url=url)
    return jsonify({"answer": answer, "sources": sources})


@app.route("/ask_pdf", methods=["POST"])
def ask_pdf():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")
    if not question:
        return jsonify({"error": "question is required"}), 400
    if not file:
        return jsonify({"error": "PDF file is required"}), 400
    answer, sources = qa_over_pdf(question, file)
    return jsonify({"answer": answer, "sources": sources})


@app.route("/ask_av", methods=["POST"])
def ask_av():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")
    if not question:
        return jsonify({"error": "question is required"}), 400
    if not file:
        return jsonify({"error": "audio/video file is required"}), 400
    answer, sources = qa_over_av(question, file)
    return jsonify({"answer": answer, "sources": sources})


# =========================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
