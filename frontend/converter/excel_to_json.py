import sys
import os
import json
import pandas as pd

# ============================
# 參數
# ============================

if len(sys.argv) != 3:
    print("使用方式：python excel_to_json.py <excel檔案> <年份>")
    sys.exit(1)

excel_path = sys.argv[1]
year_code = sys.argv[2]

# demand_yearly.json 位置（依你專案結構調整）
output_json_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "src",
    "data",
    "demand_yearly.json"
)

# ============================
# 讀取 Excel
# ============================

print(f"讀取 Excel：{excel_path}")
df = pd.read_excel(excel_path, sheet_name=0)

# 移除前兩行雙語標題
df = df[df["項目"].notna()].copy()

# 只保留 D 開頭（需求）
df = df[df["項目"].astype(str).str.startswith("D")]

# ============================
# 抽取 S54 (Total)
# ============================

year_data = {}

for _, row in df.iterrows():
    code = row["項目"]
    value = row["S54"]

    if pd.notna(value):
        year_data[code] = float(value)

print(f"抓到 {len(year_data)} 個需求項目")

# ============================
# 合併進 demand_yearly.json
# ============================

if os.path.exists(output_json_path):
    with open(output_json_path, "r", encoding="utf-8") as f:
        all_data = json.load(f)
else:
    all_data = {}

all_data[year_code] = year_data

with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print(f"已成功更新 {output_json_path}")