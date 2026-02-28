import re
import time
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# ===== 記憶設定 =====
CHAT_MAX_MESSAGES = 30
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)

# ===== 升級版系統提示（分析文件模式） =====
DEFAULT_SYSTEM_PROMPT = """
你是一位專業的「能源分析顧問」。

請使用正式分析報告風格回答問題，並嚴格遵守以下格式規範：

【輸出格式要求】

1. 使用 Markdown
2. 主標題使用：## 
3. 小標題使用：### 
4. 條列使用：
   - 數字條列：1. 2. 3.
   - 或無序條列：-
5. 重要關鍵詞請使用 **粗體**
6. 每個段落之間請空一行
7. 避免過度口語化

【結構建議】

## 主題名稱

### 一、背景或定義
說明...

### 二、主要內容或分析
1. ...
2. ...
3. ...

### 三、影響或延伸說明
- ...
- ...

### 四、結論
簡潔專業總結。

【專業要求】

- 若涉及數據，請保留原始單位與年份
- 若資料不足，請明確說明「沒有足夠資料」
- 回答要條理分明
- 適合正式分析文件呈現
- 不要加入表情符號
"""


# ===== 建立對話上下文 =====
def _build_messages(session_id: str, user_text: str, system_prompt: str | None):
    msgs = []

    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})

    for role, content in CHAT_SESSIONS[session_id]:
        msgs.append({"role": role, "content": content})

    msgs.append({"role": "user", "content": user_text})

    return msgs


# ===== 儲存對話 =====
def _store_turn(session_id: str, user_text: str, assistant_text: str):
    CHAT_SESSIONS[session_id].append(("user", user_text))
    CHAT_SESSIONS[session_id].append(("assistant", assistant_text))


# =========================================================
# CHAT API
# =========================================================
@chat_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True) or {}

    session_id = (data.get("session_id") or "default").strip() or "default"
    user_text = (data.get("user") or "").strip()
    system_prompt = (data.get("system") or "").strip() or DEFAULT_SYSTEM_PROMPT
    model = (data.get("model") or "gpt-4o-mini").strip() or "gpt-4o-mini"
    rag_auto = bool(data.get("rag_auto", True))

    if not user_text:
        return jsonify({"error": "請輸入問題內容"}), 400

    openai_client = current_app.config.get("OPENAI_CLIENT")
    qa_over_web = current_app.config.get("QA_OVER_WEB")

    # =====================================================
    # 自動網址偵測 → RAG Web
    # =====================================================
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
                user_text = f"(網址處理失敗，改用一般聊天模式) {e}\n\n{user_text}"

    # =====================================================
    # 一般聊天模式
    # =====================================================
    if openai_client:
        try:
            messages = _build_messages(session_id, user_text, system_prompt)

            resp = openai_client.responses.create(
                model=model,
                input=messages,
                temperature=0.2,
                max_output_tokens=800,  # 🔥 提高輸出長度
            )

            assistant_text = (
                resp.output_text.strip()
                if hasattr(resp, "output_text") and resp.output_text
                else "（模型沒有回傳內容）"
            )

        except Exception as e:
            assistant_text = (
                f"⚠️ 模型呼叫失敗：{e}\n\n"
                f"你剛才的問題是：{user_text}\n"
                "請確認 OpenAI API Key 是否設定正確，或稍後再試。"
            )

    else:
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        assistant_text = (
            "（離線模式）目前無法連線至雲端模型。\n\n"
            f"時間：{ts}\n\n"
            f"你剛才的問題：{user_text}\n\n"
            "請確認是否已設定 OPENAI_API_KEY。"
        )

    # 儲存對話
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
