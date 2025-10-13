// GlobeVisualizer.jsx — 進/出內層、小平台正向、內層滾輪不出殼、平台左上角返回
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

/* =========================
   常數 & 小工具
========================= */
const R = 3;
const shortZh = (zh) =>
  (zh || "").replace(/[（）()、，]/g, " ").replace(/\s+/g, " ").trim();

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
      normals.push(n.x, n.y, n.z);
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
const GridLines = ({
  radius = R,
  latN = 12,
  lonN = 12,
  color = "#64748b",
  opacity = 0.9,
}) => {
  const latGroup = new THREE.Group();
  for (let i = 1; i < latN; i++) {
    const th = (i / latN) * Math.PI;
    const y = radius * Math.cos(th);
    const r = radius * Math.sin(th);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI);
    const pts = curve.getPoints(128);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
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
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
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
   可點擊 Tile（填色完整、文字正立）
========================= */
function TileOnSphere({ cell, data, color, showText = true, onPick }) {
  const { lat0, lat1, lon0, lon1 } = cell;
  const geo = useMemo(
    () =>
      sphericalQuadGeometry({
        lat0,
        lat1,
        lon0,
        lon1,
        r: R + 0.02,
        seg: 6,
      }),
    [lat0, lat1, lon0, lon1]
  );

  const center = useMemo(
    () => ll2xyz((lat0 + lat1) / 2, (lon0 + lon1) / 2, R + 0.022),
    [lat0, lat1, lon0, lon1]
  );
  const uprightQuat = useMemo(() => {
    const n = center.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const yDir = worldUp
      .clone()
      .sub(n.clone().multiplyScalar(worldUp.dot(n)));
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
  const latMid = ((lat0 + lat1) / 2) * (Math.PI / 180);
  const dLatRad = Math.abs(lat1 - lat0) * (Math.PI / 180);
  const dLonRad = Math.abs(lon1 - lon0) * (Math.PI / 180);
  const height = R * dLatRad;
  const width = R * Math.cos(latMid) * dLonRad;
  const pad = 0.02;
  const maxW = Math.max(0.001, width - pad * 2);
  const maxH = Math.max(0.001, height - pad * 2);
  let fontSize = Math.min(maxH, maxW / Math.max(1, title.length * 0.55));
  fontSize = Math.max(0.06, Math.min(fontSize, 0.25));
  const maxChars = Math.max(1, Math.floor(maxW / (fontSize * 0.55)));
  const textShown =
    title.length > maxChars
      ? title.slice(0, Math.max(0, maxChars - 1)) + "…"
      : title;

  const handlePointerOver = () => {
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
  };
  const handleClick = () => {
    onPick && onPick({ cell, data, center });
  };

  return (
    <group>
      {/* 填色格（可點擊） */}
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

      {/* 中央文字（只在外層顯示） */}
      {showText && (
        <group position={center} quaternion={uprightQuat}>
          <group position={[0, 0, 0.003]}>
            <Text
              fontSize={fontSize}
              color="#0f172a"
              anchorX="center"
              anchorY="middle"
            >
              {textShown}
            </Text>
          </group>
        </group>
      )}
    </group>
  );
}

/* =========================
   外觀：大氣層（輕薄）、珍珠白球體
========================= */
const Atmosphere = ({ r = R, opacity = 0.07, color = "#a7f3d0" }) => (
  <mesh renderOrder={1}>
    <sphereGeometry args={[r * 1.02, 64, 64]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
    />
  </mesh>
);

/* =========================
   內層 小平台（正向、厚度+陰影+KPI 條、左上角返回）
========================= */
const InnerPlatform = ({ selection, onBack }) => {
  // 幾何 Hooks 需無條件宣告
  const W = 1.8,
    H = 1.05,
    Rr = 0.12,
    DEPTH = 0.06;
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = W / 2,
      hh = H / 2;
    s.moveTo(-hw + Rr, -hh);
    s.lineTo(hw - Rr, -hh);
    s.absarc(hw - Rr, -hh + Rr, Rr, -Math.PI / 2, 0, false);
    s.lineTo(hw, hh - Rr);
    s.absarc(hw - Rr, hh - Rr, Rr, 0, Math.PI / 2, false);
    s.lineTo(-hw + Rr, hh);
    s.absarc(-hw + Rr, hh - Rr, Rr, Math.PI / 2, Math.PI, false);
    s.lineTo(-hw, -hh + Rr);
    s.absarc(-hw + Rr, -hh + Rr, Rr, Math.PI, 1.5 * Math.PI, false);
    return s;
  }, []);
  const extrude = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth: DEPTH,
        bevelEnabled: false,
        curveSegments: 32,
      }),
    [shape]
  );
  const faceZ = DEPTH / 2;

  if (!selection) return null;
  const { data, center } = selection;

  // 取向：法線=dir，上方=世界Y在該平面的投影 → 永遠正向可讀
  const dir = center.clone().normalize();
  const plateR = R - 1.0;
  const pos = dir.clone().multiplyScalar(plateR);
  const upWorld = new THREE.Vector3(0, 1, 0);
  let yDir = upWorld.clone().sub(dir.clone().multiplyScalar(upWorld.dot(dir)));
  if (yDir.lengthSq() < 1e-6) yDir = new THREE.Vector3(0, 0, 1);
  yDir.normalize();
  const xDir = new THREE.Vector3().crossVectors(yDir, dir).normalize();
  const basis = new THREE.Matrix4().makeBasis(xDir, yDir, dir);
  const quat = new THREE.Quaternion().setFromRotationMatrix(basis);

  const k = data.kpi || {};
  const rows = [
    { label: "價格 (NT$/kWh)", val: k.price ?? "-" },
    { label: "政策指數", val: k.policy_index ?? "-" },
    { label: "用電契合", val: k.usage_match ?? "-" },
    {
      label: "裝置/潛力 (MW)",
      val: `${k.capacity_installed ?? "-"} / ${
        k.capacity_potential ?? "-"
      }`,
    },
    { label: "減排 (MtCO2e/yr)", val: k.emissions_avoided ?? "-" },
  ];
  const tPolicy = Number(k.policy_index) || 0;
  const tUsage = Number(k.usage_match) || 0;

  const Bar = ({ x, y, t }) => (
    <group position={[x, y, 0.02]}>
      <mesh>
        <planeGeometry args={[1.0, 0.08]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.9} />
      </mesh>
      <mesh position={[(-1.0 / 2 + (1.0 * t) / 2), 0, 0.001]}>
        <planeGeometry args={[1.0 * Math.max(0, Math.min(1, t)), 0.08]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.9} />
      </mesh>
    </group>
  );

  return (
    <group position={pos} quaternion={quat}>
      {/* 假陰影 */}
      <mesh position={[0, 0, -0.02]} renderOrder={39}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#000" transparent opacity={0.08} />
      </mesh>

      {/* 立體面板 */}
      <mesh geometry={extrude} position={[0, 0, -faceZ]} renderOrder={40}>
        <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.08} />
      </mesh>
      <mesh geometry={extrude} position={[0, 0, -faceZ]} renderOrder={41}>
        <meshBasicMaterial color="#e5e7eb" />
      </mesh>

      {/* 返回外層（平台左上角，低調） */}
      <Html
        transform
        position={[-W / 2 + 0.12, H / 2 - 0.12, 0.07]}
        distanceFactor={8}
      >
        <button
          onClick={onBack}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            cursor: "pointer",
            fontSize: 12,
            opacity: 0.9,
          }}
        >
          ⤴ 回外層
        </button>
      </Html>

      {/* 內容 */}
      <group position={[0, 0, 0.03]} renderOrder={42}>
        <Text
          position={[0, 0.38, 0]}
          fontSize={0.14}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
        >
          {shortZh(data.zh) || data.en || data.code}
        </Text>
        <Bar x={-0.15} y={0.16} t={tPolicy} />
        <Text
          position={[-0.95, 0.16, 0.02]}
          fontSize={0.09}
          color="#334155"
          anchorX="left"
          anchorY="middle"
        >
          政策
        </Text>
        <Bar x={-0.15} y={-0.02} t={tUsage} />
        <Text
          position={[-0.95, -0.02, 0.02]}
          fontSize={0.09}
          color="#334155"
          anchorX="left"
          anchorY="middle"
        >
          契合
        </Text>
        {rows.map((r, i) => (
          <Text
            key={i}
            position={[-0.9, -0.28 - i * 0.18, 0.02]}
            fontSize={0.09}
            color="#475569"
            anchorX="left"
            anchorY="middle"
          >
            {`${r.label}：${r.val}`}
          </Text>
        ))}
      </group>
    </group>
  );
};

/* =========================
   相機動畫器：只在進/出時接管
========================= */
const CameraRig = ({ phase, targetDir, onArrive }) => {
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    if (phase === "idle") return; // 平常不動相機
    const speed = phase === "toInner" ? 5.5 : 7.5;
    const epsilon = 0.02;
    const targetPos =
      phase === "toInner"
        ? targetDir?.clone().normalize().multiplyScalar(R - 0.6) ||
          new THREE.Vector3(0, 0, R - 0.6)
        : new THREE.Vector3(0, 0, 8);

    camera.position.lerp(targetPos, 1 - Math.exp(-speed * dt));
    camera.lookAt(0, 0, 0);

    if (camera.position.distanceTo(targetPos) < epsilon) {
      camera.position.copy(targetPos);
      onArrive && onArrive(phase);
    }
  });
  return null;
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
  const onNum = (k) => (e) =>
    setOptions((o) => ({ ...o, [k]: parseFloat(e.target.value) }));
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 2147483647,
        background: "rgba(255,255,255,0.94)",
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        width: 360,
        fontSize: 13,
        pointerEvents: "auto",
      }}
    >
      <b>Energy Cards 控制台</b>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 10,
        }}
      >
        <label>
          緯向格數：
          <input
            type="number"
            min={2}
            max={90}
            step={1}
            value={options.gridLatN}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                gridLatN: Math.max(2, parseInt(e.target.value) || 12),
              }))
            }
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <label>
          經向格數：
          <input
            type="number"
            min={2}
            max={360}
            step={1}
            value={options.gridLonN}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                gridLonN: Math.max(2, parseInt(e.target.value) || 12),
              }))
            }
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          球體透明度：
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={options.sphereOpacity}
            onChange={onNum("sphereOpacity")}
            style={{ marginLeft: 8 }}
          />
          <span style={{ marginLeft: 8 }}>
            {options.sphereOpacity.toFixed(2)}
          </span>
        </label>
      </div>
      <div style={{ marginTop: 6, color: "#475569" }}>經緯線固定顯示中</div>
    </div>
  );
};

/* =========================
   場景：外/內層、點擊進入、返回
========================= */
const Scene = ({ options }) => {
  const { sphereOpacity, gridLatN = 12, gridLonN = 12 } = options;
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const [mode, setMode] = useState("outer"); // 'outer' | 'inner'
  const [phase, setPhase] = useState("idle"); // 'idle' | 'toInner' | 'toOuter'
  const [selection, setSelection] = useState(null); // {data, cell, center}
  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);

  // 控制 OrbitControls：動畫時停用；內層限制距離，避免滾輪出殼
  useEffect(() => {
    if (!controls) return;
    controls.enabled = phase === "idle";
    if (mode === "inner") {
      controls.minDistance = R - 1.6; // 近看平台
      controls.maxDistance = R - 0.45; // 不會跑出球外
    } else {
      controls.minDistance = 2.0;
      controls.maxDistance = 20.0;
    }
    controls.update?.();
  }, [phase, mode, controls]);

  // Esc：動畫返回外層
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMode("outer");
        setPhase("toOuter");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const priceToColor = (price, minP = 1.5, maxP = 5.0) => {
    const t = Math.max(
      0,
      Math.min(1, ((Number(price) || 0) - minP) / Math.max(1e-6, maxP - minP))
    );
    const a = new THREE.Color("#22c55e");
    const b = new THREE.Color("#ef4444");
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

  const equatorBand = useMemo(
    () => cells.filter((c) => c.lat0 <= 0 && 0 < c.lat1),
    [cells]
  );

  const handlePick = ({ cell, data, center }) => {
    setSelection({ cell, data, center });
    setMode("inner");
    setPhase("toInner");
  };

  const targetDir =
    selection?.center?.clone().normalize() || new THREE.Vector3(0, 0, 1);

  // 立刻回外層（無動畫）
  const instantBackToOuter = () => {
    setMode("outer");
    setPhase("idle");
    setSelection(null);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  };

  return (
    <>
      {/* 球體（珍珠白） */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[R, 128, 128]} />
        <meshPhysicalMaterial
          color="#f8fbff"
          roughness={0.6}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
          sheen={0.35}
          sheenColor={new THREE.Color("#ffffff")}
          sheenRoughness={0.6}
          transparent
          opacity={sphereOpacity}
        />
      </mesh>
      <Atmosphere r={R} />
      <GridLines radius={R} latN={latBands} lonN={lonBands} />

      {/* 外層 tiles（文字只在 outer 顯示） */}
      {S.map((s, i) => {
        const cell = equatorBand[i % equatorBand.length];
        const price = s?.kpi?.price ?? 0;
        const color = priceToColor(price);
        return (
          <TileOnSphere
            key={s.code || i}
            cell={cell}
            data={{ zh: shortZh(s.zh), ...s }}
            color={color}
            showText={mode === "outer"}
            onPick={handlePick}
          />
        );
      })}

      {/* 內層：進入後才顯示 */}
      {mode === "inner" && (
        <group>
          {/* 內殼（空間感） */}
          <mesh renderOrder={1}>
            <sphereGeometry args={[R * 0.985, 64, 64]} />
            <meshBasicMaterial
              color="#e6fbf3"
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
          <InnerPlatform selection={selection} onBack={instantBackToOuter} />
        </group>
      )}

      {/* 相機動畫（只在進/出時接管） */}
      <CameraRig
        phase={phase}
        targetDir={targetDir}
        onArrive={(p) => {
          if (p === "toInner") setPhase("idle");
          if (p === "toOuter") {
            setPhase("idle");
            setSelection(null);
          }
        }}
      />

      {/* Controls 放在 Scene，才能被 effect 控制 enabled / distance */}
      <OrbitControls enablePan={false} enableZoom makeDefault />
    </>
  );
};

/* =========================
   主組件
========================= */
const Globe = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [options, setOptions] = useState({
    sphereOpacity: 0.45,
    gridLatN: 12,
    gridLonN: 12,
  });

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 70 }}
        style={{
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(#ffffff,#f2fbff)",
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 7, 8]} intensity={0.8} color="#e6fbff" />
        <directionalLight
          position={[-5, -3, -4]}
          intensity={0.3}
          color="#ccf0ff"
        />
        <Scene options={options} />
      </Canvas>

      <Portal>
        <button
          onClick={() => setShowPanel((s) => !s)}
          title="切換控制面板 (P)"
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 2147483647,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
            fontSize: 14,
          }}
        >
          ⚙️ 面板
        </button>
        {showPanel && <Panel options={options} setOptions={setOptions} />}
      </Portal>
    </>
  );
};

export default Globe;
