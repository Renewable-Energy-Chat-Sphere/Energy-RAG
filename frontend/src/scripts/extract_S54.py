import pandas as pd
import json
import os
import re

# 👉 改成你實際路徑
DATA_DIR = "../../backend/data/yearly"

def extract_year(filename):
    match = re.search(r"(\d{2,3})", filename)
    return match.group(1) if match else None


def extract_S54(excel_path, sheet="總比例換算"):
    try:
        df = pd.read_excel(excel_path, sheet_name=sheet)
    except Exception as e:
        print(f"❌ 讀取失敗：{excel_path}（{e}）")
        return {}

    result = {}

    # 找 S54 欄
    if "S54" not in df.columns:
        print(f"⚠️ 找不到 S54：{excel_path}")
        return {}

    for _, row in df.iterrows():
        d = str(row.iloc[0]).strip()

        if not d.startswith("D"):
            continue

        val = row["S54"]

        if pd.notna(val) and val != 0:
            result[d] = round(float(val), 2)

    return result


# =========================
# 主程式
# =========================
if __name__ == "__main__":

    final_result = {}

    for file in os.listdir(DATA_DIR):

        if not file.endswith(".xlsx"):
            continue

        year = extract_year(file)
        if not year:
            continue

        input_file = os.path.join(DATA_DIR, file)

        s54_data = extract_S54(input_file)

        if s54_data:
            final_result[year] = s54_data

    # 👉 輸出
    output_path = os.path.join(DATA_DIR, "Demand_ratio_yearly.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_result, f, indent=2, ensure_ascii=False)

    print(f"\n✅ 完成：{output_path}")