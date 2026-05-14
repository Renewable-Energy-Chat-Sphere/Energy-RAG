from energy_chat_router import should_use_energy_rag, answer_energy_question
import re
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint("chat", __name__)

# 記憶設定
CHAT_MAX_MESSAGES = 10
CHAT_SESSIONS = defaultdict(lambda: deque(maxlen=CHAT_MAX_MESSAGES))

URL_RE = re.compile(r"(https?://[^\s]+)", re.IGNORECASE)
def detect_language(text):

    # 中文
    if re.search(r"[\u4e00-\u9fff]", text):
        return "Traditional Chinese"

    # 日文
    if re.search(r"[\u3040-\u30ff]", text):
        return "Japanese"

    # 韓文
    if re.search(r"[\uac00-\ud7af]", text):
        return "Korean"

    return "English"


# =====================================================
# 回覆語種控制
# =====================================================
def get_language_prompt(user_text):
    return f"""
        請嚴格遵守以下語種規則：

        1. 使用與輸入訊息「完全一致的語種」回答
        2. 不得隨意切換語種
        3. 如果資料來源與使用者語種不同，請翻譯成使用者語種
        4. 保持語氣與文字系統一致

        使用者輸入：
        \"\"\"{user_text}\"\"\"

        請用相同語種回答。
    """


# =====================================================
# Energy Sphere Prompt
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
    - 優先以平台邏輯解釋，不得編造虛假資訊

    【語言規則（最高優先）】
    - 回覆語種必須與使用者輸入完全一致
    - 不得自行切換語種或輸入法
    - 如果資料來源語種不同，請翻譯成使用者語種
    - 不得隨意切換回覆語種

    【資料限制（最高優先）】
    - 優先根據已提供資料回答
    - 回答時請附上資料來源
    - 不得捏造不存在的數據
    - 如果本地資料不足，可使用網路搜尋補充資訊
    - 如果使用網路資料，請在回答最後附上來源網址
    - 如果使用網路查詢無果，才顯示「目前沒有足夠資訊」
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
# 指令關鍵字判斷
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
# 結果強化
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
# 回覆口語化
# =====================================================
def humanize_answer(text):

    return text.replace(
        "根據相關年度已生成的能源資料",
        "我幫你查了一下"
    )


# =====================================================
# 數字格式化
# =====================================================
def clean_numbers(text):

    # 小數超過 2 位 → 四捨五入
    def repl(match):

        num = float(match.group())

        # 整數不處理
        if num.is_integer():
            return str(int(num))

        return f"{num:.2f}"

    return re.sub(
        r"\d+\.\d+",
        repl,
        text
    )


# =====================================================
# 內部資料格式化
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
# 網路資料來源格式化
# =====================================================
def extract_sources(resp):
    sources = []

    try:
        if hasattr(resp, "output"):

            for item in resp.output:
                if hasattr(item, "content"):

                    for c in item.content:
                        if hasattr(c, "annotations"):

                            for ann in c.annotations:
                                if getattr(ann, "type", "") == "url_citation":
                                    sources.append({
                                        "title": getattr(
                                            ann,
                                            "title",
                                            "網頁來源"
                                        ),
                                        "url": getattr(
                                            ann,
                                            "url",
                                            ""
                                        )
                                    })

        # 去重複
        sources = list({
            s["url"]: s for s in sources
            if s.get("url")
        }.values())

    except Exception as e:
        print("來源解析失敗:", e)

    return sources


# =====================================================
# 取得模型輸出文字
# =====================================================
def get_output_text(resp):

    if hasattr(resp, "output_text") and resp.output_text:
        return resp.output_text.strip()

    return "（模型沒有回傳內容）"


# =====================================================
# 輸出語言翻譯
# =====================================================
def translate_answer(openai_client, model, user_text, answer):

    target_lang = detect_language(user_text)

    lang_fix_prompt = f"""
    You are a professional multilingual AI assistant.

    Target language:
    {target_lang}

    User question:
    {user_text}

    Current answer:
    {answer}

    CRITICAL RULES:
    - The ENTIRE response MUST be in {target_lang}
    - Translate ALL content into {target_lang}
    - Never mix languages
    - Preserve the original meaning
    - Keep the wording natural and fluent

    Return ONLY the final translated answer.
    """

    resp = openai_client.responses.create(
        model=model,
        input=lang_fix_prompt,
        temperature=0
    )

    return clean_numbers(
        get_output_text(resp)
    )


# =====================================================
# 輸出回覆整理
# =====================================================
def finalize_answer(
    openai_client,
    model,
    user_text,
    assistant_text,
    sources
):

    assistant_text = translate_answer(
        openai_client,
        model,
        user_text,
        assistant_text
    )

    return append_sources(
        assistant_text,
        sources
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
                        get_output_text(resp),
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

            sources = []

            # 如果 Energy RAG 找不到資料不直接 return
            # 繼續往下走 GPT Web Search
            if (
                "目前資料庫中沒有足夠資訊" in assistant_text
                or "無相關資料" in assistant_text
            ):

                resp = openai_client.responses.create(
                    model=model,
                    tools=[{"type": "web_search"}],

                    input=f"""
                    使用最新網路資料回答：

                    {user_text}

                    要求：
                    - 優先查詢台電、能源署與政府網站公開資料
                    - 如果檢索到數據直接印出
                    - 使用相同的語種回覆
                    - 附上資料來源
                    """,

                    temperature=0.2,
                    max_output_tokens=1000,
                )

                assistant_text = get_output_text(resp)
                sources = extract_sources(resp)

                assistant_text = finalize_answer(
                    openai_client,
                    model,
                    user_text,
                    assistant_text,
                    sources
                )

                _store_turn(
                    session_id,
                    user_text,
                    assistant_text
                )

                return jsonify(
                    {
                        "answer": assistant_text,
                        "sources": sources,
                        "results": [],
                        "session_id": session_id,
                        "model": "web_fallback",
                        "uses_openai": True,
                    }
                )

            if (
                "目前資料庫中沒有足夠資訊" not in assistant_text
                and "無相關資料" not in assistant_text
            ):

                assistant_text = humanize_answer(
                    assistant_text
                )

                # =====================================================
                # 分析模式 LLM
                # =====================================================
                if mode == "analysis" and openai_client:

                    analysis_prompt = f"""
                        你是一個能源分析專家，以下是資料：
                        {assistant_text}

                        請做「完整分析」，不要只是列資料：
                        1. 哪些能源最多？排名
                        2. 結構特徵（集中？分散？）
                        3. 為什麼會這樣（產業/政策/結構）
                        4. 有沒有值得注意的現象
                        5. 給一個總結

                        要求：
                        - 條理清楚
                        - 以條列式回覆並適當分段
                        - 使用相同的語種回覆
                    """

                    resp = openai_client.responses.create(
                        model=model,
                        tools=[{"type": "web_search"}],
                        input=[
                            {
                                "role": "system",
                                "content": "請使用相同的語種回答"
                            },
                            {
                                "role": "user",
                                "content": analysis_prompt
                            },
                        ],
                        temperature=0.3,
                        max_output_tokens=1000,
                    )

                    assistant_text = get_output_text(resp)
                    sources = extract_sources(resp)

                    # =====================================
                    # 輸出語種統一
                    # =====================================
                    assistant_text = finalize_answer(
                        openai_client,
                        model,
                        user_text,
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

                # 如果 analysis mode 沒有 web sources
                # 才加 Energy RAG sources
                if "### 🔗 資料來源" not in assistant_text:
                    
                    # =====================================
                    # 輸出語種統一
                    # =====================================
                    assistant_text = finalize_answer(
                        openai_client,
                        model,
                        user_text,
                        assistant_text,
                        sources
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

    if detect_query_mode(user_text) == "analysis":
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

            assistant_text = get_output_text(resp)

            sources = extract_sources(resp)
            final_sources.extend(sources)
            
            # =====================================
            # 輸出語種統一
            # =====================================
            assistant_text = finalize_answer(
                openai_client,
                model,
                user_text,
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