from energy_chat_router import is_energy_question, answer_energy_question
import re
import time
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# ===== 記憶設定 =====
CHAT_MAX_MESSAGES = 30
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)


# =====================================================
# 🌍 語言控制（萬用多語🔥）
# =====================================================
def get_language_prompt(user_text):
    return f"""
請嚴格遵守以下語言規則：

1. 使用與使用者輸入「完全相同的語言」回答
2. 不得切換語言
3. 不得翻譯
4. 保持語氣與文字系統一致

使用者輸入：
\"\"\"{user_text}\"\"\"

請用相同語言回答。
"""


# =====================================================
# 🧠 問題模式判斷（最終版🔥）
# =====================================================
def detect_query_mode(text):
    text = text.lower()

    if any(k in text for k in ["分析", "詳細", "整理", "趨勢", "report", "analysis"]):
        return "analysis"

    if any(
        k in text
        for k in ["最多", "哪個", "找出", "最高", "最低", "多少", "which", "max", "top"]
    ):
        return "precise"

    return "normal"


# =====================================================
# 🎯 結果強化（最終版🔥）
# =====================================================
def enhance_answer_by_mode(answer, mode):
    if mode == "analysis":
        return f"""
## 📊 能源資料完整分析

{answer}

---

### 🔍 綜合說明
- 已整合所有相關能源數據
- 包含結構比例、主要能源分布
- 可觀察長期趨勢與變化方向

### 📈 建議解讀方向
- 注意高占比能源 → 代表依賴性
- 觀察變化 → 可能代表產業轉型
"""

    elif mode == "precise":
        return f"""
🎯 **精確查詢結果**

{answer}

"""

    return answer


# =====================================================
# 💬 聊天模式判斷
# =====================================================
def is_simple_chat(text):
    simple_words = ["你好", "hi", "hello", "嗨", "在嗎"]
    return text.lower() in simple_words or len(text) <= 6


# =====================================================
# 🤖 Energy Sphere 專屬助手 Prompt（🔥核心）
# =====================================================
BASE_ASSISTANT_PROMPT = """
你是「Energy Sphere 智慧能源平台」的虛擬助理。

你的任務是協助使用者理解本網站的能源資料、分析結果與視覺化內容。

【角色定位】
- 你是本網站專屬 AI（不是一般聊天機器人）
- 熟悉能源需求、供給、比例、相似度分析與 3D 能源球
- 可以解釋圖表、數據與分析結果

【回答原則】
- 簡單問題 → 簡短自然回答
- 專業問題 → 條理清楚、易懂
- 優先以平台邏輯解釋（不要亂編）

【語言規則（最高優先）】
- 回答語言必須與使用者輸入完全一致
- 不得自行切換語言
- 不得翻譯

【禁止】
- 不要胡亂捏造數據
"""


# =====================================================
# 📊 分析模式 Prompt
# =====================================================
DEFAULT_SYSTEM_PROMPT = """
請使用正式分析報告風格回答：

## 主題名稱

### 一、背景或定義

### 二、主要內容或分析

### 三、影響或延伸說明

### 四、結論

要求：
- 條理清楚
- 使用 Markdown
- 關鍵字加粗
- 不要口語化
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
                        "results": [],
                        "session_id": session_id,
                        "model": "rag_web",
                        "uses_openai": bool(openai_client),
                    }
                )

            except Exception as e:
                user_text = f"(網址處理失敗) {e}\n\n{user_text}"

    # =====================================================
    # ⚡ Energy RAG Router
    # =====================================================
    if is_energy_question(user_text):
        try:
            mode = detect_query_mode(user_text)  # 🔥核心

            result = answer_energy_question(user_text)
            assistant_text = result.get("answer", "（無回應）")
            def humanize_answer(text):
                return text.replace("根據相關年度已生成的能源資料", "我幫你查了一下")
            assistant_text = humanize_answer(assistant_text)

            # 🔥 最終升級（超重要）
            assistant_text = result.get("answer", "（無回應）")

            # =====================================================
            # 🔥 真正升級（分析模式用 LLM）
            # =====================================================
            if mode == "analysis" and openai_client:

                analysis_prompt = f"""
            你是一個能源分析專家。

            以下是資料：
            {assistant_text}

            請做「完整分析」，不要只是列資料：

            1️⃣ 哪些能源最多？排名
            2️⃣ 結構特徵（集中？分散？）
            3️⃣ 為什麼會這樣（產業/政策/結構）
            4️⃣ 有沒有值得注意的現象
            5️⃣ 給一個總結

            要求：
            - 條理清楚
            - 用條列＋段落
            - 用與使用者相同語言
            """

                resp = openai_client.responses.create(
                    model=model,
                    input=[
                        {"role": "system", "content": "請使用與使用者相同語言回答"},
                        {"role": "user", "content": analysis_prompt},
                    ],
                    temperature=0.3,
                    max_output_tokens=1000,
                )

                assistant_text = resp.output_text.strip()

            # 🔵 精準模式（保留你原本）
            else:
                assistant_text = enhance_answer_by_mode(assistant_text, mode)
            _store_turn(session_id, user_text, assistant_text)

            return jsonify(
                {
                    "answer": assistant_text,
                    "sources": result.get("sources", []),
                    "results": result.get("results", []),
                    "session_id": session_id,
                    "model": "energy_rag",
                    "uses_openai": False,
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "answer": f"⚠️ Energy RAG 錯誤：{e}",
                        "sources": [],
                        "results": [],
                        "session_id": session_id,
                        "model": "energy_rag",
                        "uses_openai": False,
                    }
                ),
                500,
            )

    # =====================================================
    # 🧠 模式判斷（聊天 / 分析）
    # =====================================================
    def is_analysis_question(text):
        keywords = ["分析", "報告", "整理", "比較", "趨勢", "analysis", "report"]
        return any(k in text.lower() for k in keywords)

    if is_analysis_question(user_text):
        mode_prompt = DEFAULT_SYSTEM_PROMPT
    else:
        mode_prompt = "請用自然聊天方式回答，不要用報告格式。"

    language_prompt = get_language_prompt(user_text)

    system_prompt = (
        language_prompt + "\n\n" + BASE_ASSISTANT_PROMPT + "\n\n" + mode_prompt
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
                temperature=0.2,
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
            "sources": [],
            "results": [],
            "card_type": "default",
            "session_id": session_id,
            "model": model,
            "uses_openai": True,
        }
    )
