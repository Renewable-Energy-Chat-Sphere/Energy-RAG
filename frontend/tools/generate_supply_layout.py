import json
import numpy as np
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")

# =========================================================
# Parameters
# =========================================================

ITERATIONS = 1000
LR = 0.03

# =========================================================
# Supply Layout
# =========================================================

SIM_WEIGHT = 0.12
REPULSION = 0.08
MIN_DIST = 0.26
ANCHOR_FORCE = 0.05

# =========================================================
# Demand Layout
# =========================================================

DEMAND_OFFSET = 0.22

# =========================================================
# Orbit Spread
# =========================================================

ORBIT_STRENGTH = 0.045

# =========================================================
# Demand Collision
# =========================================================

MIN_DEMAND_DIST = 0.14
DEMAND_PUSH = 0.5

# =========================================================
# Extract Year
# =========================================================

def extract_year(filename):

    match = re.match(
        r"(\d+)_energy_euclidean_distance\.json",
        filename
    )

    return int(match.group(1)) if match else 0


# =========================================================
# Files
# =========================================================

files = [

    f for f in os.listdir(DATA_DIR)

    if "energy_euclidean_distance" in f

]

files.sort(key=extract_year)

print("Processing files:", files)

prev_points = None


# =========================================================
# Main Loop
# =========================================================

for filename in files:

    year = extract_year(filename)

    print("\n====================================")
    print(f"Processing Year {year}")
    print("====================================")

    # =====================================================
    # Load Distance Matrix
    # =====================================================

    with open(
        os.path.join(DATA_DIR, filename),
        "r",
        encoding="utf-8"
    ) as f:

        data = json.load(f)

    supply = data["Supply"]

    keys = sorted(
        supply.keys(),
        key=lambda x: int(x[1:])
    )

    dist_matrix = np.array([

        [supply[i].get(j, 0) for j in keys]

        for i in keys

    ])

    N = len(keys)

    print("Supply Nodes:", N)

    # =====================================================
    # Fibonacci Sphere Initialization
    # =====================================================

    if prev_points is None or len(prev_points) != N:

        print("Using Fibonacci Sphere")

        points = np.zeros((N, 3))

        phi = np.pi * (3 - np.sqrt(5))

        for i in range(N):

            y = 1 - (i / (N - 1)) * 2

            r = np.sqrt(1 - y * y)

            theta = phi * i

            x = np.cos(theta) * r
            z = np.sin(theta) * r

            points[i] = [x, y, z]

    else:

        print("Using Previous Year")

        noise = np.random.normal(
            0,
            0.01,
            prev_points.shape
        )

        points = prev_points + noise

        points /= np.linalg.norm(
            points,
            axis=1
        )[:, None]

    # =====================================================
    # Anchor Points
    # =====================================================

    anchor_points = points.copy()

    # =====================================================
    # Supply Optimization
    # =====================================================

    print("Optimizing Supply Layout...")

    for step in range(ITERATIONS):

        forces = np.zeros((N, 3))

        for i in range(N):

            for j in range(i + 1, N):

                diff = points[i] - points[j]

                dist = np.linalg.norm(diff) + 1e-6

                direction = diff / dist

                # =============================================
                # Similarity
                # =============================================

                similarity = 1 - dist_matrix[i][j]

                # =============================================
                # Semantic Target Distance
                # =============================================

                target = 0.34 - (similarity * 0.12)

                # =============================================
                # Semantic Attraction
                # =============================================

                sim_force = (

                    SIM_WEIGHT
                    * (dist - target)
                    * direction

                )

                # =============================================
                # Repulsion
                # =============================================

                rep_force = (

                    REPULSION
                    * (direction / (dist * dist))

                )

                # =============================================
                # Minimum Distance
                # =============================================

                min_force = np.zeros(3)

                if dist < MIN_DIST:

                    min_force = (

                        0.12
                        * (MIN_DIST - dist)
                        * direction

                    )

                # =============================================
                # Total Force
                # =============================================

                total = (
                    sim_force
                    + rep_force
                    + min_force
                )

                forces[i] += total
                forces[j] -= total

        # =================================================
        # Anchor Force
        # =================================================

        for i in range(N):

            anchor_force = (

                ANCHOR_FORCE
                * (anchor_points[i] - points[i])

            )

            forces[i] += anchor_force

        # =================================================
        # Update
        # =================================================

        points += LR * forces

        # =================================================
        # Project Back To Sphere
        # =================================================

        points /= np.linalg.norm(
            points,
            axis=1
        )[:, None]

        if step % 250 == 0:

            print(f"  iteration {step}")

    print("Supply optimization done")

    # =====================================================
    # Supply Collision Resolve
    # =====================================================

    s_keys = list(range(N))

    for _ in range(120):

        moved = False

        for i in range(N):

            for j in range(i + 1, N):

                a = points[i]
                b = points[j]

                diff = a - b

                dist = np.linalg.norm(diff) + 1e-6

                if dist < MIN_DIST:

                    direction = diff / dist

                    push = (
                        (MIN_DIST - dist)
                        * 0.5
                    )

                    a += direction * push
                    b -= direction * push

                    a /= np.linalg.norm(a)
                    b /= np.linalg.norm(b)

                    points[i] = a
                    points[j] = b

                    moved = True

        if not moved:
            break

    # =====================================================
    # Save Supply Layout
    # =====================================================

    supply_layout = {}

    for i, k in enumerate(keys):

        supply_layout[k] = {

            "x": float(points[i][0]),
            "y": float(points[i][1]),
            "z": float(points[i][2])

        }

    supply_path = os.path.join(
        DATA_DIR,
        f"supply_layout_{year}.json"
    )

    with open(
        supply_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            supply_layout,
            f,
            indent=2
        )

    print("Saved:", supply_path)

    # =====================================================
    # Demand Layout
    # =====================================================

    demand_file = os.path.join(
        DATA_DIR,
        f"{year}_energy_demand_supply.json"
    )

    if not os.path.exists(demand_file):

        print("❌ Demand file not found")
        continue

    with open(
        demand_file,
        "r",
        encoding="utf-8"
    ) as f:

        demand_data = json.load(f)

    # =====================================================
    # Supply Vectors
    # =====================================================

    supply_vec = {

        k: np.array([
            v["x"],
            v["y"],
            v["z"]
        ])

        for k, v in supply_layout.items()

    }

    demand_layout = {}

    print("Generating Ordered Demand Layout...")

    # =====================================================
    # Ordered Dependency Placement
    # =====================================================

    for demand, supplies in demand_data.items():

        sorted_supplies = sorted(

            supplies.items(),

            key=lambda x: x[1],

            reverse=True

        )

        if len(sorted_supplies) == 0:
            continue

        # =============================================
        # Main Supply
        # =============================================

        main_supply = sorted_supplies[0][0]

        if main_supply not in supply_vec:
            continue

        main_pos = supply_vec[main_supply]

        # =============================================
        # Minor Supply Offset
        # =============================================

        offset = np.zeros(3)

        for idx, (s, w) in enumerate(sorted_supplies[1:]):

            if s not in supply_vec:
                continue

            influence = (

                (w / 100.0)
                * (0.55 / (idx + 1))

            )

            direction = supply_vec[s] - main_pos

            offset += direction * influence

        # =============================================
        # Base Position
        # =============================================

        base_pos = main_pos + (offset * DEMAND_OFFSET)

        # =============================================
        # Orbit Spread
        # =============================================

        angle = (
            (hash(demand) % 360)
            * np.pi / 180
        )

        tangent = np.cross(
            main_pos,
            np.array([0, 1, 0])
        )

        if np.linalg.norm(tangent) < 1e-6:

            tangent = np.cross(
                main_pos,
                np.array([1, 0, 0])
            )

        tangent /= np.linalg.norm(tangent)

        bitangent = np.cross(
            main_pos,
            tangent
        )

        bitangent /= np.linalg.norm(bitangent)

        orbit_dir = (

            np.cos(angle) * tangent
            + np.sin(angle) * bitangent

        )

        # =============================================
        # Final Position
        # =============================================

        pos = base_pos + orbit_dir * ORBIT_STRENGTH

        pos /= np.linalg.norm(pos)

        demand_layout[demand] = pos

    # =====================================================
    # Demand Collision Resolve
    # =====================================================

    d_keys = list(demand_layout.keys())

    for _ in range(120):

        moved = False

        for i in range(len(d_keys)):

            for j in range(i + 1, len(d_keys)):

                k1 = d_keys[i]
                k2 = d_keys[j]

                a = demand_layout[k1]
                b = demand_layout[k2]

                diff = a - b

                dist = np.linalg.norm(diff) + 1e-6

                if dist < MIN_DEMAND_DIST:

                    direction = diff / dist

                    push = (
                        (MIN_DEMAND_DIST - dist)
                        * DEMAND_PUSH
                    )

                    a += direction * push
                    b -= direction * push

                    a /= np.linalg.norm(a)
                    b /= np.linalg.norm(b)

                    demand_layout[k1] = a
                    demand_layout[k2] = b

                    moved = True

        if not moved:
            break

    # =====================================================
    # Save Demand Layout
    # =====================================================

    output = {}

    for k, v in demand_layout.items():

        output[k] = {

            "x": float(v[0]),
            "y": float(v[1]),
            "z": float(v[2])

        }

    demand_path = os.path.join(
        DATA_DIR,
        f"demand_layout_{year}.json"
    )

    with open(
        demand_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            output,
            f,
            indent=2
        )

    print("Saved:", demand_path)

    # =====================================================
    # Next Year Seed
    # =====================================================

    prev_points = points.copy()

print("\n✅ All Years Completed")