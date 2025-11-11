// GlobeVisualizer.jsx — LOD1: All blocks rendered (no magnification) + overlays only on active sector
// + Right-side Info Panel with click selection (placeholder "尚無資料")
// 2025-10-23 — 版本：Layers 控制點擊（LOD0=Layer1, LOD1=Layer2），並確保相機也渲染 Layer 1/2

import React, { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard } from "@react-three/drei";

// ===================== 基本設定 =====================
const RADIUS = 3.0;
const BG = 0xffffff; // 全白
const LAYER_LOD0 = 1; // 用於 LOD0 點擊
const LAYER_LOD1 = 2; // 用於 LOD1 點擊

// 五大部門（LOD0）
const SECTORS = [
  { key: "agri",    name: "農業",  color: 0x48d99a },
  { key: "ind",     name: "工業",  color: 0xffa15a },
  { key: "trans",   name: "運輸",  color: 0x5fbef2 },
  { key: "service", name: "服務",  color: 0x8b6cff },
  { key: "res",     name: "住宅",  color: 0xff6f9d },
];

// 第二層：各部門子項目（緯度垂直切分）
const INDUSTRIES = {
  agri: ["農作物與畜牧","林業與木材","漁業與水產","食品初級加工","農機服務"],
  ind: ["砂石產品","食品飲料及菸草製造業","化學材料與製品","金屬製品","機械與設備"],
  trans: ["公路運輸","鐵路運輸","海運與港務","航空運輸","倉儲與物流"],
  service: ["批發零售","餐飲旅宿","資訊與通訊","金融保險","教育與醫療"],
  res: ["住宅用電","住宅燃氣","住宅熱能","家用再生能源"],
};

// ====== 小工具 ======
const clamp01   = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp      = (a, b, t) => a + (b - a) * t;

// ===================== 幾何/座標 =====================
function lonLatToVec3(lonDeg, latDeg, r = RADIUS, lift = 0) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const lat = THREE.MathUtils.degToRad(latDeg);
  return new THREE.Vector3(
    (r + lift) * Math.cos(lat) * Math.cos(lon),
    (r + lift) * Math.sin(lat),
    (r + lift) * Math.cos(lat) * Math.sin(lon)
  );
}

function sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r = RADIUS, seg = 64 }) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; const lat = lat0 * (1 - t) + lat1 * t;
    for (let j = 0; j <= seg; j++) {
      const s = j / seg; const lon = lon0 * (1 - s) + lon1 * s;
      const p = lonLatToVec3(lon, lat, r);
      positions.push(p.x, p.y, p.z);
      const n = p.clone().normalize();
      normals.push(n.x, n.y, n.z);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < seg; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal",   new THREE.Float32BufferAttribute(normals,   3));
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
  const t  = t0 > 0 ? t0 : t1 > 0 ? t1 : null;
  return t === null ? null : eye.clone().add(dir.clone().multiplyScalar(t));
}

function vec3ToLonLat(v) {
  const n = v.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(n.y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(n.z, n.x));
  return { lon, lat };
}

function sectorIndexFromLon(lonDeg) {
  let lon = ((lonDeg + 180) % 360 + 360) % 360 - 180; // [-180,180)
  return Math.floor((lon + 180) / 72) % 5;           // 0..4
}

// ============== 連續縮放混合（LOD0↔LOD1） ==============
function useZoomBlend() {
  const { camera } = useThree();
  const [blend01, setBlend01] = useState(0); // 0: LOD0, 1: LOD1
  useFrame(() => {
    const d = camera.position.length();
    const FAR = RADIUS * 3.0, MID = RADIUS * 2.3;
    setBlend01(1 - smoothstep(MID, FAR, d));
  });
  return { blend01 };
}

// ============== 控制 raycaster 只命中某一 Layer ==============
function RaycastLayerController({ activeLayer }) {
  const { raycaster } = useThree();
  useEffect(() => {
    raycaster.layers.disableAll();
    raycaster.layers.enable(activeLayer);
  }, [activeLayer, raycaster]);
  return null;
}

// ===================== 只在前半球顯示的看板文字 =====================
function FrontBillboardLabel({
  position = [0,0,0],
  children,
  threshold = 0.02,
  renderOrder = 10,
  ...textProps
}) {
  const { camera } = useThree();
  const grp = useRef(); const [visible, setVisible] = useState(true);
  useFrame(() => {
    if (!grp.current) return;
    const wp = new THREE.Vector3(); grp.current.getWorldPosition(wp);
    const dp = wp.clone().normalize().dot(camera.position.clone().normalize());
    const isFront = dp > threshold; if (visible !== isFront) setVisible(isFront);
  });
  return (
    <group ref={grp} visible={visible} position={position}>
      <Billboard follow>
        <Text
          material-depthTest={false}
          material-depthWrite={false}
          renderOrder={renderOrder}
          {...textProps}
        >
          {children}
        </Text>
      </Billboard>
    </group>
  );
}

// ===================== 視覺：球體 + 柔光陰影 =====================
function TransparentGlobe() {
  const matRef = useRef(); const { camera } = useThree();
  useFrame(() => {
    const d = camera.position.length();
    const near = RADIUS * 1.1, far = RADIUS * 5.0;
    const t = THREE.MathUtils.clamp((d - near) / (far - near), 0, 1);
    if (matRef.current) matRef.current.opacity = THREE.MathUtils.lerp(0.22, 0.32, t);
  });
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshPhongMaterial
        ref={matRef}
        color={0x9eb6d8}
        emissive={0xaac6ff}
        specular={0xffffff}
        shininess={90}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </mesh>
  );
}

function SoftTerminator({ strength = 0.55, sunDir = new THREE.Vector3(1,0.4,0.2).normalize() }) {
  const uniforms = useMemo(() => ({ sun:{value:sunDir}, strength:{value:strength}, radius:{value:RADIUS} }), [sunDir,strength]);
  return (
    <mesh>
      <sphereGeometry args={[RADIUS * 1.001, 128, 128]} />
      <shaderMaterial
        transparent blending={THREE.NormalBlending} depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`uniform vec3 sun; uniform float strength; varying vec3 vNormal; void main(){ float nd=dot(normalize(vNormal), normalize(sun)); float shade=smoothstep(-0.4,0.2,nd); float a=(1.0-shade)*strength; gl_FragColor=vec4(0.0,0.0,0.0,a); }`}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh renderOrder={-20}>
      <sphereGeometry args={[RADIUS * 1.04, 64, 64]} />
      <meshBasicMaterial color={0x3ea0ff} transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

// ===================== LOD 0：五楔形（淡出＋標籤） =====================
function FullCoverSectors({ fade01 = 0, onSelect }) {
  const bands = useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      out.push({ lon0: -180 + i*72, lon1: -180 + (i+1)*72, lat0: -90, lat1: 90, sector: SECTORS[i] });
    }
    return out;
  }, []);

  return (
    <group>
      {bands.map((b, i) => {
        const geo = sphericalQuadGeometry({ ...b, r: RADIUS + 0.003, seg: 64 });
        const mat = new THREE.MeshStandardMaterial({
          color: b.sector.color, roughness: 0.85, metalness: 0, transparent: true,
          opacity: lerp(0.9, 0.25, fade01), depthWrite: false, polygonOffset: true,
          polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        });
        const midLon = (b.lon0 + b.lon1) / 2;
        const labelPos = lonLatToVec3(midLon, 0, RADIUS + 0.015).toArray();
        const labelAlpha = fade01 < 0.85 ? 1.0 - smoothstep(0.2, 0.85, fade01) : 0.0;

        return (
          <group key={i}>
            <mesh
              geometry={geo}
              material={mat}
              onUpdate={(m)=>m.layers.set(LAYER_LOD0)} // ← LOD0 點擊層：Layer 1
              onPointerOver={(e)=>{document.body.style.cursor='pointer';}}
              onPointerOut ={(e)=>{document.body.style.cursor='auto';}}
              onClick={(e)=>{ e.stopPropagation(); onSelect?.({ type:'sector', key:b.sector.key, name:b.sector.name }); }}
            />
            {labelAlpha > 0 && (
              <FrontBillboardLabel
                position={labelPos}
                fontSize={lerp(0.26, 0.22, fade01)}
                color="#111111"
                outlineWidth={0.006}
                outlineColor="#ffffff"
                anchorX="center"
                anchorY="middle"
                renderOrder={100}
              >
                {b.sector.name}
              </FrontBillboardLabel>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ===================== LOD 1：所有區塊都渲染；只有正對部門顯示資訊 =====================
function SectorIndustryBubbles({ blend01 = 0, onSelect }) {
  const { camera } = useThree();

  // 取得相機正對點 → 對應部門索引
  const [activeIndex, setActiveIndex] = useState(0);
  useFrame(() => {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const hit = raySphereIntersection(camera.position, dir, new THREE.Vector3(0,0,0), RADIUS);
    if (!hit) return;
    const { lon } = vec3ToLonLat(hit);
    const idx = sectorIndexFromLon(lon);
    if (idx !== activeIndex) setActiveIndex(idx);
  });

  const in01 = smoothstep(0.0, 1.0, blend01);
  const alpha = in01;
  const layerR = RADIUS + 0.08; // 固定外推量（移除放大錯覺）

  const all = [];
  for (let si = 0; si < SECTORS.length; si++) {
    const parent = SECTORS[si];
    const items = INDUSTRIES[parent.key] ?? [];
    const n = Math.max(1, items.length);

    const lon0 = -180 + si * 72;
    const lon1 = lon0 + 72;

    // 主材質（父色 → 淡化）
    const lightMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(parent.color).lerp(new THREE.Color(0xffffff), 0.32),
      roughness: 0.85, metalness: 0.0, transparent: true,
      opacity: alpha * 0.95, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });

    // 分隔帶材質
    const dividerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(parent.color).lerp(new THREE.Color(0x000000), 0.25),
      transparent: true, opacity: alpha * 0.35, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });

    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const lat1 = THREE.MathUtils.lerp(90, -90, t0);
      const lat0 = THREE.MathUtils.lerp(90, -90, t1);

      const subGeo = sphericalQuadGeometry({ lat0, lat1, lon0, lon1, r: layerR, seg: 64 });

      // 分隔帶（k=0 不畫）
      let divider = null;
      if (k > 0) {
        const dth = 0.25;
        divider = sphericalQuadGeometry({ lat0: lat1 - dth, lat1, lon0, lon1, r: layerR + 0.0005, seg: 48 });
      }

      // 區塊一定渲染（所有部門）；資訊只在 active 部門
      const showOverlay = si === activeIndex && alpha > 0;

      const midLat = (lat0 + lat1) / 2;
      const midLon = (lon0 + lon1) / 2;
      const labelPos = lonLatToVec3(midLon, midLat, layerR + 0.012).toArray();

      all.push(
        <group key={`${si}-${k}`}>
          <mesh
            geometry={subGeo}
            material={lightMat}
            renderOrder={50}
            onUpdate={(m)=>m.layers.set(LAYER_LOD1)} // ← LOD1 點擊層：Layer 2
            onPointerOver={(e)=>{document.body.style.cursor='pointer';}}
            onPointerOut ={(e)=>{document.body.style.cursor='auto';}}
            onClick={(e)=>{ e.stopPropagation(); onSelect?.({ type:'industry', parentKey: parent.key, parentName: parent.name, name: items[k] }); }}
          />
          {divider && <mesh geometry={divider} material={dividerMat} renderOrder={55} onUpdate={(m)=>m.layers.set(LAYER_LOD1)} />}
          {showOverlay && (
            <FrontBillboardLabel
              position={labelPos}
              fontSize={0.17}  // 固定大小
              color="#111111"
              outlineWidth={0.004}
              outlineColor="#ffffff"
              anchorX="center"
              anchorY="middle"
              renderOrder={90}
            >
              {items[k]}
            </FrontBillboardLabel>
          )}
        </group>
      );
    }
  }

  return <group>{all}</group>;
}

// ===================== LOD 切換（把 onSelect 往下傳） =====================
function EnergyGlobeLOD({ onSelect }) {
  const { blend01 } = useZoomBlend();

  // 滯回：>=0.60 進入 LOD1 點擊層（Layer 2）；<=0.45 回到 LOD0（Layer 1）
  const [activeLayer, setActiveLayer] = useState(LAYER_LOD0);
  useEffect(() => {
    setActiveLayer((prev) => {
      if (prev !== LAYER_LOD1 && blend01 >= 0.60) return LAYER_LOD1;
      if (prev !== LAYER_LOD0 && blend01 <= 0.45) return LAYER_LOD0;
      return prev;
    });
  }, [blend01]);

  return (
    <group>
      {/* 控制 raycaster 僅命中某層 */}
      <RaycastLayerController activeLayer={activeLayer} />

      {/* LOD0：照常淡出（顯示與否不影響可點層，真正可點由 raycaster 的 layer 決定） */}
      <FullCoverSectors fade01={blend01} onSelect={onSelect} />

      {/* LOD1：全部渲染；只有正對部門顯示標籤 */}
      <SectorIndustryBubbles blend01={blend01} onSelect={onSelect} />
    </group>
  );
}

// ===================== 右側資訊欄 =====================
function SidePanel({ selection, onClear }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        bottom: 16,
        width: 320,
        background: "#ffffff",
        borderRadius: 12,
        boxShadow:
          "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
        padding: 16,
        overflow: "auto",
        pointerEvents: "auto",
        border: "1px solid rgba(0,0,0,0.06)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>詳細資訊</div>
        {selection && (
          <button
            onClick={onClear}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "rgba(0,0,0,0.06)",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            清除
          </button>
        )}
      </div>

      {!selection && (
        <div style={{ color: "#666", lineHeight: 1.6 }}>
          點擊球面上的
          <b> 部門或子項目</b>
          ，這裡會顯示對應的能源資訊（目前為框架示意）。
        </div>
      )}

      {selection?.type === "sector" && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            {selection.name}
          </div>
          <div style={{ color: "#666" }}>（部門）</div>
          <div style={{ marginTop: 12, color: "#444" }}>尚無資料</div>
        </div>
      )}

      {selection?.type === "industry" && (
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>{selection.parentName}</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            {selection.name}
          </div>
          <div style={{ color: "#666" }}>（子項目）</div>
          <div style={{ marginTop: 12, color: "#444" }}>尚無資料</div>
        </div>
      )}
    </div>
  );
}

// ===================== 場景 =====================
function Scene({ onSelect }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, RADIUS * 0.9, RADIUS * 2.6);
    // ★★★ 重點修正：相機也渲染 Layer 1 與 Layer 2（否則顏色整個看不到）
    camera.layers.enable(LAYER_LOD0);
    camera.layers.enable(LAYER_LOD1);
  }, [camera]);

  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[5,5,5]} intensity={1.6} color={0xffffff} />

      <TransparentGlobe />
      <SoftTerminator strength={0.5} />
      <Atmosphere />

      <EnergyGlobeLOD onSelect={onSelect} />

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

// ===================== Root：把選取狀態提升 + 側欄 =====================
export default function GlobeVisualizer() {
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3001/selected.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        // ✅ 修正這裡的 key
        if (data && data.selection) {
          setSelection({ type: "sector", name: data.selection });
        }
      } catch (err) {
        console.warn("❌ 無法從伺服器取得選擇資料", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 1000 }}
      >
        <Suspense fallback={<Html center style={{ color: '#333' }}>Loading…</Html>}>
          <Scene onSelect={setSelection} />
        </Suspense>
      </Canvas>

      {/* 右側資訊欄（Canvas 外層固定定位，不影響 3D 互動） */}
      <SidePanel selection={selection} onClear={() => setSelection(null)} />
    </>
  );
}

