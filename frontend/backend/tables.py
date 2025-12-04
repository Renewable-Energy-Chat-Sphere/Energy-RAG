# tables.py — Simplest Stable Version
import io
import pandas as pd
from flask import Blueprint, request, jsonify, current_app

tables_bp = Blueprint("tables", __name__)


# ------------------------------------------------------------
# 讀取 Excel / CSV / TSV（最穩定寫法）
# ------------------------------------------------------------
def read_table(file):
    filename = (file.filename or "").lower()
    data = file.read()
    bio = io.BytesIO(data)

    try:
        # Excel
        if filename.endswith((".xlsx", ".xls")):
            xls = pd.ExcelFile(bio)
            sheets = {sheet: xls.parse(sheet, dtype=str) for sheet in xls.sheet_names}

        # CSV
        elif filename.endswith(".csv"):
            sheets = {"Sheet1": pd.read_csv(bio, dtype=str)}

        # TSV
        elif filename.endswith(".tsv"):
            sheets = {"Sheet1": pd.read_csv(bio, sep="\t", dtype=str)}

        # 自動嘗試 CSV
        else:
            sheets = {"Sheet1": pd.read_csv(bio, dtype=str)}

        return sheets

    except Exception as e:
        raise ValueError(f"表格讀取失敗：{e}")


# ------------------------------------------------------------
# DataFrame → Markdown（限制長度）
# ------------------------------------------------------------
def df_to_markdown(df, max_rows=30, max_cols=15):
    df2 = df.copy()
    df2 = df2.head(max_rows)
    df2 = df2.iloc[:, :max_cols]
    return df2.to_markdown(index=False)


# ------------------------------------------------------------
# 多個 Sheet 合併為 markdown 給 LLM
# ------------------------------------------------------------
def build_md(sheets):
    parts = []
    for name, df in sheets.items():
        parts.append(f"### {name}\n\n{df_to_markdown(df)}\n")
    text = "\n\n".join(parts)

    # 限制長度（避免送到 LLM 過大）
    if len(text) > 12000:
        text = text[:12000] + "\n\n...(後面省略)..."

    return text


# ------------------------------------------------------------
# OpenAI 回答
# ------------------------------------------------------------
def ask_llm(question, md, client):
    if not client:
        return None

    prompt = f"""
根據下列表格內容回答問題：

【表格內容】
{md}

【問題】
{question}

請用條列式回答。
"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"(OPENAI 回答失敗：{e})"


# ------------------------------------------------------------
# 主路由
# ------------------------------------------------------------
@tables_bp.route("/ask_table", methods=["POST"])
def ask_table():
    try:
        question = (request.form.get("question") or "").strip()
        file = request.files.get("file")

        if not question:
            return jsonify({"error": "question is required"}), 400
        if not file:
            return jsonify({"error": "table file is required"}), 400

        # 讀取表格
        sheets = read_table(file)

        # 轉 markdown
        md = build_md(sheets)

        # 樣本來源
        sources = [
            {
                "sheet": name,
                "shape": [int(df.shape[0]), int(df.shape[1])],
                "columns": list(map(str, df.columns.tolist())),
            }
            for name, df in sheets.items()
        ]

        # OpenAI
        client = current_app.config.get("OPENAI_CLIENT")
        answer = ask_llm(question, md, client)

        # 若無 API → 回傳摘要
        if answer is None:
            answer = "⚠️ 未設定 OPENAI_API_KEY，以下提供表格摘要：\n\n" + md

        return jsonify({"answer": answer, "sources": sources})

    except Exception as e:
        # ⭐ 讓你可以看到真正錯誤（不再 500 一片空白）
        return jsonify({"error": str(e)}), 500
