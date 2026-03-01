import * as THREE from "three";

/* ============================================================
   面積分配（🔥 最小保障版）
============================================================ */

function allocateFaces(totalFaces, nodes) {
  // 1️⃣ 先用 floor
  let allocations = nodes.map(node =>
    Math.floor(totalFaces * node.normalizedValue)
  );

  // 2️⃣ 保證最小 1 face（只要比例 > 0）
  allocations = allocations.map((v, i) => {
    if (nodes[i].normalizedValue > 0 && v === 0) return 1;
    return v;
  });

  // 3️⃣ 修正總面數
  let diff = totalFaces - allocations.reduce((s, v) => s + v, 0);

  const sorted = nodes
    .map((n, i) => ({ i, val: n.normalizedValue }))
    .sort((a, b) => b.val - a.val);

  // 面數過多 → 從最大比例扣
  while (diff < 0) {
    for (let s of sorted) {
      if (allocations[s.i] > 1) {
        allocations[s.i]--;
        diff++;
        if (diff === 0) break;
      }
    }
  }

  // 面數不足 → 補給最大比例
  while (diff > 0) {
    for (let s of sorted) {
      allocations[s.i]++;
      diff--;
      if (diff === 0) break;
    }
  }

  return allocations;
}

/* ============================================================
   LEVEL 1
============================================================ */

export function generateDepartmentSphere(
  nodes,
  radius = 3,
  detail = 6,
  distanceMatrix = null
) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  geometry.computeVertexNormals();

  const position = geometry.attributes.position;
  const faceCount = position.count / 3;

  const faces = [];

  for (let i = 0; i < faceCount; i++) {
    const v1 = new THREE.Vector3().fromBufferAttribute(position, i * 3);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
    const v3 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);

    const center = new THREE.Vector3()
      .add(v1)
      .add(v2)
      .add(v3)
      .divideScalar(3)
      .normalize();

    faces.push({
      index: i,
      center,
      neighbors: [],
      assigned: null
    });
  }

  // 建立鄰居
  for (let i = 0; i < faceCount; i++) {
    for (let j = i + 1; j < faceCount; j++) {
      if (shareEdge(position, i, j)) {
        faces[i].neighbors.push(j);
        faces[j].neighbors.push(i);
      }
    }
  }

  const totalFaces = faces.length;

  const allocations = allocateFaces(totalFaces, nodes);

  const queues = [];
  const remaining = [...allocations];

  // 依面積排序（大先長）
  const sorted = nodes
    .map((n, i) => ({ ...n, index: i }))
    .sort((a, b) => b.normalizedValue - a.normalizedValue);

  const seeds = generateFibonacciSphere(nodes.length);

  sorted.forEach((node, orderIdx) => {
    const idx = node.index;
    const seedDir = seeds[orderIdx];

    let min = Infinity;
    let chosen = -1;

    faces.forEach(face => {
      if (face.assigned !== null) return;
      const d = face.center.distanceTo(seedDir);
      if (d < min) {
        min = d;
        chosen = face.index;
      }
    });

    if (chosen !== -1) {
      faces[chosen].assigned = idx;
      remaining[idx]--;
      queues[idx] = [chosen];
    } else {
      queues[idx] = [];
    }
  });

  growRegions(faces, queues, remaining);

  return buildRegions(nodes, faces, position);
}

/* ============================================================
   LEVEL 2（在 parent 內生成）
============================================================ */

export function generateLevel2WithinParent(
  parentRegion,
  childNodes
) {
  const parentFaces = parentRegion.faces;

  const faceMap = {};
  parentFaces.forEach(f => {
    faceMap[f.index] = {
      index: f.index,
      center: f.center,
      neighbors: [],
      assigned: null
    };
  });

  parentFaces.forEach(f => {
    f.neighbors.forEach(n => {
      if (faceMap[n]) {
        faceMap[f.index].neighbors.push(n);
      }
    });
  });

  const faceList = Object.values(faceMap);
  const totalFaces = faceList.length;

  const allocations = allocateFaces(totalFaces, childNodes);

  const queues = [];
  const remaining = [...allocations];

  const sorted = childNodes
    .map((n, i) => ({ ...n, index: i }))
    .sort((a, b) => b.normalizedValue - a.normalizedValue);

  sorted.forEach((node, orderIdx) => {
    const idx = node.index;

    let min = Infinity;
    let chosen = null;

    faceList.forEach(face => {
      if (face.assigned !== null) return;

      const d = face.center.length();
      if (d < min) {
        min = d;
        chosen = face;
      }
    });

    if (chosen) {
      chosen.assigned = idx;
      remaining[idx]--;
      queues[idx] = [chosen.index];
    } else {
      queues[idx] = [];
    }
  });

  growRegionsLevel2(faceMap, queues, remaining);

  return childNodes.map((node, idx) => ({
    id: node.id,
    name: node.name,
    faces: faceList.filter(f => f.assigned === idx)
  }));
}

/* ============================================================
   BFS
============================================================ */

function growRegions(faces, queues, remaining) {
  let growing = true;

  while (growing) {
    growing = false;

    for (let r = 0; r < queues.length; r++) {
      if (remaining[r] <= 0) continue;

      const queue = queues[r];
      const nextQueue = [];

      while (queue.length && remaining[r] > 0) {
        const current = queue.shift();

        faces[current].neighbors.forEach(n => {
          if (faces[n].assigned === null) {
            faces[n].assigned = r;
            remaining[r]--;
            nextQueue.push(n);
          }
        });
      }

      if (nextQueue.length) {
        queues[r] = nextQueue;
        growing = true;
      }
    }
  }
}

function growRegionsLevel2(faceMap, queues, remaining) {
  let growing = true;

  while (growing) {
    growing = false;

    for (let r = 0; r < queues.length; r++) {
      if (remaining[r] <= 0) continue;

      const queue = queues[r];
      const nextQueue = [];

      while (queue.length && remaining[r] > 0) {
        const currentIdx = queue.shift();
        const current = faceMap[currentIdx];

        current.neighbors.forEach(nIdx => {
          const neighbor = faceMap[nIdx];
          if (neighbor && neighbor.assigned === null) {
            neighbor.assigned = r;
            remaining[r]--;
            nextQueue.push(nIdx);
          }
        });
      }

      if (nextQueue.length) {
        queues[r] = nextQueue;
        growing = true;
      }
    }
  }
}

/* ============================================================
   工具
============================================================ */

function buildRegions(nodes, faces, position) {
  return nodes.map((node, idx) => {
    const regionFaces = faces.filter(f => f.assigned === idx);
    const vertices = [];

    regionFaces.forEach(face => {
      const i = face.index;
      const v1 = new THREE.Vector3().fromBufferAttribute(position, i * 3);
      const v2 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
      const v3 = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);
      vertices.push(...v1.toArray(), ...v2.toArray(), ...v3.toArray());
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geo.computeVertexNormals();

    return {
      id: node.id,
      name: node.name,
      geometry: geo,
      faces: regionFaces
    };
  });
}

function shareEdge(position, i, j) {
  const vertsI = [
    getVertex(position, i, 0),
    getVertex(position, i, 1),
    getVertex(position, i, 2)
  ];
  const vertsJ = [
    getVertex(position, j, 0),
    getVertex(position, j, 1),
    getVertex(position, j, 2)
  ];

  let shared = 0;
  vertsI.forEach(v1 => {
    vertsJ.forEach(v2 => {
      if (v1.distanceTo(v2) < 1e-5) shared++;
    });
  });

  return shared >= 2;
}

function getVertex(position, faceIndex, vertexOffset) {
  return new THREE.Vector3().fromBufferAttribute(
    position,
    faceIndex * 3 + vertexOffset
  );
}

function generateFibonacciSphere(samples) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    points.push(new THREE.Vector3(x, y, z).normalize());
  }

  return points;
}