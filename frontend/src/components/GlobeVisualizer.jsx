// ============================
// GlobeVisualizer.jsx — Part 1 / 2
// LOD0 / LOD1 / LOD2（瞬間切換 + 正確文字顯示版本）
// ============================

import React, {
  useMemo,
  useRef,
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

// 五大部門（LOD0）
const SECTORS = [
  { key: "agri", name: "農業", color: 0xdbeaf0 },
  { key: "ind", name: "工業", color: 0xdfedf3 },
  { key: "trans", name: "運輸", color: 0xe3f0f5 },
  { key: "service", name: "服務", color: 0xe7f3f7 },
  { key: "res", name: "住宅", color: 0xebf6f9 }
];

// 第二層：子產業
const INDUSTRIES = {
  agri: ["農作物與畜牧", "林業與木材", "漁業與水產", "食品初級加工", "農機服務"],
  ind: ["砂石產品", "食品飲料及菸草製造業", "化學材料與製品", "金屬製品", "機械與設備"],
  trans: ["公路運輸", "鐵路運輸", "海運與港務", "航空運輸", "倉儲與物流"],
  service: ["批發零售", "餐飲旅宿", "資訊與通訊", "金融保險", "教育與醫療"],
  res: ["住宅用電", "住宅燃氣", "住宅熱能", "家用再生能源"]
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

function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r = RADIUS, seg = 48 }) {
  const positions = [], normals = [], indices = [];
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
  if (d2 > radius * radius) return null;

  const thc = Math.sqrt(radius * radius - d2);
  const t0 = tca - thc, t1 = tca + thc;
  const t = t0 > 0 ? t0 : t1 > 0 ? t1 : null;
  return t == null ? null : eye.clone().add(dir.clone().multiplyScalar(t));
}

function vec3ToLonLat(v) {
  const n = v.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(n.y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(n.z, n.x));
  return { lon, lat };
}

function sectorIndexFromLon(lonDeg) {
  let lon = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  return Math.floor((lon + 180) / 72) % 5;
}

// ===================== ⭐ LOD 切換（瞬間切換） =====================
function useLODLevel() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0); // 0=LOD0, 1=LOD1, 2=LOD2

  useFrame(() => {
    const d = camera.position.length();

    const LOD1_Dist = RADIUS * 2.3;  
    const LOD2_Dist = RADIUS * 1.45;

    let newLOD = 0;
    if (d < LOD2_Dist) newLOD = 2;
    else if (d < LOD1_Dist) newLOD = 1;
    else newLOD = 0;

    if (newLOD !== lod) setLOD(newLOD);
  });

  return lod;
}

// ===================== ⭐ LOD0：五大部門（含標籤） =====================
function FullCoverSectors({ onSelect }) {
  const bands = useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      out.push({
        lon0: -180 + i * 72,
        lon1: -180 + (i + 1) * 72,
        lat0: -90,
        lat1: 90,
        sector: SECTORS[i]
      });
    }
    return out;
  }, []);

  return (
    <group>
      {bands.map((b, i) => {
        const geo = sphericalQuadGeometry({
          ...b,
          r: RADIUS + 0.01,
          seg: 48
        });

        const mat = new THREE.MeshStandardMaterial({
          color: b.sector.color,
          roughness: 0.8,
          metalness: 0.0,
          transparent: true,
          opacity: 1
        });

        // Label Position
        const labelPos = lonLatToVec3(
          (b.lon0 + b.lon1) / 2,
          0,
          RADIUS + 0.06
        ).toArray();

        return (
          <group key={i}>
            <mesh
              geometry={geo}
              material={mat}
              onUpdate={(m) => m.layers.set(LAYER_LOD0)}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "auto")}
              onClick={() => {
                onSelect({
                  type: "sector",
                  key: b.sector.key,
                  name: b.sector.name
                });
              }}
            />

            {/* LOD0 標籤 */}
            <group position={labelPos}>
              <Billboard follow>
                <Text
                  fontSize={0.28}
                  color="#111"
                  material-depthTest={false}
                  outlineWidth={0.007}
                  outlineColor="#fff"
                  renderOrder={300}
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

// ===================== ⭐ LOD1 + LOD2 =====================
function SectorIndustryBubbles({ showLOD2, onSelect }) {
  const { camera } = useThree();
  const [activeIndex, setActiveIndex] = useState(0);

  // 找相機正對的 sector
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
    const idx = sectorIndexFromLon(lon);
    setActiveIndex(idx);
  });

  const all = [];

  for (let si = 0; si < SECTORS.length; si++) {
    const parent = SECTORS[si];
    const items = INDUSTRIES[parent.key] ?? [];
    const n = items.length;

    const lon0 = -180 + si * 72;
    const lon1 = lon0 + 72;
    const layerR = RADIUS + 0.08;

    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;

      const lat1 = THREE.MathUtils.lerp(90, -90, t0);
      const lat0 = THREE.MathUtils.lerp(90, -90, t1);

      const subGeo = sphericalQuadGeometry({
        lat0, lat1,
        lon0, lon1,
        r: layerR
      });

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(parent.color).lerp(new THREE.Color(0xffffff), 0.3),
        roughness: 0.85,
        opacity: 1
      });

      const isFront = si === activeIndex;

      all.push(
        <group key={`${si}-${k}`}>
          {/* ===== LOD1 BAND ===== */}
          <mesh
            geometry={subGeo}
            material={mat}
            onUpdate={(m) => m.layers.set(LAYER_LOD1)}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
            onClick={() => {
              onSelect({
                type: "industry",
                parentKey: parent.key,
                parentName: parent.name,
                name: items[k]
              });
            }}
          />

          {/* ===== LOD1 LABEL（LOD2 時不顯示） ===== */}
          {isFront && !showLOD2 && (
            <group
              position={lonLatToVec3(
                (lon0 + lon1) / 2,
                (lat0 + lat1) / 2,
                layerR + 0.015
              ).toArray()}
            >
              <Billboard follow>
                <Text
                  fontSize={0.18}
                  color="#000"
                  material-depthTest={false}
                  outlineWidth={0.005}
                  outlineColor="#fff"
                  renderOrder={350}
                >
                  {items[k]}
                </Text>
              </Billboard>
            </group>
          )}

          {/* ===== ⭐ LOD2 小格（band 內再切 3 塊） ===== */}
          {showLOD2 &&
            Array.from({ length: 3 }).map((_, m) => {
              const s0 = m / 3;
              const s1 = (m + 1) / 3;

              const lon2_0 = THREE.MathUtils.lerp(lon0, lon1, s0);
              const lon2_1 = THREE.MathUtils.lerp(lon0, lon1, s1);

              const sub2Geo = sphericalQuadGeometry({
                lat0,
                lat1,
                lon0: lon2_0,
                lon1: lon2_1,
                r: layerR + 0.05
              });

              const labelPos = lonLatToVec3(
                (lon2_0 + lon2_1) / 2,
                (lat0 + lat1) / 2,
                layerR + 0.08
              ).toArray();

              return (
                <group key={`${si}-${k}-L2-${m}`}>
                  <mesh
                    geometry={sub2Geo}
                    material={
                      new THREE.MeshStandardMaterial({
                        color: new THREE.Color(parent.color).lerp(
                          new THREE.Color(0xffffff),
                          0.55
                        ),
                        roughness: 0.8,
                        opacity: 1
                      })
                    }
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

                  {/* LOD2 LABEL */}
                  {isFront && (
                    <group position={labelPos}>
                      <Billboard follow>
                        <Text
                          fontSize={0.12}
                          color="#000"
                          material-depthTest={false}
                          outlineWidth={0.003}
                          outlineColor="#fff"
                          renderOrder={400}
                        >
                          {`LOD2 範例 ${m + 1}`}
                        </Text>
                      </Billboard>
                    </group>
                  )}
                </group>
              );
            })}
        </group>
      );
    }
  }

  return <group>{all}</group>;
}
// ===================== 視覺：球體（透明外殼） =====================
function TransparentGlobe() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhongMaterial
        color={0xeef7ff}
        emissive={0xb7d4e6}
        specular={0xffffff}
        transparent
        opacity={0.33}
        shininess={90}
        depthWrite={false}
      />
    </mesh>
  );
}

// ===================== 柔光 Terminator =====================
function SoftTerminator({
  strength = 0.55,
  sunDir = new THREE.Vector3(1, 0.4, 0.2).normalize()
}) {
  const uniforms = useMemo(
    () => ({
      sun: { value: sunDir },
      strength: { value: strength },
      radius: { value: RADIUS }
    }),
    [sunDir, strength]
  );

  return (
    <mesh>
      <sphereGeometry args={[RADIUS * 1.001, 128, 128]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`}
        fragmentShader={`
          uniform vec3 sun;
          uniform float strength;
          varying vec3 vNormal;
          void main() {
            float nd = dot(normalize(vNormal), normalize(sun));
            float shade = smoothstep(-0.4, 0.2, nd);
            float a = (1.0 - shade) * strength;
            gl_FragColor = vec4(0.4,0.5,0.6, a * 0.6);
          }`}
      />
    </mesh>
  );
}

// ===================== 大氣光暈 =====================
function Atmosphere() {
  return (
    <mesh renderOrder={-20}>
      <sphereGeometry args={[RADIUS * 1.04, 64, 64]} />
      <meshBasicMaterial
        color={0x3ea0ff}
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ===================== Raycaster Layer 指定 =====================
function RaycastLayerController({ activeLayer }) {
  const { raycaster } = useThree();

  useEffect(() => {
    raycaster.layers.disableAll();
    raycaster.layers.enable(activeLayer);
  }, [activeLayer, raycaster]);

  return null;
}

// ===================== ⭐ LOD 控制器 =====================
function EnergyGlobeLOD({ onSelect }) {
  const lod = useLODLevel(); // 0=LOD0, 1=LOD1, 2=LOD2

  const activeLayer = lod === 0 ? LAYER_LOD0 : LAYER_LOD1;

  return (
    <group>
      <RaycastLayerController activeLayer={activeLayer} />

      {lod === 0 && <FullCoverSectors onSelect={onSelect} />}

      {lod === 1 && (
        <SectorIndustryBubbles showLOD2={false} onSelect={onSelect} />
      )}

      {lod === 2 && (
        <SectorIndustryBubbles showLOD2={true} onSelect={onSelect} />
      )}
    </group>
  );
}

// ===================== ⭐ Scene（燈光、球體等） =====================
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
      {/* 光源 */}
      <ambientLight intensity={1.25} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.6}
        color={0xffffff}
      />

      {/* 球體結構 */}
      <TransparentGlobe />
      <SoftTerminator strength={0.5} />
      <Atmosphere />

      {/* LOD */}
      <EnergyGlobeLOD onSelect={onSelect} />

      {/* 控制器 */}
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

// ===================== ⭐ GlobeVisualizer（主入口） =====================
export default function GlobeVisualizer({ onSelect }) {
  const [selection, setSelection] = useState(null);
  const [lastAiSelection, setLastAiSelection] = useState(null);

  // ===================== AI 選擇同步（每 2 秒查 selected.json） =====================
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3001/selected.json", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (data?.selection && data.selection !== lastAiSelection) {
          const newSel = {
            type: "sector",
            name: data.selection,
          };

          setSelection(newSel);
          onSelect?.(newSel);
          setLastAiSelection(data.selection);
        }
      } catch (e) {
        console.warn("❌ AI 選取同步錯誤：", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lastAiSelection, onSelect]);

  // ===================== 渲染 =====================
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "transparent" }}>
      {/* 左側：球體 */}
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
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.autoClear = false;
          }}
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
