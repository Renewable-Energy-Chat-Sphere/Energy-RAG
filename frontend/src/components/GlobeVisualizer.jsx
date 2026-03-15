import React, { useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import supplyLayout from "../data/supply_layout.json";
import demandLayout from "../data/demand_layout.json";
import supplyCatalog from "../data/supply_catalog.json";
import demandSupply from "../data/113_energy_demand_supply.json";
import hierarchy from "../data/hierarchy.json";

const SUPPLY_RADIUS = 3.25;


/* ===================== */
/* Supply Map */
/* ===================== */

const supplyMap = {};
supplyCatalog.forEach((s)=>{
  supplyMap[s.source_id] = s;
});


/* ===================== */
/* Build hierarchy level map */
/* ===================== */

const demandLevel = {};

function buildLevel(node, code){

  demandLevel[code] = node.level;

  if(node.children){

    Object.entries(node.children).forEach(([childCode, child])=>{
      buildLevel(child, childCode);
    });

  }

}

Object.entries(hierarchy).forEach(([code,node])=>{
  buildLevel(node, code);
});


/* ===================== */
/* Grid Sphere */
/* ===================== */

function GridSphere(){

  const lines=[];
  const latSegments=12;
  const lonSegments=24;

  for(let i=1;i<latSegments;i++){

    const lat=Math.PI*(i/latSegments-0.5);
    const y=3*Math.sin(lat);
    const r=3*Math.cos(lat);

    const points=[];

    for(let j=0;j<=64;j++){

      const lon=(j/64)*Math.PI*2;

      points.push(
        new THREE.Vector3(
          r*Math.cos(lon),
          y,
          r*Math.sin(lon)
        )
      );

    }

    const geo=new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lat"+i} geometry={geo}>
        <lineBasicMaterial color="#64748b"/>
      </line>
    );

  }

  for(let i=0;i<lonSegments;i++){

    const lon=(i/lonSegments)*Math.PI*2;
    const points=[];

    for(let j=-32;j<=32;j++){

      const lat=(j/32)*Math.PI/2;

      points.push(
        new THREE.Vector3(
          3*Math.cos(lat)*Math.cos(lon),
          3*Math.sin(lat),
          3*Math.cos(lat)*Math.sin(lon)
        )
      );

    }

    const geo=new THREE.BufferGeometry().setFromPoints(points);

    lines.push(
      <line key={"lon"+i} geometry={geo}>
        <lineBasicMaterial color="#64748b"/>
      </line>
    );

  }

  return <group>{lines}</group>;

}


/* ===================== */
/* Supply Nodes */
/* ===================== */

function SupplyNodes({onHover}){

  return Object.entries(supplyLayout).map(([id,pos])=>{

    const info=supplyMap[id];

    const position=[
      pos.x*SUPPLY_RADIUS,
      pos.y*SUPPLY_RADIUS,
      pos.z*SUPPLY_RADIUS
    ];

    return(

      <mesh
        key={id}
        position={position}

        onPointerOver={(e)=>{

          e.stopPropagation();

          onHover({
            code:id,
            name:info?.name_zh||id,
            category:info?.category,
            type:"supply"
          });

        }}

        onPointerOut={()=>onHover(null)}

      >

        <sphereGeometry args={[0.06,16,16]}/>

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

function DemandNodes({ lod, onHover, onSelect }) {

  return Object.entries(demandLayout).map(([id, pos]) => {

    const level = demandLevel[id];

    /* LOD control */

    if (lod === 0 && level !== 1) return null;
    if (lod === 1 && level !== 2) return null;
    if (lod === 2 && level !== 3) return null;

    /* node size (接近 supply) */

    const size =
      level === 1 ? 0.09 :
      level === 2 ? 0.075 :
      0.06;

    /* hierarchy radius */

    const radius =
      level === 1 ? 2.9 :
      level === 2 ? 3.0 :
      3.1;

    const position = [
      pos.x * radius,
      pos.y * radius,
      pos.z * radius
    ];

    return (

      <mesh
        key={id}
        position={position}

        onPointerOver={(e) => {

          e.stopPropagation();

          onHover({
            code: id,
            name: id,
            type: "demand"
          });

        }}

        onPointerOut={() => onHover(null)}

        onClick={(e) => {

          e.stopPropagation();

          onSelect({
            code: id,
            name: id,
            year: "113"
          });

        }}

      >

        <sphereGeometry args={[size, 16, 16]} />

        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.25}
        />

      </mesh>

    );

  });

}


/* ===================== */
/* Energy Flow Lines */
/* ===================== */

function SupplyFlowLines({selected,lod}){

  if(!selected) return null;

  const level=demandLevel[selected.code];

  if(lod===0 && level!==1) return null;
  if(lod===1 && level!==2) return null;
  if(lod===2 && level!==3) return null;

  const ratio=demandSupply[selected.code];

  if(!ratio) return null;

  const lines=[];

  Object.entries(ratio).forEach(([supply,weight])=>{

    const s=supplyLayout[supply];
    const d=demandLayout[selected.code];

    if(!s||!d) return;

    const p1=new THREE.Vector3(
      s.x*SUPPLY_RADIUS,
      s.y*SUPPLY_RADIUS,
      s.z*SUPPLY_RADIUS
    );

    const p2=new THREE.Vector3(
      d.x*3,
      d.y*3,
      d.z*3
    );

    const geo=new THREE.BufferGeometry().setFromPoints([p1,p2]);

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
/* LOD Controller */
/* ===================== */

function Scene({onHover,onSelect,selected}){

  const {camera}=useThree();
  const [lod,setLOD]=useState(0);

  useFrame(()=>{

    const d=camera.position.length();

    if(d>7) setLOD(0);
    else if(d>5) setLOD(1);
    else setLOD(2);

  });

  return(

    <>

      <ambientLight intensity={0.6}/>
      <pointLight position={[10,10,10]} intensity={1}/>

      <GridSphere/>

      <SupplyNodes onHover={onHover}/>

      <DemandNodes
        lod={lod}
        camera={camera}
        onHover={onHover}
        onSelect={onSelect}
      />

      <SupplyFlowLines
        selected={selected}
        lod={lod}
      />

      <OrbitControls enablePan={false}/>

    </>

  );

}


/* ===================== */
/* Main */
/* ===================== */

export default function GlobeVisualizer({
  onHover,
  onSelect,
  selected
}){

  return(

    <Canvas
      camera={{position:[0,0,8],fov:50}}
      style={{background:"transparent"}}
    >

      <Scene
        onHover={onHover}
        onSelect={onSelect}
        selected={selected}
      />

    </Canvas>

  );

}