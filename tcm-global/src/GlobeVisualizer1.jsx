import React, { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";

// =====================
// Energy Globe (LOD + Soft Shading)
// - 背景全白
// - 透明球體 + 柔光地球陰影（day–night terminator）
// - LOD：遠=貼齊表面的能源環帶、中文類別；中=國家級泡泡；近=設施點
// =====================

const RADIUS = 3.0;
const BG = 0xffffff; // 全白背景

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

// 類別中文顯示
const TYPE_ZH = {
  Coal: "煤炭",
  Oil: "石油",
  Gas: "天然氣",
  Hydro: "水力",
  Solar: "太陽能",
  Wind: "風力",
  Nuclear: "核能",
  Biomass: "生質能",
};

// —— DEMO 假資料 ——
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
  {
    name: "Japan",
    lon: 138.0,
    lat: 36.0,
    mix: { Coal: 32, Gas: 36, Nuclear: 6, Hydro: 8, Solar: 12, Wind: 2 },
    sites: [
      { name: "Hekinan Coal", type: "Coal" },
      { name: "Futtsu Gas", type: "Gas" },
      { name: "Kashiwazaki-Kariwa", type: "Nuclear" },
      { name: "Kurobe Hydro", type: "Hydro" },
      { name: "Mega Solar", type: "Solar" },
      { name: "Hokkaido Wind", type: "Wind" },
    ],
  },
];

// 環帶用的全球占比（demo）
const GLOBAL_SHARE = [
  { type: "Coal", value: 27 },
  { type: "Oil", value: 31 },
  { type: "Gas", value: 23 },
  { type: "Hydro", value: 6 },
  { type: "Nuclear", value: 5 },
  { type: "Wind", value: 4 },
  { type: "Solar", value: 3 },
  { type: "Biomass", value: 1 },
];

// ===================== 共用工具 =====================
function lonLatToVec3(lonDeg, latDeg, r = RADIUS, lift = 0) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    (r + lift) * Math.cos(lat) * Math.cos(lon),
    (r + lift) * Math.sin(lat),
    (r + lift) * Math.cos(lat) * Math.sin(lon)
  );
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

// ===================== 視覺：球體 + 柔光陰影 =====================
function TransparentGlobe() {
  const matRef = useRef();
  const { camera } = useThree();
  useFrame(() => {
    const d = camera.position.length();
    const near = RADIUS * 1.1, far = RADIUS * 5.0;
    const t = THREE.MathUtils.clamp((d - near) / (far - near), 0, 1);
    const opacity = THREE.MathUtils.lerp(0.22, 0.32, t); // 白底→球厚一點
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

// 柔光 terminator：以太陽方向做暗部覆蓋
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
          void main(){ vPos = position; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `}
        fragmentShader={`
          uniform vec3 sun; uniform float strength; varying vec3 vNormal;
          void main(){
            float nd = dot(normalize(vNormal), normalize(sun));
            float shade = smoothstep(-0.4, 0.2, nd); // 0 夜 1 日
            float alpha = (1.0 - shade) * strength; // 夜側變暗
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

// ===================== LOD 0：貼齊表面的能源「環帶」 =====================
function SurfaceEnergyBands({ shares = GLOBAL_SHARE }) {
  // 轉比例 → 角度範圍（固定在球體座標系，不再跟著相機旋轉）
  const slices = useMemo(() => {
    const total = shares.reduce((s, d) => s + (d.value || 0), 0) || 1;
    let acc = 0;
    return shares.map((d) => {
      const ratio = (d.value || 0) / total;
      const a0 = acc * Math.PI * 2; acc += ratio; const a1 = acc * Math.PI * 2;
      return { type: d.type, a0, a1, color: CATEGORY_COLORS[d.type] ?? 0x999999 };
    });
  }, [shares]);

  const thickness = 0.08; // 環帶厚度
  const lift = 0.004;     // 離表面極小距離，避免 Z-fighting

  return (
    // 固定在赤道平面（與球一起旋轉），不再面向相機
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {slices.map((s, i) => (
        <mesh key={i}>
          <ringGeometry args={[RADIUS - thickness - 0.002, RADIUS + lift, 256, 1, s.a0, s.a1 - s.a0]} />
          <meshBasicMaterial color={s.color} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* 中文標籤：只讓文字 billboard 面向相機，環帶本身不跟相機 */}
      {slices.map((s, i) => {
        const mid = (s.a0 + s.a1) / 2;
        const r = RADIUS + 0.02;
        const x = r * Math.cos(mid);
        const y = 0.05;
        const z = r * Math.sin(mid);
        return (
          <Text
            key={`t-${i}`}
            position={[x, y, z]}
            fontSize={0.16}
            color={`#${s.color.toString(16)}`}
            anchorX="center"
            anchorY="middle"
            billboard
          >
            {TYPE_ZH[s.type] ?? s.type}
          </Text>
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
            <Text position={[0, size * 1.6, 0]} fontSize={0.12} color="#333" anchorX="center" anchorY="middle">{c.name}</Text>
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
          <Text position={[0, 0.06, 0]} fontSize={0.08} color="#333" anchorX="center" anchorY="bottom">{p.name}</Text>
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

// ===================== 場景與 LOD 切換 =====================
function EnergyGlobeLOD() {
  const level = useZoomLevel(); // 0=遠 1=中 2=近
  return (
    <group>
      {level === 0 && <SurfaceEnergyBands />}
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
          Energy Globe — LOD demo
        </div>
      </Html>

      <OrbitControls enablePan={false} minDistance={RADIUS * 1.05} maxDistance={RADIUS * 6} />
    </>
  );
}

export default function GlobeVisualizer() {
  return (
    <Canvas style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true, logarithmicDepthBuffer: true }} dpr={[1, 2]} camera={{ fov: 45, near: 0.1, far: 1000 }}>
      <Suspense fallback={<Html center style={{ color: '#333' }}>Loading…</Html>}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
