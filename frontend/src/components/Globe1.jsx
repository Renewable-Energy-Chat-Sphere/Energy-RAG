import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import hierarchy from "../data/hierarchy.json";
import demandData from "../data/demand_ratio_yearly.json";

/* ===================== */
const RADIUS = 2;
const LON_DIV = 24;
const LAT_DIV = 12;
const TOTAL = LON_DIV * LAT_DIV;
/* ===================== */

const colors = {
  D2: "#60a5fa",
  D50: "#34d399",
  D40: "#f59e0b",
  D68: "#f472b6",
  D47: "#a78bfa",
};

/* ===================== */
/* LOD */
/* ===================== */

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

/* ===================== */
/* 工具 */
/* ===================== */

function getNeighbors(i) {
  const x = i % LON_DIV;
  const y = Math.floor(i / LON_DIV);

  const list = [
    { x: (x + 1) % LON_DIV, y },
    { x: (x - 1 + LON_DIV) % LON_DIV, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];

  return list
    .filter((n) => n.y >= 0 && n.y < LAT_DIV)
    .map((n) => n.y * LON_DIV + n.x);
}

/* ===================== */
/* 取得 Level1 數據 */
/* ===================== */

function getLevel1Data(year) {
  const yearKey = String(year);
  const yearData = demandData?.[yearKey];
  if (!yearData) return {};

  const result = {};
  for (let key in hierarchy) {
    if (hierarchy[key].level === 1) {
      result[key] = yearData[key] ?? 0;
    }
  }
  return result;
}

/* ===================== */
/* Level1 分配 */
/* ===================== */

function generateRegions(level1Data) {
  if (!level1Data || Object.keys(level1Data).length === 0) {
    return new Array(TOTAL).fill("D2");
  }

  const grid = new Array(TOTAL).fill(null);

  const totalValue = Object.values(level1Data).reduce(
    (a, b) => a + b,
    0
  );

  if (totalValue === 0) {
    return new Array(TOTAL).fill("D2");
  }

  let depts = Object.entries(level1Data).map(([key, value]) => ({
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
    10 * LON_DIV + 12,
    1 * LON_DIV + 12,
    6 * LON_DIV + 21,
    6 * LON_DIV + 2,
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

/* ===================== */
/* 球面幾何 */
/* ===================== */

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

/* ===================== */
/* 主球 */
/* ===================== */

function GridSphere({ year, onSelect, onHover }) {
  const lod = useLOD();

  const grid = useMemo(() => {
    const level1Data = getLevel1Data(year);
    return generateRegions(level1Data);
  }, [year]);

  const lonStep = 360 / LON_DIV;
  const latStep = 180 / LAT_DIV;

  const tiles = [];
  const departmentCenters = {};
  const departmentCounts = {};

  for (let i = 0; i < LON_DIV; i++) {
    for (let j = 0; j < LAT_DIV; j++) {
      const idx = j * LON_DIV + i;
      const key = grid[idx];

      const lon1 = -180 + i * lonStep;
      const lon2 = lon1 + lonStep;
      const lat1 = -90 + j * latStep;
      const lat2 = lat1 + latStep;

      const centerLon = (lon1 + lon2) / 2;
      const centerLat = (lat1 + lat2) / 2;
      const centerVec = lonLatToVec3(centerLon, centerLat, RADIUS);

      if (!departmentCenters[key]) {
        departmentCenters[key] = new THREE.Vector3();
        departmentCounts[key] = 0;
      }

      departmentCenters[key].add(centerVec);
      departmentCounts[key]++;

      const pushMesh = (geometry, uniqueKey) => {
        tiles.push(
          <mesh
            key={uniqueKey}
            geometry={geometry}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (onHover) {
                onHover({
                  code: key,
                  name: hierarchy[key]?.name,
                  year,
                });
              }
            }}
            onPointerOut={() => {
              if (onHover) onHover(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) {
                onSelect({
                  code: key,
                  name: hierarchy[key]?.name,
                  year,
                });
              }
            }}
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
      };

      if (lod === 2) {
        const lonMid = (lon1 + lon2) / 2;
        const latMid = (lat1 + lat2) / 2;

        const parts = [
          [lon1, lonMid, lat1, latMid],
          [lonMid, lon2, lat1, latMid],
          [lon1, lonMid, latMid, lat2],
          [lonMid, lon2, latMid, lat2],
        ];

        parts.forEach((p, k) => {
          pushMesh(
            createPatch(p[0], p[1], p[2], p[3]),
            `${i}-${j}-${k}`
          );
        });
      } else {
        pushMesh(
          createPatch(lon1, lon2, lat1, lat2),
          `${i}-${j}`
        );
      }
    }
  }

  const labels = Object.keys(departmentCenters).map((key) => {
    const avg = departmentCenters[key]
      .clone()
      .divideScalar(departmentCounts[key])
      .normalize();

    const position = avg.clone().multiplyScalar(RADIUS);
    const name = hierarchy[key]?.name || key;
    const size = Math.sqrt(departmentCounts[key]) * 0.045;

    return (
      <group
        key={`label-${key}`}
        position={[position.x, position.y, position.z]}
        onUpdate={(self) => {
          self.lookAt(0, 0, 0);
          self.rotateY(Math.PI);
        }}
      >
        <Text
          fontSize={size}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.003}
          outlineColor="#000000"
          depthTest={false}
        >
          {name}
        </Text>
      </group>
    );
  });

  return (
    <>
      {tiles}
      {lod === 1 && labels}
    </>
  );
}

/* ===================== */

export default function GlobeVisualizer({
  year,
  onSelect,
  onHover,
}) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 55 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -4, -5]} intensity={0.8} />

      <GridSphere
        year={year}
        onSelect={onSelect}
        onHover={onHover}
      />

      <OrbitControls enableDamping />
    </Canvas>
  );
}