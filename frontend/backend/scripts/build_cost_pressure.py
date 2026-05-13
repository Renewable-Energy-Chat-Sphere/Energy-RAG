import json
import os

# =========================
# 🔥 路徑設定
# =========================

BASE_DIR = os.path.dirname(__file__)

DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../src/data"))

# =========================
# 🔥 讀取成本對照表
# =========================

with open(
    os.path.join(DATA_DIR, "energy_cost_mapping.json"), "r", encoding="utf-8"
) as f:

    cost_map = json.load(f)

# =========================
# 🔥 結果
# =========================

results = []

# =========================
# 🔥 跑 80~113 年
# =========================

for year in range(80, 114):

    print(f"🔥 處理 {year} 年")

    file_path = os.path.join(DATA_DIR, f"{year}_energy_demand_supply.json")

    # 檔案不存在就跳過
    if not os.path.exists(file_path):
        print("❌ 找不到檔案")
        continue

    # =========================
    # 🔥 讀取資料
    # =========================

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # =========================
    # 🔥 統計供給總量
    # =========================

    supply_totals = {}

    for demand_data in data.values():

        for supply_code, value in demand_data.items():

            # 只算 S 開頭
            if not supply_code.startswith("S"):
                continue

            # 避免空值
            try:
                value = float(value)
            except:
                value = 0

            if supply_code not in supply_totals:
                supply_totals[supply_code] = 0

            supply_totals[supply_code] += value

    # =========================
    # 🔥 計算成本壓力
    # =========================

    total_energy = 0
    total_cost = 0

    for supply_code, amount in supply_totals.items():

        mapping = cost_map.get(supply_code)

        # 找不到成本模型就跳過
        if not mapping:
            continue

        lcoe = mapping.get("lcoe", 1)

        total_energy += amount

        total_cost += amount * lcoe

    # =========================
    # 🔥 平均成本壓力
    # =========================

    if total_energy == 0:
        cost_pressure = 0
    else:
        cost_pressure = round((total_cost / total_energy) * 50, 2)

    # =========================
    # 🔥 存結果
    # =========================

    results.append({"year": year, "costPressure": cost_pressure})

    print(f"✅ {year} 年成本壓力 = {cost_pressure}")

# =========================
# 🔥 輸出 JSON
# =========================

output_path = os.path.join(DATA_DIR, "historical_cost_pressure.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\n🔥 historical_cost_pressure.json 建立完成")
