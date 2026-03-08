import json
import numpy as np
import os

DATA_DIR = "../src/data"

ITERATIONS = 1500
LR = 0.03

# 控制力
SIM_WEIGHT = 0.2
REPULSION = 0.05
MIN_DIST = 0.35


# =========================
# 讀取 distance
# =========================

files = [f for f in os.listdir(DATA_DIR) if "energy_euclidean_distance" in f]

matrices = []

for f in files:

    with open(os.path.join(DATA_DIR, f), "r", encoding="utf-8") as file:
        data = json.load(file)

        supply = data["Supply"]

        keys = sorted(supply.keys())

        matrix = np.array([
            [supply[i].get(j, 0) for j in keys]
            for i in keys
        ])

        matrices.append(matrix)

dist_matrix = np.mean(matrices, axis=0)

N = len(keys)

print("Loaded", len(matrices), "years")
print("Nodes:", N)


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
# layout optimization
# =========================

for step in range(ITERATIONS):

    forces = np.zeros((N,3))

    for i in range(N):

        for j in range(i+1,N):

            diff = points[i] - points[j]
            dist = np.linalg.norm(diff)+1e-6

            direction = diff/dist

            # 相似度吸引
            target = dist_matrix[i][j]
            sim_force = SIM_WEIGHT*(dist-target)*direction

            # 基本排斥
            rep_force = REPULSION*(direction/(dist*dist))

            # 最小距離限制
            min_force = np.zeros(3)
            if dist < MIN_DIST:
                min_force = 0.2*(MIN_DIST-dist)*direction

            total = sim_force + rep_force + min_force

            forces[i] += total
            forces[j] -= total

    points += LR*forces

    # 投影回球面
    points /= np.linalg.norm(points,axis=1)[:,None]

    if step%200==0:
        print("iteration",step)


print("Optimization done")


# =========================
# output
# =========================

layout = {}

for i,k in enumerate(keys):

    layout[k] = {
        "x":float(points[i][0]),
        "y":float(points[i][1]),
        "z":float(points[i][2])
    }

with open(os.path.join(DATA_DIR,"supply_layout.json"),"w",encoding="utf-8") as f:
    json.dump(layout,f,indent=2)

print("Saved to supply_layout.json")