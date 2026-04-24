import React, { useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

import supplyCatalog from "../data/supply_catalog.json";
import hierarchy from "../data/hierarchy.json";

const SUPPLY_RADIUS = 3.02;

/* ===================== */
/* 動態載入所有年份資料 */
/* ===================== */

const supplyLayoutsRaw = import.meta.glob("../data/supply_layout_*.json", {
  eager: true,
});

const demandLayoutsRaw = import.meta.glob("../data/demand_layout_*.json", {
  eager: true,
});

const demandSupplyRaw = import.meta.glob(
  "../data/*_energy_demand_supply.json",
  { eager: true },
);

/* ===================== */
/* 轉成 year mapping */
/* ===================== */

const supplyLayouts = {};
const demandLayouts = {};
const demandSupplyData = {};
const globalMaxCache = {};

Object.keys(supplyLayoutsRaw).forEach((path) => {
  const match = path.match(/supply_layout_(\d+)\.json/);
  if (match) {
    supplyLayouts[match[1]] = supplyLayoutsRaw[path].default;
  }
});

Object.keys(demandLayoutsRaw).forEach((path) => {
  const match = path.match(/demand_layout_(\d+)\.json/);
  if (match) {
    demandLayouts[match[1]] = demandLayoutsRaw[path].default;
  }
});

Object.keys(demandSupplyRaw).forEach((path) => {
  const match = path.match(/(\d+)_energy_demand_supply\.json/);
  if (match) {
    demandSupplyData[match[1]] = demandSupplyRaw[path].default;
  }
});

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

function Label({ position, worldPosition, text, baseSize = 14 }) {
  const { camera } = useThree();

  const distance = camera.position.length();
  const camDir = camera.position.clone().normalize();
  const nodeDir = new THREE.Vector3(...worldPosition).normalize();
  const dot = camDir.dot(nodeDir);
  let fontSizeFactor = 1;

  if (distance > 6) {
    fontSizeFactor = 1;
  } else if (distance > 3) {
    fontSizeFactor = 1.3;
  } else {
    fontSizeFactor = 1.5;
  }

  const isDark = document
    .getElementById("main-content")
    ?.classList.contains("dark");

  function formatText(text) {
    if (!text) return "";
    return text.length > 5 ? text.slice(0, 5) + "..." : text;
  }

  return (
    <Html
      position={position}
      center
      occlude={false}
      style={{
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          fontSize: baseSize * fontSizeFactor + "px",
          color: isDark ? "#ffffff" : "#000000",
          opacity: dot > 0 ? 0.9 : 0.15,
          filter: dot > 0 ? "none" : "brightness(0.6)",
          whiteSpace: "nowrap",
          letterSpacing: "0.5px",
          transition: "font-size 0.2s ease",

          textShadow: isDark
            ? "0 0 6px rgba(255,255,255,0.5)"
            : "0 0 4px rgba(0,0,0,0.4)",

          background: "transparent",
          padding: "0px",
          backdropFilter: "none",
        }}
      >
        {formatText(text)}
      </div>
    </Html>
  );
}

/* ===================== */
/* Glow */
/* ===================== */

function Glow({ size, color }) {
  return (
    <group>
      {/* 外層大光暈 */}

      {/* 中層光暈 */}
      <mesh>
        <sphereGeometry args={[size * 1.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ===================== */
/* Supply Nodes */
/* ===================== */

function SupplyNodes({ year, onHover, selected }) {
  const { camera } = useThree();

  const BASE = import.meta.env.BASE_URL;

  const supplyLayout = supplyLayouts[year];

  const demandSupply = demandSupplyData[year];

  const activeSupply = selected
    ? Object.keys(demandSupply?.[selected.code] || {})
    : null;

  if (!supplyLayout) return null;

  const iconMap = {
    Coal: "coal.png",
    Oil: "oil.png",
    Gas: "gas.png",
    Renewable: "solar.png",
    Electricity: "electricity.png",
    Waste: "biomass.png",
    Other: "default.png",
  };

  return Object.entries(supplyLayout).map(([id, pos]) => {
    const position = [
      pos.x * (SUPPLY_RADIUS * 1.05),
      pos.y * (SUPPLY_RADIUS * 1.05),
      pos.z * (SUPPLY_RADIUS * 1.05),
    ];
    const camDir = camera.position.clone().normalize();
    const nodeDir = new THREE.Vector3(...position).normalize();
    const dot = camDir.dot(nodeDir);

    const info = supplyMap[id];
    const category = info?.category || "Other";

    const CATEGORY_COLOR = {
      Coal: "#9ca3af",
      Oil: "#f97316",
      Gas: "#38bdf8",
      Renewable: "#4ade80",
      Electricity: "#facc15",
      Waste: "#a78bfa",
      Other: "#94a3b8",
    };
    const iconFile = iconMap[category] || "default.png";

    const distance = camera.position.length();
    const scale = THREE.MathUtils.clamp(10 / distance, 0.4, 1.8);

    return (
      <group key={id} position={position}>
        {(!selected || activeSupply?.includes(id)) && (
          <Glow size={0.08} color={CATEGORY_COLOR[category] || "#94a3b8"} />
        )}

        <Html center occlude={false}>
          <img
            src={`${BASE}icons/${iconFile}`}
            alt=""
            style={{
              width: `${20 * scale}px`,
              height: `${20 * scale}px`,
              objectFit: "contain",
              transition: "transform 0.25s ease, filter 0.25s ease",
              pointerEvents: dot > 0 ? "auto" : "none",
              cursor: dot > 0 ? "pointer" : "default",

              /* 光暈 */
              filter:
                category === "Renewable"
                  ? "drop-shadow(0 0 10px rgba(34,197,94,0.9))"
                  : category === "Coal"
                    ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))"
                    : "drop-shadow(0 0 6px rgba(59,130,246,0.4))",

              /* 未被選中時隱藏 */
              opacity: dot > 0 ? 1 : 0.2,
            }}
            onError={(e) => {
              if (e.currentTarget.dataset.fallback) return;
              e.currentTarget.dataset.fallback = "true";
              e.currentTarget.src = `${BASE}icons/default.png`;
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();

              e.currentTarget.style.transform = "translateY(-2px) scale(1.1)";

              e.currentTarget.style.filter =
                "drop-shadow(0 0 14px rgba(255,255,255,0.25))";

              onHover({
                code: id,
                name: info?.name_zh || id,
                type: "supply",
              });
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px) scale(1)";

              e.currentTarget.style.filter =
                category === "Renewable"
                  ? "drop-shadow(0 0 10px rgba(34,197,94,0.9))"
                  : category === "Coal"
                    ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))"
                    : "drop-shadow(0 0 6px rgba(59,130,246,0.4))";

              onHover(null);
            }}
          />
        </Html>
      </group>
    );
  });
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
        <lineBasicMaterial color="#64748b" transparent opacity={0.3} />
      </line>,
    );
  }

  for (let i = 0; i < lonSegments; i++) {
    const lon = (i / lonSegments) * Math.PI * 2;
    const points = [];

    for (let j = -32; j <= 32; j++) {
      const lat = ((j / 32) * Math.PI) / 2;

      points.push(
        new THREE.Vector3(
          3 * Math.cos(lat) * Math.cos(lon),
          3 * Math.sin(lat),
          3 * Math.cos(lat) * Math.sin(lon),
        ),
      );
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lon" + i} geometry={geo}>
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.3} />
      </line>,
    );
  }

  return <group>{lines}</group>;
}

/* ===================== */
/* Demand Nodes */
/* ===================== */

function DemandNodes({ year, lod, onHover, onSelect }) {
  const { camera } = useThree();
  const demandLayout = demandLayouts[year];

  if (!demandLayout) return null;

  return Object.entries(demandLayout).map(([id, pos]) => {
    const level = demandLevel[id];

    if (lod === 0 && level !== 1) return null;
    if (lod === 1 && level !== 2) return null;
    if (lod === 2 && level !== 3) return null;

    const size = level === 1 ? 0.1 : level === 2 ? 0.075 : 0.06;
    const radius = level === 1 ? 3.05 : level === 2 ? 3.1 : 3.15;

    const position = [pos.x * radius, pos.y * radius, pos.z * radius];

    const camDir = camera.position.clone().normalize();
    const nodeDir = new THREE.Vector3(...position).normalize();
    const dot = camDir.dot(nodeDir);
    return (
      <group key={id} position={position}>
        <Glow size={size} color="#3b82f6" />

        <mesh
          onPointerOver={(e) => {
            if (dot <= 0) return; // ❌ 背面直接不觸發
            e.stopPropagation();
            onHover({
              code: id,
              name: demandName[id] || id,
              type: "demand",
            });
          }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => {
            if (dot <= 0) return; // 🔥 關鍵：擋背面點擊
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
            emissiveIntensity={dot > 0 ? 0.5 : 0.1}
            transparent
            opacity={dot > 0 ? 1 : 0.2}
          />
        </mesh>
        {lod === 0 && level === 1 && (
          <Label
            position={[0, size + 0.18, 0]}
            worldPosition={position}
            text={demandName[id]}
            baseSize={18}
          />
        )}
        {lod === 1 && level === 2 && (
          <Label
            position={[0, size + 0.14, 0]}
            worldPosition={position}
            text={demandName[id]}
            baseSize={12}
          />
        )}
        {lod === 2 && level === 3 && (
          <Label
            position={[0, size + 0.1, 0]}
            worldPosition={position}
            text={demandName[id]}
            baseSize={10}
          />
        )}
      </group>
    );
  });
}

/* ===================== */
/* Supply Flow Lines*/
/* ===================== */

function getColor(value) {
  const colors = [
    new THREE.Color("#06b6d4"),
    new THREE.Color("#22c55e"),
    new THREE.Color("#facc15"),
    new THREE.Color("#f97316"),
    new THREE.Color("#ef4444"),
  ];

  const scaled = value * (colors.length - 1);
  const index = Math.floor(scaled);
  const t = scaled - index;

  if (index >= colors.length - 1) {
    return colors[colors.length - 1];
  }

  return colors[index].clone().lerp(colors[index + 1], t);
}

function SupplyFlowLines({ year, selected, lod }) {
  const { camera } = useThree();
  if (!selected) return null;

  const demandLayout = demandLayouts[year];
  const supplyLayout = supplyLayouts[year];
  const demandSupply = demandSupplyData[year];

  if (!demandLayout || !supplyLayout || !demandSupply) return null;

  const level = demandLevel[selected.code];

  if (lod === 0 && level !== 1) return null;
  if (lod === 1 && level !== 2) return null;
  if (lod === 2 && level !== 3) return null;

  const ratio = demandSupply[selected.code];
  if (!ratio) return null;

  const d = demandLayout[selected.code];
  if (!d) return null;

  const toSphere = (v, r) =>
    new THREE.Vector3(v.x, v.y, v.z).normalize().multiplyScalar(r);

  return Object.entries(ratio)
    .map(([supply, raw], index, arr) => {
      const s = supplyLayout[supply];
      if (!s) return null;

      const values = Object.values(ratio);
      const max = Math.max(...values);
      const normalized = raw / (max || 1);

      const adjusted = Math.pow(normalized, 1.5);
      const color = getColor(adjusted);

      const start = toSphere(s, SUPPLY_RADIUS * 1.05);
      const end = toSphere(d, SUPPLY_RADIUS * 1.05);
      const camDir = camera.position.clone().normalize();
      const nodeDir = start.clone().normalize();
      const dot = camDir.dot(nodeDir);
      // 旋轉軸
      const axis = new THREE.Vector3().crossVectors(start, end).normalize();
      const angle = start.angleTo(end);

      const normalizedDist = angle / Math.PI;

      // 距離控制
      const heightFactor = 0.08 + Math.pow(normalizedDist, 2) * 0.12;

      const segments = 40;
      const points = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;

        // 沿球面旋轉
        const p = start.clone().applyAxisAngle(axis, angle * t);

        // 中間抬高
        const lift = Math.sin(Math.PI * t) * heightFactor;

        p.normalize().multiplyScalar(SUPPLY_RADIUS * (1 + lift));

        points.push(p);
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, 64, 0.015, 10, false);

      return (
        <mesh key={supply} geometry={geo}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      );
    })
    .filter(Boolean);
}

/* ===================== */
/* Scene */
/* ===================== */

function Scene({ year, onHover, onSelect, selected, showFlow, hovered }) {
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
      <mesh>
        <sphereGeometry args={[3, 64, 64]} />
        <meshPhysicalMaterial
          color="#e5e7eb"
          transparent
          opacity={0.15} // 🔥 半透明
          roughness={0.2}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      <GridSphere />

      <SupplyNodes
        year={year}
        onHover={onHover}
        hovered={hovered}
        selected={selected}
      />

      <DemandNodes
        year={year}
        lod={lod}
        onHover={onHover}
        onSelect={onSelect}
      />

      {showFlow && (
        <SupplyFlowLines year={year} selected={selected} lod={lod} />
      )}

      <OrbitControls enablePan={false} />
    </>
  );
}

/* ===================== */
/* Main */
/* ===================== */

export default function GlobeVisualizer({
  year,
  onHover,
  onSelect,
  selected,
  showFlow,
  hovered,
}) {
  const [showLegendDetail, setShowLegendDetail] = useState(false);
  // 防止資料還沒載入
  if (!supplyLayouts[year] || !demandLayouts[year]) {
    return null;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 3D 球 */}
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <Scene
          year={year}
          onHover={onHover}
          onSelect={onSelect}
          selected={selected}
          showFlow={showFlow}
          hovered={hovered}
        />
      </Canvas>

      <div
        style={{
          position: "absolute",
          left: "40px",
          top: "40px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: "200px",
            padding: "15px",
            borderRadius: "20px",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "12px",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* 標題 */}
          <div style={{ marginBottom: "10px" }}>能源連線強度</div>

          {/* 漸層 */}
          <div
            style={{
              height: "10px",
              borderRadius: "10px",
              background:
                "linear-gradient(to right, #06b6d4 20%, #22c55e 40%, #facc15 60%, #f97316 80%, #ef4444 100%)",
              marginBottom: "5px",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <span>低</span>
            <span>高</span>
          </div>

          {/* 下拉按鈕 */}
          <div
            style={{
              cursor: "pointer",
              fontSize: "12px",
              opacity: 0.8,
            }}
            onClick={() => setShowLegendDetail(!showLegendDetail)}
          >
            {showLegendDetail ? "▲ 收起說明" : "▼ 查看說明"}
          </div>

          {/* 展開內容 */}
          <div
            style={{
              maxHeight: showLegendDetail ? "200px" : "0px",
              opacity: showLegendDetail ? 1 : 0,
              overflow: "hidden",
              transition: "all 0.35s ease",
              marginTop: showLegendDetail ? "8px" : "0px",
            }}
          >
            <div
              style={{
                lineHeight: "1.5",
                fontSize: "12px",
                opacity: 0.9,
              }}
            >
              <div style={{ marginBottom: "5px" }}>
                顏色依同一項目中所有能源使用比例正規化 (0-1)
                後，以連續漸層呈現：
              </div>
              <div>青色（{"< 0.25"}）- 低</div>
              <div>綠色（{"< 0.5"}）- 偏低</div>
              <div>黃色（{"< 0.75"}）- 中等</div>
              <div>橘色（{"< 1"}）- 高</div>
              <div>紅色（{"= 1"}）- 最高</div>

              <div style={{ marginTop: "10px" }}>
                ※ 顏色代表相對強度，與節點位置分布（相似度）不同
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
