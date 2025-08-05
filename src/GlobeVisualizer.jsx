// GlobeVisualizer.jsx
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const LatLines = ({ layers = 12, radius = 3 }) => {
  const lines = [];

  for (let i = 1; i < layers; i++) {
    const theta = (i / layers) * Math.PI; // 緯度角度
    const y = radius * Math.cos(theta);
    const r = radius * Math.sin(theta);

    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#888" });

    lines.push(
      <lineLoop
        key={`lat-${i}`}
        geometry={geometry}
        material={material}
        position={[0, y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    );
  }

  return <group>{lines}</group>;
};

const LonLines = ({ segments = 12, radius = 3 }) => {
  const lines = [];

  for (let i = 0; i < segments; i++) {
    const lon = (i / segments) * 2 * Math.PI;
    const points = [];

    for (let j = 0; j <= 64; j++) {
      const theta = (j / 64) * Math.PI;
      const x = radius * Math.sin(theta) * Math.cos(lon);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(lon);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#888" });
    lines.push(<line key={`lon-${i}`} geometry={geometry} material={material} />);
  }

  return <group>{lines}</group>;
};

const Globe = () => {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 75 }} style={{ width: "100vw", height: "100vh" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitControls enablePan={false} enableZoom={true} />
      <LatLines layers={12} radius={3} />
      <LonLines segments={12} radius={3} />
    </Canvas>
  );
};

export default Globe;