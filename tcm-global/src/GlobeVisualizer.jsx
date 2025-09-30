// GlobeVisualizer.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

/* =========================
   常數 & 小工具
========================= */
const R = 3;
const COLOR_LOW = "#22c55e";  // 便宜 = 綠
const COLOR_HIGH = "#ef4444"; // 昂貴 = 紅

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
const lerpColor = (a, b, t) => {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return `#${A.clone().lerp(B, clamp01(t)).getHexString()}`;
};
const normalize = (x, a, b) => clamp01(((Number(x) ?? a) - a) / Math.max(1e-9, b - a));

function lighten(hex, amt = 0.25) {
  const c = new THREE.Color(hex);
  const w = new THREE.Color("#ffffff");
  return `#${c.clone().lerp(w, clamp01(amt)).getHexString()}`;
}

const shortZh = (zh) => (zh || "")
  .replace(/（/g, " ").replace(/）/g, "")
  .replace(/[()]/g, "").replace(/[、，]/g, " ")
  .replace(/\s+/g, " ").trim();

/* =========================
   佈點：golden spiral（初始卡片錨點）
========================= */
function goldenSpiralPositions(n, radius) {
  if (n <= 1) return [new THREE.Vector3(0, 1, 0).multiplyScalar(radius)];
  const out = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    out.push(new THREE.Vector3(x, y, z).multiplyScalar(radius));
  }
  return out;
}

/* =========================
   防卡入：沿球面法線抬升
========================= */
function posWithLift(pos, lift) {
  const v = Array.isArray(pos) ? new THREE.Vector3(pos[0], pos[1], pos[2]) : pos.clone();
  const u = v.clone().normalize();
  const rr = R + Math.max(0, lift);
  return [u.x * rr, u.y * rr, u.z * rr];
}
const LIFTS = {
  far: 0.10,
  mid: 0.20,
  near: 0.30,
};

/* =========================
   CardLOD：依相機到卡片距離決定 far/mid/near
   （靠近「區塊」才顯示更詳細）
========================= */
function CardLOD({ pos, thresholds = { far: 6.5, mid: 4.2 }, children }) {
  const { camera } = useThree();
  const levelRef = useRef("far");
  const [, force] = useState(0);

  useFrame(() => {
    const d = new THREE.Vector3(...pos).distanceTo(camera.position);
    let next = "near";
    if (d > thresholds.far) next = "far";
    else if (d > thresholds.mid) next = "mid";
    if (next !== levelRef.current) {
      levelRef.current = next;
      // 觸發 rerender
      force((n) => n + 1);
    }
  });

  return children(levelRef.current);
}

/* =========================
   球體（透明度可控）
========================= */
function EarthSphere({ R = 3, opacity = 0.45, color = "#77a6ff" }) {
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[R, 128, 128]} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0.0}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

/* =========================
   著色：便宜綠 → 昂貴紅（或依其他指標）
========================= */
const colorByPrice = (price, [minP, maxP] = [1.5, 5.0]) =>
  lerpColor(COLOR_LOW, COLOR_HIGH, normalize(price, minP, maxP)); // 低價→0(綠)，高價→1(紅)
const colorByPolicy = (p) => lerpColor(COLOR_LOW, COLOR_HIGH, normalize(p ?? 0, 0, 1));
const colorByUsage  = (u) => lerpColor(COLOR_LOW, COLOR_HIGH, normalize(u ?? 0, 0, 1));

function colorOfSupply(s, mode) {
  const k = s.kpi || {};
  if (mode === "price")  return colorByPrice(k.price ?? 0);
  if (mode === "policy") return colorByPolicy(k.policy_index);
  if (mode === "usage")  return colorByUsage(k.usage_match);
  return "#9ca3af";
}

/* =========================
   UI 元件（都用 Billboard，字永遠正面）
========================= */
const TextOnlyCard = ({ pos, title, subtitle = "" }) => (
  <Billboard follow position={pos}>
    <group renderOrder={10}>
      <Text fontSize={0.16} color="#0f172a" anchorX="center" anchorY="bottom">
        {title}
      </Text>
      {!!subtitle && (
        <Text position={[0, -0.14, 0]} fontSize={0.11} color="#475569" anchorX="center" anchorY="top">
          {subtitle}
        </Text>
      )}
    </group>
  </Billboard>
);

function RoundedPanel({ w = 1, h = 0.6, r = 0.08, fill = "#ffffff", border = "#e5e7eb", opacity = 0.96 }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    const rr = Math.min(r, hw, hh);
    s.moveTo(-hw + rr, -hh);
    s.lineTo(hw - rr, -hh); s.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
    s.lineTo(hw, hh - rr);  s.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
    s.lineTo(-hw + rr, hh); s.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
    s.lineTo(-hw, -hh + rr);s.absarc(-hw + rr, -hh + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
    return s;
  }, [w, h, r]);
  const geo = useMemo(() => new THREE.ShapeGeometry(shape, 32), [shape]);
  return (
    <group>
      {/* 背板 */}
      <mesh geometry={geo} position={[0, 0, 0.001]}>
        <meshStandardMaterial color={fill} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {/* 邊框 */}
      <mesh geometry={geo} position={[0, 0, 0.002]}>
        <meshBasicMaterial color={border} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

function MidPanel({ pos, title, subtitle, baseColor }) {
  const fill = lighten(baseColor, 0.65);
  const border = lighten(baseColor, 0.45);
  return (
    <Billboard follow position={pos}>
      <RoundedPanel w={1.2} h={0.62} r={0.1} fill={fill} border={border} opacity={0.97} />
      <group renderOrder={30}>
        <Text position={[0, 0.12, 0.01]} fontSize={0.14} color="#0f172a" anchorX="center" anchorY="middle">
          {title}
        </Text>
        {subtitle && (
          <Text position={[0, -0.08, 0.01]} fontSize={0.1} color="#334155" anchorX="center" anchorY="middle">
            {subtitle}
          </Text>
        )}
      </group>
    </Billboard>
  );
}

function DetailPanel({ pos, data, baseColor }) {
  const k = data.kpi || {};
  const title = data.zh || data.en || data.code;
  const priceStr = (k.price ?? "-") + " NT$/kWh";
  const capStr = `${k.capacity_installed ?? "-"} / ${k.capacity_potential ?? "-"} MW`;
  const polStr = (k.policy_index ?? "-");
  const useStr = (k.usage_match ?? "-");
  const emiStr = (k.emissions_avoided ?? "-") + " MtCO2e/yr";
  const events = Array.isArray(data.recent_events) ? data.recent_events.slice(0, 3) : [];

  const fill = lighten(baseColor, 0.55);
  const border = lighten(baseColor, 0.35);

  return (
    <Billboard follow position={pos}>
      <RoundedPanel w={1.7} h={1.1} r={0.12} fill={fill} border={border} opacity={0.985} />
      <group renderOrder={50}>
        <Text position={[0, 0.37, 0.01]} fontSize={0.16} color="#0f172a" anchorX="center" anchorY="middle">
          {title}
        </Text>

        <Text position={[-0.74, 0.14, 0.01]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle">
          價格：{priceStr}
        </Text>
        <Text position={[-0.74, 0.02, 0.01]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle">
          裝置/潛力：{capStr}
        </Text>
        <Text position={[-0.74, -0.10, 0.01]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle">
          政策指數：{polStr}　契合度：{useStr}
        </Text>
        <Text position={[-0.74, -0.22, 0.01]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle">
          減排：{emiStr}
        </Text>

        <Text position={[-0.74, -0.40, 0.01]} fontSize={0.1} color="#334155" anchorX="left" anchorY="middle">
          近期事件：
        </Text>
        {events.map((ev, idx) => (
          <Text key={ev.id || idx} position={[-0.74, -0.52 - idx * 0.12, 0.01]} fontSize={0.092} color="#475569" anchorX="left" anchorY="middle">
            {`${ev.ts || ""} ｜ ${ev.type || ""}`}
          </Text>
        ))}
      </group>
    </Billboard>
  );
}

/* =========================
   供給卡片：整合 LOD + 顏色 + 防卡入
========================= */
function SupplyBlockLOD({ posBase, data, colorMode }) {
  const baseColor = colorOfSupply(data, colorMode);
  const farTitle = shortZh(data.zh) || data.code;
  const midTitle = farTitle;
  const midSub = data.en || "";

  return (
    <CardLOD pos={posBase}>
      {(level) => {
        const pos =
          level === "far" ? posWithLift(posBase, LIFTS.far) :
          level === "mid" ? posWithLift(posBase, LIFTS.mid) :
                            posWithLift(posBase, LIFTS.near);

        if (level === "far") return <TextOnlyCard pos={pos} title={farTitle} subtitle={""} />;
        if (level === "mid") return <MidPanel pos={pos} title={midTitle} subtitle={midSub} baseColor={baseColor} />;
        return <DetailPanel pos={pos} data={data} baseColor={baseColor} />;
      }}
    </CardLOD>
  );
}

/* =========================
   場景
========================= */
const Scene = ({ options }) => {
  const { colorMode, showGrid, sphereOpacity } = options;

  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);
  const positions = useMemo(
    () => goldenSpiralPositions(S.length, R * 1.02).map((v) => [v.x, v.y, v.z]),
    [S.length]
  );

  return (
    <>
      <EarthSphere R={R} opacity={sphereOpacity} color="#77a6ff" />
      {showGrid && <GridLines radius={R} />}

      {S.map((s, i) => (
        <SupplyBlockLOD key={s.code || i} posBase={positions[i]} data={s} colorMode={colorMode} />
      ))}
    </>
  );
};

/* =========================
   經緯線（簡版）
========================= */
const GridLines = ({ radius = R, latN = 12, lonN = 12, color = "#cbd5e1", opacity = 0.5 }) => {
  const lat = new THREE.Group();
  for (let i = 1; i < latN; i++) {
    const th = (i / latN) * Math.PI;
    const y = radius * Math.cos(th);
    const r = radius * Math.sin(th);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI);
    const pts = curve.getPoints(96);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const line = new THREE.LineLoop(geo, mat);
    line.rotation.x = Math.PI / 2;
    line.position.y = y;
    lat.add(line);
  }
  const lon = new THREE.Group();
  for (let i = 0; i < lonN; i++) {
    const L = (i / lonN) * 2 * Math.PI;
    const pts = [];
    for (let j = 0; j <= 96; j++) {
      const th = (j / 96) * Math.PI;
      const x = radius * Math.sin(th) * Math.cos(L);
      const y = radius * Math.cos(th);
      const z = radius * Math.sin(th) * Math.sin(L);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    lon.add(new THREE.Line(geo, mat));
  }
  return (<><primitive object={lat} /><primitive object={lon} /></>);
};

/* =========================
   Portal & 控制面板
========================= */
const Portal = ({ children }) => {
  const [el] = useState(() => document.createElement("div"));
  useEffect(() => {
    el.style.position = "relative";
    el.style.zIndex = "2147483647";
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, [el]);
  return createPortal(children, el);
};

const Panel = ({ options, setOptions }) => {
  const on = (k) => (e) =>
    setOptions((o) => ({
      ...o,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));
  const onNum = (k) => (e) =>
    setOptions((o) => ({ ...o, [k]: parseFloat(e.target.value) }));

  return (
    <div style={{
      position:"fixed", top:12, left:12, zIndex:2147483647,
      background:"rgba(255,255,255,0.94)", padding:12, borderRadius:10,
      border:"1px solid #e5e7eb", boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
      width:320, fontSize:13, pointerEvents:"auto"
    }}>
      <b>Energy Cards 控制台</b>
      <div style={{marginTop:8}}>
        <label>顏色模式：
          <select value={options.colorMode} onChange={on("colorMode")} style={{marginLeft:8}}>
            <option value="price">價格（便宜綠→昂貴紅）</option>
            <option value="policy">政策（弱綠→強紅）</option>
            <option value="usage">用電匹配（低綠→高紅）</option>
          </select>
        </label>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10}}>
        <label><input type="checkbox" checked={options.showGrid} onChange={on("showGrid")} /> 顯示經緯線</label>
      </div>
      <div style={{marginTop:10}}>
        <label>球體透明度：
          <input type="range" min="0.1" max="1" step="0.05" value={options.sphereOpacity} onChange={onNum("sphereOpacity")} style={{marginLeft:8}} />
          <span style={{marginLeft:8}}>{options.sphereOpacity.toFixed(2)}</span>
        </label>
      </div>
    </div>
  );
};

/* =========================
   主組件
========================= */
const Globe = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [options, setOptions] = useState({
    colorMode: "price",
    showGrid: true,
    sphereOpacity: 0.45,
  });

  useEffect(() => {
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas camera={{ position: [0, 0, 8], fov: 70 }} style={{ width: "100vw", height: "100vh", background: "#ffffff" }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 5, 6]} intensity={1.0} />
        <OrbitControls enablePan={false} enableZoom makeDefault />
        <Scene options={options} />
      </Canvas>

      <Portal>
        <button
          onClick={() => setShowPanel((s) => !s)}
          title="切換控制面板 (P)"
          style={{ position:"fixed", top:12, right:12, zIndex:2147483647, padding:"8px 10px", borderRadius:10, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", boxShadow:"0 6px 18px rgba(0,0,0,0.15)", fontSize:14 }}
        >
          ⚙️ 面板
        </button>
        {showPanel && <Panel options={options} setOptions={setOptions} />}
      </Portal>
    </>
  );
};

export default Globe;
