import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

/* =====================
   基本設定
===================== */
const RADIUS = 3.0;

/* =====================
   LOD（距離）
===================== */
function useSimpleLOD() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(0);

  useFrame(() => {
    const d = camera.position.length();
    if (d > RADIUS * 2.8) setLOD(0);
    else if (d > RADIUS * 1.8) setLOD(1);
    else setLOD(2);
  });

  return lod;
}

/* =====================
   經緯度 → Vector3
===================== */
function lonLatToVec3(lon, lat, radius) {
  const latR = THREE.MathUtils.degToRad(lat);
  const lonR = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.cos(latR) * Math.cos(lonR),
    radius * Math.sin(latR),
    radius * Math.cos(latR) * Math.sin(lonR)
  );
}

/* =====================
   球面 Patch Geometry
===================== */
function sphericalPatchGeometry({
  lon0, lon1, lat0, lat1, radius, seg = 24
}) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let i = 0; i <= seg; i++) {
    for (let j = 0; j <= seg; j++) {
      const lat = THREE.MathUtils.lerp(lat0, lat1, i / seg);
      const lon = THREE.MathUtils.lerp(lon0, lon1, j / seg);
      const p = lonLatToVec3(lon, lat, radius);
      positions.push(p.x, p.y, p.z);
      normals.push(p.x / radius, p.y / radius, p.z / radius);
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
  return geo;
}

/* =====================
   區塊邊界線
===================== */
function PatchBorder({ lon0, lon1, lat0, lat1, radius }) {
  const points = [];
  const steps = 32;

  for (let i = 0; i <= steps; i++)
    points.push(lonLatToVec3(
      THREE.MathUtils.lerp(lon0, lon1, i / steps), lat1, radius
    ));
  for (let i = 0; i <= steps; i++)
    points.push(lonLatToVec3(
      lon1, THREE.MathUtils.lerp(lat1, lat0, i / steps), radius
    ));
  for (let i = 0; i <= steps; i++)
    points.push(lonLatToVec3(
      THREE.MathUtils.lerp(lon1, lon0, i / steps), lat0, radius
    ));
  for (let i = 0; i <= steps; i++)
    points.push(lonLatToVec3(
      lon0, THREE.MathUtils.lerp(lat0, lat1, i / steps), radius
    ));

  return (
    <line geometry={new THREE.BufferGeometry().setFromPoints(points)}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.9} />
    </line>
  );
}

/* =====================
   玻璃球本體
===================== */
function GlassGlobe() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhysicalMaterial
        color="#2f80ff"
        transparent
        opacity={0.35}
        transmission={0.9}
        roughness={0.05}
        thickness={0.6}
        ior={1.45}
        clearcoat={0.8}
      />
    </mesh>
  );
}

/* =====================
   LOD0：五大部門
===================== */
const LOD0_REGIONS = [
  { lon0: -180, lon1: -60, lat0: 0, lat1: 90, name: "工業", icon: "https://img.icons8.com/ios-filled/200/factory.png" },
  { lon0: -60, lon1: 60, lat0: 0, lat1: 90, name: "運輸", icon: "https://img.icons8.com/ios-filled/200/truck.png" },
  { lon0: 60, lon1: 180, lat0: 0, lat1: 90, name: "農業", icon: "https://img.icons8.com/ios-filled/200/tractor.png" },
  { lon0: -180, lon1: 0, lat0: -90, lat1: 0, name: "服務", icon: "https://img.icons8.com/ios-filled/200/service.png" },
  { lon0: 0, lon1: 180, lat0: -90, lat1: 0, name: "住宅", icon: "https://img.icons8.com/ios-filled/200/city.png" }
];

function LOD0Regions() {
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return LOD0_REGIONS.map(r => loader.load(r.icon));
  }, []);

  return (
    <>
      {LOD0_REGIONS.map((r, i) => {
        const centerLon = (r.lon0 + r.lon1) / 2;
        const centerLat = (r.lat0 + r.lat1) / 2;
        const pos = lonLatToVec3(centerLon, centerLat, RADIUS + 0.06);

        return (
          <group key={`lod0-${i}`}>
            <mesh
              geometry={sphericalPatchGeometry({
                lon0: r.lon0, lon1: r.lon1,
                lat0: r.lat0, lat1: r.lat1,
                radius: RADIUS + 0.06
              })}
            >
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={0.12}
                roughness={0.85}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            <PatchBorder {...r} radius={RADIUS + 0.015} />

            {/* icon + 文字 */}
            <group
              position={pos.toArray()}
              onUpdate={(g) => {
                g.lookAt(0, 0, 0);
                g.rotateY(Math.PI);
              }}
            >
              <mesh>
                <planeGeometry args={[0.28, 0.28]} />
                <meshBasicMaterial map={textures[i]} transparent />
              </mesh>

              <Text
                position={[0, -0.26, 0]}
                fontSize={0.12}
                color="#111"
                anchorX="center"
                anchorY="top"
              >
                {r.name}
              </Text>
            </group>
          </group>
        );
      })}
    </>
  );
}

/* =====================
   LOD1：每區 2×2
===================== */
function LOD1Regions() {
  const parts = 2;
  return (
    <>
      {LOD0_REGIONS.flatMap((r, i) =>
        [...Array(parts)].flatMap((_, u) =>
          [...Array(parts)].map((_, v) => {
            const lon0 = THREE.MathUtils.lerp(r.lon0, r.lon1, u / parts);
            const lon1 = THREE.MathUtils.lerp(r.lon0, r.lon1, (u + 1) / parts);
            const lat0 = THREE.MathUtils.lerp(r.lat0, r.lat1, v / parts);
            const lat1 = THREE.MathUtils.lerp(r.lat0, r.lat1, (v + 1) / parts);

            return (
              <group key={`lod1-${i}-${u}-${v}`}>
                <mesh
                  geometry={sphericalPatchGeometry({
                    lon0, lon1, lat0, lat1,
                    radius: RADIUS - 0.01
                  })}
                >
                  <meshStandardMaterial
                    color="#74c0fc"
                    transparent
                    opacity={0.38}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                <PatchBorder
                  lon0={lon0}
                  lon1={lon1}
                  lat0={lat0}
                  lat1={lat1}
                  radius={RADIUS - 0.005}
                />
              </group>
            );
          })
        )
      )}
    </>
  );
}

/* =====================
   LOD2：4×4
===================== */
function LOD2Regions() {
  const parts = 4;
  return (
    <>
      {LOD0_REGIONS.flatMap((r, i) =>
        [...Array(parts)].flatMap((_, u) =>
          [...Array(parts)].map((_, v) => {
            const lon0 = THREE.MathUtils.lerp(r.lon0, r.lon1, u / parts);
            const lon1 = THREE.MathUtils.lerp(r.lon0, r.lon1, (u + 1) / parts);
            const lat0 = THREE.MathUtils.lerp(r.lat0, r.lat1, v / parts);
            const lat1 = THREE.MathUtils.lerp(r.lat0, r.lat1, (v + 1) / parts);

            return (
              <group key={`lod2-${i}-${u}-${v}`}>
                <mesh
                  geometry={sphericalPatchGeometry({
                    lon0, lon1, lat0, lat1,
                    radius: RADIUS - 0.08
                  })}
                >
                  <meshStandardMaterial
                    color="#339af0"
                    transparent
                    opacity={0.55}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                <PatchBorder
                  lon0={lon0}
                  lon1={lon1}
                  lat0={lat0}
                  lat1={lat1}
                  radius={RADIUS - 0.075}
                />
              </group>
            );
          })
        )
      )}
    </>
  );
}

/* =====================
   Scene
===================== */
function Scene() {
  const { camera } = useThree();
  const lod = useSimpleLOD();

  useEffect(() => {
    camera.position.set(0, 0, RADIUS * 3.5);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 5, 5]} intensity={1.6} />
      <directionalLight position={[-5, -3, -5]} intensity={0.6} />

      <GlassGlobe />
      {lod === 0 && <LOD0Regions />}
      {lod === 1 && <LOD1Regions />}
      {lod === 2 && <LOD2Regions />}

      <OrbitControls
        enablePan={false}
        minDistance={RADIUS * 1.2}
        maxDistance={RADIUS * 6}
        enableDamping
      />
    </>
  );
}

/* =====================
   Root
===================== */
export default function GlobeVisualizer() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ fov: 45, near: 0.1, far: 1000 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
