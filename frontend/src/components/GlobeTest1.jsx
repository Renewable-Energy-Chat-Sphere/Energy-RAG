import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import demandData from "../data/demand_yearly.json";
import hierarchy from "../data/hierarchy.json";

/* ===================== */
const RADIUS = 3.0;
const LON_DIV = 24;
const LAT_DIV = 12;
/* ===================== */

function useSimpleLOD() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0);

  useFrame(() => {
    const d = camera.position.length();
    if (d > RADIUS * 2.8) setLOD(0);
    else if (d > RADIUS * 1.8) setLOD(1);
    else setLOD(2);
  });

  return lod;
}

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

/* ===================== 玻璃球 ===================== */
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

/* ===================== Level1 ===================== */
function getLevel1Codes() {
  const baseHue = 205;
  return Object.entries(hierarchy)
    .filter(([_, v]) => v.level === 1)
    .map(([code, v], i) => ({
      code,
      name: v.name,
      color: `hsl(${baseHue}, ${55 + i * 5}%, ${48 + i * 3}%)`
    }));
}

/* ===================== 分配（無空隙） ===================== */
function buildBlockGrid(yearData) {

  const LEVEL1 = getLevel1Codes();

  const total = LEVEL1.reduce(
    (sum, item) => sum + (yearData?.[item.code] || 0),
    0
  );

  const totalColumns = LON_DIV;
  const baseColumns = LEVEL1.length;
  const remainingColumns = totalColumns - baseColumns;

  const allocations = LEVEL1.map(item => {
    const value = yearData?.[item.code] || 0;
    const ratio = total === 0 ? 0 : value / total;
    const raw = ratio * remainingColumns;

    return {
      ...item,
      base: 1,
      extra: Math.floor(raw),
      remainder: raw - Math.floor(raw)
    };
  });

  let assigned =
    allocations.reduce((sum, a) => sum + a.extra, 0);

  let diff = remainingColumns - assigned;

  if (diff > 0) {
    allocations
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, diff)
      .forEach(a => a.extra += 1);
  }

  const columnPlan = [];
  allocations.forEach(a => {
    const count = a.base + a.extra;
    for (let i = 0; i < count; i++) {
      columnPlan.push(a);
    }
  });

  while (columnPlan.length < totalColumns) {
    columnPlan.push(columnPlan[columnPlan.length - 1]);
  }

  const tiles = [];

  for (let lon = 0; lon < LON_DIV; lon++) {
    const dept = columnPlan[lon];

    for (let lat = 0; lat < LAT_DIV; lat++) {

      const lon0 = -180 + lon * (360 / LON_DIV);
      const lon1 = lon0 + (360 / LON_DIV);
      const lat0 = -90 + lat * (180 / LAT_DIV);
      const lat1 = lat0 + (180 / LAT_DIV);

      tiles.push({ lon0, lon1, lat0, lat1, dept });
    }
  }

  return tiles;
}

/* ===================== 部門外框 ===================== */
function DepartmentBorder({ minLon, maxLon }) {

  const points = [];
  const steps = 32;

  for (let i = 0; i <= steps; i++)
    points.push(
      lonLatToVec3(
        THREE.MathUtils.lerp(minLon, maxLon, i / steps),
        90,
        RADIUS + 0.051
      )
    );

  for (let i = 0; i <= steps; i++)
    points.push(
      lonLatToVec3(
        maxLon,
        THREE.MathUtils.lerp(90, -90, i / steps),
        RADIUS + 0.051
      )
    );

  for (let i = 0; i <= steps; i++)
    points.push(
      lonLatToVec3(
        THREE.MathUtils.lerp(maxLon, minLon, i / steps),
        -90,
        RADIUS + 0.051
      )
    );

  for (let i = 0; i <= steps; i++)
    points.push(
      lonLatToVec3(
        minLon,
        THREE.MathUtils.lerp(-90, 90, i / steps),
        RADIUS + 0.051
      )
    );

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.35}
      />
    </line>
  );
}

/* ===================== LOD0 ===================== */
function LOD0Grid({ tiles }) {

  const [hovered, setHovered] = useState(null);

  const groups = {};

  tiles.forEach(t => {
    if (!groups[t.dept.code]) {
      groups[t.dept.code] = {
        name: t.dept.name,
        minLon: t.lon0,
        maxLon: t.lon1
      };
    } else {
      groups[t.dept.code].minLon =
        Math.min(groups[t.dept.code].minLon, t.lon0);
      groups[t.dept.code].maxLon =
        Math.max(groups[t.dept.code].maxLon, t.lon1);
    }
  });

  return (
    <>
      {tiles.map((t, i) => {

        const isHover = hovered === t.dept.code;

        return (
          <mesh
            key={i}
            geometry={sphericalPatchGeometry({
              lon0: t.lon0,
              lon1: t.lon1,
              lat0: t.lat0,
              lat1: t.lat1,
              radius: RADIUS + 0.05
            })}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(t.dept.code);
            }}
            onPointerOut={() => setHovered(null)}
          >
            <meshStandardMaterial
              color={t.dept.color}
              transparent
              opacity={isHover ? 0.9 : 0.55}
              roughness={0.45}
              metalness={0.15}
              emissive={isHover ? t.dept.color : "#000000"}
              emissiveIntensity={isHover ? 0.35 : 0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {Object.entries(groups).map(([code, g]) => (
        <DepartmentBorder
          key={code}
          minLon={g.minLon}
          maxLon={g.maxLon}
        />
      ))}

      {Object.entries(groups).map(([code, g]) => {

        const centerLon = (g.minLon + g.maxLon) / 2;
        const pos = lonLatToVec3(centerLon, 0, RADIUS + 0.08);

        return (
          <group
            key={`label-${code}`}
            position={pos.toArray()}
            onUpdate={(obj) => {
              obj.lookAt(0, 0, 0);
              obj.rotateY(Math.PI);
            }}
          >
            <Text
              fontSize={0.16}
              color="#111"
              anchorX="center"
              anchorY="middle"
              depthTest={false}
            >
              {g.name}
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

  const tiles = useMemo(() => {
    return buildBlockGrid(demandData[year]);
  }, [year]);

  useEffect(() => {
    camera.position.set(0, 0, RADIUS * 3.5);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 6, 6]} intensity={1.5} />
      <directionalLight position={[-4, -2, -5]} intensity={0.5} />

      <GlassGlobe />

      {lod === 0 && <LOD0Grid tiles={tiles} />}

      <OrbitControls
        enablePan={false}
        minDistance={RADIUS * 1.2}
        maxDistance={RADIUS * 6}
        enableDamping
      />
    </>
  );
}

export default function GlobeVisualizer({ year }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ fov: 45, near: 0.1, far: 1000 }}>
        <Scene year={year} />
      </Canvas>
    </div>
  );
}