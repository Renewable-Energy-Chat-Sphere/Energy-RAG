import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import hierarchy from "../data/hierarchy.json";

const RADIUS = 2;
const LON_DIV = 24;
const LAT_DIV = 12;
const TOTAL = LON_DIV * LAT_DIV;

/* ===== 113 Level1 ===== */
const data113 = {
  D2: 4.94,
  D50: 3.19,
  D40: 1.27,
  D68: 0.81,
  D47: 0.39,
};

const colors = {
  D2: "#60a5fa",
  D50: "#34d399",
  D40: "#f59e0b",
  D68: "#f472b6",
  D47: "#a78bfa",
};

/* ========================= */
/* LOD 控制 */
/* ========================= */

function useLOD() {
  const { camera } = useThree();
  const [lod, setLod] = useState(1);

  useFrame(() => {
    const d = camera.position.length();
    if (d > 5) setLod(1);
    else setLod(2);
  });

  return lod;
}

/* ========================= */
/* 鄰居工具 */
/* ========================= */

function getNeighbors(i) {
  const x = i % LON_DIV;
  const y = Math.floor(i / LON_DIV);

  const list = [
    { x: (x + 1) % LON_DIV, y },
    { x: (x - 1 + LON_DIV) % LON_DIV, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];

  const result = [];

  for (let n of list) {
    if (n.y >= 0 && n.y < LAT_DIV) {
      result.push(n.y * LON_DIV + n.x);
    }
  }

  return result;
}

/* ========================= */
/* Level1 分配邏輯（不動） */
/* ========================= */

function generateRegions() {
  const grid = new Array(TOTAL).fill(null);

  const totalValue = Object.values(data113).reduce((a, b) => a + b, 0);

  let depts = Object.entries(data113).map(([key, value]) => ({
    key,
    value,
    quota: Math.round((value / totalValue) * TOTAL),
  }));

  let sum = depts.reduce((a, b) => a + b.quota, 0);
  depts[0].quota += TOTAL - sum;

  depts.sort((a, b) => a.value - b.value);

  const largest = depts.pop();
  const smallFour = depts;

  const seeds = [
    10 * LON_DIV + 12, // 北
    1 * LON_DIV + 12,  // 南
    6 * LON_DIV + 21,  // 東
    6 * LON_DIV + 2,   // 西
  ];

  smallFour.forEach((dept, idx) => {
    const seed = seeds[idx];
    grid[seed] = dept.key;
    dept.quota--;

    let frontier = new Set([seed]);

    while (dept.quota > 0) {
      const newFrontier = new Set();

      for (let cell of frontier) {
        for (let n of getNeighbors(cell)) {
          if (grid[n] === null && dept.quota > 0) {
            grid[n] = dept.key;
            dept.quota--;
            newFrontier.add(n);
          }
        }
      }

      if (newFrontier.size === 0) break;
      frontier = newFrontier;
    }
  });

  for (let i = 0; i < TOTAL; i++) {
    if (grid[i] === null) {
      grid[i] = largest.key;
    }
  }

  return grid;
}

/* ========================= */
/* 球面 patch */
/* ========================= */

function lonLatToVec3(lon, lat, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createPatch(lon1, lon2, lat1, lat2) {
  const geometry = new THREE.BufferGeometry();

  const v1 = lonLatToVec3(lon1, lat1, RADIUS);
  const v2 = lonLatToVec3(lon2, lat1, RADIUS);
  const v3 = lonLatToVec3(lon2, lat2, RADIUS);
  const v4 = lonLatToVec3(lon1, lat2, RADIUS);

  const vertices = new Float32Array([
    ...v1.toArray(),
    ...v2.toArray(),
    ...v3.toArray(),
    ...v1.toArray(),
    ...v3.toArray(),
    ...v4.toArray(),
  ]);

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/* ========================= */
/* 渲染 */
/* ========================= */

function GridSphere() {
  const lod = useLOD();
  const grid = useMemo(() => generateRegions(), []);

  const lonStep = 360 / LON_DIV;
  const latStep = 180 / LAT_DIV;

  const tiles = [];

  for (let i = 0; i < LON_DIV; i++) {
    for (let j = 0; j < LAT_DIV; j++) {
      const idx = j * LON_DIV + i;
      const key = grid[idx];

      const lon1 = -180 + i * lonStep;
      const lon2 = lon1 + lonStep;
      const lat1 = -90 + j * latStep;
      const lat2 = lat1 + latStep;

      const hasLevel2 =
        hierarchy[key] && hierarchy[key].children;

      if (lod === 1 || !hasLevel2) {
        // LOD1 或沒有 Level2 → 保持原格
        tiles.push(
          <mesh key={`${i}-${j}`} geometry={createPatch(lon1, lon2, lat1, lat2)}>
            <meshPhysicalMaterial
              color={colors[key]}
              roughness={0.35}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.1}
              transparent
              opacity={0.95}
            />
          </mesh>
        );
      } else {
        // LOD2 → 細分 2x2
        const lonMid = (lon1 + lon2) / 2;
        const latMid = (lat1 + lat2) / 2;

        const parts = [
          [lon1, lonMid, lat1, latMid],
          [lonMid, lon2, lat1, latMid],
          [lon1, lonMid, latMid, lat2],
          [lonMid, lon2, latMid, lat2],
        ];

        parts.forEach((p, k) => {
          tiles.push(
            <mesh
              key={`${i}-${j}-${k}`}
              geometry={createPatch(p[0], p[1], p[2], p[3])}
            >
              <meshPhysicalMaterial
                color={colors[key]}
                roughness={0.35}
                metalness={0}
                clearcoat={1}
                clearcoatRoughness={0.1}
                transparent
                opacity={0.95}
              />
            </mesh>
          );
        });
      }
    }
  }

  return <>{tiles}</>;
}

/* ========================= */
/* 主元件 */
/* ========================= */

export default function GlobeVisualizer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -4, -5]} intensity={0.8} />

      <GridSphere />
      <OrbitControls enableDamping />
    </Canvas>
  );
}