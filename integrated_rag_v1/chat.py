# chat.py
import re
import time
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# 單機記憶體對話歷史（正式環境改用 Redis/DB）
CHAT_MAX_MESSAGES = 30
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)


def _build_messages(session_id: str, user_text: str, system_prompt: str | None):
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


@chat_bp.route("/chat", methods=["POST"])
def chat():
    """
    JSON:
    {
      "session_id": "abc123",
      "user": "訊息",              # 必填
      "system": "system 指令",     # 可選
      "model": "gpt-4o-mini",     # 可選
      "rag_auto": true            # 可選；含 URL 時自動用 RAG Web
    }
    """
    data = request.get_json(force=True) or {}
    session_id = (data.get("session_id") or "default").strip() or "default"
    user_text = (data.get("user") or "").strip()
    system_prompt = (data.get("system") or "").strip() or None
    model = (data.get("model") or "gpt-4o-mini").strip() or "gpt-4o-mini"
    rag_auto = bool(data.get("rag_auto", True))

    if not user_text:
        return jsonify({"error": "user is required"}), 400

    openai_client = current_app.config.get("OPENAI_CLIENT")
    qa_over_web = current_app.config.get("QA_OVER_WEB")

    # 輕量路由：訊息含 URL → 走 RAG Web
    if rag_auto and qa_over_web:
        m = URL_RE.search(user_text)
        if m:
            url = m.group(1)
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
                        "uses_openai": bool(openai_client),
                    }
                )
            except Exception as e:
                user_text = f"(網址處理失敗，改用一般聊天) {e}\n\n" + user_text

    # 一般聊天
    if openai_client:
        try:
            messages = _build_messages(session_id, user_text, system_prompt)
            resp = openai_client.chat.completions.create(
                model=model, messages=messages, temperature=0.3
            )
            assistant_text = (
                resp.choices[0].message.content or ""
            ).strip() or "（模型沒有回傳內容）"
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
