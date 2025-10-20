import os
import io
import re
import time
from collections import defaultdict, deque
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
import pandas as pd  # ✅ Table Support

load_dotenv()

from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf
from pipelines.rag_av import qa_over_av

# ✅ Table Support - optional: OpenAI
try:
    from openai import OpenAI

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    openai_client = None

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024  # 512MB


@app.route("/")
def index():
    return render_template("index.html")


# =========================
# RAG routes
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
# ✅ Table Support
# =========================
def df_to_markdown(df: pd.DataFrame, max_rows=30, max_cols=15):
    df2 = df.copy()
    if df2.shape[0] > max_rows:
        df2 = df2.head(max_rows)
    if df2.shape[1] > max_cols:
        df2 = df2.iloc[:, :max_cols]
    df2 = df2.convert_dtypes()
    return df2.to_markdown(index=False)


def read_table_file(file_storage):
    content = file_storage.read()
    bio = io.BytesIO(content)
    name = (file_storage.filename or "").lower()

    if name.endswith((".xlsx", ".xlsm", ".xltx", ".xltm", ".xls")):
        xls = pd.ExcelFile(bio)
        sheets = {}
        for sheet_name in xls.sheet_names:
            sheets[sheet_name] = xls.parse(sheet_name)
        return sheets
    elif name.endswith(".csv") or name.endswith(".txt"):
        return {"Sheet1": pd.read_csv(bio, encoding="utf-8", engine="python")}
    elif name.endswith((".tsv", ".tab")):
        return {"Sheet1": pd.read_csv(bio, sep="\t", encoding="utf-8", engine="python")}
    else:
        # fallback
        try:
            return {"Sheet1": pd.read_csv(bio, engine="python")}
        except Exception:
            raise ValueError("不支援的檔案格式，請上傳 .xlsx/.xls/.csv/.tsv")


def build_context_markdown(sheets: dict, max_chars=12000):
    parts = []
    for name, df in sheets.items():
        md = df_to_markdown(df)
        parts.append(f"### Sheet: {name}\n\n{md}\n")
    ctx = "\n\n".join(parts)
    if len(ctx) > max_chars:
        ctx = ctx[:max_chars] + "\n\n...(已截斷)..."
    return ctx


def simple_stats(sheets: dict):
    info = []
    for name, df in sheets.items():
        cols = list(map(str, df.columns.tolist()))
        info.append(
            {
                "sheet": name,
                "shape": [int(df.shape[0]), int(df.shape[1])],
                "columns_sample": cols[:15],
            }
        )
    return info


def llm_answer_from_tables(question: str, ctx_md: str):
    if not openai_client:
        return None
    prompt = f"""根據下方表格內容（Markdown），回答使用者的問題。
表格內容：
{ctx_md}

問題：
{question}
"""
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"(LLM 回答失敗) {e}"


@app.route("/ask_table", methods=["POST"])
def ask_table():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")
    if not question:
        return jsonify({"error": "question is required"}), 400

    if not file:
        return jsonify({"error": "table file is required"}), 400

    try:
        sheets = read_table_file(file)
        stats = simple_stats(sheets)
        ctx_md = build_context_markdown(sheets)

        answer = llm_answer_from_tables(question, ctx_md)
        if not answer:
            md_list = []
            for name, df in sheets.items():
                md_list.append(
                    f"### {name}\n行數×列數：{df.shape[0]}×{df.shape[1]}\n\n{df_to_markdown(df)}"
                )
            answer = "未設定 OPENAI_API_KEY，回傳摘要：\n\n" + "\n\n---\n\n".join(
                md_list
            )

        return jsonify({"answer": answer, "sources": stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# 🤖 Generic Chatbot + 輕量智慧路由（含網址自動改用 /ask_web）
# =========================

# 對話歷史（多 session），僅在單機開發時使用；正式環境請改為 DB / Redis
CHAT_MAX_MESSAGES = 30
CHAT_SESSIONS: dict[str, deque] = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

# 偵測訊息中是否含 URL
URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)


def _build_messages(session_id: str, user_text: str, system_prompt: str | None = None):
    msgs = []
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})
    for role, content in CHAT_SESSIONS[session_id]:
        msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_text})
    return msgs


def _store_turn(session_id: str, user_text: str, assistant_text: str):
    CHAT_SESSIONS[session_id].append(("user", user_text))
    CHAT_SESSIONS[session_id].append(("assistant", assistant_text))


@app.route("/chat", methods=["POST"])
def chat():
    """
    JSON body:
    {
      "session_id": "abc123",        # 可選，預設 "default"
      "user": "你的問題文字",           # 必填
      "system": "你是助教…",            # 可選
      "model": "gpt-4o-mini",        # 可選
      "rag_auto": true               # 可選；true 時若偵測到 URL 會改走 qa_over_web
    }
    """
    data = request.get_json(force=True, silent=False) or {}
    session_id = (data.get("session_id") or "default").strip() or "default"
    user_text = (data.get("user") or "").strip()
    system_prompt = (data.get("system") or "").strip() or None
    model = (data.get("model") or "gpt-4o-mini").strip() or "gpt-4o-mini"
    rag_auto = bool(data.get("rag_auto", True))

    if not user_text:
        return jsonify({"error": "user is required"}), 400

    # 1) 輕量智慧路由：訊息含 URL → 用你現成的 RAG Web
    if rag_auto:
        m = URL_RE.search(user_text)
        if m:
            url = m.group(1)
            # 從原始訊息拿掉 url，當成 question
            question_only = user_text.replace(url, "").strip() or "請根據網址內容回答。"
            try:
                answer, sources = qa_over_web(question_only, url=url)
                _store_turn(session_id, user_text, answer)
                return jsonify(
                    {
                        "answer": answer,
                        "sources": sources,
                        "session_id": session_id,
                        "model": "rag_web",
                        "uses_openai": (
                            False if not openai_client else True
                        ),  # RAG 裡面若也用到 LLM，則仍可能 True
                    }
                )
            except Exception as e:
                # 不中斷：改走一般聊天
                fallback_note = f"(網址處理失敗，改用一般聊天) {e}\n\n"
                user_text = (
                    fallback_note + user_text
                )  # 帶入訊息中，讓模型知道剛剛發生什麼

    # 2) 一般聊天：有 OpenAI 就用，沒有就離線 fallback
    if openai_client:
        try:
            messages = _build_messages(session_id, user_text, system_prompt)
            resp = openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
            )
            assistant_text = (resp.choices[0].message.content or "").strip()
            if not assistant_text:
                assistant_text = "（模型沒有回傳內容）"
        except Exception as e:
            assistant_text = (
                f"(LLM 失敗，改用離線回覆) {e}\n\n"
                f"你剛才說：{user_text}\n"
                f"暫時建議：確認 OPENAI_API_KEY 設定或稍後再試。"
            )
    else:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        assistant_text = (
            "（離線模式）我目前無法存取雲端模型，但我已收到你的訊息。\n"
            f"時間：{ts}\n\n"
            f"你說的是：{user_text}\n"
            "可以嘗試：\n"
            "1) 設定 OPENAI_API_KEY 後重試；\n"
            "2) 若要針對網址或檔案提問，改用 /ask_web、/ask_pdf、/ask_av、/ask_table。"
        )

    _store_turn(session_id, user_text, assistant_text)

    return jsonify(
        {
            "answer": assistant_text,
            "session_id": session_id,
            "history_len": len(CHAT_SESSIONS[session_id]),
            "model": model,
            "uses_openai": bool(openai_client),
        }
    )


# =========================

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
