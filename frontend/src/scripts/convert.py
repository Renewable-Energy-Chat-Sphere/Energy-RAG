import pandas as pd
import json
import os
import re

# ✅ 改這裡
DATA_DIR = "../../backend/data/yearly"

def extract_year(filename):
    match = re.search(r"(\d{2,3})", filename)
    return match.group(1) if match else "unknown"

def convert_ratio_to_json(excel_path, output_path, sheet="總比例換算"):
    try:
        df = pd.read_excel(excel_path, sheet_name=sheet)
    except Exception as e:
        print(f"❌ 讀取失敗：{excel_path}（{e}）")
        return

    result = {}

    for _, row in df.iterrows():
        d = str(row.iloc[0]).strip()

        if d == "D1":
            continue
        if not d.startswith("D"):
            continue

        entry = {}

        for col in df.columns[1:]:
            s = str(col).strip()

            if s == "S54":
                continue
            if not s.startswith("S"):
                continue

            val = row[col]

            if pd.notna(val) and val != 0:
                try:
                    entry[s] = round(float(val), 3)
                except:
                    continue

        if entry:
            result[d] = entry

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ 完成：{output_path}")


# =========================
# 主程式
# =========================
if __name__ == "__main__":

    for file in os.listdir(DATA_DIR):

        if not file.endswith(".xlsx"):
            continue

        year = extract_year(file)

        input_file = os.path.join(DATA_DIR, file)

        # 👉 輸出也放同一個資料夾
        output_file = os.path.join(
            DATA_DIR,
            f"{year}_energy_demand_supply.json"
        )

        convert_ratio_to_json(input_file, output_file)