import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  Suspense
} from "react";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text } from "@react-three/drei";

import DEPT_JSON from "../data/index_demand.json";

// ===================== 基本設定 =====================
const RADIUS = 3.0;
const LAYER_LOD0 = 1;
const LAYER_LOD1 = 2;

// Hover 浮起高度
const HOVER_OFFSET = {
  lod0: 0.015,
  lod1: 0.01,
  lod2: 0.006
};

// =====================
// JSON → Hierarchy Extractor
// =====================
function extractDeptHierarchy(json) {
  const level1 = [];
  const level2ByParent = {};
  const level3ByParent = {};

  function walk(node, parentCode = null) {
    for (const [code, item] of Object.entries(node)) {
      if (item.level === 1) {
        level1.push({ code, name: item.name });
      }

      if (item.level === 2 && parentCode) {
        level2ByParent[parentCode] ??= [];
        level2ByParent[parentCode].push({ code, name: item.name });
      }

      if (item.level === 3 && parentCode) {
        level3ByParent[parentCode] ??= [];
        level3ByParent[parentCode].push({ code, name: item.name });
      }

      if (item.children) {
        walk(item.children, code);
      }
    }
  }

  walk(json);
  return { level1, level2ByParent, level3ByParent };
}

// =====================
// Lon / Lat → Vec3
// =====================
function lonLatToVec3(lonDeg, latDeg, r = RADIUS, lift = 0) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    (r + lift) * Math.cos(lat) * Math.cos(lon),
    (r + lift) * Math.sin(lat),
    (r + lift) * Math.cos(lat) * Math.sin(lon)
  );
}

// =====================
// Surface-aligned Label
// =====================
function SurfaceLabel({
  lon,
  lat,
  radius,
  offset = 0.02,
  fontSize,
  color = "#000",
  children
}) {
  const ref = useRef();

  const position = useMemo(() => {
    return lonLatToVec3(lon, lat, radius + offset);
  }, [lon, lat, radius, offset]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.lookAt(0, 0, 0);
    ref.current.rotateY(Math.PI);
  }, []);

  return (
    <group ref={ref} position={position.toArray()}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        material-depthTest={false}
      >
        {children}
      </Text>
    </group>
  );
}

// =====================
// 球面分塊 Geometry
// =====================
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
// =====================
// Raycast 球面交會
// =====================
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

// =====================
// Camera 距離 → LOD
// =====================
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

// =====================
// 字體縮放（Google Earth 風格）
// =====================
function useCameraLabelScales() {
  const { camera } = useThree();
  const [sizes, setSizes] = useState({
    lod0: 0.26,
    lod1: 0.18,
    lod2: 0.1
  });

  useFrame(() => {
    const d = camera.position.length();
    const s = THREE.MathUtils.clamp(d / (RADIUS * 3.2), 0.35, 1);
    setSizes({
      lod0: 0.26 * s,
      lod1: 0.18 * (s * 0.78),
      lod2: 0.1 * (s * 0.6)
    });
  });

  return sizes;
}

// =====================
// Raycaster Layer Controller
// =====================
function RaycastLayerController({ activeLayer }) {
  const { raycaster } = useThree();

  useEffect(() => {
    raycaster.layers.disableAll();
    raycaster.layers.enable(activeLayer);
  }, [activeLayer, raycaster]);

  return null;
}

// =====================
// LOD0 — Level 1（★整顆球都 render）
// =====================
function LOD0Sectors({ hierarchy, onSelect }) {
  const { camera } = useThree();
  const label = useCameraLabelScales();
  const { level1 } = hierarchy;

  const sectorCount = level1.length;
  const sectorAngle = 360 / sectorCount;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);

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
    const idx =
      Math.floor(((lon + 180) / 360) * sectorCount) % sectorCount;

    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActiveIndex(idx);
    }
  });

  return (
    <group renderOrder={10}>
      {level1.map((dept, i) => {
        const lon0 = -180 + i * sectorAngle;
        const lon1 = lon0 + sectorAngle;

        const geo = sphericalQuadGeometry({
          lat0: -90,
          lat1: 90,
          lon0,
          lon1,
          r: RADIUS + 0.01
        });

        return (
          <group key={dept.code}>
            {/* ★ 所有 sector 都 render（前面 + 背面） */}
            <mesh
              geometry={geo}
              material={
                new THREE.MeshStandardMaterial({
                  color: 0xe6eef2,   // 比原本更淡
                  roughness: 1,
                  metalness: 0,
                  transparent: true,
                  opacity: 0.18,     // ⭐ 關鍵：讓紫色球透出來
                  depthWrite: false  // ⭐ 關鍵：不要擋底層球殼
                })
              }
              onUpdate={(m) => m.layers.set(LAYER_LOD0)}
              onClick={() =>
                onSelect?.({
                  level: 1,
                  code: dept.code,
                  name: dept.name
                })
              }
            />

            {/* ★ Label 只顯示正對的 sector */}
            {i === activeIndex && (
              <SurfaceLabel
                lon={(lon0 + lon1) / 2}
                lat={0}
                radius={RADIUS}
                offset={0.025}
                fontSize={label.lod0}
              >
                {`${dept.code}\n${dept.name}`}
              </SurfaceLabel>
            )}
          </group>
        );
      })}
    </group>
  );
}
// =====================
// LOD1 / LOD2 — Level 2 & 3（★整顆球都有 base）
// =====================
function LOD1And2({ hierarchy, showLOD2, onSelect }) {
  const { camera } = useThree();
  const label = useCameraLabelScales();

  const { level1, level2ByParent, level3ByParent } = hierarchy;
  const sectorCount = level1.length;
  const sectorAngle = 360 / sectorCount;

  const [activeIndex, setActiveIndex] = useState(0);

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
    const idx =
      Math.floor(((lon + 180) / 360) * sectorCount) % sectorCount;
    setActiveIndex(idx);
  });

  const nodes = [];

  for (let si = 0; si < level1.length; si++) {
    const parent = level1[si];
    const lon0 = -180 + si * sectorAngle;
    const lon1 = lon0 + sectorAngle;

    // =====================
    // ★ Base layer（所有 sector 都有）
    // =====================
    const baseGeo = sphericalQuadGeometry({
      lat0: -90,
      lat1: 90,
      lon0,
      lon1,
      r: RADIUS + 0.08,
      seg: 32
    });

    nodes.push(
      <mesh
        key={`base-${parent.code}`}
        geometry={baseGeo}
        material={
          new THREE.MeshStandardMaterial({
            color: 0xf0f6fa,
            roughness: 0.9
          })
        }
        onUpdate={(m) => m.layers.set(LAYER_LOD1)}
      />
    );

    // =====================
    // ★ 只有 active sector 才細分
    // =====================
    if (si !== activeIndex) continue;

    const level2 = level2ByParent[parent.code] ?? [];
    const n2 = level2.length;
    const baseR = RADIUS + 0.08;

    for (let i = 0; i < n2; i++) {
      const t0 = i / n2;
      const t1 = (i + 1) / n2;
      const lat1 = THREE.MathUtils.lerp(90, -90, t0);
      const lat0 = THREE.MathUtils.lerp(90, -90, t1);

      const geo1 = sphericalQuadGeometry({
        lat0,
        lat1,
        lon0,
        lon1,
        r: baseR,
        seg: 32
      });

      nodes.push(
        <group key={`L1-${parent.code}-${i}`}>
          <mesh
            geometry={geo1}
            material={
              new THREE.MeshStandardMaterial({
                color: 0xf0f6fa,
                roughness: 0.9
              })
            }
            onUpdate={(m) => m.layers.set(LAYER_LOD1)}
            onClick={() =>
              onSelect?.({
                level: 2,
                code: level2[i].code,
                name: level2[i].name,
                parent: parent.code
              })
            }
          />

          {!showLOD2 && (
            <SurfaceLabel
              lon={(lon0 + lon1) / 2}
              lat={(lat0 + lat1) / 2}
              radius={baseR}
              offset={0.03}
              fontSize={label.lod1}
            >
              {`${level2[i].code}\n${level2[i].name}`}
            </SurfaceLabel>
          )}
        </group>
      );

      // =====================
      // LOD2 — Level 3（只在 active sector）
      // =====================
      if (showLOD2) {
        const level3 = level3ByParent[level2[i].code] ?? [];
        const n3 = level3.length;

        for (let k = 0; k < n3; k++) {
          const s0 = k / n3;
          const s1 = (k + 1) / n3;
          const lonA = THREE.MathUtils.lerp(lon0, lon1, s0);
          const lonB = THREE.MathUtils.lerp(lon0, lon1, s1);

          const geo2 = sphericalQuadGeometry({
            lat0,
            lat1,
            lon0: lonA,
            lon1: lonB,
            r: baseR + 0.05,
            seg: 18
          });

          nodes.push(
            <group key={`L2-${level2[i].code}-${k}`}>
              <mesh
                geometry={geo2}
                material={
                  new THREE.MeshStandardMaterial({
                    color: 0xf7fbff,
                    roughness: 0.9
                  })
                }
                onClick={() =>
                  onSelect?.({
                    level: 3,
                    code: level3[k].code,
                    name: level3[k].name,
                    parent: level2[i].code
                  })
                }
              />

              <SurfaceLabel
                lon={(lonA + lonB) / 2}
                lat={(lat0 + lat1) / 2}
                radius={baseR + 0.05}
                offset={0.02}
                fontSize={label.lod2}
              >
                {`${level3[k].code}\n${level3[k].name}`}
              </SurfaceLabel>
            </group>
          );
        }
      }
    }
  }

  return <group>{nodes}</group>;
}
// =====================
// Transparent Globe（底層球殼，負責整顆球顏色）
// =====================
function BlueCoreGlobe() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: {
        colorInner: { value: new THREE.Color("#6fd9ffff") },
        colorOuter: { value: new THREE.Color("#cfefff") }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 colorInner;
        uniform vec3 colorOuter;
        void main() {
          float f = pow(vNormal.z * 0.5 + 0.5, 1.4);
          vec3 color = mix(colorInner, colorOuter, f);
          gl_FragColor = vec4(color, 0.35);
        }
      `
    });
  }, []);

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
// =====================
// LOD Controller
// =====================
function EnergyGlobeLOD({ hierarchy, onSelect }) {
  const lod = useLODLevel();
  const activeLayer = lod === 0 ? LAYER_LOD0 : LAYER_LOD1;

  return (
    <group renderOrder={10}>
      <RaycastLayerController activeLayer={activeLayer} />

      {lod === 0 && (
        <LOD0Sectors hierarchy={hierarchy} onSelect={onSelect} />
      )}

      {lod === 1 && (
        <LOD1And2
          hierarchy={hierarchy}
          showLOD2={false}
          onSelect={onSelect}
        />
      )}

      {lod === 2 && (
        <LOD1And2
          hierarchy={hierarchy}
          showLOD2={true}
          onSelect={onSelect}
        />
      )}
    </group>
  );
}

// =====================
// Scene
// =====================
function Scene({ hierarchy, onSelect }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    camera.position.set(0, RADIUS * 0.9, RADIUS * 2.6);
    camera.layers.enable(LAYER_LOD0);
    camera.layers.enable(LAYER_LOD1);

    gl.setClearColor(0x000000, 0);
    gl.autoClear = false;
  }, [camera, gl]);

  // Google Earth 風格：距離 → 操作速度
  useFrame(() => {
    if (!controlsRef.current) return;

    const dist = camera.position.length();
    const t = THREE.MathUtils.clamp(
      (dist - RADIUS * 1.05) / (RADIUS * 5),
      0,
      1
    );

    controlsRef.current.rotateSpeed = THREE.MathUtils.lerp(0.15, 1.1, t);
    controlsRef.current.zoomSpeed = THREE.MathUtils.lerp(0.25, 1.0, t);
  });

  return (
    <>
      {/* 光源（只影響 sector，不影響底層球殼） */}
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.4}
        color={0xffffff}
      />

      <BlueCoreGlobe />
      {/* LOD Globe */}
      <EnergyGlobeLOD hierarchy={hierarchy} onSelect={onSelect} />

      {/* Orbit Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={RADIUS * 1.05}
        maxDistance={RADIUS * 6}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// =====================
// Root Component
// =====================
export default function GlobeVisualizer({ onSelect }) {
  const hierarchy = useMemo(
    () => extractDeptHierarchy(DEPT_JSON),
    []
  );

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
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 2000 }}
        >
          <Suspense fallback={<Html center>Loading…</Html>}>
            <Scene
              hierarchy={hierarchy}
              onSelect={(v) => onSelect?.(v)}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
