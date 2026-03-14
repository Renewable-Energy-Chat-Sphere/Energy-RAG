import json
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")

ITERATIONS = 1200
LR = 0.03

SIM_WEIGHT = 0.25
REPULSION = 0.05
MIN_DIST = 0.35


# =========================
# 讀取 distance matrix
# =========================

files = [f for f in os.listdir(DATA_DIR) if "energy_euclidean_distance" in f]

matrices = []

for f in files:

    with open(os.path.join(DATA_DIR, f), "r", encoding="utf-8") as file:
        data = json.load(file)

        supply = data["Supply"]

        keys = sorted(supply.keys(), key=lambda x: int(x[1:]))

        matrix = np.array([
            [supply[i].get(j, 0) for j in keys]
            for i in keys
        ])

        matrices.append(matrix)

dist_matrix = np.mean(matrices, axis=0)

N = len(keys)

print("Loaded years:", len(matrices))
print("Supply nodes:", N)


# =========================
# Fibonacci sphere seed
# =========================

points = np.zeros((N,3))

phi = np.pi * (3 - np.sqrt(5))

for i in range(N):

    y = 1 - (i/(N-1))*2
    r = np.sqrt(1-y*y)

    theta = phi*i

    x = np.cos(theta)*r
    z = np.sin(theta)*r

    points[i] = [x,y,z]


# =========================
# Force layout optimization
# =========================

for step in range(ITERATIONS):

    forces = np.zeros((N,3))

    for i in range(N):

        for j in range(i+1,N):

            diff = points[i] - points[j]
            dist = np.linalg.norm(diff)+1e-6

            direction = diff/dist

            target = dist_matrix[i][j]

            sim_force = SIM_WEIGHT*(dist-target)*direction
            rep_force = REPULSION*(direction/(dist*dist))

            min_force = np.zeros(3)

            if dist < MIN_DIST:
                min_force = 0.2*(MIN_DIST-dist)*direction

            total = sim_force + rep_force + min_force

            forces[i] += total
            forces[j] -= total

    points += LR*forces

    points /= np.linalg.norm(points,axis=1)[:,None]

    if step%200==0:
        print("iteration",step)


print("Supply optimization done")


# =========================
# 輸出 supply layout
# =========================

supply_layout = {}

for i,k in enumerate(keys):

    supply_layout[k] = {
        "x":float(points[i][0]),
        "y":float(points[i][1]),
        "z":float(points[i][2])
    }

with open(os.path.join(DATA_DIR,"supply_layout.json"),"w",encoding="utf-8") as f:
    json.dump(supply_layout,f,indent=2)

print("Saved supply_layout.json")


# =========================
# 讀需求資料 (113年範例)
# =========================

ratio_file = os.path.join(DATA_DIR,"113_energy_ratio.json")

if not os.path.exists(ratio_file):

    print("No demand ratio file found")
    exit()

with open(ratio_file,"r",encoding="utf-8") as f:
    demand_data = json.load(f)


# =========================
# Demand barycenter
# =========================

supply_vec = {
    k: np.array([v["x"],v["y"],v["z"]])
    for k,v in supply_layout.items()
}

demand_layout = {}

for demand, supplies in demand_data.items():

    total = 0
    pos = np.zeros(3)

    for s,w in supplies.items():

        if s not in supply_vec:
            continue

        pos += supply_vec[s]*w
        total += w

    if total == 0:
        continue

    pos /= total
    pos /= np.linalg.norm(pos)

    demand_layout[demand] = {
        "x":float(pos[0]),
        "y":float(pos[1]),
        "z":float(pos[2])
    }


with open(os.path.join(DATA_DIR,"demand_layout.json"),"w",encoding="utf-8") as f:
    json.dump(demand_layout,f,indent=2)

print("Saved demand_layout.json")