import json
import os
import re
import numpy as np

# =========================
# 📂 固定路徑（你指定的）
# =========================
DATA_DIR = r"C:\xampp\htdocs\Web\Energy-RAG\frontend\src\data"


# =========================
# 📅 取年份
# =========================
def extract_year(filename):
    match = re.search(r"(\d{2,3})", filename)
    return match.group(1) if match else None


# =========================
# 🔥 核心：算 distance
# =========================
def build_distance(demand_data):

    supply_set = set()
    for d in demand_data.values():
        supply_set.update(d.keys())

    supplies = sorted(supply_set, key=lambda x: int(x[1:]))

    N = len(supplies)

    co_matrix = np.zeros((N, N))

    for d, s_dict in demand_data.items():
        used = set(s_dict.keys())

        for i in range(N):
            for j in range(i, N):
                if supplies[i] in used and supplies[j] in used:
                    co_matrix[i][j] += 1
                    co_matrix[j][i] += 1

    max_val = np.max(co_matrix)
    if max_val == 0:
        max_val = 1

    sim_matrix = co_matrix / max_val
    dist_matrix = 1 - sim_matrix

    result = {}

    for i, s1 in enumerate(supplies):
        result[s1] = {}
        for j, s2 in enumerate(supplies):
            result[s1][s2] = round(float(dist_matrix[i][j]), 4)

    return result


# =========================
# 🚀 主程式（多年份）
# =========================
if __name__ == "__main__":

    files = [
        f for f in os.listdir(DATA_DIR)
        if "energy_demand_supply" in f
    ]

    files.sort(key=extract_year)

    print("📂 找到檔案：", files)

    for file in files:

        year = extract_year(file)
        if not year:
            continue

        print(f"\n📘 處理 {year} 年")

        path = os.path.join(DATA_DIR, file)

        with open(path, "r", encoding="utf-8") as f:
            demand_data = json.load(f)

        dist = build_distance(demand_data)

        output = {
            "Supply": dist
        }

        out_path = os.path.join(
            DATA_DIR,
            f"{year}_energy_euclidean_distance.json"
        )

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)

        print(f"✅ 完成：{out_path}")

    print("\n🎉 全部年份完成！")