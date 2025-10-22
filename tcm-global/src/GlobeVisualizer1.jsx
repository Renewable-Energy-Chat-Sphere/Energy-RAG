// GlobeVisualizer.jsx — Five Sectors Full-Cover Wedges (2025-10-22, front-only billboard labels)
import React, { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard } from "@react-three/drei";

// ===================== 基本設定 =====================
const RADIUS = 3.0;
const BG = 0xffffff; // 全白背景

// 五大部門
const SECTORS = [
  { key: "agri",    name: "農業",  color: 0x48d99a },
  { key: "ind",     name: "工業",  color: 0xffa15a },
  { key: "trans",   name: "運輸",  color: 0x5fbef2 },
  { key: "service", name: "服務",  color: 0x8b6cff },
  { key: "res",     name: "住宅",  color: 0xff6f9d },
];

// 模擬（保留中/近 LOD）
const COUNTRIES = [
  {
    name: "Taiwan",
    lon: 121.0,
    lat: 23.8,
    mix: { Coal: 45, Gas: 35, Nuclear: 7, Hydro: 2, Solar: 9, Wind: 2 },
    sites: [
      { name: "Taichung Coal", type: "Coal" },
      { name: "Tatan Gas", type: "Gas" },
      { name: "Maanshan Nuke", type: "Nuclear" },
      { name: "Zengwen Hydro", type: "Hydro" },
      { name: "Tainan Solar", type: "Solar" },
      { name: "Offshore Wind", type: "Wind" },
    ],
  },
];

const CATEGORY_COLORS = {
  Coal: 0x8b6cff,
  Oil: 0xffa15a,
  Gas: 0x5fbef2,
  Hydro: 0x48d99a,
  Solar: 0xffd35a,
  Wind: 0x6fd3ff,
  Nuclear: 0xff6f9d,
  Biomass: 0xa7ff7b,
};

// ===================== 工具函式 =====================
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

function useZoomLevel() {
  const { camera } = useThree();
  const [level, setLevel] = useState(0);
  useFrame(() => {
    const d = camera.position.length();
    const near = RADIUS * 1.15;
    const mid = RADIUS * 2.2;
    const L = d < mid ? (d < near * 1.25 ? 2 : 1) : 0;
    if (L !== level) setLevel(L);
  });
  return level;
}

// ===================== 只在前半球顯示的看板文字 =====================
function FrontBillboardLabel({
  position = [0, 0, 0],
  children,
  groupProps = {},
  threshold = 0.02, // >0 在前半球；小緩衝避免邊緣閃爍
  // Text props 直接往下傳
  ...textProps
}) {
  const { camera } = useThree();
  const [visible, setVisible] = useState(true);
  const grp = useRef();

  useFrame(() => {
    if (!grp.current) return;
    // 以世界座標做判斷，支援巢狀 group
    const wp = new THREE.Vector3();
    grp.current.getWorldPosition(wp);
    const dp = wp.clone().normalize().dot(camera.position.clone().normalize());
    const isFront = dp > threshold;
    if (visible !== isFront) setVisible(isFront);
  });

  return (
    <group ref={grp} visible={visible} position={position} {...groupProps}>
      <Billboard follow>
        <Text
          // 讓文字被前景合理遮擋，但不寫入深度以減少半透明排序問題
          material-depthTest
          material-depthWrite={false}
          renderOrder={10}
          {...textProps}
        >
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

// ===================== LOD 0：五楔形滿版 =====================
// 將經度分成 5 個連續扇區（每個 72°），覆蓋整顆球（緯度 -90~90）。
function FullCoverSectors() {
  const bands = useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const lon0 = -180 + i * 72;       // 5 等分經度
      const lon1 = lon0 + 72;
      const s = SECTORS[i % SECTORS.length];
      out.push({ lon0, lon1, lat0: -90, lat1: 90, sector: s });
    }
    return out;
  }, []);

  // 材質快取（半透明 + 不寫深度，避免互切；polygonOffset 避免貼殼抖動）
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
          opacity: 0.9,
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
          r: RADIUS + 0.003,  // 緊貼球面外側
          seg: 64,            // 平滑
        });

        // 標籤放扇區中心（經度中點、緯度 0）
        const midLon = (b.lon0 + b.lon1) / 2;
        const labelPos = lonLatToVec3(midLon, 0, RADIUS + 0.01).toArray();

        return (
          <group key={i}>
            <mesh geometry={geo} material={matCache.get(b.sector.key)} />
            <FrontBillboardLabel
              position={labelPos}
              fontSize={0.26}
              color="#111111"
              outlineWidth={0.006}
              outlineColor="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {b.sector.name}
            </FrontBillboardLabel>
          </group>
        );
      })}
    </group>
  );
}

// ===================== LOD 1：國家級泡泡 =====================
function CountryBubbles() {
  return (
    <group>
      {COUNTRIES.map((c) => {
        const pos = lonLatToVec3(c.lon, c.lat, RADIUS, 0.01);
        const total = Object.values(c.mix).reduce((s, v) => s + v, 0);
        const size = THREE.MathUtils.lerp(0.08, 0.24, Math.min(1, total / 120));
        return (
          <group key={c.name} position={pos.toArray()}>
            <mesh>
              <circleGeometry args={[size, 48]} />
              <meshBasicMaterial color={0x000000} transparent opacity={0.08} />
            </mesh>
            <FrontBillboardLabel
              position={[0, size * 1.6, 0]}
              fontSize={0.12}
              color="#333"
              anchorX="center"
              anchorY="middle"
            >
              {c.name}
            </FrontBillboardLabel>
          </group>
        );
      })}
    </group>
  );
}

// ===================== LOD 2：設施點 =====================
function FacilityDots() {
  const { camera } = useThree();
  const look = useRef({ country: COUNTRIES[0] });
  useFrame(() => {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const hit = raySphereIntersection(camera.position, dir, new THREE.Vector3(0, 0, 0), RADIUS);
    if (!hit) return;
    let best = null; let bestAng = Infinity;
    for (const c of COUNTRIES) {
      const p = lonLatToVec3(c.lon, c.lat, RADIUS);
      const ang = p.angleTo(hit);
      if (ang < bestAng) { bestAng = ang; best = c; }
    }
    if (best) look.current.country = best;
  });
  const c = look.current.country;
  const base = lonLatToVec3(c.lon, c.lat, RADIUS, 0.01);
  const points = useMemo(() => c.sites.map((s) => ({ ...s, pos: randomOnSphereCap(base, 6) })), [c]);
  return (
    <group>
      {points.map((p, i) => (
        <group key={i} position={p.pos.toArray()}>
          <mesh>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color={CATEGORY_COLORS[p.type] ?? 0x888888} />
          </mesh>
          <FrontBillboardLabel
            position={[0, 0.06, 0]}
            fontSize={0.08}
            color="#333"
            anchorX="center"
            anchorY="bottom"
          >
            {p.name}
          </FrontBillboardLabel>
        </group>
      ))}
    </group>
  );
}

function randomOnSphereCap(centerVec3, angleDeg) {
  const axis = centerVec3.clone().normalize();
  const angle = THREE.MathUtils.degToRad(angleDeg);
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(1 - v * (1 - Math.cos(angle)));
  const local = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  );
  const y = axis;
  const x = new THREE.Vector3(0, 1, 0).cross(y).normalize();
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  const z = y.clone().cross(x).normalize();
  return new THREE.Vector3()
    .addScaledVector(x, local.x)
    .addScaledVector(y, local.y)
    .addScaledVector(z, local.z)
    .multiplyScalar(RADIUS + 0.02);
}

// ===================== LOD 切換 =====================
function EnergyGlobeLOD() {
  const level = useZoomLevel(); // 0=遠 1=中 2=近
  return (
    <group>
      {level === 0 && <FullCoverSectors />}
      {level >= 1 && <CountryBubbles />}
      {level >= 2 && <FacilityDots />}
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
          Energy Globe — Five Wedges LOD
        </div>
      </Html>

      <OrbitControls enablePan={false} minDistance={RADIUS * 1.05} maxDistance={RADIUS * 6} />
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
