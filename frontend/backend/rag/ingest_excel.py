import pandas as pd
import json

file_path = "../data/excel/85_energy_ratio.xlsx"
df = pd.read_excel(file_path, sheet_name="總比例換算")

# ===== 取能源名稱（第1列） =====
energy_names = df.iloc[0, 2:]   # S1 ~ S54 中文
energy_codes = df.columns[2:]   # S1 ~ S54

records = []

for i in range(2, len(df)):  # 從 D1 開始
    row = df.iloc[i]

    demand_code = row.iloc[0]
    demand_name = row.iloc[1]

    # 跳過空行
    if pd.isna(demand_code):
        continue

    for j, supply_code in enumerate(energy_codes):
        value = row.iloc[j + 2]

        # 跳過 0 或空值（很重要）
        if pd.isna(value) or value == 0:
            continue

        supply_name = energy_names[j]

        text = (
            f"113年，{demand_name}（代碼 {demand_code}）"
            f"使用的能源為{supply_name}（代碼 {supply_code}），"
            f"比例為{value}。"
        )

        records.append({
            "text": text,
            "type": "excel",
            "year": 113,
            "demand_code": demand_code,
            "demand_name": demand_name,
            "supply_code": supply_code,
            "supply_name": supply_name,
            "value": float(value)
        })

# 存成 JSON
with open("energy_rag_ready.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"共轉換 {len(records)} 筆資料")