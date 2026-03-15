# tables.py — Simplest Stable Version
import re
import json
import io
import pandas as pd
from flask import Blueprint, request, jsonify, current_app

tables_bp = Blueprint("tables", __name__)


# ------------------------------------------------------------
# 讀取 Excel / CSV / TSV
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

        # fallback
        else:
            sheets = {"Sheet1": pd.read_csv(bio, dtype=str)}

        return sheets

    except Exception as e:
        raise ValueError(f"表格讀取失敗：{e}")


# ------------------------------------------------------------
# DataFrame → Markdown
# ------------------------------------------------------------
def df_to_markdown(df, max_rows=30, max_cols=15):
    df2 = df.copy()
    df2 = df2.head(max_rows)
    df2 = df2.iloc[:, :max_cols]
    return df2.to_markdown(index=False)


# ------------------------------------------------------------
# 多個 Sheet → Markdown
# ------------------------------------------------------------
def build_md(sheets):

    parts = []

    for name, df in sheets.items():
        parts.append(f"### {name}\n\n{df_to_markdown(df)}\n")

    text = "\n\n".join(parts)

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
你是一個資料分析助手。

請根據提供的表格資料回答問題。

如果問題涉及數據整理或統計，
請同時產生 structured_data JSON。

【表格內容】
{md}

【問題】
{question}

回答規則：

1. 先用條列式回答
2. 若有表格請輸出 structured_data

structured_data:
{{
 "columns": ["欄位1","欄位2"],
 "rows":[
   ["值1","值2"],
   ["值1","值2"]
 ]
}}
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
# 主 API
# ------------------------------------------------------------
@tables_bp.route("/ask_table", methods=["POST"])
def ask_table():

    try:

        question = (request.form.get("question") or "").strip()
        file = request.files.get("file")

        if not question:
            return jsonify({"success": False, "error": "question is required"}), 400

        if not file:
            return jsonify({"success": False, "error": "table file is required"}), 400

        # 讀取表格
        sheets = read_table(file)

        # 轉 markdown
        md = build_md(sheets)

        # 來源資訊
        sources = [
            {
                "source_type": "table",
                "sheet": name,
                "rows": int(df.shape[0]),
                "columns_count": int(df.shape[1]),
                "columns": list(map(str, df.columns.tolist())),
            }
            for name, df in sheets.items()
        ]

        # 呼叫 OpenAI
        client = current_app.config.get("OPENAI_CLIENT")
        answer = ask_llm(question, md, client)

        if answer is None:
            answer = "⚠️ 未設定 OPENAI_API_KEY\n\n" + md

        # ⭐ 解析 GPT 回傳 JSON
        structured_data = None

        try:

            match = re.search(r"\{[\s\S]*\}", answer)

            if match:
                structured_data = json.loads(match.group())

        except Exception as e:
            print("JSON parse error:", e)

        

        return jsonify({
            "success": True,
            "type": "table",
            "question": question,
            "answer": answer,
            "sources": sources,
            "structured_data": structured_data
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500