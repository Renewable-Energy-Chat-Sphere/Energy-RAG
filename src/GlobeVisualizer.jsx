// GlobeVisualizer.jsx
import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

// 資料（含 similarity）
import data from "./data_with_similarity";

// 顏色：相似度低→綠，高→紅；非作用半球為中性色
const COLOR_LOW = "#22c55e";
const COLOR_HIGH = "#ef4444";
const COLOR_NEUTRAL_S = "#dbeafe";
const COLOR_NEUTRAL_H = "#ffe4e6";
const TILE_OPACITY = 0.3;

const lerpColor = (fromHex, toHex, t) => {
  const a = new THREE.Color(fromHex);
  const b = new THREE.Color(toHex);
  const c = a.clone().lerp(b, Math.max(0, Math.min(1, t)));
  return `#${c.getHexString()}`;
};

const LatLines = ({ layers = 12, radius = 3 }) => {
  const lines = [];
  for (let i = 1; i < layers; i++) {
    const theta = (i / layers) * Math.PI;
    const y = radius * Math.cos(theta);
    const r = radius * Math.sin(theta);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#888" });
    lines.push(
      <lineLoop
        key={`lat-${i}`}
        geometry={geometry}
        material={material}
        position={[0, y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    );
  }
  return <group>{lines}</group>;
};

const LonLines = ({ segments = 12, radius = 3 }) => {
  const lines = [];
  for (let i = 0; i < segments; i++) {
    const lon = (i / segments) * 2 * Math.PI;
    const points = [];
    for (let j = 0; j <= 64; j++) {
      const theta = (j / 64) * Math.PI;
      const x = radius * Math.sin(theta) * Math.cos(lon);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(lon);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#888" });
    lines.push(<line key={`lon-${i}`} geometry={geometry} material={material} />);
  }
  return <group>{lines}</group>;
};

const HoverableTile = ({ item, pos, quaternion, tileWidth, tileHeight, fillColor }) => {
  const [hovered, setHovered] = useState(false);
  const { scale } = useSpring({
    scale: hovered ? 1.06 : 1,
    config: { tension: 220, friction: 18 },
  });

  const fitText = (text, maxChars = 22) => {
    if (!text) return "";
    const s = String(text);
    let lengthCount = 0;
    let result = "";
    for (let ch of s) {
      // 中文 / 全形字元：算 2
      lengthCount += /[^\x00-\xff]/.test(ch) ? 2 : 1;
      if (lengthCount > maxChars) {
        result += "...";
        break;
      }
      result += ch;
    }
    return result;
  };


  return (
    <animated.group position={pos} quaternion={quaternion} scale={scale}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <planeGeometry args={[tileWidth, tileHeight]} />
        <meshBasicMaterial color={fillColor} transparent opacity={TILE_OPACITY} side={THREE.DoubleSide} />
      </mesh>

      <Text position={[0, tileHeight * 0.25, 0.01]} fontSize={tileHeight * 0.2} color="#000" anchorX="center" anchorY="middle">
        {fitText(item.code, 12)}
      </Text>
      <Text position={[0, 0, 0.01]} fontSize={tileHeight * 0.16} color="#000" anchorX="center" anchorY="middle">
        {fitText(item.zh, 18)}
      </Text>
      <Text position={[0, -tileHeight * 0.25, 0.01]} fontSize={tileHeight * 0.13} color="#333" anchorX="center" anchorY="middle">
        {fitText(item.en, 22)}
      </Text>
    </animated.group>
  );
};

const LabeledGridShell = ({ data, radius = 3, rows = 12, cols = 12, focus }) => {
  const tiles = [];
  const symptoms = useMemo(() => data.filter((item) => item.code.startsWith("S")), [data]);
  const drugs = useMemo(() => data.filter((item) => item.code.startsWith("H")), [data]);

  // 保持原本由赤道向兩側的 row 排序
  const rowOrder = [];
  const mid = Math.floor(rows / 2);
  for (let i = 0; i < rows; i++) {
    const offset = Math.floor((i + 1) / 2);
    rowOrder.push(i % 2 === 0 ? mid - offset : mid + offset);
  }
  let indexH = 0;
  let indexS = 0;

  for (const row of rowOrder) {
    const theta = ((row + 0.5) / rows) * Math.PI;
    const sinTheta = Math.sin(theta);
    const latCircumference = 2 * Math.PI * radius * sinTheta;
    const tileWidth = (latCircumference / cols) * 0.98;
    const tileHeight = (Math.PI * radius / rows) * 0.98;

    for (let col = 0; col < cols; col++) {
      let item = null;
      if (row >= mid && indexH < drugs.length) {
        item = drugs[indexH++];
      } else if (row < mid && indexS < symptoms.length) {
        item = symptoms[indexS++];
      }
      if (!item) continue;

      const phi = ((col + 0.5) / cols) * 2 * Math.PI;
      const r = radius;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);
      const pos = [x, y, z];

      const lookAt = new THREE.Vector3(0, 0, 0);
      const current = new THREE.Vector3(x, y, z);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(current, lookAt, new THREE.Vector3(0, 1, 0))
      );

      // 顏色根據 focus 映射（同類型才套用）
      const isS = item.code.startsWith("S");
      let fillColor;
      if (focus && ((isS && focus.type === "S") || (!isS && focus.type === "H"))) {
        const raw = Number(item?.similarity?.[focus.code]) || 0;
        const sim = Math.max(0, Math.min(1, raw));
        fillColor = lerpColor(COLOR_LOW, COLOR_HIGH, sim); // 低→綠，高→紅
      } else {
        fillColor = isS ? COLOR_NEUTRAL_S : COLOR_NEUTRAL_H;
      }

      tiles.push(
        <HoverableTile
          key={`tile-${row}-${col}`}
          item={item}
          pos={pos}
          quaternion={quaternion}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
          fillColor={fillColor}
        />
      );
    }
  }
  return <group>{tiles}</group>;
};

const Globe = () => {
  // 下拉選單的基準點（focus）
  const allCodes = useMemo(
    () =>
      data.map((d) => ({
        code: d.code,
        label: `${d.code} — ${d.zh || d.en || ""}`,
        type: d.code.startsWith("S") ? "S" : "H",
      })),
    []
  );
  // 預設讓第一個 S 當 focus
  const defaultFocus = useMemo(() => {
    const firstS = allCodes.find((c) => c.type === "S");
    return firstS ? { code: firstS.code, type: "S" } : null;
  }, [allCodes]);

  const [focus, setFocus] = useState(defaultFocus);
  const goToDetail = (newTab = true) => {
    if (!focus) return;
    const path = `/focus/${encodeURIComponent(focus.code)}`;
    if (newTab) {
      window.open(path, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = path;
    }
  };

  return (
    <>
      {/* 控制面板：選擇基準點 + 前往按鈕（同一行） */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          padding: 10,
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
          minWidth: 320,
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 6, fontWeight: 600 }}>請選擇基準點</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={focus ? focus.code : ""}
            onChange={(e) => {
              const code = e.target.value;
              const type = code.startsWith("S") ? "S" : "H";
              setFocus({ code, type });
            }}
            style={{
              width: "auto",
              maxWidth:300,
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          >
            {}
            <optgroup label="症狀 (S)">
              {allCodes.filter((c) => c.type === "S").map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="藥物 (H)">
              {allCodes.filter((c) => c.type === "H").map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </optgroup>
          </select>

          <button
            onClick={() => goToDetail(true)} // true=新分頁；false=同分頁
            disabled={!focus}
            style={{
              marginLeft: "auto",    // 把按鈕推到最右邊
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: focus ? "pointer" : "not-allowed",
              opacity: focus ? 1 : 0.5,
              whiteSpace: "nowrap",
            }}
            title="在新分頁開啟專屬頁"
          >
            前往專屬頁
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          規則解釋：相似度低→綠，高→紅。 選 Sxx 只上色 S 半球，選 Hxx 只上色 H 半球。
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 75 }} style={{ width: "100vw", height: "100vh" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls enablePan={false} enableZoom={true} />
        <LatLines layers={12} radius={3} />
        <LonLines segments={12} radius={3} />
        <LabeledGridShell data={data} radius={3} rows={12} cols={12} focus={focus} />
      </Canvas>
    </>
  );
};

export default Globe;
