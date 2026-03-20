import re
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# ===== 記憶設定 =====
CHAT_MAX_MESSAGES = 30
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)


# =====================================================
# 🌍 語言控制（更穩定）
# =====================================================
def get_language_prompt(user_text):
    return f"""
請嚴格遵守以下語言規則：

1. 使用與使用者輸入「完全相同的語言」回答
2. 不得切換語言
3. 不得翻譯
4. 若無法判斷語言，請使用繁體中文

使用者輸入：
\"\"\"{user_text}\"\"\"
"""


# =====================================================
# 💬 判斷：簡單聊天
# =====================================================
def is_simple_chat(text):
    text = text.lower().strip()
    simple_words = ["你好", "hi", "hello", "嗨", "在嗎", "hey"]
    return text in simple_words or len(text) <= 4


# =====================================================
# 📊 判斷：是否偏分析型
# =====================================================
def wants_structure(text):
    keywords = [
        "分析",
        "整理",
        "比較",
        "差異",
        "優缺點",
        "原因",
        "影響",
        "report",
        "analysis",
        "compare",
    ]
    return any(k in text for k in keywords)


# =====================================================
# 🤖 Energy Sphere 助手 Prompt（升級版🔥）
# =====================================================
BASE_ASSISTANT_PROMPT = """
你是「Energy Sphere 智慧能源平台」的 AI 助手。

【角色】
- 專門解釋能源資料、供給、需求、比例、相似度與 3D 能源球
- 幫助使用者理解平台內容

【回答風格（非常重要）】
請像 ChatGPT 一樣「自動選擇最適合的格式」：

1️⃣ 打招呼 / 閒聊  
→ 簡短自然（像真人）

2️⃣ 一般問題  
→ 清楚解釋（可用段落或條列）

3️⃣ 分析 / 比較 / 複雜問題  
→ 條列 + 分段（但不要固定報告模板）

4️⃣ 使用者明確要求（報告 / PDF / 條列整理）  
→ 才使用完整結構化格式

⚠️ 絕對不要每次都用同一種格式
⚠️ 回答要自然、有彈性

【語言規則】
- 必須與使用者語言完全一致
- 不可切換語言

【禁止】
- 不要亂編數據
"""


# =====================================================
# 🧠 建立對話上下文
# =====================================================
def _build_messages(session_id: str, user_text: str, system_prompt: str):
    msgs = [{"role": "system", "content": system_prompt}]

    for role, content in CHAT_SESSIONS[session_id]:
        msgs.append({"role": role, "content": content})

    msgs.append({"role": "user", "content": user_text})
    return msgs


# =====================================================
# 💾 儲存對話
# =====================================================
def _store_turn(session_id: str, user_text: str, assistant_text: str):
    CHAT_SESSIONS[session_id].append(("user", user_text))
    CHAT_SESSIONS[session_id].append(("assistant", assistant_text))


# =====================================================
# 🚀 CHAT API
# =====================================================
@chat_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True) or {}

    session_id = (data.get("session_id") or "default").strip() or "default"
    user_text = (data.get("user") or "").strip()
    model = (data.get("model") or "gpt-4o-mini").strip()
    rag_auto = bool(data.get("rag_auto", True))

    if not user_text:
        return jsonify({"error": "請輸入問題內容"}), 400

    openai_client = current_app.config.get("OPENAI_CLIENT")
    qa_over_web = current_app.config.get("QA_OVER_WEB")

    # =====================================================
    # 🌐 URL → RAG
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
                    }
                )

            except Exception as e:
                user_text = f"(網址處理失敗) {e}\n\n{user_text}"

    # =====================================================
    # 🧠 GPT風格控制（🔥重點）
    # =====================================================
    language_prompt = get_language_prompt(user_text)

    # 👉 動態引導（不再鎖死格式）
    if is_simple_chat(user_text):
        style_hint = "請用簡短自然的方式回答。"
    elif wants_structure(user_text):
        style_hint = "請用條列與分段說明，幫助理解。"
    else:
        style_hint = "請清楚解釋，必要時可用條列。"

    system_prompt = (
        language_prompt + "\n\n" + BASE_ASSISTANT_PROMPT + "\n\n" + style_hint
    )

    # =====================================================
    # 🤖 呼叫模型
    # =====================================================
    if openai_client:
        try:
            messages = _build_messages(session_id, user_text, system_prompt)

            resp = openai_client.responses.create(
                model=model,
                input=messages,
                temperature=0.4,  # 🔥 提升自然度
                max_output_tokens=800,
            )

            assistant_text = (
                resp.output_text.strip()
                if hasattr(resp, "output_text") and resp.output_text
                else "（模型沒有回傳內容）"
            )

        except Exception as e:
            assistant_text = f"⚠️ 模型錯誤：{e}"

    else:
        assistant_text = "⚠️ 尚未設定 OpenAI API Key"

    _store_turn(session_id, user_text, assistant_text)

    return jsonify(
        {
            "answer": assistant_text,
            "session_id": session_id,
            "history_len": len(CHAT_SESSIONS[session_id]),
            "model": model,
        }
    )
