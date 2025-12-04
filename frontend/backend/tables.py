# tables.py
import io
import pandas as pd
from flask import Blueprint, request, jsonify, current_app

tables_bp = Blueprint("tables", __name__)


# === 將 DataFrame 轉成 Markdown (限制列數與欄數，防止太長) ===
def df_to_markdown(df: pd.DataFrame, max_rows=30, max_cols=15):
    df2 = df.copy()
    if df2.shape[0] > max_rows:
        df2 = df2.head(max_rows)
    if df2.shape[1] > max_cols:
        df2 = df2.iloc[:, :max_cols]
    df2 = df2.convert_dtypes()
    return df2.to_markdown(index=False)


# === 改進：允許空值與模糊字的表格讀取 ===
def read_table_file(file_storage):
    content = file_storage.read()
    bio = io.BytesIO(content)
    name = (file_storage.filename or "").lower()

    # 嘗試判斷檔案格式
    if name.endswith((".xlsx", ".xlsm", ".xltx", ".xltm", ".xls")):
        xls = pd.ExcelFile(bio)
        sheets = {sheet: xls.parse(sheet) for sheet in xls.sheet_names}
    elif name.endswith(".csv") or name.endswith(".txt"):
        sheets = {"Sheet1": pd.read_csv(bio, encoding="utf-8", engine="python")}
    elif name.endswith((".tsv", ".tab")):
        sheets = {
            "Sheet1": pd.read_csv(bio, sep="\t", encoding="utf-8", engine="python")
        }
    else:
        try:
            sheets = {"Sheet1": pd.read_csv(bio, engine="python")}
        except Exception:
            raise ValueError("不支援的檔案格式，請上傳 .xlsx/.xls/.csv/.tsv")

    # ✅ 自動清理：將空值與模糊文字視為空白
    cleaned_sheets = {}
    for name, df in sheets.items():
        # 先轉換成字串，避免 pd.NA 比對錯誤
        df = df.astype(str)

        # 移除或替換模糊空值（nan、none、—、無、空 等）
        df = df.replace(
            to_replace=r"(?i)^(nan|na|n/a|none|null|\?|—|-|無|空|missing|blank)$",
            value="",
            regex=True,
        )

        cleaned_sheets[name] = df

    return cleaned_sheets


# === 將多張表格組成 markdown context（給 LLM 用） ===
def build_context_markdown(sheets: dict, max_chars=12000):
    parts = []
    for name, df in sheets.items():
        try:
            md = df_to_markdown(df)
        except Exception as e:
            md = f"(無法轉換表格：{e})"
        parts.append(f"### Sheet: {name}\n\n{md}\n")
    ctx = "\n\n".join(parts)
    if len(ctx) > max_chars:
        ctx = ctx[:max_chars] + "\n\n...(已截斷)..."
    return ctx


# === 提供簡要統計資訊 ===
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


# === 用 LLM 從表格回答問題 ===
def llm_answer_from_tables(question: str, ctx_md: str, openai_client):
    if not openai_client:
        return None
    prompt = f"""根據下方表格內容（Markdown），回答使用者的問題。
若資料有空白、缺失或模糊項，請盡力根據可用資訊推論，必要時可回答「資料不足」。
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


# === Flask 路由：處理表格問答 ===
@tables_bp.route("/ask_table", methods=["POST"])
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

        openai_client = current_app.config.get("OPENAI_CLIENT")
        answer = llm_answer_from_tables(question, ctx_md, openai_client)

        # 若未設定 API 金鑰，回傳摘要
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
