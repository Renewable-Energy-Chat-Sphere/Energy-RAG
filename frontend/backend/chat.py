from energy_chat_router import should_use_energy_rag, answer_energy_question
import re
import time
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# ===== 記憶設定 =====
CHAT_MAX_MESSAGES = 10
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)


# =====================================================
# 語言控制（萬用多語）
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
# 問題模式判斷（最終版）
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
# 結果強化（最終版）
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
# 聊天模式判斷
# =====================================================
def is_simple_chat(text):
    simple_words = ["你好", "hi", "hello", "嗨", "在嗎"]
    return text.lower() in simple_words or len(text) <= 6


# =====================================================
# Energy Sphere 專屬助手 Prompt（核心）
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
    - 不得自行切換語言或輸入法（如：中文/英文、繁體中文/簡體中文）
    - 不得翻譯

    【資料限制（最高優先）】
    - 優先根據已提供資料回答
    - 回答時請附上資料來源
    - 不得捏造不存在的數據
    - 若本地資料不足，可使用網路搜尋補充資訊
    - 若使用網路資料，請在回答最後附上來源網址
    - 若使用網路查詢無果，才顯示「目前沒有足夠資訊」
"""


# =====================================================
# 分析模式 Prompt
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
# 建立對話上下文
# =====================================================
def _build_messages(session_id: str, user_text: str, system_prompt: str):
    msgs = [{"role": "system", "content": system_prompt}]

    for role, content in CHAT_SESSIONS[session_id]:
        msgs.append({"role": role, "content": content})

    msgs.append({"role": "user", "content": user_text})
    return msgs


# =====================================================
# 儲存對話
# =====================================================
def _store_turn(session_id: str, user_text: str, assistant_text: str):
    CHAT_SESSIONS[session_id].append(("user", user_text))
    CHAT_SESSIONS[session_id].append(("assistant", assistant_text))

# =====================================================
# 統一資料來源格式化
# =====================================================
def append_sources(answer, sources):

    if not sources:
        return answer

    source_lines = []

    for s in sources:

        # 字串
        if isinstance(s, str):

            source_lines.append(f"- {s}")

        # dict
        elif isinstance(s, dict):

            # 網頁來源
            if s.get("url"):

                title = s.get("title", "網頁資料")

                source_lines.append(
                    f"- [{title}]({s['url']})"
                )

            # Excel
            elif s.get("sheet"):

                sheet = s.get("sheet")
                rows = s.get("rows", "?")

                source_lines.append(
                    f"- 工作表：{sheet}（{rows} rows）"
                )

            # Energy RAG
            elif s.get("year"):

                year = s.get("year")

                if s.get("sheet"):

                    source_lines.append(
                        f"- 民國{year}年｜{s['sheet']}"
                    )

                else:

                    source_lines.append(
                        f"- 民國{year}年能源資料"
                    )

    # 去重複
    source_lines = list(dict.fromkeys(source_lines))

    if not source_lines:
        return answer

    return (
        answer
        + "\n\n---\n"
        + "### 🔗 資料來源\n"
        + "\n".join(source_lines)
    )

# =====================================================
# CHAT API
# =====================================================
@chat_bp.route("/chat", methods=["POST"])
def chat():
    session_id = (
        request.form.get("session_id") or "default"
    ).strip() or "default"

    user_text = (
        request.form.get("user") or ""
    ).strip()

    model = (
        request.form.get("model") or "gpt-4o-mini"
    ).strip()

    rag_auto = (
        request.form.get("rag_auto", "true").lower()
        == "true"
    )

    file = request.files.get("file")

    if not user_text and not file:
        return jsonify({"error": "請輸入問題內容"}), 400

    # =====================================================
    # Unified File Router
    # =====================================================
    if file:

        filename = file.filename.lower()

        # PDF
        if filename.endswith(".pdf"):

            qa_over_pdf = current_app.config.get("QA_OVER_PDF")

            answer, sources, structured_data = qa_over_pdf(
                user_text,
                file
            )

            return jsonify(
                {
                    "answer": append_sources(answer, sources),
                    "sources": sources,
                    "structured_data": structured_data,
                    "results": [],
                    "card_type": "default",
                    "session_id": session_id,
                    "model": "pdf_rag",
                    "uses_openai": bool(
                        current_app.config.get("OPENAI_CLIENT")
                    ),
                }
            )

        # Excel / CSV
        elif filename.endswith((
            ".xlsx",
            ".xls",
            ".csv",
            ".tsv"
        )):

            from tables import read_table, build_md, ask_llm, extract_json

            sheets = read_table(file)

            md = build_md(sheets)

            client = current_app.config.get("OPENAI_CLIENT")

            answer = ask_llm(
                user_text,
                md,
                client
            )

            structured_data = extract_json(answer)

            return jsonify(
                {
                    "answer": append_sources(
                        answer,
                        [
                            {
                                "sheet": name,
                                "rows": int(df.shape[0]),
                            }
                            for name, df in sheets.items()
                        ]
                    ),

                    "sources": [
                        {
                            "sheet": name,
                            "rows": int(df.shape[0]),
                            "columns": list(df.columns),
                        }
                        for name, df in sheets.items()
                    ],
                    "structured_data": structured_data,
                    "results": [],
                    "card_type": "default",
                    "session_id": session_id,
                    "model": "table_rag",
                    "uses_openai": bool(client),
                }
            )

        # TXT
        elif filename.endswith(".txt"):

            text = file.read().decode("utf-8")

            prompt = f"""
                以下是使用者上傳的文字內容：

                {text}

                問題：
                {user_text}
            """

            resp = current_app.config.get(
                "OPENAI_CLIENT"
            ).responses.create(
                model=model,
                input=prompt,
                temperature=0.2,
                max_output_tokens=1000,
            )

            return jsonify(
                {
                    "answer": append_sources(
                        resp.output_text,
                        [filename]
                    ),
                    "sources": [filename],
                    "results": [],
                    "card_type": "default",
                    "session_id": session_id,
                    "model": "txt_rag",
                    "uses_openai": True,
                }
            )

        else:

            return jsonify(
                {
                    "answer": "⚠️ 不支援的檔案格式",
                    "sources": [],
                    "results": [],
                }
            )

    openai_client = current_app.config.get("OPENAI_CLIENT")
    qa_over_web = current_app.config.get("QA_OVER_WEB")

    # =====================================================
    # URL 轉換 RAG
    # =====================================================
    if rag_auto and qa_over_web:
        m = URL_RE.search(user_text)
        if m:
            url = m.group(1)
            question_only = user_text.replace(url, "").strip() or "請根據網址內容回答。"

            try:
                answer, sources = qa_over_web(question_only, url=url)
                answer = append_sources(answer, sources)
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
    # Energy RAG Router
    # =====================================================
    if should_use_energy_rag(user_text):

        try:

            mode = detect_query_mode(user_text)

            result = answer_energy_question(user_text)

            assistant_text = result.get(
                "answer",
                "（無回應）"
            )

            # =====================================
            # 🔥 如果 Energy RAG 找不到資料
            # → 不 return
            # → 繼續往下走 GPT Web Search
            # =====================================
            if (
                "目前資料庫中沒有足夠資訊" not in assistant_text
                and "無相關資料" not in assistant_text
            ):

                def humanize_answer(text):

                    return text.replace(
                        "根據相關年度已生成的能源資料",
                        "我幫你查了一下"
                    )

                assistant_text = humanize_answer(
                    assistant_text
                )
                # =====================================
                # 🔥 強制翻譯成使用者語言
                # =====================================
                if openai_client:

                    lang_fix_prompt = f"""
                        You are a professional multilingual translator.

                        User question:
                        {user_text}

                        Current answer:
                        {assistant_text}

                        IMPORTANT RULES:

                        1. Reply ONLY in the same language as the user's question
                        2. Fully translate ALL content into that language
                        3. Never keep the original language
                        4. Never mix multiple languages
                        5. Preserve the original meaning
                        6. Keep the response natural and fluent

                        Output ONLY the translated result.
                        """

                    lang_resp = openai_client.responses.create(
                        model=model,
                        input=lang_fix_prompt,
                        temperature=0
                    )

                    assistant_text = lang_resp.output_text.strip()

                # =====================================================
                # 分析模式 LLM
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
                        tools=[{"type": "web_search"}],
                        input=[
                            {
                                "role": "system",
                                "content": "請使用與使用者相同語言回答"
                            },
                            {
                                "role": "user",
                                "content": analysis_prompt
                            },
                        ],
                        temperature=0.3,
                        max_output_tokens=1000,
                    )

                    assistant_text = (
                        resp.output_text.strip()
                    )

                    # =====================================
                    # GPT / Web Search 來源
                    # =====================================
                    sources = []

                    try:

                        if hasattr(resp, "sources"):

                            for s in resp.sources:

                                sources.append({
                                    "title": getattr(
                                        s,
                                        "title",
                                        "網頁來源"
                                    ),
                                    "url": getattr(
                                        s,
                                        "url",
                                        ""
                                    )
                                })

                    except:
                        pass

                    assistant_text = append_sources(
                        assistant_text,
                        sources
                    )

                # =====================================
                # 精準模式
                # =====================================
                else:

                    assistant_text = enhance_answer_by_mode(
                        assistant_text,
                        mode
                    )

                # =====================================
                # 如果 analysis mode 沒有 web sources
                # 才加 Energy RAG sources
                # =====================================
                if "### 🔗 資料來源" not in assistant_text:

                    assistant_text = append_sources(
                        assistant_text,
                        result.get("sources", [])
                    )

                _store_turn(
                    session_id,
                    user_text,
                    assistant_text
                )

                return jsonify(
                    {
                        "answer": assistant_text,
                        "sources": result.get(
                            "sources",
                            []
                        ),
                        "results": result.get(
                            "results",
                            []
                        ),
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
    # 模式判斷
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
    # 呼叫模型
    # =====================================================
    final_sources = []
    if openai_client:

        try:
            messages = _build_messages(
                session_id,
                user_text,
                system_prompt
            )

            resp = openai_client.responses.create(
                model=model,

                # 允許 GPT 上網搜尋
                tools=[{"type": "web_search"}],

                input=messages,
                temperature=0.2,
                max_output_tokens=800,
            )

            assistant_text = (
                resp.output_text.strip()
                if hasattr(resp, "output_text") and resp.output_text
                else "（模型沒有回傳內容）"
            )

            # GPT 一般來源
            sources = []
            try:

                if hasattr(resp, "sources"):

                    for s in resp.sources:

                        item = {
                            "title": getattr(s, "title", "網頁來源"),
                            "url": getattr(s, "url", "")
                        }

                        sources.append(item)
                        final_sources.append(item)

            except:
                pass

            assistant_text = append_sources(
                assistant_text,
                sources
            )

        except Exception as e:
            assistant_text = f"⚠️ 模型錯誤：{e}"
            final_sources = []

    else:
        assistant_text = "⚠️ 尚未設定 OpenAI API Key"

    _store_turn(session_id, user_text, assistant_text)

    return jsonify(
        {
            "answer": assistant_text,
            "sources": final_sources,
            "results": [],
            "card_type": "default",
            "session_id": session_id,
            "model": model,
            "uses_openai": True,
        }
    )