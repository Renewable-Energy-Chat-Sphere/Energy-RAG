import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

import demandData from "../data/demand_ratio_yearly.json";
import hierarchy from "../data/hierarchy.json";
import demandDistance from "../data/113_energy_euclidean_distance.json";

import {
  generateDepartmentSphere,
  generateLevel2WithinParent
} from "../geometry/SphereLayoutEngine";

const RADIUS = 3;

/* ============================
   LOD 控制
============================ */

function useLOD() {
  const { camera } = useThree();
  const [lod, setLOD] = useState(1);

  useFrame(() => {
    const d = camera.position.length();
    if (d < 6) setLOD(2);
    else setLOD(1);
  });

  return lod;
}

/* ============================
   球面貼齊文字
============================ */

function SurfaceText({ geometry, text, size = 0.22 }) {
  if (!geometry) return null;

  const pos = geometry.attributes.position;
  const dir = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    dir.x += pos.getX(i);
    dir.y += pos.getY(i);
    dir.z += pos.getZ(i);
  }

  dir.divideScalar(pos.count).normalize();

  const position = dir.clone().multiplyScalar(RADIUS * 1.02);
  const outward = position.clone().normalize();

  let reference = new THREE.Vector3(0, 1, 0);
  if (Math.abs(outward.dot(reference)) > 0.95) {
    reference = new THREE.Vector3(1, 0, 0);
  }

  const right = new THREE.Vector3()
    .crossVectors(reference, outward)
    .normalize();

  const up = new THREE.Vector3()
    .crossVectors(outward, right)
    .normalize();

  const matrix = new THREE.Matrix4();
  matrix.makeBasis(right, up, outward);

  const quaternion = new THREE.Quaternion()
    .setFromRotationMatrix(matrix);

  return (
    <Text
      position={position}
      quaternion={quaternion}
      fontSize={size}
      color="white"
      anchorX="center"
      anchorY="middle"
      depthTest={false}
      renderOrder={999}
    >
      {text}
    </Text>
  );
}

/* ============================
   主球體
============================ */

function Globe({ year = "113" }) {
  const lod = useLOD();

  const level1Regions = useMemo(() => {
    const yearData = demandData[year];

    const level1Nodes = Object.keys(hierarchy)
      .filter(k => hierarchy[k].level === 1)
      .map(k => ({
        id: k,
        name: hierarchy[k].name,
        value: yearData[k] || 0
      }));

    const total = level1Nodes.reduce((s, v) => s + v.value, 0);

    const normalized = level1Nodes.map(v => ({
      ...v,
      normalizedValue: total > 0 ? v.value / total : 0
    }));

    return generateDepartmentSphere(
      normalized,
      RADIUS,
      5,
      demandDistance?.Demand?.["Level 1"]
    );
  }, [year]);

  return (
    <>
      {level1Regions.map((region, i) => {
        const baseColor = new THREE.Color().setHSL(
          i / level1Regions.length,
          0.6,
          0.45
        );

        let level2Regions = [];

        if (lod === 2 && hierarchy[region.id]?.children) {
          const yearData = demandData[year];

          const childIds = Object.keys(
            hierarchy[region.id].children
          );

          const childTotal = childIds.reduce(
            (sum, cid) => sum + (yearData[cid] || 0),
            0
          );

          console.log(region.id, "childTotal =", childTotal);

          if (childTotal > 0) {
            const childNodes = childIds.map(cid => ({
              id: cid,
              name: hierarchy[region.id].children[cid].name,
              normalizedValue:
                (yearData[cid] || 0) / childTotal
            }));

            level2Regions = generateLevel2WithinParent(
              region,
              childNodes
            );
          }
        }

        return (
          <group key={region.id}>
            {/* Level1 */}
            <mesh geometry={region.geometry}>
              <meshStandardMaterial
                color={baseColor}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>

            {lod === 1 && (
              <SurfaceText
                geometry={region.geometry}
                text={region.name}
                size={0.22}
              />
            )}

            {/* Level2 */}
            {lod === 2 &&
              level2Regions.map((child, idx) => {
                const vertices = [];

                child.faces.forEach(face => {
                  const pos =
                    region.geometry.attributes.position;

                  const i = face.index;

                  const v1 = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
                  const v2 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
                  const v3 = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);

                  vertices.push(
                    ...v1.toArray(),
                    ...v2.toArray(),
                    ...v3.toArray()
                  );
                });

                const geo = new THREE.BufferGeometry();
                geo.setAttribute(
                  "position",
                  new THREE.Float32BufferAttribute(vertices, 3)
                );
                geo.computeVertexNormals();

                return (
                  <group key={child.id}>
                    <mesh geometry={geo}>
                      <meshStandardMaterial
                        color={baseColor.clone().offsetHSL(
                          0,
                          0,
                          idx % 2 === 0 ? 0.1 : -0.1
                        )}
                        roughness={0.5}
                        metalness={0.05}
                      />
                    </mesh>

                    <SurfaceText
                      geometry={geo}
                      text={
                        child.name.length > 5
                          ? child.name.slice(0, 5) + "..."
                          : child.name
                      }
                      size={0.15}
                    />
                  </group>
                );
              })}
          </group>
        );
      })}

      {/* 玻璃殼 */}
      <mesh>
        <sphereGeometry args={[RADIUS * 1.02, 64, 64]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.08}
          roughness={0}
          transmission={1}
          thickness={0.5}
        />
      </mesh>
    </>
  );
}

/* ============================
   主畫面
============================ */

export default function GlobeVisualizer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      style={{ background: "#0f172a" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />

      <Globe year="113" />

      <OrbitControls enablePan={false} />
    </Canvas>
  );
}