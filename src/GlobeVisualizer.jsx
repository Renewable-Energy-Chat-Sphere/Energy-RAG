// GlobeVisualizer.jsx
import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

// 資料
import data from "./data_with_similarity";

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

const HoverableTile = ({ item, pos, quaternion, tileWidth, tileHeight }) => {
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const isActive = hovered || touched;

  const { scale } = useSpring({
    scale: isActive ? 1.2 : 1,
    config: { tension: 220, friction: 18 },
  });

  const fitText = (text, maxChars = 22) => {
    if (!text) return "";
    const s = String(text);
    return s.length > maxChars ? s.slice(0, maxChars - 3) + "..." : s;
  };

  return (
    <animated.group position={pos} quaternion={quaternion} scale={scale}>
      <mesh
        onClick={() => {
          if (item?.url) window.open(item.url, "_blank");
          setTouched(true);
        }}
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
        <meshBasicMaterial
          color={"#fdfcdc"}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
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

const LabeledGridShell = ({ data, radius = 3, rows = 12, cols = 12 }) => {
  const tiles = [];
  const symptoms = data.filter((item) => item.code.startsWith("S"));
  const drugs = data.filter((item) => item.code.startsWith("H"));

  // 由赤道往兩側填，視覺較平均
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

      tiles.push(
        <HoverableTile
          key={`tile-${row}-${col}`}
          item={item}
          pos={pos}
          quaternion={quaternion}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
        />
      );
    }
  }
  return <group>{tiles}</group>;
};

const Globe = () => {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 75 }} style={{ width: "100vw", height: "100vh" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitControls enablePan={false} enableZoom={true} />
      <LatLines layers={12} radius={3} />
      <LonLines segments={12} radius={3} />
      {/* ⬇️ 直接吃由 Excel 轉出的完整資料（含 similarity） */}
      <LabeledGridShell data={data} />
    </Canvas>
  );
};

export default Globe;
