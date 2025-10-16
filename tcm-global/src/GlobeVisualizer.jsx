// GlobeVisualizer.jsx — Google Earth 風格多層球體系統
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei"; // controls + 2D HUD
import * as THREE from "three";
import supplyData from "./energy_data.sample.js";

// --- 多層球體系統常數 ---
const LAYER_RADIUS = {
  OUTER: 3.0,    // 外層：全球視圖
  MIDDLE: 2.0,   // 中層：區域視圖  
  INNER: 1.0,    // 內層：本地視圖
};

// --- Region registry（支援多層級地圖）---
const REGION_REGISTRY = {
  TW: {
    name: "台灣",
    // 外層：簡化輪廓
    outerViewBox: "0 0 256 256",
    outerSvgPath: "M 180 20 L 200 40 L 210 70 L 205 100 L 190 130 L 170 150 L 150 165 L 130 170 L 110 160 L 95 140 L 90 120 L 95 95 L 110 70 L 130 50 L 155 35 Z",
    
    // 中層：更詳細的區域劃分
    middleViewBox: "0 0 512 512",
    middleRegions: [
      { id: "north", name: "北部", path: "M 256 50 L 350 80 L 380 150 L 360 200 L 300 220 L 250 200 L 220 150 L 240 100 Z", sites: [
        { id: "hydro-n1", label: "石門", x: 280, y: 120, cap: 300 },
        { id: "hydro-n2", label: "翡翠", x: 300, y: 140, cap: 400 },
      ]},
      { id: "central", name: "中部", path: "M 200 200 L 280 220 L 300 300 L 280 380 L 220 400 L 180 380 L 160 300 L 180 250 Z", sites: [
        { id: "hydro-c1", label: "德基", x: 240, y: 280, cap: 200 },
        { id: "hydro-c2", label: "日月潭", x: 220, y: 320, cap: 1000 },
        { id: "hydro-c3", label: "谷關", x: 260, y: 300, cap: 150 },
      ]},
      { id: "south", name: "南部", path: "M 180 380 L 260 400 L 280 480 L 240 500 L 200 480 L 160 450 L 140 400 L 160 380 Z", sites: [
        { id: "hydro-s1", label: "曾文", x: 200, y: 420, cap: 500 },
        { id: "hydro-s2", label: "南化", x: 240, y: 440, cap: 300 },
      ]},
    ],
    
    // 內層：詳細地圖（使用原來的台灣地圖）
    innerViewBox: "0 0 256 256",
    innerSvgPath: "M 180 20 L 200 40 L 210 70 L 205 100 L 190 130 L 170 150 L 150 165 L 130 170 L 110 160 L 95 140 L 90 120 L 95 95 L 110 70 L 130 50 L 155 35 Z",
    innerSites: [
      { id: "hydro-01", label: "德基", x: 150, y: 110, cap: 200 },
      { id: "hydro-02", label: "日月潭", x: 130, y: 130, cap: 1000 },
      { id: "hydro-03", label: "谷關", x: 160, y: 120, cap: 150 },
    ],
  },
};

// 依 code 判定區域（先用 *_TW* 規則；之後可擴充）
function inferRegionFromCode(code = "") {
  if (/_TW/i.test(code)) return "TW";
  return null;
}

/* =========================
   多層球體系統工具函數
========================= */
const shortZh = (zh) => (zh || "").replace(/[（）()、，]/g, " ").replace(/\s+/g, " ").trim();

function ll2xyz(latDeg, lonDeg, r = LAYER_RADIUS.OUTER) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = r * Math.cos(lat) * Math.cos(lon);
  const y = r * Math.sin(lat);
  const z = r * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r = LAYER_RADIUS.OUTER, seg = 6 }) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const lat = lat0 * (1 - t) + lat1 * t;
    for (let j = 0; j <= seg; j++) {
      const s = j / seg;
      const lon = lon0 * (1 - s) + lon1 * s;
      const p = ll2xyz(lat, lon, r);
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
  return geo;
}

/* =========================
   經緯線（支援多層球體）
========================= */
const GridLines = ({ radius = LAYER_RADIUS.OUTER, latN = 12, lonN = 12, color = "#64748b", opacity = 0.9 }) => {
  const latGroup = new THREE.Group();
  for (let i = 1; i < latN; i++) {
    const th = (i / latN) * Math.PI;
    const y = radius * Math.cos(th);
    const r = radius * Math.sin(th);
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI);
    const pts = curve.getPoints(128);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false });
    const line = new THREE.LineLoop(geo, mat);
    line.rotation.x = Math.PI / 2;
    line.position.y = y;
    line.renderOrder = 20;
    latGroup.add(line);
  }
  const lonGroup = new THREE.Group();
  for (let i = 0; i < lonN; i++) {
    const L = (i / lonN) * 2 * Math.PI;
    const pts = [];
    for (let j = 0; j <= 128; j++) {
      const th = (j / 128) * Math.PI;
      const x = radius * Math.sin(th) * Math.cos(L);
      const y = radius * Math.cos(th);
      const z = radius * Math.sin(th) * Math.sin(L);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 20;
    lonGroup.add(line);
  }
  return (
    <>
      <primitive object={latGroup} />
      <primitive object={lonGroup} />
    </>
  );
};

/* =========================
   可點擊 Tile（支援多層球體）
========================= */
function TileOnSphere({ cell, data, color, showText = true, onPick, layerRadius = LAYER_RADIUS.OUTER }) {
  const { lat0, lat1, lon0, lon1 } = cell;
  const geo = useMemo(() => sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r: layerRadius + 0.02, seg: 6 }), [lat0, lat1, lon0, lon1, layerRadius]);

  const center = useMemo(() => ll2xyz((lat0 + lat1) / 2, (lon0 + lon1) / 2, layerRadius + 0.022), [lat0, lat1, lon0, lon1, layerRadius]);
  const uprightQuat = useMemo(() => {
    const n = center.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const yDir = worldUp.clone().sub(n.clone().multiplyScalar(worldUp.dot(n)));
    if (yDir.lengthSq() < 1e-6) yDir.set(0, 0, 1);
    yDir.normalize();
    const xDir = new THREE.Vector3().crossVectors(yDir, n).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(xDir, yDir, n);
    const q = new THREE.Quaternion();
    q.setFromRotationMatrix(m);
    return q;
  }, [center]);

  const title = shortZh(data.zh) || "";
  const latMid = ((lat0 + lat1) / 2) * Math.PI / 180;
  const dLatRad = Math.abs(lat1 - lat0) * Math.PI / 180;
  const dLonRad = Math.abs(lon1 - lon0) * Math.PI / 180;
  const height = layerRadius * dLatRad;
  const width = layerRadius * Math.cos(latMid) * dLonRad;
  const pad = 0.02;
  const maxW = Math.max(0.001, width - pad * 2);
  const maxH = Math.max(0.001, height - pad * 2);
  let fontSize = Math.min(maxH, maxW / Math.max(1, title.length * 0.55));
  fontSize = Math.max(0.06, Math.min(fontSize, 0.25));
  const maxChars = Math.max(1, Math.floor(maxW / (fontSize * 0.55)));
  const textShown = title.length > maxChars ? title.slice(0, Math.max(0, maxChars - 1)) + "…" : title;

  const handlePointerOver = () => { document.body.style.cursor = 'pointer'; };
  const handlePointerOut = () => { document.body.style.cursor = 'auto'; };
  const handleClick = () => { onPick && onPick({ cell, data, center }); };

  return (
    <group>
      {/* 填色格（可點擊） */}
      <mesh
        geometry={geo}
        renderOrder={4}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.65}
          depthTest
          depthWrite
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* 中央文字（只在外層顯示） */}
      {showText && (
        <group position={center} quaternion={uprightQuat}>
          <group position={[0, 0, 0.003]}>
            <Text fontSize={fontSize} color="#0f172a" anchorX="center" anchorY="middle">{textShown}</Text>
          </group>
        </group>
      )}
    </group>
  );
}

/* =========================
   多層球體系統：外層球體（全球視圖）
========================= */
const OuterLayer = ({ options, supplyData, onTilePick }) => {
  const { sphereOpacity, gridLatN = 12, gridLonN = 12 } = options;
  
  const priceToColor = (price, minP = 1.5, maxP = 5.0) => {
    const t = Math.max(0, Math.min(1, ((Number(price) || 0) - minP) / Math.max(1e-6, maxP - minP)));
    const a = new THREE.Color('#22c55e');
    const b = new THREE.Color('#ef4444');
    return `#${a.clone().lerp(b, t).getHexString()}`;
  };

  const latBands = Math.max(2, Math.floor(gridLatN));
  const lonBands = Math.max(2, Math.floor(gridLonN));
  const dLat = 180 / latBands;
  const dLon = 360 / lonBands;

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < latBands; i++) {
      const lat0 = -90 + i * dLat;
      const lat1 = lat0 + dLat;
      for (let j = 0; j < lonBands; j++) {
        const lon0 = -180 + j * dLon;
        const lon1 = lon0 + dLon;
        out.push({ lat0, lat1, lon0, lon1, i, j });
      }
    }
    return out;
  }, [latBands, lonBands, dLat, dLon]);

  const equatorBand = useMemo(() => cells.filter((c) => c.lat0 <= 0 && 0 < c.lat1), [cells]);

  return (
    <group>
      {/* 外層球體（珍珠白） */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[LAYER_RADIUS.OUTER, 128, 128]} />
        <meshPhysicalMaterial
          color="#f8fbff"
          roughness={0.6}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.35}
          sheen={0.35}
          sheenColor={new THREE.Color('#ffffff')}
          sheenRoughness={0.6}
          transparent
          opacity={sphereOpacity}
        />
      </mesh>

      {/* 外層大氣層 */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[LAYER_RADIUS.OUTER * 1.02, 64, 64]} />
        <meshBasicMaterial 
          color="#a7f3d0" 
          transparent 
          opacity={0.07} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>

      {/* 外層經緯線 */}
      <GridLines radius={LAYER_RADIUS.OUTER} latN={latBands} lonN={lonBands} />

      {/* 外層能源數據 tiles */}
      {supplyData.map((s, i) => {
        const cell = equatorBand[i % equatorBand.length];
        const price = s?.kpi?.price ?? 0;
        const color = priceToColor(price);
        return (
          <TileOnSphere
            key={s.code || i}
            cell={cell}
            data={{ zh: shortZh(s.zh), ...s }}
            color={color}
            showText={true}
            onPick={onTilePick}
            layerRadius={LAYER_RADIUS.OUTER}
          />
        );
      })}
    </group>
  );
};

/* =========================
   多層球體系統：中層球體（區域視圖）
========================= */
const MiddleLayer = ({ selection, onRegionPick, onBack }) => {
  if (!selection) return null;
  
  const { data, center } = selection;
  const regionKey = inferRegionFromCode(data.code);
  const region = REGION_REGISTRY[regionKey];

  if (!region || !region.middleRegions) {
    return (
      <group>
        {/* 中層球體殼 */}
        <mesh renderOrder={1}>
          <sphereGeometry args={[LAYER_RADIUS.MIDDLE, 64, 64]} />
          <meshBasicMaterial
            color="#e6fbf3"
            transparent
            opacity={0.15}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
        <Html center>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.9)", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            此區域暫無中層地圖。<button onClick={onBack} style={{ marginLeft: 8 }}>⤴ 回外層</button>
          </div>
        </Html>
      </group>
    );
  }

  // 中層地圖板定位
  const dir = center.clone().normalize();
  const plateR = LAYER_RADIUS.MIDDLE - 0.8;
  const pos = dir.clone().multiplyScalar(plateR);
  const up = new THREE.Vector3(0, 1, 0);
  let yDir = up.clone().sub(dir.clone().multiplyScalar(up.dot(dir)));
  if (yDir.lengthSq() < 1e-6) yDir = new THREE.Vector3(0, 0, 1);
  yDir.normalize();
  const xDir = new THREE.Vector3().crossVectors(yDir, dir).normalize();
  const basis = new THREE.Matrix4().makeBasis(xDir, yDir, dir);
  const quat = new THREE.Quaternion().setFromRotationMatrix(basis);

  const W = 2.0, H = 1.4; // 中層地圖板尺寸

  return (
    <group>
      {/* 中層球體殼 */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[LAYER_RADIUS.MIDDLE, 64, 64]} />
        <meshBasicMaterial
          color="#e6fbf3"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 中層經緯線 */}
      <GridLines radius={LAYER_RADIUS.MIDDLE} latN={8} lonN={8} color="#94a3b8" opacity={0.6} />

      <group position={pos} quaternion={quat}>
        {/* 中層地圖板 */}
        <mesh position={[0, 0, -0.01]} renderOrder={39}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial color="#000" transparent opacity={0.05} />
        </mesh>
        <mesh renderOrder={40}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* 中層地圖內容 */}
        <Html transform position={[0, 0, 0.01]} distanceFactor={3.5}>
          <div style={{ width: `${W * 140}px`, height: `${H * 140}px`, position: "relative", pointerEvents: "auto" }}>
            {/* 返回按鈕 */}
            <button
              onClick={onBack}
              style={{ position: "absolute", left: 8, top: 8, zIndex: 5, padding: "6px 8px", borderRadius: 8,
                       border: "1px solid #d1d5db", background: "#fff",
                       boxShadow: "0 4px 12px rgba(0,0,0,0.12)", fontSize: 12, opacity: 0.9 }}
            >
              ⤴ 回外層
            </button>

            {/* 標題 */}
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                          fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
              {region.name}｜{shortZh(data.zh) || data.en || data.code}
            </div>

            {/* 中層區域地圖 */}
            <svg viewBox={region.middleViewBox} style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="middleFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0f9ff" />
                  <stop offset="100%" stopColor="#e0f2fe" />
                </linearGradient>
              </defs>
              
              {region.middleRegions.map(reg => (
                <g key={reg.id}>
                  <path 
                    d={reg.path} 
                    fill="url(#middleFill)" 
                    stroke="#0ea5e9" 
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onRegionPick && onRegionPick({ region: reg, parentData: data })}
                    onMouseEnter={(e) => e.target.style.fill = '#bae6fd'}
                    onMouseLeave={(e) => e.target.style.fill = 'url(#middleFill)'}
                  />
                  <text 
                    x={reg.path.split(' ')[1]} 
                    y={reg.path.split(' ')[2]} 
                    fill="#0f172a" 
                    fontSize="12" 
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {reg.name}
                  </text>
                  
                  {/* 區域內的站點 */}
                  {reg.sites.map(site => (
                    <g key={site.id} transform={`translate(${site.x}, ${site.y})`}>
                      <circle r="4" fill="#22c55e" stroke="#0f766e" strokeWidth="1.5" />
                      <text x="6" y="3" fill="#0f172a" fontSize="9">{site.label}</text>
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          </div>
        </Html>
      </group>
    </group>
  );
};


/* =========================
   多層球體系統：內層球體（詳細地圖視圖）
========================= */
const InnerLayer = ({ regionSelection, onBack }) => {
  if (!regionSelection) return null;
  
  const { region, parentData } = regionSelection;
  const regionKey = inferRegionFromCode(parentData.code);
  const regionData = REGION_REGISTRY[regionKey];

  if (!regionData || !regionData.innerSites) {
    return (
      <group>
        {/* 內層球體殼 */}
        <mesh renderOrder={1}>
          <sphereGeometry args={[LAYER_RADIUS.INNER, 64, 64]} />
          <meshBasicMaterial
            color="#f0f9ff"
            transparent
            opacity={0.2}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
        <Html center>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.9)", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            此區域暫無詳細地圖。<button onClick={onBack} style={{ marginLeft: 8 }}>⤴ 回中層</button>
          </div>
        </Html>
      </group>
    );
  }

  // 內層地圖板定位
  const dir = new THREE.Vector3(0, 0, 1); // 內層固定朝向
  const plateR = LAYER_RADIUS.INNER - 0.6;
  const pos = dir.clone().multiplyScalar(plateR);
  const quat = new THREE.Quaternion(); // 內層不需要旋轉

  const W = 1.6, H = 1.2; // 內層地圖板尺寸

  return (
    <group>
      {/* 內層球體殼 */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[LAYER_RADIUS.INNER, 64, 64]} />
        <meshBasicMaterial
          color="#f0f9ff"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 內層經緯線 */}
      <GridLines radius={LAYER_RADIUS.INNER} latN={6} lonN={6} color="#cbd5e1" opacity={0.4} />

      <group position={pos} quaternion={quat}>
        {/* 內層地圖板 */}
        <mesh position={[0, 0, -0.005]} renderOrder={39}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial color="#000" transparent opacity={0.03} />
        </mesh>
        <mesh renderOrder={40}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.15} />
        </mesh>

        {/* 內層詳細地圖內容 */}
        <Html transform position={[0, 0, 0.005]} distanceFactor={2.8}>
          <div style={{ width: `${W * 140}px`, height: `${H * 140}px`, position: "relative", pointerEvents: "auto" }}>
            {/* 返回按鈕 */}
            <button
              onClick={onBack}
              style={{ position: "absolute", left: 8, top: 8, zIndex: 5, padding: "6px 8px", borderRadius: 8,
                       border: "1px solid #d1d5db", background: "#fff",
                       boxShadow: "0 4px 12px rgba(0,0,0,0.12)", fontSize: 12, opacity: 0.9 }}
            >
              ⤴ 回中層
            </button>

            {/* 標題 */}
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                          fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
              {regionData.name}｜{region.name}｜{shortZh(parentData.zh) || parentData.en || parentData.code}
            </div>

            {/* 內層詳細地圖 */}
            <svg viewBox={regionData.innerViewBox} style={{ width: "100%", height: "100%" }}>
              <defs>
                <linearGradient id="innerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0fdf4" />
                  <stop offset="100%" stopColor="#dcfce7" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* 台灣輪廓 */}
              <path 
                d={regionData.innerSvgPath} 
                fill="url(#innerFill)" 
                stroke="#22c55e" 
                strokeWidth="3"
                filter="url(#glow)"
              />
              
              {/* 詳細站點 */}
              {regionData.innerSites.map(site => (
                <g key={site.id} transform={`translate(${site.x}, ${site.y})`}>
                  <circle r="8" fill="#22c55e" stroke="#0f766e" strokeWidth="2" filter="url(#glow)" />
                  <text x="10" y="4" fill="#0f172a" fontSize="10" fontWeight="600">{site.label}</text>
                  
                  {/* 容量標示 */}
                  <text x="10" y="16" fill="#059669" fontSize="8">{site.cap}MW</text>
                </g>
              ))}
              
              {/* 區域邊界高亮 */}
              <path 
                d={region.path} 
                fill="none" 
                stroke="#0ea5e9" 
                strokeWidth="4"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            </svg>
          </div>
        </Html>
      </group>
    </group>
  );
};
/* =========================
   多層球體相機動畫系統
========================= */
const MultiLayerCameraRig = ({ phase, targetLayer, targetDir, onArrive }) => {
  const { camera } = useThree();

  useFrame((_, dt) => {
    if (phase === "idle") return;

    const speed = phase === "toMiddle" ? 4.0 : phase === "toInner" ? 3.5 : 6.0;
    const epsilon = 0.02;

    // 各層的相機位置
    const layerPositions = {
      outer: new THREE.Vector3(0, 0, 8),
      middle: targetDir ? targetDir.clone().multiplyScalar(LAYER_RADIUS.MIDDLE + 1.5) : new THREE.Vector3(0, 0, 4),
      inner: new THREE.Vector3(0, 0, 2.5)
    };

    const targetPos = layerPositions[targetLayer] || layerPositions.outer;

    camera.position.lerp(targetPos, 1 - Math.exp(-speed * dt));
    camera.lookAt(0, 0, 0);

    if (camera.position.distanceTo(targetPos) < epsilon) {
      camera.position.copy(targetPos);
      onArrive && onArrive(phase);
    }
  });

  return null;
};


/* =========================
   Portal & 控制面板
========================= */
const Portal = ({ children }) => {
  const [el] = useState(() => document.createElement("div"));
  useEffect(() => {
    el.style.position = "relative";
    el.style.zIndex = "2147483647";
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, [el]);
  return createPortal(children, el);
};

const Panel = ({ options, setOptions }) => {
  const onNum = (k) => (e) => setOptions((o) => ({ ...o, [k]: parseFloat(e.target.value) }));
  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 2147483647, background: "rgba(255,255,255,0.94)", padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", width: 360, fontSize: 13, pointerEvents: "auto" }}>
      <b>Energy Cards 控制台</b>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <label>
          緯向格數：
          <input type="number" min={2} max={90} step={1} value={options.gridLatN} onChange={(e) => setOptions((o) => ({ ...o, gridLatN: Math.max(2, parseInt(e.target.value) || 12) }))} style={{ width: 80, marginLeft: 8 }} />
        </label>
        <label>
          經向格數：
          <input type="number" min={2} max={360} step={1} value={options.gridLonN} onChange={(e) => setOptions((o) => ({ ...o, gridLonN: Math.max(2, parseInt(e.target.value) || 12) }))} style={{ width: 80, marginLeft: 8 }} />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          球體透明度：
          <input type="range" min="0.1" max="1" step="0.05" value={options.sphereOpacity} onChange={onNum("sphereOpacity")} style={{ marginLeft: 8 }} />
          <span style={{ marginLeft: 8 }}>{options.sphereOpacity.toFixed(2)}</span>
        </label>
      </div>
      <div style={{ marginTop: 6, color: "#475569" }}>經緯線固定顯示中</div>
    </div>
  );
};

/* =========================
   多層球體場景系統
========================= */
const MultiLayerScene = ({ options }) => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  
  // 多層狀態管理
  const [currentLayer, setCurrentLayer] = useState('outer'); // 'outer' | 'middle' | 'inner'
  const [phase, setPhase] = useState('idle'); // 'idle' | 'toMiddle' | 'toInner' | 'toOuter'
  const [outerSelection, setOuterSelection] = useState(null); // 外層選中的能源數據
  const [middleSelection, setMiddleSelection] = useState(null); // 中層選中的區域
  const [innerSelection, setInnerSelection] = useState(null); // 內層選中的詳細區域
  
  const S = useMemo(() => (Array.isArray(supplyData) ? supplyData : []), []);

  // 控制 OrbitControls 啟停（動畫時暫停，抵達後開啟）
  useEffect(() => {
    if (controls) controls.enabled = (phase === 'idle');
  }, [phase, controls]);

  // Esc：返回上一層
  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        if (currentLayer === 'inner') {
          setCurrentLayer('middle');
          setPhase('toMiddle');
          setInnerSelection(null);
        } else if (currentLayer === 'middle') {
          setCurrentLayer('outer');
          setPhase('toOuter');
          setMiddleSelection(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentLayer]);

  // 外層點擊處理
  const handleOuterPick = ({ cell, data, center }) => {
    setOuterSelection({ cell, data, center });
    setCurrentLayer('middle');
    setPhase('toMiddle');
  };

  // 中層區域點擊處理
  const handleMiddlePick = ({ region, parentData }) => {
    setMiddleSelection({ region, parentData });
    setCurrentLayer('inner');
    setPhase('toInner');
  };

  // 返回處理
  const handleBackToOuter = () => {
    setCurrentLayer('outer');
    setPhase('toOuter');
    setOuterSelection(null);
    setMiddleSelection(null);
    setInnerSelection(null);
  };

  const handleBackToMiddle = () => {
    setCurrentLayer('middle');
    setPhase('toMiddle');
    setInnerSelection(null);
  };

  const targetDir = outerSelection?.center?.clone().normalize() || new THREE.Vector3(0, 0, 1);

  return (
    <>
      {/* 外層球體 */}
      {currentLayer === 'outer' && (
        <OuterLayer 
          options={options} 
          supplyData={S} 
          onTilePick={handleOuterPick} 
        />
      )}

      {/* 中層球體 */}
      {currentLayer === 'middle' && (
        <MiddleLayer 
          selection={outerSelection}
          onRegionPick={handleMiddlePick}
          onBack={handleBackToOuter}
        />
      )}

      {/* 內層球體 */}
      {currentLayer === 'inner' && (
        <InnerLayer 
          regionSelection={middleSelection}
          onBack={handleBackToMiddle}
        />
      )}

      {/* 多層相機動畫系統 */}
      <MultiLayerCameraRig
        phase={phase}
        targetLayer={currentLayer}
        targetDir={targetDir}
        onArrive={(p) => {
          if (p === 'toMiddle') setPhase('idle');
          if (p === 'toInner') setPhase('idle');
          if (p === 'toOuter') { 
            setPhase('idle'); 
            setOuterSelection(null);
            setMiddleSelection(null);
            setInnerSelection(null);
          }
        }}
      />

      {/* 多層控制系統 */}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={currentLayer === 'inner' ? 1.5 : currentLayer === 'middle' ? 2.0 : 2.5}
        maxDistance={currentLayer === 'inner' ? 4.0 : currentLayer === 'middle' ? 6.0 : 12.0}
        makeDefault
      />
    </>
  );
};

/* =========================
   主組件
========================= */
const Globe = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [options, setOptions] = useState({ sphereOpacity: 0.45, gridLatN: 12, gridLonN: 12 });

  useEffect(() => {
    const onKey = (e) => { if ((e.key || "").toLowerCase() === "p") setShowPanel((s) => !s); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas camera={{ position: [0, 0, 8], fov: 70 }} style={{ width: "100vw", height: "100vh", background: "linear-gradient(#ffffff,#f2fbff)" }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 7, 8]} intensity={0.8} color="#e6fbff" />
        <directionalLight position={[-5, -3, -4]} intensity={0.3} color="#ccf0ff" />
        <MultiLayerScene options={options} />
      </Canvas>

      <Portal>
        <button onClick={() => setShowPanel((s) => !s)} title="切換控制面板 (P)" style={{ position: "fixed", top: 12, right: 12, zIndex: 2147483647, padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.15)", fontSize: 14 }}>⚙️ 面板</button>
        {showPanel && <Panel options={options} setOptions={setOptions} />}
      </Portal>
    </>
  );
};

export default Globe;
