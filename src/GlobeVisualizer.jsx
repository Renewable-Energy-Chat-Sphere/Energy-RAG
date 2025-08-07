// GlobeVisualizer.jsx (adaptive tile sizing by latitude)
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

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

const data = [
  { code: "S01", color: "#fce4ec", url: "https://example.com/s01" },
  { code: "S02", color: "#f8bbd0", url: "https://example.com/s02" },
  { code: "S03", color: "#f48fb1", url: "https://example.com/s03" },
  { code: "H01", color: "#e3f2fd", url: "https://example.com/h01" },
  { code: "H02", color: "#90caf9", url: "https://example.com/h02" },
  { code: "H03", color: "#42a5f5", url: "https://example.com/h03" }
];


const GridShell = ({ radius = 3, rows = 12, cols = 24 }) => {
  const tiles = [];

  for (let row = 0; row < rows; row++) {
    const theta = ((row + 0.5) / rows) * Math.PI;
    const sinTheta = Math.sin(theta);
    const latCircumference = 2 * Math.PI * radius * sinTheta;
    const tileWidth = (latCircumference / cols) * 0.98;
    const tileHeight = (Math.PI * radius / rows) * 0.98;

    for (let col = 0; col < cols; col++) {
      const phi = ((col + 0.5) / cols) * 2 * Math.PI;
      const index = (row * cols + col) % data.length;
      const item = data[index];

      const r = radius + 0.005;
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
  <group key={`tile-${row}-${col}`} position={pos} quaternion={quaternion}>
    <mesh
      onClick={() => window.open(item.url, "_blank")} // 在新分頁開啟連結
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";       // 滑鼠變成手指
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";       // 滑鼠變回箭頭
      }}
    >
      <planeGeometry args={[tileWidth, tileHeight]} />
      <meshBasicMaterial
        color={item.color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
    <Text
      position={[0, 0, 0.01]}
      fontSize={tileHeight * 0.25 * sinTheta}
      color="#000"
      anchorX="center"
      anchorY="middle"
      onClick={() => window.open(item.url, "_blank")}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
    >
      {item.code}
    </Text>
  </group>
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
      <GridShell />
    </Canvas>
  );
};

export default Globe;

// 👉 若要將每個 tile 換成圖片
// 1. 改成 <ImageTile url={item.image} ... />
// 2. 新增 useTexture 載入圖檔
// 3. 將 meshBasicMaterial 中改為 map={texture}, 並移除 color
// 4. 資料格式要加上 image 欄位，如 image: "/img/S01.jpg"
