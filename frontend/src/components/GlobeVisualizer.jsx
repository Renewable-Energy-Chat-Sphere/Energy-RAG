import React, { useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

import supplyLayout from "../data/supply_layout.json";
import demandLayout from "../data/demand_layout.json";
import supplyCatalog from "../data/supply_catalog.json";
import demandSupply from "../data/113_energy_demand_supply.json";
import hierarchy from "../data/hierarchy.json";

const SUPPLY_RADIUS = 3.02;

/* ===================== */
/* Supply Map */
/* ===================== */

const supplyMap = {};
supplyCatalog.forEach((s) => {
  supplyMap[s.source_id] = s;
});

/* ===================== */
/* Build hierarchy */
/* ===================== */

const demandLevel = {};
const demandName = {};

function buildLevel(node, code) {
  demandLevel[code] = node.level;
  demandName[code] = node.name;

  if (node.children) {
    Object.entries(node.children).forEach(([childCode, child]) => {
      buildLevel(child, childCode);
    });
  }
}

Object.entries(hierarchy).forEach(([code, node]) => {
  buildLevel(node, code);
});

/* ===================== */
/* Label（縮放 + 截斷） */
/* ===================== */

function Label({ position, text, baseSize = 14 }) {
  const { camera } = useThree();

  const distance = camera.position.length();
  const scale = THREE.MathUtils.clamp(8 / distance, 0.6, 1.6);

  function formatText(text) {
    if (!text) return "";
    return text.length > 4 ? text.slice(0, 4) + "..." : text;
  }

  return (
    <Html position={position} center occlude={false}>
      <div
        style={{
          fontSize: baseSize * scale + "px",
          color: "black",
          opacity: 0.8,
          textShadow: "0 0 6px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {formatText(text)}
      </div>
    </Html>
  );
}

/* ===================== */
/* Glow（縮小版） */
/* ===================== */

function Glow({ size, color }) {
  return (
    <mesh>
      <sphereGeometry args={[size * 1.3, 16, 16]} />
      <meshBasicMaterial transparent opacity={0.08} color={color} />
    </mesh>
  );
}

/* ===================== */
/* Grid Sphere */
/* ===================== */

function GridSphere() {
  const lines = [];
  const latSegments = 12;
  const lonSegments = 24;

  for (let i = 1; i < latSegments; i++) {
    const lat = Math.PI * (i / latSegments - 0.5);
    const y = 3 * Math.sin(lat);
    const r = 3 * Math.cos(lat);

    const points = [];

    for (let j = 0; j <= 64; j++) {
      const lon = (j / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(r * Math.cos(lon), y, r * Math.sin(lon)));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lat" + i} geometry={geo}>
        <lineBasicMaterial color="#64748b" />
      </line>
    );
  }

  for (let i = 0; i < lonSegments; i++) {
    const lon = (i / lonSegments) * Math.PI * 2;
    const points = [];

    for (let j = -32; j <= 32; j++) {
      const lat = (j / 32) * Math.PI / 2;

      points.push(
        new THREE.Vector3(
          3 * Math.cos(lat) * Math.cos(lon),
          3 * Math.sin(lat),
          3 * Math.cos(lat) * Math.sin(lon)
        )
      );
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lon" + i} geometry={geo}>
        <lineBasicMaterial color="#64748b" />
      </line>
    );
  }

  return <group>{lines}</group>;
}

/* ===================== */
/* Supply Nodes */
/* ===================== */

function SupplyNodes({ onHover }) {
  const { camera } = useThree();

  const BASE = import.meta.env.BASE_URL;

  // ⭐ category → icon mapping
  const iconMap = {
    Coal: "coal.png",
    Oil: "oil.png",
    Gas: "gas.png",
    Renewable: "solar.png",     // 可再細分（之後升級）
    Electricity: "electricity.png",
    Waste: "biomass.png",
    Other: "default.png",
  };

  return Object.entries(supplyLayout).map(([id, pos]) => {
    const info = supplyMap[id];

    // ⭐ 抓 category（重點）
    const category = info?.category || "Other";

    // ⭐ 對應 icon
    const iconFile = iconMap[category] || "default.png";

    // ⭐ 距離縮放
    const distance = camera.position.length();
    const scale = THREE.MathUtils.clamp(8 / distance, 0.6, 1.4);

    const position = [
      pos.x * SUPPLY_RADIUS,
      pos.y * SUPPLY_RADIUS,
      pos.z * SUPPLY_RADIUS,
    ];

    return (
      <group key={id} position={position}>
        {/* Glow */}
        <Glow size={0.08} color="#f59e0b" />

        <Html center occlude={false}>
          <img
            src={`${BASE}icons/${iconFile}`}
            alt=""
            style={{
              width: `${20 * scale}px`,
              height: `${20 * scale}px`,
              objectFit: "contain",

              transition: "all 0.15s ease",
              filter: "drop-shadow(0 0 4px rgba(0,0,0,0.6))",

              cursor: "pointer",
              pointerEvents: "auto",
            }}

            // ⭐ fallback
            onError={(e) => {
              if (e.currentTarget.dataset.fallback) return;

              e.currentTarget.dataset.fallback = "true";
              e.currentTarget.src = `${BASE}icons/default.png`;
            }}

            // ⭐ hover
            onMouseEnter={(e) => {
              e.stopPropagation();

              e.currentTarget.style.transform = "scale(1.4)";
              e.currentTarget.style.filter =
                "drop-shadow(0 0 8px rgba(245,158,11,0.8))";

              onHover({
                code: id,
                name: info?.name_zh || id,
                type: "supply",
              });
            }}

            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.filter =
                "drop-shadow(0 0 4px rgba(0,0,0,0.6))";

              onHover(null);
            }}
          />
        </Html>
      </group>
    );
  });
}

/* ===================== */
/* Demand Nodes */
/* ===================== */

function DemandNodes({ lod, onHover, onSelect }) {
  return Object.entries(demandLayout).map(([id, pos]) => {
    const level = demandLevel[id];

    if (lod === 0 && level !== 1) return null;
    if (lod === 1 && level !== 2) return null;
    if (lod === 2 && level !== 3) return null;

    const size = level === 1 ? 0.1 : level === 2 ? 0.075 : 0.06;
    const radius = level === 1 ? 2.9 : level === 2 ? 3.0 : 3.1;

    const position = [pos.x * radius, pos.y * radius, pos.z * radius];

    return (
      <group key={id} position={position}>
        <Glow size={size} color="#3b82f6" />

        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover({
              code: id,
              name: demandName[id] || id,
              type: "demand",
            });
          }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect({
              code: id,
              name: demandName[id] || id,
            });
          }}
        >
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* LOD0 */}
        {lod === 0 && level === 1 && (
          <Label position={[0, size + 0.18, 0]} text={demandName[id]} baseSize={18} />
        )}

        {/* LOD1 */}
        {lod === 1 && level === 2 && (
          <Label position={[0, size + 0.14, 0]} text={demandName[id]} baseSize={12} />
        )}

        {/* 🔥 LOD2（新增） */}
        {lod === 2 && level === 3 && (
          <Label position={[0, size + 0.1, 0]} text={demandName[id]} baseSize={10} />
        )}
      </group>
    );
  });
}

/* ===================== */
/* Supply Flow Lines */
/* ===================== */

function SupplyFlowLines({ selected, lod }) {
  if (!selected) return null;

  const level = demandLevel[selected.code];

  if (lod === 0 && level !== 1) return null;
  if (lod === 1 && level !== 2) return null;
  if (lod === 2 && level !== 3) return null;

  const ratio = demandSupply[selected.code];
  if (!ratio) return null;

  return Object.entries(ratio).map(([supply]) => {
    const s = supplyLayout[supply];
    const d = demandLayout[selected.code];

    if (!s || !d) return null;

    const p1 = new THREE.Vector3(
      s.x * SUPPLY_RADIUS,
      s.y * SUPPLY_RADIUS,
      s.z * SUPPLY_RADIUS
    );

    const p2 = new THREE.Vector3(d.x * 3, d.y * 3, d.z * 3);

    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);

    return (
      <line key={supply} geometry={geo}>
        <lineBasicMaterial color="#ff0000" transparent opacity={0.7} />
      </line>
    );
  });
}

/* ===================== */
/* Scene */
/* ===================== */

function Scene({ onHover, onSelect, selected }) {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0);

  useFrame(() => {
    const d = camera.position.length();

    if (d > 7) setLOD(0);
    else if (d > 5) setLOD(1);
    else setLOD(2);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <GridSphere />

      <SupplyNodes onHover={onHover} />

      <DemandNodes lod={lod} onHover={onHover} onSelect={onSelect} />

      <SupplyFlowLines selected={selected} lod={lod} />

      <OrbitControls enablePan={false} />
    </>
  );
}

/* ===================== */
/* Main */
/* ===================== */

export default function GlobeVisualizer({
  onHover,
  onSelect,
  selected,
}) {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
      <Scene
        onHover={onHover}
        onSelect={onSelect}
        selected={selected}
      />
    </Canvas>
  );
}