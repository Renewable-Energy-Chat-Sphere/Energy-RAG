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

const testSymptoms = [
  {
    code: "S01",
    zh: "右膝內側半月板桶柄撕裂",
    en: "Right knee medial meniscus bucket handle tear",
    url: "https://example.com/s01"
  },
  {
    code: "S02",
    zh: "外側半月板放射狀撕裂",
    en: "Lateral meniscus radial tear",
    url: "https://example.com/s02"
  },
  {
    code: "S03",
    zh: "已在滑車處接受 BiCRI 手術",
    en: "Status post BiCRI at Trochlea",
    url: "https://example.com/s03"
  },
  {
    code: "S04",
    zh: "雙側彈性扁平足",
    en: "Bilateral flexible flatfoot",
    url: "https://example.com/s04"
  },
  {
    code: "S05",
    zh: "板機指",
    en: "Trigger finger",
    url: "https://example.com/s05"
  },

];

const testDrugs = [
  {
    code: "H01",
    zh: "滋骨加強咀嚼錠",
    en: "Bio-cal Plus chewable",
    sci: "Tricalcium phosphate + Cholecalciferol",
    url: "https://example.com/h01"
  },
  {
    code: "H02",
    zh: "骨力強注射液",
    en: "Aclasta",
    sci: "Zoledronic acid",
    url: "https://example.com/h02"
  },
  {
    code: "H03",
    zh: "骨穩 注射液",
    en: "Forteo",
    sci: "Teriparatide",
    url: "https://example.com/h03"
  },
  {
    code: "H04",
    zh: "鈣穩膜衣錠",
    en: "Evista",
    sci: "Raloxifene hydrochloride",
    url: "https://example.com/h04"
  },
  {
    code: "H05",
    zh: "希樂葆膠囊",
    en: "Celebrex / Celebrex Capsule",
    sci: "Celecoxib",
    url: "https://example.com/h05"
  }
  
];

// 合併為單一資料陣列
const data = [...testSymptoms, ...testDrugs];



// LabeledGridShell with S/H split hemisphere
const LabeledGridShell = ({ data, radius = 3, rows = 12, cols = 12 }) => {
  const tiles = [];

  // 分類資料為 symptoms (S 開頭) 與 drugs (H 開頭)
  const symptoms = data.filter((item) => item.code.startsWith("S"));
  const drugs = data.filter((item) => item.code.startsWith("H"));

  // 產生從赤道往上下交錯排的 row 順序
  const rowOrder = [];
  const mid = Math.floor(rows / 2);
  for (let i = 0; i < rows; i++) {
    const offset = Math.floor((i + 1) / 2);
    rowOrder.push(i % 2 === 0 ? mid - offset : mid + offset);
  }

  // 將 drugs 與 symptoms 分別安排到不同半球 row
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

      const fitText = (text, maxChars = 22) => {
        if (!text) return "";
        return text.length > maxChars ? text.slice(0, maxChars - 3) + "..." : text;
      };

      tiles.push(
        <group key={`tile-${row}-${col}`} position={pos} quaternion={quaternion}>
          <mesh
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
            <planeGeometry args={[tileWidth, tileHeight]} />
            <meshBasicMaterial
              color={"#fdfcdc"}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>


          {/* Code */}
          <Text
            position={[0, tileHeight * 0.25, 0.01]}
            fontSize={tileHeight * 0.2}
            color="#000"
            anchorX="center"
            anchorY="middle"
          >
            {fitText(item.code, 12)}
          </Text>

          {/* 中文 */}
          <Text
            position={[0, 0, 0.01]}
            fontSize={tileHeight * 0.16}
            color="#000"
            anchorX="center"
            anchorY="middle"
          >
            {fitText(item.zh, 18)}
          </Text>

          {/* 英文 */}
          <Text
            position={[0, -tileHeight * 0.25, 0.01]}
            fontSize={tileHeight * 0.13}
            color="#333"
            anchorX="center"
            anchorY="middle"
          >
            {fitText(item.en, 22)}
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
      <LabeledGridShell data={data} />
    </Canvas>
  );
};

export default Globe;


// 👉 若要將每個 tile 換成圖片
// 1. 改成 <ImageTile url={item.image} ... />
// 2. 新增 useTexture 載入圖檔
// 3. 將 meshBasicMaterial 中改為 map={texture}, 並移除 color
// 4. 資料格式要加上 image 欄位，如 image: "/img/S01.jpg"
