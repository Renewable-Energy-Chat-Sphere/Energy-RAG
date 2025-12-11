// =========================================
// GlobeVisualizer.jsx — Part 1 / 2
// LOD0 / LOD1 / LOD2 + Natural Hover + LOD2 FAST
// =========================================

import React, {
  useMemo,
  useEffect,
  useState,
  Suspense
} from "react";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard } from "@react-three/drei";

// ===================== 基本設定 =====================
const RADIUS = 3.0;
const LAYER_LOD0 = 1;
const LAYER_LOD1 = 2;

// Hover 浮起高度
const HOVER_OFFSET = {
  lod0: 0.015,
  lod1: 0.010,
  lod2: 0.006
};

// LOD2 FAST — 幾何解析度
const LOD2_SEG = 18;

// ===================== 部門定義 =====================
const SECTORS = [
  { key: "agri", name: "農業", color: 0xdbeaf0 },
  { key: "ind", name: "工業", color: 0xdfedf3 },
  { key: "trans", name: "運輸", color: 0xe3f0f5 },
  { key: "service", name: "服務", color: 0xe7f3f7 },
  { key: "res", name: "住宅", color: 0xebf6f9 }
];

const INDUSTRIES = {
  agri: ["農作物與畜牧", "林業與木材", "漁業與水產", "食品初級加工", "農機服務"],
  ind: ["砂石產品", "食品飲料及菸草製造業", "化學材料與製品", "金屬製品", "機械與設備"],
  trans: ["公路運輸", "鐵路運輸", "海運與港務", "航空運輸", "倉儲與物流"],
  service: ["批發零售", "餐飲旅宿", "資訊與通訊", "金融保險", "教育與醫療"],
  res: ["住宅用電", "住宅燃氣", "住宅熱能", "家用再生能源"]
};

// ===================== 工具：Lon/Lat → Vec3 =====================
function lonLatToVec3(lonDeg, latDeg, r = RADIUS, lift = 0) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    (r + lift) * Math.cos(lat) * Math.cos(lon),
    (r + lift) * Math.sin(lat),
    (r + lift) * Math.cos(lat) * Math.sin(lon)
  );
}

// ===================== 球面分塊（含 LOD2 FAST） =====================
function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r, seg = 48 }) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let i = 0; i <= seg; i++) {
    for (let j = 0; j <= seg; j++) {
      const lat = THREE.MathUtils.lerp(lat0, lat1, i / seg);
      const lon = THREE.MathUtils.lerp(lon0, lon1, j / seg);
      const p = lonLatToVec3(lon, lat, r);
      positions.push(p.x, p.y, p.z);
      normals.push(...p.clone().normalize());
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

// ===================== Raycast 球面交會 =====================
function raySphereIntersection(eye, dir, center, radius) {
  const L = center.clone().sub(eye);
  const tca = L.dot(dir);
  const d2 = L.lengthSq() - tca * tca;
  if (d2 > radius * radius) return null;

  const thc = Math.sqrt(radius * radius - d2);
  const t0 = tca - thc;
  const t1 = tca + thc;
  const t = t0 > 0 ? t0 : t1 > 0 ? t1 : null;

  return t == null ? null : eye.clone().add(dir.clone().multiplyScalar(t));
}

function vec3ToLonLat(v) {
  const n = v.clone().normalize();
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(n.y)),
    lon: THREE.MathUtils.radToDeg(Math.atan2(n.z, n.x))
  };
}

function sectorIndexFromLon(lonDeg) {
  const lon = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  return Math.floor((lon + 180) / 72) % 5;
}

// ===================== 字體縮放：三層正式 Google Earth 版 =====================
// LOD0 大 → LOD1 中 → LOD2 小
function useCameraLabelScales() {
  const { camera } = useThree();
  const [sizes, setSizes] = useState({
    lod0: 0.26,
    lod1: 0.18,
    lod2: 0.10
  });

  useFrame(() => {
    const d = camera.position.length();
    const s = THREE.MathUtils.clamp(d / (RADIUS * 3.2), 0.35, 1);

    setSizes({
      lod0: 0.26 * s,
      lod1: 0.18 * (s * 0.78),
      lod2: 0.10 * (s * 0.60)
    });
  });

  return sizes;
}

// ===================== LOD 計算 =====================
function useLODLevel() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0);

  useFrame(() => {
    const d = camera.position.length();
    const L1 = RADIUS * 2.3;
    const L2 = RADIUS * 1.45;
    const newLOD = d < L2 ? 2 : d < L1 ? 1 : 0;

    if (newLOD !== lod) setLOD(newLOD);
  });

  return lod;
}

// ===================== ⭐ LOD0（半球 + Hover 浮起） =====================
function FullCoverSectors({ onSelect }) {
  const { camera } = useThree();
  const label = useCameraLabelScales();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hover, setHover] = useState(null);

  const bands = useMemo(
    () =>
      SECTORS.map((sector, i) => ({
        lon0: -180 + i * 72,
        lon1: -180 + (i + 1) * 72,
        sector
      })),
    []
  );

  // 判斷正對的 LOD0 Sector
  useFrame(() => {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const hit = raySphereIntersection(camera.position, forward, new THREE.Vector3(0, 0, 0), RADIUS);
    if (!hit) return;
    const { lon } = vec3ToLonLat(hit);
    setActiveIndex(sectorIndexFromLon(lon));
  });

  const visible = [
    activeIndex,
    (activeIndex + 1) % 5,
    (activeIndex + 4) % 5
  ];

  return (
    <group renderOrder={10}>
      {bands.map((b, i) => {
        if (!visible.includes(i)) return null;

        const rOffset = hover === i ? HOVER_OFFSET.lod0 : 0;

        const geo = sphericalQuadGeometry({
          lat0: -90,
          lat1: 90,
          lon0: b.lon0,
          lon1: b.lon1,
          r: RADIUS + 0.01 + rOffset
        });

        return (
          <group key={i}>
            <mesh
              geometry={geo}
              material={
                new THREE.MeshStandardMaterial({
                  color: b.sector.color,
                  roughness: 0.82
                })
              }
              onUpdate={(m) => m.layers.set(LAYER_LOD0)}
              onPointerOver={() => setHover(i)}
              onPointerOut={() => setHover(null)}
              onClick={() =>
                onSelect({
                  type: "sector",
                  key: b.sector.key,
                  name: b.sector.name
                })
              }
            />

            {/* label */}
            <group
              position={lonLatToVec3(
                (b.lon0 + b.lon1) / 2,
                0,
                RADIUS + 0.05
              ).toArray()}
            >
              <Billboard follow>
                <Text
                  fontSize={label.lod0}
                  color="#111"
                  material-depthTest={false}
                >
                  {b.sector.name}
                </Text>
              </Billboard>
            </group>
          </group>
        );
      })}
    </group>
  );
}
// =========================================
// GlobeVisualizer.jsx — Part 2 / 2
// LOD1 / LOD2 FAST / Scene / Root Component
// =========================================

// ===================== LOD1 + LOD2 FAST =====================
function SectorIndustryBubbles({ showLOD2, onSelect }) {
  const { camera } = useThree();
  const label = useCameraLabelScales();

  const [activeIndex, setActiveIndex] = useState(0);
  const [hover, setHover] = useState(null);

  // 判斷目前正對的 sectorIndex
  useFrame(() => {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const hit = raySphereIntersection(
      camera.position,
      dir,
      new THREE.Vector3(0, 0, 0),
      RADIUS
    );
    if (!hit) return;
    const { lon } = vec3ToLonLat(hit);
    setActiveIndex(sectorIndexFromLon(lon));
  });

  const nodes = [];

  for (let si = 0; si < SECTORS.length; si++) {
    const parent = SECTORS[si];
    const items = INDUSTRIES[parent.key] ?? [];
    const n = items.length;

    const lon0 = -180 + si * 72;
    const lon1 = lon0 + 72;

    const baseRadius = RADIUS + 0.08;

    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;

      const lat1 = THREE.MathUtils.lerp(90, -90, t0);
      const lat0 = THREE.MathUtils.lerp(90, -90, t1);

      const isFront = si === activeIndex;
      const isHover = hover === `${si}-${k}`;

      const offset = isHover ? HOVER_OFFSET.lod1 : 0;

      // LOD1 tile geometry
      const geo1 = sphericalQuadGeometry({
        lat0,
        lat1,
        lon0,
        lon1,
        r: baseRadius + offset,
        seg: 32
      });

      nodes.push(
        <group key={`L1-${si}-${k}`}>
          <mesh
            geometry={geo1}
            material={
              new THREE.MeshStandardMaterial({
                color: new THREE.Color(parent.color).lerp(
                  new THREE.Color(0xffffff),
                  0.30
                ),
                roughness: 0.88
              })
            }
            onUpdate={(m) => m.layers.set(LAYER_LOD1)}
            onPointerOver={() => setHover(`${si}-${k}`)}
            onPointerOut={() => setHover(null)}
            onClick={() =>
              onSelect({
                type: "industry",
                parentKey: parent.key,
                parentName: parent.name,
                name: items[k]
              })
            }
          />

          {/* LOD1 label：只在正前方顯示 */}
          {isFront && !showLOD2 && (
            <group
              position={lonLatToVec3(
                (lon0 + lon1) / 2,
                (lat0 + lat1) / 2,
                baseRadius + 0.015
              ).toArray()}
            >
              <Billboard follow>
                <Text
                  fontSize={label.lod1}
                  color="#000"
                  material-depthTest={false}
                >
                  {items[k]}
                </Text>
              </Billboard>
            </group>
          )}
        </group>
      );

      // ============= LOD2 FAST =============
      if (showLOD2 && isFront) {
        for (let m = 0; m < 3; m++) {
          const s0 = m / 3;
          const s1 = (m + 1) / 3;

          const lonA = THREE.MathUtils.lerp(lon0, lon1, s0);
          const lonB = THREE.MathUtils.lerp(lon0, lon1, s1);

          const isHover2 = hover === `L2-${si}-${k}-${m}`;
          const rOffset2 = isHover2 ? HOVER_OFFSET.lod2 : 0;

          const geo2 = sphericalQuadGeometry({
            lat0,
            lat1,
            lon0: lonA,
            lon1: lonB,
            r: baseRadius + 0.05 + rOffset2,
            seg: LOD2_SEG               // ⭐ FAST MODE（seg=18）
          });

          const labelPos = lonLatToVec3(
            (lonA + lonB) / 2,
            (lat0 + lat1) / 2,
            baseRadius + 0.06
          ).toArray();

          nodes.push(
            <group key={`L2-${si}-${k}-${m}`}>
              <mesh
                geometry={geo2}
                material={
                  new THREE.MeshStandardMaterial({
                    color: new THREE.Color(parent.color).lerp(
                      new THREE.Color(0xffffff),
                      0.55
                    ),
                    roughness: 0.85
                  })
                }
                onPointerOver={() => setHover(`L2-${si}-${k}-${m}`)}
                onPointerOut={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({
                    type: "lod2",
                    parentSector: parent.name,
                    parentIndustry: items[k],
                    name: `LOD2 範例 ${m + 1}`
                  });
                }}
              />

              {/* LOD2 Label（小字 + 不貼太近） */}
              <group position={labelPos}>
                <Billboard follow>
                  <Text
                    fontSize={label.lod2}  // ⭐ 正確縮放
                    color="#000"
                    material-depthTest={false}
                  >
                    {`LOD2 範例 ${m + 1}`}
                  </Text>
                </Billboard>
              </group>
            </group>
          );
        }
      }
    }
  }

  return <group>{nodes}</group>;
}

// ===================== Transparent Globe =====================
function TransparentGlobe() {
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhongMaterial
        color={0xeef7ff}
        emissive={0xb7d4e6}
        specular={0xffffff}
        shininess={90}
        transparent
        opacity={0.33}
        depthWrite={false}
      />
    </mesh>
  );
}

// ===================== Soft Terminator =====================
function SoftTerminator() {
  const sun = new THREE.Vector3(1, 0.4, 0.2).normalize();

  const uniforms = useMemo(
    () => ({
      sun: { value: sun },
      strength: { value: 0.55 }
    }),
    []
  );

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[RADIUS * 1.001, 128, 128]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 sun;
          uniform float strength;
          varying vec3 vNormal;
          void main() {
            float nd = dot(normalize(vNormal), normalize(sun));
            float shade = smoothstep(-0.4, 0.2, nd);
            float a = (1.0 - shade) * strength;
            gl_FragColor = vec4(0.4,0.5,0.6, a * 0.6);
          }
        `}
      />
    </mesh>
  );
}

// ===================== Atmosphere =====================
function Atmosphere() {
  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[RADIUS * 1.04, 64, 64]} />
      <meshBasicMaterial
        color={0x3ea0ff}
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

// ===================== Raycaster 層控制 =====================
function RaycastLayerController({ activeLayer }) {
  const { raycaster } = useThree();

  useEffect(() => {
    raycaster.layers.disableAll();
    raycaster.layers.enable(activeLayer);
  }, [activeLayer, raycaster]);

  return null;
}

// ===================== LOD Controller =====================
function EnergyGlobeLOD({ onSelect }) {
  const lod = useLODLevel();
  const activeLayer = lod === 0 ? LAYER_LOD0 : LAYER_LOD1;

  return (
    <group renderOrder={10}>
      <RaycastLayerController activeLayer={activeLayer} />

      {lod === 0 && <FullCoverSectors onSelect={onSelect} />}
      {lod === 1 && <SectorIndustryBubbles showLOD2={false} onSelect={onSelect} />}
      {lod === 2 && <SectorIndustryBubbles showLOD2={true} onSelect={onSelect} />}
    </group>
  );
}

// ===================== Scene =====================
function Scene({ onSelect }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    camera.position.set(0, RADIUS * 0.9, RADIUS * 2.6);
    camera.layers.enable(LAYER_LOD0);
    camera.layers.enable(LAYER_LOD1);

    gl.setClearColor(0x000000, 0);
    gl.autoClear = false;
  }, [camera, gl]);

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} color={0xffffff} />

      <TransparentGlobe />
      <SoftTerminator />
      <Atmosphere />

      <EnergyGlobeLOD onSelect={onSelect} />

      <OrbitControls
        enablePan={false}
        minDistance={RADIUS * 1.05}
        maxDistance={RADIUS * 6}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        zoomSpeed={0.85}
      />
    </>
  );
}

// ===================== Root Component =====================
export default function GlobeVisualizer({ onSelect }) {
  const [selection, setSelection] = useState(null);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "transparent"
      }}
    >
      <div style={{ flex: 1, height: "100%", position: "relative" }}>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          gl={{
            alpha: true,
            antialias: true,
            logarithmicDepthBuffer: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 2000 }}
        >
          <Suspense fallback={<Html center>Loading…</Html>}>
            <Scene
              onSelect={(v) => {
                setSelection(v);
                onSelect?.(v);
              }}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
