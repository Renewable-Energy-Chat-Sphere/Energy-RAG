// GlobeVisualizer.jsx（修正版：語法校對、框架對齊）
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

/* =========================
   常數與小工具
========================= */
const R = 3;
const shortZh = (zh) => (zh || "").replace(/[（）()、，]/g, " ").replace(/\s+/g, " ").trim();

function ll2xyz(latDeg, lonDeg, r = R) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = r * Math.cos(lat) * Math.cos(lon);
  const y = r * Math.sin(lat);
  const z = r * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r = R, seg = 6 }) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const lat = lat0 * (1 - t) + lat1 * t;
    for (let j = 0; j <= seg; j++) {
      const s = j / seg;
      const lon = lon0 * (1 - s) + lon1 * s;
      const p = ll2xyz(lat, lon, r);
      positions.push(p.x, p.y, p.z);
      const n = p.clone().normalize();
      normals.push(n.x, n.y, n.z); // 徑向法線，避免光照造成條紋
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

/* =========================
   經緯線（固定顯示）
========================= */
const GridLines = ({ radius = R, latN = 12, lonN = 12, color = "#64748b", opacity = 0.9 }) => {
  const latGroup = new THREE.Group();
  for (let i = 1; i < latN; i++) {
    const th = (i / latN) * Math.PI;
    const y = radius * Math.cos(th);
    const r = radius * Math.sin(th);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI);
    const pts = curve.getPoints(128);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false });
    const line = new THREE.LineLoop(geo, mat);
    line.rotation.x = Math.PI / 2;
    line.position.y = y;
    line.renderOrder = 20;
    latGroup.add(line);
  }
  const lonGroup = new THREE.Group();
  for (let i = 0; i < lonN; i++) {
    const L = (i / lonN) * 2 * Math.PI;
    const pts = [];
    for (let j = 0; j <= 128; j++) {
      const th = (j / 128) * Math.PI;
      const x = radius * Math.sin(th) * Math.cos(L);
      const y = radius * Math.cos(th);
      const z = radius * Math.sin(th) * Math.sin(L);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 20;
    lonGroup.add(line);
  }
  return (
    <>
      <primitive object={latGroup} />
      <primitive object={lonGroup} />
    </>
  );
};

/* =========================
   單一格 Tile（文字正立、自動適應、顏色透明）
========================= */
function TileOnSphere({ cell, data, color, showText = true, onPick }) {
  const { lat0, lat1, lon0, lon1 } = cell;
  const geo = useMemo(() => sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r: R + 0.02, seg: 6 }), [lat0, lat1, lon0, lon1]);

  const center = useMemo(() => ll2xyz((lat0 + lat1) / 2, (lon0 + lon1) / 2, R + 0.022), [lat0, lat1, lon0, lon1]);
  const uprightQuat = useMemo(() => {
    const n = center.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const yDir = worldUp.clone().sub(n.clone().multiplyScalar(worldUp.dot(n)));
    if (yDir.lengthSq() < 1e-6) yDir.set(0, 0, 1);
    yDir.normalize();
    const xDir = new THREE.Vector3().crossVectors(yDir, n).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(xDir, yDir, n);
    const q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    return q;
  }, [center]);

  const title = shortZh(data.zh) || "";
  const latMid = ((lat0 + lat1) / 2) * Math.PI / 180;
  const dLatRad = Math.abs(lat1 - lat0) * Math.PI / 180;
  const dLonRad = Math.abs(lon1 - lon0) * Math.PI / 180;
  const height = R * dLatRad;
  const width = R * Math.cos(latMid) * dLonRad;
  const pad = 0.02;
  const maxW = Math.max(0.001, width - pad * 2);
  const maxH = Math.max(0.001, height - pad * 2);
  let fontSize = Math.min(maxH, maxW / Math.max(1, title.length * 0.55));
  fontSize = Math.max(0.06, Math.min(fontSize, 0.25));
  const maxChars = Math.max(1, Math.floor(maxW / (fontSize * 0.55)));
  const textShown = title.length > maxChars ? title.slice(0, Math.max(0, maxChars - 1)) + "…" : title;

  const handlePointerOver = () => { document.body.style.cursor = 'pointer'; };
  const handlePointerOut = () => { document.body.style.cursor = 'auto'; };
  const handleClick = () => { onPick && onPick({ cell, data, center }); };

  return (
    <group>
      {/* 可點擊的填色格 */}
      <mesh
        geometry={geo}
        renderOrder={4}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.65}
          depthTest
          depthWrite
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* 中央文字：外層模式才顯示 */}
      {showText && (
        <group position={center} quaternion={uprightQuat}>
          <group position={[0, 0, 0.003]}>
            <Text fontSize={fontSize} color="#0f172a" anchorX="center" anchorY="middle">{textShown}</Text>
          </group>
        </group>
      )}
    </group>
  );
}


/* =========================
   大氣層（美化）
========================= */
// 柔和大氣層（外殼）
const Atmosphere = ({ r = R, opacity = 0.12, color = "#78c7ff" }) => (
  <mesh renderOrder={1}>
    <sphereGeometry args={[r * 1.02, 64, 64]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
  </mesh>
);

// 地平線光暈（Fresnel）
const HorizonGlow = ({ r = R }) => {
  const matRef = React.useRef();
  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#bfe7ff') },
        uPower: { value: 1.6 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position,1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uPower;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main(){
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), uPower);
          gl_FragColor = vec4(uColor, fres * 0.35);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    matRef.current = material;
  }, []);
  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[r * 1.01, 64, 64]} />
      {/* @ts-ignore */}
      <primitive object={matRef.current || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })} />
    </mesh>
  );
};

// 薄雲層（慢速旋轉白霧）
const CloudLayer = ({ r = R }) => {
  const ref = React.useRef();
  useEffect(() => {
    ref.current.rotation.y = 0;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01; // 緩慢旋轉
  });
  return (
    <mesh ref={ref} renderOrder={1.5}>
      <sphereGeometry args={[r * 1.018, 64, 64]} />
      <meshLambertMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
    </mesh>
  );
};

/* =========================
   控制面板 & Portal
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
  const onNum = (k) => (e) => setOptions((o) => ({ ...o, [k]: parseFloat(e.target.value) }));
  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 2147483647, background: "rgba(255,255,255,0.94)", padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", width: 340, fontSize: 13, pointerEvents: "auto" }}>
      <b>Energy Cards 控制台</b>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <label>
          緯向格數：
          <input type="number" min={2} max={90} step={1} value={options.gridLatN} onChange={(e) => setOptions((o) => ({ ...o, gridLatN: Math.max(2, parseInt(e.target.value) || 12) }))} style={{ width: 80, marginLeft: 8 }} />
        </label>
        <label>
          經向格數：
          <input type="number" min={2} max={360} step={1} value={options.gridLonN} onChange={(e) => setOptions((o) => ({ ...o, gridLonN: Math.max(2, parseInt(e.target.value) || 12) }))} style={{ width: 80, marginLeft: 8 }} />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          球體透明度：
          <input type="range" min="0.1" max="1" step="0.05" value={options.sphereOpacity} onChange={onNum("sphereOpacity")} style={{ marginLeft: 8 }} />
          <span style={{ marginLeft: 8 }}>{options.sphereOpacity.toFixed(2)}</span>
        </label>
      </div>
      <div style={{ marginTop: 6, color: "#475569" }}>經緯線固定顯示中</div>
    </div>
  );
};

/* =========================
   場景（赤道帶排布、電價單色上色）
========================= */
// 簡單的相機動畫器：在外層/內層間平滑切換
const CameraRig = ({ active, targetDir }) => {
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (!active) return; // Hook 始終掛著，但未啟動時不動作
    const speed = 4;
    const targetRadius = R - 0.6; // 進內部視距
    const dir = (targetDir && targetDir.clone().normalize()) || new THREE.Vector3(0, 0, 1);
    const targetPos = dir.clone().multiplyScalar(targetRadius);
    camera.position.lerp(targetPos, 1 - Math.exp(-speed * dt));
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const InnerLayer = ({ selection }) => {
  if (!selection) return null;
  const { data, cell } = selection;
  // 內層：僅顯示一個淡色內殼 + 標題（示意）
  return (
    <group>
      <mesh renderOrder={1}>
        <sphereGeometry args={[R * 0.985, 64, 64]} />
        <meshBasicMaterial color="#e6fbf3" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* 中心立體文字（面向中心） */}
      <Text position={[0,0,0]} fontSize={0.3} color="#0f172a" anchorX="center" anchorY="middle">
        {shortZh(data.zh)}
      </Text>
    </group>
  );
};

const Scene = ({ options }) => {
  const { sphereOpacity, gridLatN = 12, gridLonN = 12 } = options;
  const [mode, setMode] = useState('outer'); // 'outer' | 'inner'
  const [selection, setSelection] = useState(null); // {data, cell, center}
  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);

  // ESC 返回外層
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMode('outer'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const priceToColor = (price, minP = 1.5, maxP = 5.0) => {
    const t = Math.max(0, Math.min(1, ((Number(price) || 0) - minP) / Math.max(1e-6, maxP - minP)));
    const a = new THREE.Color('#22c55e');
    const b = new THREE.Color('#ef4444');
    return `#${a.clone().lerp(b, t).getHexString()}`;
  };

  const latBands = Math.max(2, Math.floor(gridLatN));
  const lonBands = Math.max(2, Math.floor(gridLonN));
  const dLat = 180 / latBands;
  const dLon = 360 / lonBands;

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < latBands; i++) {
      const lat0 = -90 + i * dLat;
      const lat1 = lat0 + dLat;
      for (let j = 0; j < lonBands; j++) {
        const lon0 = -180 + j * dLon;
        const lon1 = lon0 + dLon;
        out.push({ lat0, lat1, lon0, lon1, i, j });
      }
    }
    return out;
  }, [latBands, lonBands, dLat, dLon]);

  const equatorBand = useMemo(() => cells.filter((c) => c.lat0 <= 0 && 0 < c.lat1), [cells]);

  const handlePick = ({ cell, data, center }) => { setSelection({ cell, data, center }); setMode('inner'); };
  const targetDir = selection?.center?.clone().normalize() || new THREE.Vector3(0, 0, 1);

  return (
    <>
      {/* 球體與氛圍 */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[R, 128, 128]} />
        <meshPhysicalMaterial
          color="#f8fbff"
          roughness={0.6}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
          sheen={0.35}
          sheenColor={new THREE.Color('#ffffff')}
          sheenRoughness={0.6}
          transparent
          opacity={sphereOpacity}
        />
      </mesh>
      <Atmosphere r={R} opacity={0.07} color="#a7f3d0" />
      <GridLines radius={R} latN={latBands} lonN={lonBands} />

      {/* 外層 tiles（文字只在 outer 顯示） */}
      {S.map((s, i) => {
        const cell = equatorBand[i % equatorBand.length];
        const price = s?.kpi?.price ?? 0;
        const color = `#${new THREE.Color('#22c55e').lerp(new THREE.Color('#ef4444'), Math.max(0, Math.min(1, ((Number(price)||0) - 1.5)/3.5))).getHexString()}`;
        return (
          <TileOnSphere
            key={s.code || i}
            cell={cell}
            data={{ zh: shortZh(s.zh) }}
            color={color}
            showText={mode === 'outer'}
            onPick={handlePick}
          />
        );
      })}

      {/* 內層：只有進入後才顯示 */}
      {mode === 'inner' && <InnerLayer selection={selection} />}

      {/* 返回外層按鈕（只有內層顯示） */}
      {mode === 'inner' && (
        <Html fullscreen>
          <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 2147483647 }}>
            <button onClick={() => setMode('outer')} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: '#ffffff', boxShadow: '0 6px 18px rgba(0,0,0,0.15)', cursor: 'pointer' }}>← 返回外層 (Esc)</button>
          </div>
        </Html>
      )}

      {/* 相機動畫器（外層時不接管相機） */}
      <CameraRig active={mode === 'inner'} targetDir={targetDir} />
    </>
  );
};

/* =========================
   主組件
========================= */
const Globe = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [options, setOptions] = useState({ sphereOpacity: 0.45, gridLatN: 12, gridLonN: 12 });

  useEffect(() => {
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas camera={{ position: [0, 0, 8], fov: 70 }} style={{ width: "100vw", height: "100vh", background: "linear-gradient(#ffffff,#f2fbff)" }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 7, 8]} intensity={0.8} color="#e6fbff" />
        <directionalLight position={[-5, -3, -4]} intensity={0.3} color="#ccf0ff" />
        <OrbitControls enablePan={false} enableZoom makeDefault />
        <Scene options={options} />
      </Canvas>

      <Portal>
        <button onClick={() => setShowPanel((s) => !s)} title="切換控制面板 (P)" style={{ position: "fixed", top: 12, right: 12, zIndex: 2147483647, padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.15)", fontSize: 14 }}>⚙️ 面板</button>
        {showPanel && <Panel options={options} setOptions={setOptions} />}
      </Portal>
    </>
  );
};

export default Globe;
