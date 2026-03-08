import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import supplyLayout from "../data/supply_layout.json";
import supplyCatalog from "../data/supply_catalog.json";

const RADIUS = 3;

/* =====================
   建立 Supply 查詢表
===================== */

const supplyMap = {};

supplyCatalog.forEach((s) => {
  supplyMap[s.source_id] = s;
});

/* =====================
   經線 + 緯線球體
===================== */

function GridSphere() {

  const lines = [];

  const latSegments = 12;
  const lonSegments = 24;

  /* 緯線 */
  for (let i = 1; i < latSegments; i++) {

    const lat = Math.PI * (i / latSegments - 0.5);
    const y = RADIUS * Math.sin(lat);
    const r = RADIUS * Math.cos(lat);

    const points = [];

    for (let j = 0; j <= 64; j++) {

      const lon = (j / 64) * Math.PI * 2;

      points.push(
        new THREE.Vector3(
          r * Math.cos(lon),
          y,
          r * Math.sin(lon)
        )
      );

    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lat" + i} geometry={geo}>
        <lineBasicMaterial color="#9ca3af" />
      </line>
    );

  }

  /* 經線 */

  for (let i = 0; i < lonSegments; i++) {

    const lon = (i / lonSegments) * Math.PI * 2;

    const points = [];

    for (let j = -32; j <= 32; j++) {

      const lat = (j / 32) * Math.PI / 2;

      points.push(
        new THREE.Vector3(
          RADIUS * Math.cos(lat) * Math.cos(lon),
          RADIUS * Math.sin(lat),
          RADIUS * Math.cos(lat) * Math.sin(lon)
        )
      );

    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lon" + i} geometry={geo}>
        <lineBasicMaterial color="#9ca3af" />
      </line>
    );

  }

  return <group>{lines}</group>;

}

/* =====================
   Supply 點
===================== */

function SupplyNodes({ onHover }) {

  return Object.entries(supplyLayout).map(([id, pos]) => {

    const position = [
      pos.x * RADIUS,
      pos.y * RADIUS,
      pos.z * RADIUS
    ];

    const info = supplyMap[id];

    return (

      <mesh
        key={id}
        position={position}

        onPointerOver={(e) => {

          e.stopPropagation();

          if (onHover) {
            onHover({
              code: id,
              name: info?.name_zh || id,
              category: info?.category
            });
          }

        }}

        onPointerOut={() => {

          if (onHover) onHover(null);

        }}

      >
        <sphereGeometry args={[0.08, 16, 16]} />

        <meshBasicMaterial color="#f59e0b" />

      </mesh>

    );

  });

}

/* =====================
   主畫面
===================== */

export default function GlobeVisualizer({ onHover }) {

  return (

    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ background: "transparent" }}
    >

      <ambientLight intensity={0.8} />

      <GridSphere />

      <SupplyNodes onHover={onHover} />

      <OrbitControls enablePan={false} />

    </Canvas>

  );

}