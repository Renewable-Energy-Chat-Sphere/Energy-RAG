// GlobeVisualizer.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";            // ⚠️ 新增 useFrame
import { OrbitControls, Text, Billboard } from "@react-three/drei"; // ⚠️ 新增 Billboard
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

// ── 常數
const R = 3;
const R_INNER = R * 0.75;
const COLOR_LOW = "#22c55e";
const COLOR_HIGH = "#ef4444";

// ── 小工具
const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
const lerpColor = (a, b, t) => {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return `#${A.clone().lerp(B, clamp01(t)).getHexString()}`;
};
const normalize = (x, a, b) => clamp01(((Number(x) ?? a) - a) / Math.max(1e-9, b - a));
const normalizeInvert = (x, a, b) => 1 - normalize(x, a, b);
const projectToSphere = (v, r) => v.clone().setLength(r || v.length() || 1);

// ── Haptics：更順的觸覺回饋（節流＋分級）
function createHaptics(enabled = true) {
  const supports = typeof navigator !== "undefined" && "vibrate" in navigator;
  const rm = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0;
  const throttle = (fn) => (...args) => {
    const now = performance.now();
    if (now - last < 45) return; // 45ms 節流，避免抖動
    last = now;
    fn(...args);
  };
  const vibrate = (pat) => {
    if (!enabled || rm || !supports) return;
    try { navigator.vibrate(pat); } catch {}
  };
  return {
    tick: throttle(() => vibrate(8)),                 // 輕觸
    press: throttle(() => vibrate([10, 25, 12])),     // 按下
    success: throttle(() => vibrate([9, 18, 9, 18, 12])), // 完成
    weight: throttle((w) => {                         // 依權重漸進
      const d = Math.round(6 + 24 * clamp01(w));
      vibrate([d, 12, d]);
    }),
  };
}

// ── Golden-Spiral 均勻分布
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

// ── 需求端 Demo
const mockDemand = [
  { code: "D_IND", zh: "工業部門", mix: { SOLAR_TW_utility: 0.10, WIND_TW_offshore: 0.15, HYDRO_TW: 0.05, BIOMASS_TW: 0.10, WIND_TW_onshore: 0.10, SOLAR_TW_rooftop: 0.05 }, value: 4200 },
  { code: "D_TRA", zh: "運輸部門", mix: { SOLAR_TW_rooftop: 0.05, WIND_TW_onshore: 0.05, HYDRO_TW: 0.02 }, value: 3600 },
  { code: "D_RES", zh: "住宅部門", mix: { SOLAR_TW_rooftop: 0.35, HYDRO_TW: 0.15, WIND_TW_onshore: 0.08 }, value: 1800 },
  { code: "D_SER", zh: "服務業部門", mix: { SOLAR_TW_utility: 0.18, WIND_TW_offshore: 0.12, HYDRO_TW: 0.07, SOLAR_TW_rooftop: 0.12 }, value: 2600 },
  { code: "D_AGR", zh: "農業部門", mix: { BIOMASS_TW: 0.30, SOLAR_TW_rooftop: 0.20, HYDRO_TW: 0.05 }, value: 900 },
];

// ── 顏色/大小
const colorByPrice = (price, [minP, maxP] = [1.5, 5.0]) =>
  lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalizeInvert(price, minP, maxP));
const nodeScale = (v, [mn, mx]) => 0.16 + 0.55 * Math.sqrt(normalize(v, mn, mx));

// ── 經緯線
const GridLines = ({ radius = R, latN = 12, lonN = 12, color = "#999", opacity = 0.35 }) => {
  const lat = new THREE.Group();
  for (let i = 1; i < latN; i++) {
    const th = (i / latN) * Math.PI;
    const y = radius * Math.cos(th);
    const r = radius * Math.sin(th);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI);
    const pts = curve.getPoints(96);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
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
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    lon.add(new THREE.Line(geo, mat));
  }
  return (
    <>
      <primitive object={lat} />
      <primitive object={lon} />
    </>
  );
};

// ── Label：永遠正向（面向相機、避免翻轉/鏡像、雙面可見）
const Label = ({ position, text, fontSize = 0.13, color = "#111", anchorY = "bottom" }) => (
  <Billboard follow={true} lockZ={true} position={position}>
    <Text
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY={anchorY}
      // 讓文字筆畫永遠朝向相機，避免從背面看鏡像
      depthOffset={1}
      outlineWidth={0.002}
      outlineColor="#ffffff"
      outlineOpacity={0.85}
    >
      {text}
      {/* DoubleSide 確保任何角度可見但不鏡像（因為 Billboard 總是面向相機） */}
      <meshBasicMaterial attach="material" side={THREE.DoubleSide} />
    </Text>
  </Billboard>
);

// ── Node（平滑放大 + 觸覺回饋）
const NodeBillboard = ({ pos, size, color, top, bottom, onClick, haptics }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const grp = useRef();
  const target = useRef(1);

  useEffect(() => { target.current = hovered ? 1.08 : 1; }, [hovered]);
  useEffect(() => { if (pressed) target.current = 1.12; }, [pressed]);

  // 平滑補間（比瞬間 scale 更像原生觸覺）
  useFrame((_, dt) => {
    if (!grp.current) return;
    const s = grp.current.scale.x;
    const next = THREE.MathUtils.damp(s, target.current, 8, dt); // 阻尼補間
    grp.current.scale.setScalar(next);
  });

  return (
    <group
      ref={grp}
      position={pos}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; haptics?.tick(); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
      onPointerDown={(e) => { e.stopPropagation(); setPressed(true); haptics?.press(); }}
      onPointerUp={(e) => { e.stopPropagation(); setPressed(false); haptics?.success(); onClick && onClick(); }}
    >
      <mesh>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
      </mesh>
      {top && <Label position={[0, size + 0.06, 0]} text={top} fontSize={0.14} color="#111" anchorY="bottom" />}
      {bottom && <Label position={[0, -size - 0.06, 0]} text={bottom} fontSize={0.11} color="#333" anchorY="top" />}
    </group>
  );
};

const BezierLink = ({ a, b, bulge = 0.15, color = "#888", opacity = 0.45 }) => {
  const av = new THREE.Vector3(...a);
  const bv = new THREE.Vector3(...b);
  const mid = av.clone().add(bv).multiplyScalar(0.5).setLength(R * (1 + bulge));
  const curve = new THREE.CubicBezierCurve3(av, mid, mid, bv);
  const points = curve.getPoints(64);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
};

// ── 場景
const Scene = ({ options }) => {
  const {
    showGrid, showSupply, showDemand, showLinks,
    alpha, colorMode, linkOpacity, linkBulge,
    supplyScale, demandScale, haptics: hapticsOn,        // ⚠️ 新增 haptics
  } = options;

  const innerR = R * alpha;
  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);
  const supplyPos = useMemo(() => {
    const pts = goldenSpiralPositions(S.length, R);
    const map = new Map();
    S.forEach((s, i) => map.set(s.code, pts[i]));
    return map;
  }, [S]);

  const demandPos = useMemo(() => {
    const map = new Map();
    for (const d of mockDemand) {
      const vec = new THREE.Vector3(); let sum = 0;
      for (const [code, w] of Object.entries(d.mix || {})) {
        const p = supplyPos.get(code); if (!p) continue;
        const wv = Math.max(0, Number(w) || 0);
        vec.add(p.clone().multiplyScalar(wv)); sum += wv;
      }
      const pos = sum > 0 ? projectToSphere(vec.multiplyScalar(1 / sum), innerR)
                          : new THREE.Vector3(0, 1, 0).multiplyScalar(innerR);
      map.set(d.code, pos);
    }
    return map;
  }, [supplyPos, innerR]);

  const sVals = S.map((s) => (s.kpi?.capacity_installed || 0) + 0.3 * (s.kpi?.capacity_potential || 0));
  const sRange = [Math.min(...sVals, 1), Math.max(...sVals, 10)];
  const dVals = mockDemand.map((d) => d.value || 0);
  const dRange = [Math.min(...dVals, 1), Math.max(...dVals, 10)];

  const colorOfSupply = (s) => {
    const k = s.kpi || {};
    if (colorMode === "price")  return colorByPrice(k.price ?? 0, [1.5, 5.0]);
    if (colorMode === "policy") return lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalize(k.policy_index ?? 0, 0, 1));
    if (colorMode === "usage")  return lerpColor(COLOR_LOW, COLOR_HIGH, 1 - normalize(k.usage_match ?? 0, 0, 1));
    return "#9ca3af";
  };

  const h = useMemo(() => createHaptics(hapticsOn), [hapticsOn]); // ⚠️ 建立 haptics

  return (
    <>
      {showGrid && <GridLines radius={R} />}
      {showGrid && <GridLines radius={innerR} color="#bbb" opacity={0.25} />}

      {/* 供給節點 */}
      {showSupply && S.map((s) => {
        const p = supplyPos.get(s.code);
        const base = (s.kpi?.capacity_installed || 0) + 0.3 * (s.kpi?.capacity_potential || 0);
        const size = nodeScale(base, sRange) * supplyScale;
        const color = colorOfSupply(s);
        return (
          <NodeBillboard
            key={s.code}
            pos={[p.x, p.y, p.z]}
            size={size}
            color={color}
            top={s.code}
            bottom={s.zh || s.en}
            haptics={h}
          />
        );
      })}

      {/* 需求節點 + 連線 */}
      {showDemand && mockDemand.map((d) => {
        const p = demandPos.get(d.code);
        const size = nodeScale(d.value || 0, dRange) * demandScale;
        return (
          <group key={d.code}>
            {showLinks && Object.entries(d.mix || {}).map(([code, w]) => {
              const sp = supplyPos.get(code);
              if (!sp || w <= 0) return null;
              const a = [p.x, p.y, p.z], b = [sp.x, sp.y, sp.z];
              const c = lerpColor("#94a3b8", "#e11d48", clamp01(w));
              return (
                <BezierLink
                  key={`${d.code}-${code}`}
                  a={a} b={b}
                  bulge={(0.12 + 0.12 * clamp01(w)) * linkBulge}
                  color={c}
                  opacity={(0.25 + 0.45 * clamp01(w)) * linkOpacity}
                />
              );
            })}
            <NodeBillboard
              pos={[p.x, p.y, p.z]}
              size={size}
              color="#2563eb"
              top={d.code}
              bottom={d.zh}
              haptics={h}
            />
          </group>
        );
      })}
    </>
  );
};

// ── Portal
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

// ── 面板（+ 觸覺開關）
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
      <b>Energy Sphere 控制台</b>
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
        <label><input type="checkbox" checked={options.showSupply} onChange={on("showSupply")} /> 顯示供給</label>
        <label><input type="checkbox" checked={options.showDemand} onChange={on("showDemand")} /> 顯示需求</label>
        <label><input type="checkbox" checked={options.showLinks}  onChange={on("showLinks")}  /> 顯示連線</label>
        <label><input type="checkbox" checked={options.showGrid}   onChange={on("showGrid")}   /> 顯示網格</label>
        <label><input type="checkbox" checked={options.haptics}   onChange={on("haptics")}    /> 觸覺回饋</label>
      </div>
      <div style={{marginTop:10}}>
        內外層距離 α（R_INNER/R）：{options.alpha.toFixed(2)}
        <input type="range" min={0.6} max={0.9} step={0.01} value={options.alpha} onChange={onNum("alpha")} style={{width:"100%"}} />
      </div>
      <div style={{marginTop:10}}>
        連線透明度倍率：{options.linkOpacity.toFixed(2)}
        <input type="range" min={0.2} max={1.5} step={0.05} value={options.linkOpacity} onChange={onNum("linkOpacity")} style={{width:"100%"}} />
        連線鼓度倍率：{options.linkBulge.toFixed(2)}
        <input type="range" min={0.5} max={2.0} step={0.05} value={options.linkBulge} onChange={onNum("linkBulge")} style={{width:"100%"}} />
      </div>
      <div style={{marginTop:10}}>
        供給節點大小倍率：{options.supplyScale.toFixed(2)}
        <input type="range" min={0.5} max={1.8} step={0.05} value={options.supplyScale} onChange={onNum("supplyScale")} style={{width:"100%"}} />
        需求節點大小倍率：{options.demandScale.toFixed(2)}
        <input type="range" min={0.5} max={1.8} step={0.05} value={options.demandScale} onChange={onNum("demandScale")} style={{width:"100%"}} />
      </div>
      <div style={{marginTop:8, color:"#475569"}}>
        小撇步：按 <b>P</b> 顯示/隱藏面板。
      </div>
    </div>
  );
};

const Globe = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [options, setOptions] = useState({
    colorMode: "price",
    showSupply: true,
    showDemand: true,
    showLinks:  true,
    showGrid:   true,
    haptics:    true,      // ⚠️ 新增：觸覺回饋開關
    alpha: R_INNER / R,
    linkOpacity: 1.0,
    linkBulge:   1.0,
    supplyScale: 1.0,
    demandScale: 1.0,
  });

  useEffect(() => {
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas camera={{ position: [0, 0, 9], fov: 70 }} style={{ width: "100vw", height: "100vh" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls enablePan={false} enableZoom={true} />
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
