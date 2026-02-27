import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import demandData from "../data/demand_yearly.json";
import hierarchy from "../data/hierarchy.json";

/* ===================== */
const RADIUS = 3.0;
const LON_DIV = 24;
const LAT_DIV = 12;
/* ===================== LOD ===================== */

function useSimpleLOD() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0);

  useFrame(() => {
    const d = camera.position.length();

    if (d > RADIUS * 2.2) {
      setLOD(0);
    } else {
      setLOD(1);
    }
  });

  return lod;
}

/* ===================== 基礎幾何 ===================== */

function lonLatToVec3(lon, lat, radius) {
  const latR = THREE.MathUtils.degToRad(lat);
  const lonR = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.cos(latR) * Math.cos(lonR),
    radius * Math.sin(latR),
    radius * Math.cos(latR) * Math.sin(lonR)
  );
}

function sphericalPatchGeometry({
  lon0, lon1, lat0, lat1, radius, seg = 12
}) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let i = 0; i <= seg; i++) {
    for (let j = 0; j <= seg; j++) {
      const lat = THREE.MathUtils.lerp(lat0, lat1, i / seg);
      const lon = THREE.MathUtils.lerp(lon0, lon1, j / seg);
      const p = lonLatToVec3(lon, lat, radius);
      positions.push(p.x, p.y, p.z);
      normals.push(p.x / radius, p.y / radius, p.z / radius);
    }
  }

  const row = seg + 1;
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

function GlassGlobe() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhysicalMaterial
        color="#3b82f6"
        transparent
        opacity={0.25}
        transmission={1}
        roughness={0.02}
        thickness={1}
        ior={1.5}
        clearcoat={1}
      />
    </mesh>
  );
}

/* ===================== 顏色 ===================== */

const BASE_HUES = [210, 140, 25, 280, 50];

function generateColor(index) {
  const hue = BASE_HUES[index % BASE_HUES.length];
  return `hsl(${hue}, 60%, 50%)`;
}

/* ===================== Level1 ===================== */

function getLevel1() {
  return Object.entries(hierarchy)
    .filter(([_, v]) => v.level === 1)
    .map(([code, v], i) => ({
      code,
      name: v.name,
      index: i
    }));
}

/* ===================== 核心分配函數 ===================== */

function buildTiles(yearData, lod) {

  const level1 = getLevel1();
  if (!level1.length) return [];

  const totalTiles = LON_DIV * LAT_DIV;

  const totalValue = level1.reduce(
    (sum, item) => sum + (yearData?.[item.code] || 0),
    0
  );

  if (!totalValue) return [];

  /* ===== Level1 分配 ===== */

  const allocations = level1.map(item => {
    const value = yearData?.[item.code] || 0;
    const ratio = value / totalValue;
    const raw = ratio * totalTiles;

    return {
      ...item,
      count: Math.max(1, Math.floor(raw)),
      remainder: raw - Math.floor(raw)
    };
  });

  let assigned = allocations.reduce((s, a) => s + a.count, 0);
  let diff = totalTiles - assigned;

  if (diff > 0) {
    allocations
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, diff)
      .forEach(a => a.count += 1);
  }

  const grid = Array.from({ length: LON_DIV }, () =>
    Array(LAT_DIV).fill(null)
  );

  const directions = [[1,0],[-1,0],[0,1],[0,-1]];

  /* ===== flood fill Level1 ===== */

  allocations.forEach(dept => {

    let seedFound = false;
    let seedLon = 0;
    let seedLat = 0;

    for (let i = 0; i < LON_DIV && !seedFound; i++) {
      for (let j = 0; j < LAT_DIV && !seedFound; j++) {
        if (!grid[i][j]) {
          seedLon = i;
          seedLat = j;
          seedFound = true;
        }
      }
    }

    if (!seedFound) return;

    const queue = [[seedLon, seedLat]];
    grid[seedLon][seedLat] = dept;

    let filled = 1;

    while (queue.length && filled < dept.count) {

      const [lon, lat] = queue.shift();

      for (let [dx, dy] of directions) {

        const nx = lon + dx;
        const ny = lat + dy;

        if (
          nx >= 0 && nx < LON_DIV &&
          ny >= 0 && ny < LAT_DIV &&
          !grid[nx][ny]
        ) {
          grid[nx][ny] = dept;
          queue.push([nx, ny]);
          filled++;
          if (filled >= dept.count) break;
        }
      }
    }
  });

  /* ===== LOD1 細分（在 parent 區塊內再 flood fill）===== */

  if (lod === 1) {

    const grouped = {};

    for (let lon = 0; lon < LON_DIV; lon++) {
      for (let lat = 0; lat < LAT_DIV; lat++) {
        const dept = grid[lon][lat];
        if (!dept) continue;
        if (!grouped[dept.code]) grouped[dept.code] = [];
        grouped[dept.code].push([lon, lat]);
      }
    }

    Object.entries(grouped).forEach(([parentCode, cells]) => {

      const parentNode = hierarchy[parentCode];
      if (!parentNode?.children) return;

      const parentValue = yearData?.[parentCode] || 0;
      if (!parentValue) return;

      const children = Object.entries(parentNode.children)
        .map(([code, data]) => ({
          code,
          name: data.name,
          value: yearData?.[code] || 0
        }))
        .filter(c => c.value > 0);

      if (!children.length) return;

      // 子 grid
      const localGrid = {};
      cells.forEach(([lon, lat]) => {
        localGrid[`${lon}_${lat}`] = null;
      });

      const allocations = children.map(c => {
        const ratio = c.value / parentValue;
        const raw = ratio * cells.length;
        return {
          ...c,
          count: Math.max(1, Math.floor(raw)),
          remainder: raw - Math.floor(raw)
        };
      });

      let assigned = allocations.reduce((s, a) => s + a.count, 0);
      let diff = cells.length - assigned;

      if (diff > 0) {
        allocations
          .sort((a, b) => b.remainder - a.remainder)
          .slice(0, diff)
          .forEach(a => a.count += 1);
      }

      allocations.forEach(child => {

        const emptyCell = Object.keys(localGrid)
          .find(k => localGrid[k] === null);

        if (!emptyCell) return;

        const [seedLon, seedLat] =
          emptyCell.split("_").map(Number);

        const queue = [[seedLon, seedLat]];
        localGrid[emptyCell] = child;

        let filled = 1;

        while (queue.length && filled < child.count) {

          const [lon, lat] = queue.shift();

          for (let [dx, dy] of directions) {

            const nx = lon + dx;
            const ny = lat + dy;
            const key = `${nx}_${ny}`;

            if (localGrid[key] === null) {
              localGrid[key] = child;
              queue.push([nx, ny]);
              filled++;
              if (filled >= child.count) break;
            }
          }
        }
      });

      // 寫回 grid（顏色保持 parent）
      const parentIndex =
        level1.find(l => l.code === parentCode)?.index || 0;

      Object.entries(localGrid).forEach(([k, child]) => {
        const [lon, lat] = k.split("_").map(Number);
        grid[lon][lat] = {
          ...child,
          index: parentIndex
        };
      });

    });
  }

  /* ===== 轉為 tiles ===== */

  const tiles = [];

  for (let lon = 0; lon < LON_DIV; lon++) {
    for (let lat = 0; lat < LAT_DIV; lat++) {

      const dept = grid[lon][lat];
      if (!dept) continue;

      const lon0 = -180 + lon * (360 / LON_DIV);
      const lon1 = lon0 + (360 / LON_DIV);
      const lat0 = -90 + lat * (180 / LAT_DIV);
      const lat1 = lat0 + (180 / LAT_DIV);

      tiles.push({
        lon0,
        lon1,
        lat0,
        lat1,
        dept,
        color: generateColor(dept.index)
      });
    }
  }

  return tiles;
}

/* ===================== FINAL STABLE GRID ===================== */

function Grid({ tiles, lod }) {

  if (!tiles || !tiles.length) return null;

  /* ===================== 建立 index map（找鄰居） ===================== */

  const gridIndexMap = {};

  tiles.forEach(t => {
    const lonIndex = Math.floor((t.lon0 + 180) / (360 / LON_DIV));
    const latIndex = Math.floor((t.lat0 + 90) / (180 / LAT_DIV));
    gridIndexMap[`${lonIndex}_${latIndex}`] = t;
  });

  /* ===================== 分組（用於文字） ===================== */

  const groups = {};

  tiles.forEach(t => {

    if (!t?.dept?.code) return;

    const code = t.dept.code;
    const name = t.dept.name || "";

    const lonIndex = Math.floor((t.lon0 + 180) / (360 / LON_DIV));
    const latIndex = Math.floor((t.lat0 + 90) / (180 / LAT_DIV));

    if (!groups[code]) {
      groups[code] = {
        name,
        cells: [[lonIndex, latIndex]],
        count: 1
      };
    } else {
      groups[code].cells.push([lonIndex, latIndex]);
      groups[code].count++;
    }
  });

  const groupValues = Object.values(groups);
  const maxTiles = groupValues.length
    ? Math.max(...groupValues.map(g => g.count))
    : 1;

  /* ===================== LOD1 邊界線 ===================== */

  const boundaryLines = [];

  if (lod === 1) {

    tiles.forEach(t => {

      const lonIndex = Math.floor((t.lon0 + 180) / (360 / LON_DIV));
      const latIndex = Math.floor((t.lat0 + 90) / (180 / LAT_DIV));

      const rightNeighbor =
        gridIndexMap[`${lonIndex + 1}_${latIndex}`];

      const topNeighbor =
        gridIndexMap[`${lonIndex}_${latIndex + 1}`];

      if (
        rightNeighbor &&
        rightNeighbor.dept?.code !== t.dept?.code
      ) {
        const p1 = lonLatToVec3(t.lon1, t.lat0, RADIUS + 0.06);
        const p2 = lonLatToVec3(t.lon1, t.lat1, RADIUS + 0.06);
        boundaryLines.push([p1, p2]);
      }

      if (
        topNeighbor &&
        topNeighbor.dept?.code !== t.dept?.code
      ) {
        const p1 = lonLatToVec3(t.lon0, t.lat1, RADIUS + 0.06);
        const p2 = lonLatToVec3(t.lon1, t.lat1, RADIUS + 0.06);
        boundaryLines.push([p1, p2]);
      }

    });
  }

  /* ===================== Render ===================== */

  return (
    <>
      {/* ===================== 區塊 ===================== */}
      {tiles.map((t, i) => (
        <mesh
          key={i}
          geometry={sphericalPatchGeometry({
            lon0: t.lon0,
            lon1: t.lon1,
            lat0: t.lat0,
            lat1: t.lat1,
            radius: RADIUS + 0.05
          })}
        >
          <meshStandardMaterial
            color={t.color}
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      ))}

      {/* ===================== LOD1 邊界 ===================== */}
      {lod === 1 &&
        boundaryLines.map((line, i) => {

          const geometry =
            new THREE.BufferGeometry().setFromPoints(line);

          return (
            <line key={i} geometry={geometry}>
              <lineBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.95}
                depthTest={false}
              />
            </line>
          );
        })}

      {/* ===================== 文字 ===================== */}
      {Object.entries(groups).map(([code, g]) => {

        if (!g || !g.cells.length) return null;

        // LOD 控制
        if (lod === 0) {
          // LOD0 顯示 Level1
        } else if (lod === 1) {
          // LOD1 顯示 Level2（Level1 不顯示）
          // 若你想只顯示 level 2 可在這裡加條件
        }

        /* ===== 計算區塊地理中心（不再平均向量） ===== */

        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;

        g.cells.forEach(([lonIndex, latIndex]) => {

          const lon0 = -180 + lonIndex * (360 / LON_DIV);
          const lon1 = lon0 + (360 / LON_DIV);
          const lat0 = -90 + latIndex * (180 / LAT_DIV);
          const lat1 = lat0 + (180 / LAT_DIV);

          minLon = Math.min(minLon, lon0);
          maxLon = Math.max(maxLon, lon1);
          minLat = Math.min(minLat, lat0);
          maxLat = Math.max(maxLat, lat1);
        });

        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;

        let position =
          lonLatToVec3(centerLon, centerLat, RADIUS + 0.18);

        // 極區推開
        if (Math.abs(centerLat) > 70) {
          position.multiplyScalar(1.08);
        }

        /* ===== 字體大小 ===== */

        const ratio = Math.sqrt(g.count / maxTiles);

        const minSize = 0.05;
        const maxSize = 0.20;

        let fontSize =
          minSize + (maxSize - minSize) * ratio;

        if (g.count < 3) fontSize *= 0.8;

        /* ===== 文字省略 ===== */

        let displayName = g.name || "";

        const maxChars =
          Math.max(3, Math.floor(ratio * 8));

        if (displayName.length > maxChars) {
          displayName =
            displayName.substring(0, maxChars) + "...";
        }

        return (
          <group
            key={`label-${code}`}
            position={position.toArray()}
            onUpdate={(obj) => {
              obj.lookAt(0, 0, 0);
              obj.rotateY(Math.PI);
            }}
          >
            <Text
              fontSize={fontSize}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              maxWidth={fontSize * 4}
              lineHeight={1.05}
              depthTest={false}
            >
              {displayName}
            </Text>
          </group>
        );
      })}
    </>
  );
}
/* ===================== Scene ===================== */

function Scene({ year }) {

  const { camera } = useThree();
  const lod = useSimpleLOD();

  const yearData = demandData?.[year];

  const tiles = useMemo(() => {
    if (!yearData) return [];
    return buildTiles(yearData, lod);
  }, [yearData, lod]);

  useEffect(() => {
    camera.position.set(0, 0, RADIUS * 3.5);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 6, 6]} intensity={1.5} />
      <directionalLight position={[-5, -4, -6]} intensity={0.4} />

      <GlassGlobe />

      {tiles.length > 0 && (
        <Grid tiles={tiles} lod={lod} />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={RADIUS * 1.2}
        maxDistance={RADIUS * 6}
        enableDamping
      />
    </>
  );
}

/* ===================== Root ===================== */

export default function GlobeVisualizer({ year }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ fov: 45, near: 0.1, far: 1000 }}>
        <Scene year={year} />
      </Canvas>
    </div>
  );
}