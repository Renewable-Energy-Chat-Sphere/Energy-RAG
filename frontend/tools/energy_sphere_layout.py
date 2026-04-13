import json
import numpy as np
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")

ITERATIONS = 1200
LR = 0.03

SIM_WEIGHT = 0.25
REPULSION = 0.05
MIN_DIST = 0.35

DEMAND_REPULSION = 0.15
DEMAND_MIN_DIST = 0.12


# =========================
# 取得年份
# =========================

def extract_year(filename):
    match = re.match(r"(\d+)_energy_euclidean_distance\.json", filename)
    return int(match.group(1)) if match else 0


files = [f for f in os.listdir(DATA_DIR) if "energy_euclidean_distance" in f]
files.sort(key=extract_year)

print("Processing files:", files)


prev_points = None


# =========================
# 主迴圈（每年）
# =========================

for filename in files:

    year = extract_year(filename)

    print(f"\n=== {year} 年 ===")

    # =========================
    # Load distance
    # =========================

    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
        data = json.load(f)

    supply = data["Supply"]

    keys = sorted(supply.keys(), key=lambda x: int(x[1:]))

    dist_matrix = np.array([
        [supply[i].get(j, 0) for j in keys]
        for i in keys
    ])

    N = len(keys)

    # =========================
    # 初始化位置
    # =========================

    if prev_points is None:
        print("  使用 Fibonacci 初始球")

        points = np.zeros((N, 3))
        phi = np.pi * (3 - np.sqrt(5))

        for i in range(N):
            y = 1 - (i/(N-1))*2
            r = np.sqrt(1-y*y)
            theta = phi*i
            x = np.cos(theta)*r
            z = np.sin(theta)*r
            points[i] = [x, y, z]

    else:
        print("  使用上一年結果")

        noise = np.random.normal(0, 0.01, prev_points.shape)
        points = prev_points + noise
        points /= np.linalg.norm(points, axis=1)[:, None]

    # =========================
    # 優化
    # =========================

    for step in range(ITERATIONS):

        forces = np.zeros((N, 3))

        for i in range(N):
            for j in range(i+1, N):

                diff = points[i] - points[j]
                dist = np.linalg.norm(diff) + 1e-6
                direction = diff/dist

                target = dist_matrix[i][j]

                sim_force = SIM_WEIGHT * (dist-target) * direction
                rep_force = REPULSION * (direction/(dist*dist))

                min_force = np.zeros(3)
                if dist < MIN_DIST:
                    min_force = 0.2*(MIN_DIST-dist)*direction

                total = sim_force + rep_force + min_force

                forces[i] += total
                forces[j] -= total

        points += LR * forces
        points /= np.linalg.norm(points, axis=1)[:, None]

        if step % 300 == 0:
            print("  iteration", step)

    print("  Supply optimization done")

    # =========================
    # 存 supply
    # =========================

    supply_layout = {}

    for i, k in enumerate(keys):
        supply_layout[k] = {
            "x": float(points[i][0]),
            "y": float(points[i][1]),
            "z": float(points[i][2])
        }

    supply_path = os.path.join(DATA_DIR, f"supply_layout_{year}.json")

    with open(supply_path, "w", encoding="utf-8") as f:
        json.dump(supply_layout, f, indent=2)

    print("  Saved", supply_path)

    # =========================
    # Demand（同年）
    # =========================

    demand_file = os.path.join(DATA_DIR, f"{year}_energy_demand_supply.json")

    if not os.path.exists(demand_file):
        print("  ❌ 找不到 demand data")
        continue

    with open(demand_file, "r", encoding="utf-8") as f:
        demand_data = json.load(f)

    supply_vec = {
        k: np.array([v["x"], v["y"], v["z"]])
        for k, v in supply_layout.items()
    }

    demand_layout = {}

    for demand, supplies in demand_data.items():

        pos = np.zeros(3)
        total = 0

        for s, w in supplies.items():

            if s not in supply_vec:
                continue

            weight = w ** 1.5
            pos += supply_vec[s] * weight
            total += weight

        if total == 0:
            continue

        pos /= total
        pos /= np.linalg.norm(pos)

        demand_layout[demand] = pos

    # =========================
    # collision
    # =========================

    d_keys = list(demand_layout.keys())

    for _ in range(80):
        for i in range(len(d_keys)):
            for j in range(i+1, len(d_keys)):

                a = demand_layout[d_keys[i]]
                b = demand_layout[d_keys[j]]

                diff = a - b
                dist = np.linalg.norm(diff) + 1e-6

                if dist < DEMAND_MIN_DIST:

                    direction = diff/dist
                    move = DEMAND_REPULSION * (DEMAND_MIN_DIST - dist)

                    a += direction * move
                    b -= direction * move

                    a /= np.linalg.norm(a)
                    b /= np.linalg.norm(b)

                    demand_layout[d_keys[i]] = a
                    demand_layout[d_keys[j]] = b

    # =========================
    # 存 demand
    # =========================

    output = {}

    for k, v in demand_layout.items():
        output[k] = {
            "x": float(v[0]),
            "y": float(v[1]),
            "z": float(v[2])
        }

    demand_path = os.path.join(DATA_DIR, f"demand_layout_{year}.json")

    with open(demand_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("  Saved", demand_path)

    prev_points = points.copy()


print("\n全部年份完成 ✅")