import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import supplyLayout from "../data/supply_layout.json";
import demandLayout from "../data/demand_layout.json";
import supplyCatalog from "../data/supply_catalog.json";
import ratio113 from "../data/113_energy_ratio.json";

const RADIUS = 3;


/* ===================== */
/* Supply 查詢表 */
/* ===================== */

const supplyMap = {};

supplyCatalog.forEach((s) => {
  supplyMap[s.source_id] = s;
});


/* ===================== */
/* 球體經緯線 */
/* ===================== */

function GridSphere() {

  const lines = [];

  const latSegments = 12;
  const lonSegments = 24;

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
        <lineBasicMaterial color="#64748b" />
      </line>
    );
  }


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
        <lineBasicMaterial color="#64748b" />
      </line>
    );
  }

  return <group>{lines}</group>;
}


/* ===================== */
/* Supply Nodes */
/* ===================== */

function SupplyNodes({ onHover, search }) {

  return Object.entries(supplyLayout).map(([id, pos]) => {

    const info = supplyMap[id];

    if (search && !info?.name_zh?.includes(search)) return null;

    const position = [
      pos.x * RADIUS,
      pos.y * RADIUS,
      pos.z * RADIUS
    ];

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
              category: info?.category,
              type: "supply"
            });
          }
        }}

        onPointerOut={() => onHover(null)}

      >

        <sphereGeometry args={[0.07, 16, 16]} />

        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.3}
        />

      </mesh>

    );
  });
}


/* ===================== */
/* Demand Nodes */
/* ===================== */

function DemandNodes({ onHover, onSelect }) {

  return Object.entries(demandLayout).map(([id, pos]) => {

    const position = [
      pos.x * RADIUS,
      pos.y * RADIUS,
      pos.z * RADIUS
    ];

    return (

      <mesh
        key={id}
        position={position}

        onPointerOver={(e) => {

          e.stopPropagation();

          if (onHover) {

            onHover({
              code: id,
              name: id,
              type: "demand"
            });
          }
        }}

        onPointerOut={() => onHover(null)}

        onClick={(e) => {

          e.stopPropagation();

          if (onSelect) {

            onSelect({
              code: id,
              name: id,
              year: "113"
            });
          }
        }}

      >

        <sphereGeometry args={[0.11, 20, 20]} />

        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.4}
        />

      </mesh>

    );
  });
}


/* ===================== */
/* Energy Flow Lines */
/* ===================== */

function SupplyFlowLines({ selected, showSupply }) {

  if (!selected || !showSupply) return null;

  const ratio = ratio113[selected.code];

  if (!ratio) return null;

  const lines = [];

  Object.entries(ratio).forEach(([supply, weight]) => {

    const s = supplyLayout[supply];
    const d = demandLayout[selected.code];

    if (!s || !d) return;

    const p1 = new THREE.Vector3(
      s.x * RADIUS,
      s.y * RADIUS,
      s.z * RADIUS
    );

    const p2 = new THREE.Vector3(
      d.x * RADIUS,
      d.y * RADIUS,
      d.z * RADIUS
    );

    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);

    lines.push(

      <line key={supply} geometry={geo}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.7}
        />
      </line>

    );

  });

  return <group>{lines}</group>;
}


/* ===================== */
/* 主視覺 */
/* ===================== */

export default function GlobeVisualizer({
  onHover,
  onSelect,
  selected,
  search,
  showSupply
}) {

  return (

    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ background: "transparent" }}
    >

      <ambientLight intensity={0.6} />

      <pointLight position={[10, 10, 10]} intensity={1} />

      <GridSphere />

      <SupplyNodes
        onHover={onHover}
        search={search}
      />

      <DemandNodes
        onHover={onHover}
        onSelect={onSelect}
      />

      <SupplyFlowLines
        selected={selected}
        showSupply={showSupply}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
      />

    </Canvas>
  );
}