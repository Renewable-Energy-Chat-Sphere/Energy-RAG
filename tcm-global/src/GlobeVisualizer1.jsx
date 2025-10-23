// GlobeVisualizer.jsx — Sectors Blend to Industries (smooth LOD0→LOD1, front-only labels)
// 2025-10-22
import React, { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard } from "@react-three/drei";

// ===================== 基本設定 =====================
const RADIUS = 3.0;
const BG = 0xffffff; // 全白背景

// 五大部門（LOD0 的五個楔形）
const SECTORS = [
  { key: "agri",    name: "農業",  color: 0x48d99a },
  { key: "ind",     name: "工業",  color: 0xffa15a },
  { key: "trans",   name: "運輸",  color: 0x5fbef2 },
  { key: "service", name: "服務",  color: 0x8b6cff },
  { key: "res",     name: "住宅",  color: 0xff6f9d },
];

// 第二層：各部門底下的產業（示例，可改成你的正式清單）
const INDUSTRIES = {
  agri: ["農作物與畜牧","林業與木材","漁業與水產","食品初級加工"],
  ind: ["砂石產品","食品飲料及菸草製造業","化學材料與製品","金屬製品","機械與設備"],
  trans: ["公路運輸","鐵路運輸","海運與港務","航空運輸","倉儲與物流"],
  service: ["批發零售","餐飲旅宿","資訊與通訊","金融保險","教育與醫療"],
  res: ["住宅用電","住宅燃氣","住宅熱能","家用再生能源"],
};

// ===================== 工具函式 =====================
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function lonLatToVec3(lonDeg, latDeg, r = RADIUS, lift = 0) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    (r + lift) * Math.cos(lat) * Math.cos(lon),
    (r + lift) * Math.sin(lat),
    (r + lift) * Math.cos(lat) * Math.sin(lon)
  );
}

// 將經緯度矩形投到球面；seg 越高越平滑
function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r = RADIUS, seg = 48 }) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const lat = lat0 * (1 - t) + lat1 * t;
    for (let j = 0; j <= seg; j++) {
      const s = j / seg;
      const lon = lon0 * (1 - s) + lon1 * s;
      const p = lonLatToVec3(lon, lat, r);
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
  geo.computeBoundingSphere();
  return geo;
}

function raySphereIntersection(eye, dir, center, radius) {
  const L = center.clone().sub(eye);
  const tca = L.dot(dir);
  const d2 = L.lengthSq() - tca * tca;
  const r2 = radius * radius;
  if (d2 > r2) return null;
  const thc = Math.sqrt(r2 - d2);
  const t0 = tca - thc;
  const t1 = tca + thc;
  const t = t0 > 0 ? t0 : t1 > 0 ? t1 : null;
  if (t === null) return null;
  return eye.clone().add(dir.clone().multiplyScalar(t));
}

function vec3ToLonLat(v) {
  const n = v.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(n.y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(n.z, n.x));
  return { lon, lat };
}

function sectorIndexFromLon(lonDeg) {
  let lon = lonDeg;
  lon = ((lon + 180) % 360 + 360) % 360 - 180; // [-180,180)
  const idx = Math.floor((lon + 180) / 72) % 5; // 0..4
  return idx;
}

// ============== 連續縮放混合（像 Google Earth 由遠→近的平滑過渡） ==============
function useZoomBlend() {
  const { camera } = useThree();
  const [blend01, setBlend01] = useState(0); // 0: 只看 LOD0；1: LOD1 完全出現
  const [nearLevel, setNearLevel] = useState(0); // 近距離離散層級（給 LOD2 用）

  useFrame(() => {
    const d = camera.position.length();
    // 這三個門檻可以依你的手感微調
    const FAR = RADIUS * 3.0;   // 遠端（LOD0 最清楚、LOD1 不顯）
    const MID = RADIUS * 2.3;   // 中距開始出現 LOD1
    const NEAR = RADIUS * 1.55; // 很近（可觸發 LOD2）

    // 當距離從 FAR 漸近到 MID，blend01 從 0 漸近到 1
    // 因為 d 越小越近，所以用反向 smoothstep
    const t = 1 - smoothstep(MID, FAR, d);
    if (Math.abs(t - blend01) > 1e-3) setBlend01(t);

    // 近距離層級（可控制 LOD2 啟用）
    const L = d < NEAR ? 2 : d < MID ? 1 : 0;
    if (L !== nearLevel) setNearLevel(L);
  });

  return { blend01, nearLevel };
}

// ===================== 只在前半球顯示的看板文字 =====================
function FrontBillboardLabel({
  position = [0, 0, 0],
  children,
  groupProps = {},
  threshold = 0.02,
  ...textProps
}) {
  const { camera } = useThree();
  const [visible, setVisible] = useState(true);
  const grp = useRef();
  useFrame(() => {
    if (!grp.current) return;
    const wp = new THREE.Vector3();
    grp.current.getWorldPosition(wp);
    const dp = wp.clone().normalize().dot(camera.position.clone().normalize());
    const isFront = dp > threshold;
    if (visible !== isFront) setVisible(isFront);
  });
  return (
    <group ref={grp} visible={visible} position={position} {...groupProps}>
      <Billboard follow>
        <Text material-depthTest material-depthWrite={false} renderOrder={10} {...textProps}>
          {children}
        </Text>
      </Billboard>
    </group>
  );
}

// ===================== 視覺：球體 + 柔光陰影 =====================
function TransparentGlobe() {
  const matRef = useRef();
  const { camera } = useThree();
  useFrame(() => {
    const d = camera.position.length();
    const near = RADIUS * 1.1, far = RADIUS * 5.0;
    const t = THREE.MathUtils.clamp((d - near) / (far - near), 0, 1);
    const opacity = THREE.MathUtils.lerp(0.22, 0.32, t);
    if (matRef.current) matRef.current.opacity = opacity;
  });
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhongMaterial
        ref={matRef}
        color={0x9eb6d8}
        emissive={0xaac6ff}
        specular={0xffffff}
        shininess={90}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

function SoftTerminator({ strength = 0.55, sunDir = new THREE.Vector3(1, 0.4, 0.2).normalize() }) {
  const uniforms = useMemo(() => ({
    sun: { value: sunDir },
    strength: { value: strength },
    radius: { value: RADIUS },
  }), [sunDir, strength]);
  return (
    <mesh>
      <sphereGeometry args={[RADIUS * 1.001, 128, 128]} />
      <shaderMaterial
        transparent
        blending={THREE.NormalBlending}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPos; varying vec3 vNormal;
          void main(){ vPos = position; vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `}
        fragmentShader={`
          uniform vec3 sun; uniform float strength; varying vec3 vNormal;
          void main(){
            float nd = dot(normalize(vNormal), normalize(sun));
            float shade = smoothstep(-0.4, 0.2, nd);
            float alpha = (1.0 - shade) * strength;
            gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
          }
        `}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS * 1.04, 64, 64]} />
      <meshBasicMaterial color={0x3ea0ff} transparent opacity={0.06} side={THREE.BackSide} />
    </mesh>
  );
}

// ===================== LOD 0：五楔形滿版（支援淡出） =====================
function FullCoverSectors({ fade01 = 0 }) {
  // fade01: 0 → 原本不淡；1 → 淡很多
  const bands = useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const lon0 = -180 + i * 72;
      const lon1 = lon0 + 72;
      const s = SECTORS[i % SECTORS.length];
      out.push({ lon0, lon1, lat0: -90, lat1: 90, sector: s });
    }
    return out;
  }, []);

  // 材質快取
  const matCache = useMemo(() => {
    const m = new Map();
    for (const s of SECTORS) {
      m.set(
        s.key,
        new THREE.MeshStandardMaterial({
          color: s.color,
          roughness: 0.85,
          metalness: 0.0,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
    }
    return m;
  }, []);

  return (
    <group>
      {bands.map((b, i) => {
        const geo = sphericalQuadGeometry({
          lat0: b.lat0,
          lat1: b.lat1,
          lon0: b.lon0,
          lon1: b.lon1,
          r: RADIUS + 0.003,
          seg: 64,
        });

        const midLon = (b.lon0 + b.lon1) / 2;
        const labelPos = lonLatToVec3(midLon, 0, RADIUS + 0.01).toArray();
        const mat = matCache.get(b.sector.key);
        // 動態調整透明度（淡出）
        mat.opacity = lerp(0.9, 0.25, fade01);
        // 文字透明度：先淡出，進到第二層後直接隱藏
        const labelAlpha = (fade01 < 0.85)
          ? 1.0 - smoothstep(0.2, 0.85, fade01)  // 0→0.85 之間平滑淡出
          : 0.0;                                 // 進到第二層就隱藏

        return (
          <group key={i}>
            <mesh geometry={geo} material={mat} />
            {labelAlpha > 0 && (
              <FrontBillboardLabel
                position={labelPos}
                fontSize={lerp(0.26, 0.22, fade01)}
                color="#111111"
                outlineWidth={0.006}
                outlineColor="#ffffff"
                anchorX="center"
                anchorY="middle"
                material-transparent
                fillOpacity={labelAlpha}
                outlineOpacity={labelAlpha}
              >
                {b.sector.name}
              </FrontBillboardLabel>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ===================== LOD 1：部門 → 產業（沿該部門中心經線；外推半徑隨 blend 增加） =====================
function SectorIndustryBubbles({ blend01 = 0 }) {
  const { camera } = useThree();
  const [activeIndex, setActiveIndex] = useState(0);

  // 依視線所落點計算目前正對的部門
  useFrame(() => {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const hit = raySphereIntersection(camera.position, dir, new THREE.Vector3(0, 0, 0), RADIUS);
    if (!hit) return;
    const { lon } = vec3ToLonLat(hit);
    const idx = sectorIndexFromLon(lon);
    if (idx !== activeIndex) setActiveIndex(idx);
  });

  const lon0 = -180 + activeIndex * 72;
  const lon1 = lon0 + 72;
  const midLon = (lon0 + lon1) / 2;
  const currentSector = SECTORS[activeIndex];
  const items = INDUSTRIES[currentSector.key] ?? [];

  // 視覺距離：由遠到近，將 LOD1 的半徑外推更多，並給一點縮放感
  const baseR = RADIUS + lerp(0.05, 0.16, blend01); // 讓第二層離第一層「更遠」
  const rowScale = lerp(0.98, 1.04, blend01);

  const lats = useMemo(() => {
    const n = Math.max(1, items.length);
    const margin = 22;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const lat = THREE.MathUtils.lerp(90 - margin, -90 + margin, t);
      arr.push(lat);
    }
    return arr;
  }, [items.length]);

  // 透明度隨 blend01 漸入
  const alpha = lerp(0.0, 1.0, blend01);

  return (
    <group>
      {items.map((name, i) => {
        const p = lonLatToVec3(midLon, lats[i], baseR);
        const size = 0.12 * rowScale;
        return (
          <group key={name} position={p.toArray()} scale={[rowScale, rowScale, rowScale]}>
            <mesh>
              <circleGeometry args={[size, 48]} />
              <meshBasicMaterial color={0x000000} transparent opacity={0.08 * alpha} />
            </mesh>
            <FrontBillboardLabel
              position={[0, size * 1.2, 0]}
              fontSize={0.12 * rowScale}
              color="#333"
              anchorX="center"
              anchorY="middle"
              // 讓文字也一起淡入
              material-transparent
              fillOpacity={alpha}
            >
              {name}
            </FrontBillboardLabel>
          </group>
        );
      })}
    </group>
  );
}

// ===================== LOD 2（預留；仍靠近時才顯示） =====================
function FacilityDotsDemo() { return null; }

// ===================== LOD 切換（連續 0↔1，近距離觸發 2） =====================
function EnergyGlobeLOD() {
  const { blend01, nearLevel } = useZoomBlend(); // blend01: 0..1
  return (
    <group>
      <FullCoverSectors fade01={blend01} />
      <SectorIndustryBubbles blend01={blend01} />
      {nearLevel >= 2 && <FacilityDotsDemo />}
    </group>
  );
}

function Scene() {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(0, RADIUS * 0.9, RADIUS * 2.6); }, [camera]);
  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[5, 5, 5]} intensity={1.6} color={0xffffff} />

      <TransparentGlobe />
      <SoftTerminator strength={0.5} />
      <Atmosphere />

      <EnergyGlobeLOD />

      <Html position={[0, RADIUS * 1.55, 0]} transform center>
        <div style={{padding:"8px 12px", background:"rgba(0,0,0,0.55)", borderRadius:12, color:"#fff", fontSize:12, backdropFilter:"blur(6px)"}}>
          Energy Globe — Smooth LOD0→LOD1
        </div>
      </Html>

      <OrbitControls
        enablePan={false}
        minDistance={RADIUS * 1.05}
        maxDistance={RADIUS * 6}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
      />
    </>
  );
}

export default function GlobeVisualizer() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 1000 }}
    >
      <Suspense fallback={<Html center style={{ color: '#333' }}>Loading…</Html>}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
