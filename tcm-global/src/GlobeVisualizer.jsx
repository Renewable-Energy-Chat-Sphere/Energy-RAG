// GlobeVisualizer.jsx
import React, { useMemo, useState, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

/* =========================
   常數 & 小工具
========================= */
const R = 3;
const COLOR_LOW = "#22c55e";
const COLOR_HIGH = "#ef4444";

const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
const lerpColor = (a, b, t) => {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return `#${A.clone().lerp(B, clamp01(t)).getHexString()}`;
};
const normalize = (x, a, b) => clamp01(((Number(x) ?? a) - a) / Math.max(1e-9, b - a));
const normalizeInvert = (x, a, b) => 1 - normalize(x, a, b);

// 讓彩色面板更柔和一點（基色→更亮）
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
   Haptics（可關）
========================= */
function createHaptics(enabled = true) {
  const supports = typeof navigator !== "undefined" && "vibrate" in navigator;
  const rm = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0;
  const throttle = (fn) => (...args) => {
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    fn(...args);
  };
  const vibrate = (pat) => { if (!enabled || rm || !supports) return; try { navigator.vibrate(pat); } catch {} };
  return {
    tick: throttle(() => vibrate(8)),
    press: throttle(() => vibrate([10, 25, 12])),
    success: throttle(() => vibrate([9, 18, 9, 18, 12])),
  };
}

/* =========================
   佈點：把面板貼在球體外 1.02R
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
   LOD（有「遲滯」避免閃爍）
========================= */
const ZoomCtx = React.createContext({ dist: 8, level: "far" });

function ZoomProvider({ children }) {
  const { camera } = useThree();
  const [level, setLevel] = useState("far");
  const distRef = useRef(camera.position.length());

  // 門檻 + 遲滯：避免在邊界反覆切換
  const FAR_MID = 7.0, MID_NEAR = 4.6, HYST = 0.4;

  useFrame(() => {
    const d = camera.position.length();
    distRef.current = d;
    let next = level;
    if (level === "far") {
      if (d < FAR_MID - HYST) next = "mid";
    } else if (level === "mid") {
      if (d > FAR_MID + HYST) next = "far";
      else if (d < MID_NEAR - HYST) next = "near";
    } else { // near
      if (d > MID_NEAR + HYST) next = "mid";
    }
    if (next !== level) setLevel(next);
  });

  const value = useMemo(() => ({ dist: distRef.current, level }), [level]);
  return <ZoomCtx.Provider value={value}>{children}</ZoomCtx.Provider>;
}
function useZoom() { return useContext(ZoomCtx); }
function ShowAt({ when = [], children }) {
  const { level } = useZoom();
  const ok = Array.isArray(when) ? when.includes(level) : when === level;
  return ok ? children : null;
}

/* =========================
   球體（半透明但非全透）
========================= */
function EarthSphere({ R = 3, baseOpacity = 0.45, color = "#77a6ff" }) {
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[R, 96, 96]} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0.0}
        transparent
        opacity={baseOpacity}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

/* =========================
   顏色模式（沿用你原本邏輯）
========================= */
const colorByPrice = (price, [minP, maxP] = [1.5, 5.0]) =>
  lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalizeInvert(price, minP, maxP));
const colorByPolicy = (p) => lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalize(p ?? 0, 0, 1));
const colorByUsage  = (u) => lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalize(u ?? 0, 0, 1));

function colorOfSupply(s, mode) {
  const k = s.kpi || {};
  if (mode === "price")  return colorByPrice(k.price ?? 0, [1.5, 5.0]);
  if (mode === "policy") return colorByPolicy(k.policy_index);
  if (mode === "usage")  return colorByUsage(k.usage_match);
  return "#9ca3af";
}

/* =========================
   UI 元件：純文字／中面板／細節面板
   （加上 renderOrder + depthWrite/DepthTest 以減少閃爍）
========================= */
const TextOnlyCard = ({ pos, title, subtitle = "", titleSize = 0.16, subSize = 0.11 }) => (
  <Billboard follow lockZ position={pos}>
    <group renderOrder={10}>
      {!!title && (
        <Text
          fontSize={titleSize}
          color="#111827"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="#ffffff"
          outlineOpacity={0.95}
          depthOffset={2}
        >
          {title}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
      )}
      {!!subtitle && (
        <Text
          position={[0, -0.14, 0]}
          fontSize={subSize}
          color="#4b5563"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.006}
          outlineColor="#ffffff"
          outlineOpacity={0.95}
          depthOffset={2}
        >
          {subtitle}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
      )}
    </group>
  </Billboard>
);

function RoundedPanel({ w = 1, h = 0.6, r = 0.08, fill = "#ffffff", border = "#e5e7eb", opacity = 0.96, ro = 5 }) {
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
    <group renderOrder={ro}>
      <mesh geometry={geo} position={[0, 0, 0.0005]}>
        <meshStandardMaterial
          color={fill}
          transparent
          opacity={opacity}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geo} position={[0, 0, 0.0006]}>
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
      <RoundedPanel w={1.2} h={0.62} r={0.1} fill={fill} border={border} opacity={0.96} ro={20} />
      <group renderOrder={30}>
        <Text position={[0, 0.12, 0]} fontSize={0.14} color="#0f172a" anchorX="center" anchorY="middle" depthOffset={3}>
          {title}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
        {subtitle && (
          <Text position={[0, -0.08, 0]} fontSize={0.1} color="#334155" anchorX="center" anchorY="middle" depthOffset={3}>
            {subtitle}
            <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
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
      <RoundedPanel w={1.7} h={1.1} r={0.12} fill={fill} border={border} opacity={0.98} ro={40} />
      <group renderOrder={50}>
        <Text position={[0, 0.37, 0]} fontSize={0.16} color="#0f172a" anchorX="center" anchorY="middle" depthOffset={4}>
          {title}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>

        <Text position={[-0.74, 0.14, 0]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle" depthOffset={4}>
          價格：{priceStr}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
        <Text position={[-0.74, 0.02, 0]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle" depthOffset={4}>
          裝置/潛力：{capStr}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
        <Text position={[-0.74, -0.10, 0]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle" depthOffset={4}>
          政策指數：{polStr}　契合度：{useStr}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
        <Text position={[-0.74, -0.22, 0]} fontSize={0.1} color="#111827" anchorX="left" anchorY="middle" depthOffset={4}>
          減排：{emiStr}
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>

        <Text position={[-0.74, -0.40, 0]} fontSize={0.1} color="#334155" anchorX="left" anchorY="middle" depthOffset={4}>
          近期事件：
          <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
        </Text>
        {events.map((ev, idx) => (
          <Text key={ev.id || idx} position={[-0.74, -0.52 - idx * 0.12, 0]} fontSize={0.092} color="#475569" anchorX="left" anchorY="middle" depthOffset={4}>
            {`${ev.ts || ""} ｜ ${ev.type || ""}`}
            <meshBasicMaterial attach="material" depthTest={false} depthWrite={false} toneMapped={false} />
          </Text>
        ))}
      </group>
    </Billboard>
  );
}

/* =========================
   供給 LOD 包裝（遠→中→近）
========================= */
function SupplyBlockLOD({ pos, data, haptics, colorMode }) {
  const k = data.kpi || {};
  const baseColor = colorOfSupply(data, colorMode);
  const farTitle = shortZh(data.zh) || data.code;
  const midTitle = farTitle;
  const midSub = data.en || "";

  return (
    <>
      <ShowAt when={["far"]}>
        <TextOnlyCard pos={pos} title={farTitle} subtitle={""} />
      </ShowAt>

      <ShowAt when={["mid"]}>
        <MidPanel pos={pos} title={midTitle} subtitle={midSub} baseColor={baseColor} />
      </ShowAt>

      <ShowAt when={["near"]}>
        <DetailPanel pos={pos} data={data} baseColor={baseColor} />
      </ShowAt>
    </>
  );
}

/* =========================
   場景
========================= */
const Scene = ({ options }) => {
  const { haptics: hapticsOn, colorMode, showGrid } = options;

  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);
  const positions = useMemo(() => {
    // 貼著球面外緣，卡片位置在 1.02R
    const pts = goldenSpiralPositions(S.length, R * 1.02);
    return pts.map((v) => [v.x, v.y, v.z]);
  }, [S.length]);

  const h = useMemo(() => createHaptics(hapticsOn), [hapticsOn]);

  return (
    <>
      {/* 球體（非全透明） */}
      <EarthSphere R={R} baseOpacity={0.45} color="#77a6ff" />

      {/* （可選）經緯線，想要就打開 */}
      {showGrid && <GridLines radius={R} />}

      {/* 供給資料卡 */}
      {S.map((s, i) => (
        <SupplyBlockLOD key={s.code || i} pos={positions[i]} data={s} haptics={h} colorMode={colorMode} />
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
   Portal & 面板
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
  const on = (k) => (e) => setOptions((o) => ({ ...o, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const onNum = (k) => (e) => setOptions((o) => ({ ...o, [k]: parseFloat(e.target.value) }));
  return (
    <div style={{
      position:"fixed", top:12, left:12, zIndex:2147483647,
      background:"rgba(255,255,255,0.94)", padding:12, borderRadius:10,
      border:"1px solid #e5e7eb", boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
      width:300, fontSize:13, pointerEvents:"auto"
    }}>
      <b>Energy Cards 控制台（球體＋顏色 LOD）</b>
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
        <label><input type="checkbox" checked={options.haptics} onChange={on("haptics")} /> 觸覺回饋</label>
      </div>
      <div style={{marginTop:8, color:"#475569"}}>
        小撇步：縮放切換層級；遠＝只文字、中＝小面板、近＝詳細卡片。
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
    haptics: true,
  });

  useEffect(() => {
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 70 }}
        style={{ width: "100vw", height: "100vh", background: "#ffffff" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 6]} intensity={0.9} />
        <OrbitControls enablePan={false} enableZoom makeDefault />
        <ZoomProvider>
          <Scene options={options} />
        </ZoomProvider>
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
