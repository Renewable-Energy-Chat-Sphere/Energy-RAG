// GlobeVisualizer.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";
import data from "./data_with_similarity";

// --- 色彩與常數 ---
const COLOR_LOW = "#22c55e";
const COLOR_HIGH = "#ef4444";
const COLOR_NEUTRAL_S = "#dbeafe";
const COLOR_NEUTRAL_H = "#ffe4e6";
const TILE_OPACITY = 0.3;

// 吸附設定
const SNAP_PX = 20;
const MARGIN_PX = 8;

const lerpColor = (fromHex, toHex, t) => {
  const a = new THREE.Color(fromHex);
  const b = new THREE.Color(toHex);
  const c = a.clone().lerp(b, Math.max(0, Math.min(1, t)));
  return `#${c.getHexString()}`;
};

// ---------- 經緯線 ----------
const LatLines = React.memo(({ layers = 12, radius = 3, color = "#999", opacity = 0.6 }) => {
  const group = useMemo(() => {
    const g = new THREE.Group();
    for (let i = 1; i < layers; i++) {
      const theta = (i / layers) * Math.PI;
      const y = radius * Math.cos(theta);
      const r = radius * Math.sin(theta);
      const curve = new THREE.EllipseCurve(0, 0, r, r, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(100);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.LineLoop(geometry, material);
      line.rotation.x = Math.PI / 2;
      line.position.y = y;
      g.add(line);
    }
    return g;
  }, [layers, radius, color, opacity]);
  return <primitive object={group} />;
});

const LonLines = React.memo(({ segments = 12, radius = 3, color = "#999", opacity = 0.6 }) => {
  const group = useMemo(() => {
    const g = new THREE.Group();
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
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.Line(geometry, material);
      g.add(line);
    }
    return g;
  }, [segments, radius, color, opacity]);
  return <primitive object={group} />;
});

// ---------- 互動方塊（點擊 → 新分頁詳細頁） ----------
const HoverableTile = ({ item, pos, quaternion, tileWidth, tileHeight, fillColor }) => {
  const [hovered, setHovered] = useState(false);
  const { scale } = useSpring({ scale: hovered ? 1.06 : 1, config: { tension: 220, friction: 18 } });

  const fitText = (text, maxChars = 22) => {
    if (!text) return "";
    const s = String(text);
    let l = 0, out = "";
    for (let ch of s) {
      l += /[^\x00-\xff]/.test(ch) ? 2 : 1;
      if (l > maxChars) { out += "..."; break; }
      out += ch;
    }
    return out;
  };

  const openDetail = () => {
    const path = `/focus/${encodeURIComponent(item.code)}`;
    window.open(path, "_blank", "noopener,noreferrer");
  };

  return (
    <animated.group position={pos} quaternion={quaternion} scale={scale}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
        onClick={(e) => { e.stopPropagation(); openDetail(); }}
      >
        <planeGeometry args={[tileWidth, tileHeight]} />
        <meshBasicMaterial color={fillColor} transparent opacity={TILE_OPACITY} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group renderOrder={10}>
        <Text position={[0, tileHeight * 0.25, 0.01]} fontSize={tileHeight * 0.2} color="#000" anchorX="center" anchorY="middle">
          {fitText(item.code, 12)}
        </Text>
        <Text position={[0, 0, 0.01]} fontSize={tileHeight * 0.16} color="#000" anchorX="center" anchorY="middle">
          {fitText(item.zh, 18)}
        </Text>
        <Text position={[0, -tileHeight * 0.25, 0.01]} fontSize={tileHeight * 0.13} color="#333" anchorX="center" anchorY="middle">
          {fitText(item.en, 22)}
        </Text>
      </group>
    </animated.group>
  );
};

// ---------- 產生格子與 layout ----------
const LabeledGridShell = ({ data, radius = 3, rows = 12, cols = 12, focus, onLayout }) => {
  const tiles = [];
  const layoutMap = {};
  const symptoms = useMemo(() => data.filter((i) => i.code.startsWith("S")), [data]);
  const drugs = useMemo(() => data.filter((i) => i.code.startsWith("H")), [data]);

  const rowOrder = [];
  const mid = Math.floor(rows / 2);
  for (let i = 0; i < rows; i++) {
    const offset = Math.floor((i + 1) / 2);
    rowOrder.push(i % 2 === 0 ? mid - offset : mid + offset);
  }
  let indexH = 0, indexS = 0;

  for (const row of rowOrder) {
    const theta = ((row + 0.5) / rows) * Math.PI;
    const sinTheta = Math.sin(theta);
    const latCircumference = 2 * Math.PI * radius * sinTheta;
    const tileWidth = (latCircumference / cols) * 0.98;
    const tileHeight = (Math.PI * radius / rows) * 0.98;

    for (let col = 0; col < cols; col++) {
      let item = null;
      if (row >= mid && indexH < drugs.length) item = drugs[indexH++];
      else if (row < mid && indexS < symptoms.length) item = symptoms[indexS++];
      if (!item) continue;

      const phi = ((col + 0.5) / cols) * 2 * Math.PI;
      const r = radius;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);
      const pos = [x, y, z];

      const lookAt = new THREE.Vector3(0, 0, 0);
      const current = new THREE.Vector3(x, y, z);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(current, lookAt, new THREE.Vector3(0, 1, 0))
      );

      const isS = item.code.startsWith("S");
      let fillColor;
      if (focus && ((isS && focus.type === "S") || (!isS && focus.type === "H"))) {
        const raw = Number(item?.similarity?.[focus.code]) || 0;
        const sim = Math.max(0, Math.min(1, raw));
        fillColor = lerpColor(COLOR_LOW, COLOR_HIGH, sim);
      } else {
        fillColor = isS ? COLOR_NEUTRAL_S : COLOR_NEUTRAL_H;
      }

      layoutMap[item.code] = { pos, quaternion, isS, row, col, tileWidth, tileHeight };

      tiles.push(
        <HoverableTile
          key={`tile-${row}-${col}`}
          item={item}
          pos={pos}
          quaternion={quaternion}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
          fillColor={fillColor}
        />
      );
    }
  }

  onLayout && onLayout(layoutMap);
  return <group>{tiles}</group>;
};

// ---------- 相似度連線 & 焦點圈 ----------
const FocusLinks = ({ data, focus, layout, k = 12, radius = 3, opacity = 0.5 }) => {
  if (!focus || !layout) return null;
  const focusNode = layout[focus.code];
  if (!focusNode) return null;

  const isSFocus = focus.code.startsWith("S");
  const candidates = data.filter((d) => d.code !== focus.code && d.code.startsWith(isSFocus ? "S" : "H"));
  const sorted = [...candidates]
    .sort((a, b) => (Number(b?.similarity?.[focus.code]) || 0) - (Number(a?.similarity?.[focus.code]) || 0))
    .slice(0, k);

  return (
    <group renderOrder={5}>
      {sorted.map((item) => {
        const sim = Math.max(0, Math.min(1, Number(item?.similarity?.[focus.code]) || 0));
        const a = new THREE.Vector3(...focusNode.pos);
        const b = new THREE.Vector3(...(layout[item.code]?.pos || [0, 0, 0]));
        if (b.length() === 0) return null;

        const mid = a.clone().add(b).multiplyScalar(0.5).setLength(radius * (1.15 + 0.25 * sim));
        const curve = new THREE.CubicBezierCurve3(a, mid, mid, b);
        const points = curve.getPoints(32);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const color = lerpColor(COLOR_LOW, COLOR_HIGH, sim);
        return (
          <line key={`link-${focus.code}-${item.code}`} geometry={geometry}>
            <lineBasicMaterial color={color} transparent opacity={opacity * (0.6 + 0.4 * sim)} />
          </line>
        );
      })}
    </group>
  );
};

const FocusHalo = ({ layout, focus }) => {
  if (!focus || !layout?.[focus.code]) return null;
  const { pos } = layout[focus.code];
  return (
    <group position={pos} renderOrder={6}>
      <mesh>
        <ringGeometry args={[0.18, 0.22, 48]} />
        <meshBasicMaterial transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// ---------- Zoom HUD（只顯示縮放，網格固定） ----------
const ZoomHUD = () => {
  const { camera } = useThree();
  const [d, setD] = useState(camera.position.length());
  useFrame(() => {
    const nd = Number(camera.position.length().toFixed(2));
    setD((prev) => (prev === nd ? prev : nd));
  });
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 9,
        background: "rgba(0,0,0,0.5)", color: "#fff", padding: "6px 10px",
        borderRadius: 8, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", fontSize: 12,
        pointerEvents: "none",
      }}>
        Zoom ≈ {d.toFixed(2)}　Fixed grid
      </div>
    </Html>
  );
};

// ---------- 場景（固定網格密度，不隨縮放變動） ----------
const Scene = ({ layers, focus, topK, gridOpacity, rows, cols }) => {
  const layoutRef = useRef(null);

  return (
    <>
      {layers.grid && (
        <>
          <LatLines layers={rows} radius={3} color="#888" opacity={gridOpacity} />
          <LonLines segments={cols} radius={3} color="#888" opacity={gridOpacity} />
        </>
      )}

      {layers.tiles && (
        <LabeledGridShell
          data={data}
          radius={3}
          rows={rows}
          cols={cols}
          focus={focus}
          onLayout={(m) => (layoutRef.current = m)}
        />
      )}

      {layers.focusHalo && <FocusHalo layout={layoutRef.current} focus={focus} />}

      {layers.links && (
        <FocusLinks
          data={data}
          focus={focus}
          layout={layoutRef.current}
          k={topK}
          radius={3}
          opacity={0.55}
        />
      )}

      <ZoomHUD />
    </>
  );
};

// ---------- 小工具：localStorage ----------
const useLocalStorage = (key, initial) => {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
};

// ---------- 面板（拖曳/縮放 + 貼邊吸附 + 記象限 + 最小化 + 內容捲動） ----------
const DraggableResizablePanel = ({
  title = "層級控制",
  children,
  initial = { top: 12, left: 12, width: 360, height: 320 },
}) => {
  const [rect, setRect] = useLocalStorage("globe_panel_rect", { ...initial });
  const [locked, setLocked] = useLocalStorage("globe_panel_locked", false);
  const [anchor, setAnchor] = useLocalStorage("globe_panel_anchor", "tl");
  const [minimized, setMinimized] = useLocalStorage("globe_panel_min", false);
  const [lastSize, setLastSize] = useState({ width: rect.width, height: rect.height });

  const panelRef = useRef(null);
  const stateRef = useRef({ dragging: false, resizing: false, startX: 0, startY: 0, startLeft: 0, startTop: 0, startW: 360, startH: 0 });

  const computeAnchor = (left, top, width, height) => {
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    const cx = left + width / 2;
    const cy = top + (height || 200) / 2;
    const horiz = cx < midX ? "l" : "r";
    const vert  = cy < midY ? "t" : "b";
    return vert + horiz;
  };

  const toggleMin = () => {
    if (!minimized) {
      setLastSize({ width: rect.width, height: rect.height });
      setRect((r) => ({ ...r, height: 40 }));
      setMinimized(true);
    } else {
      setRect((r) => ({ ...r, width: lastSize.width || r.width, height: lastSize.height || 320 }));
      setMinimized(false);
    }
  };

  const onPointerDownDrag = (e) => {
    if (locked) return;
    const r = panelRef.current.getBoundingClientRect();
    stateRef.current = {
      ...stateRef.current,
      dragging: true, resizing: false,
      startX: e.clientX ?? (e.touches?.[0]?.clientX),
      startY: e.clientY ?? (e.touches?.[0]?.clientY),
      startLeft: r.left, startTop: r.top,
      startW: r.width, startH: r.height,
    };
    document.body.style.userSelect = "none";
  };

  const onPointerDownResize = (e) => {
    if (locked || minimized) return;
    e.stopPropagation();
    const r = panelRef.current.getBoundingClientRect();
    stateRef.current = {
      ...stateRef.current,
      dragging: false, resizing: true,
      startX: e.clientX ?? (e.touches?.[0]?.clientX),
      startY: e.clientY ?? (e.touches?.[0]?.clientY),
      startLeft: r.left, startTop: r.top,
      startW: r.width, startH: r.height,
    };
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const move = (e) => {
      const s = stateRef.current;
      if (!s.dragging && !s.resizing) return;
      const x = e.clientX ?? (e.touches?.[0]?.clientX);
      const y = e.clientY ?? (e.touches?.[0]?.clientY);
      if (x == null || y == null) return;

      if (s.dragging) {
        let left = s.startLeft + (x - s.startX);
        let top  = s.startTop  + (y - s.startY);
        const w = panelRef.current?.offsetWidth || rect.width || 320;
        const h = panelRef.current?.offsetHeight || rect.height || 200;
        left = Math.max(MARGIN_PX, Math.min(left, window.innerWidth - w - MARGIN_PX));
        top  = Math.max(MARGIN_PX, Math.min(top,  window.innerHeight - h - MARGIN_PX));
        setRect((r) => ({ ...r, left, top }));
      } else if (s.resizing) {
        let newW = Math.max(260, s.startW + (x - s.startX));
        let newH = Math.max(180, (s.startH || 0) + (y - s.startY));
        newW = Math.min(newW, window.innerWidth - (rect.left || MARGIN_PX) - MARGIN_PX);
        newH = Math.min(newH, window.innerHeight - (rect.top || MARGIN_PX) - MARGIN_PX);
        setRect((r) => ({ ...r, width: newW, height: newH }));
      }
    };
    const up = () => {
      const s = stateRef.current;
      if (!s.dragging && !s.resizing) return;
      if (s.dragging) {
        const el = panelRef.current;
        const w = el?.offsetWidth || 320;
        const h = el?.offsetHeight || 200;
        let { left, top } = rect;
        const rightGap  = window.innerWidth  - (left + w);
        const bottomGap = window.innerHeight - (top + h);
        if (left <= SNAP_PX) left = MARGIN_PX;
        else if (rightGap <= SNAP_PX) left = window.innerWidth - w - MARGIN_PX;
        if (top <= SNAP_PX) top = MARGIN_PX;
        else if (bottomGap <= SNAP_PX) top = window.innerHeight - h - MARGIN_PX;

        const anc = computeAnchor(left, top, w, h);
        setAnchor(anc);
        setRect((r) => ({ ...r, left, top }));
      }
      stateRef.current.dragging = false;
      stateRef.current.resizing = false;
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [rect, setRect, setAnchor]);

  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const w = el.offsetWidth || rect.width || 320;
      const h = el.offsetHeight || rect.height || 200;

      let left = rect.left;
      let top = rect.top;

      if (anchor.includes("r")) {
        const rightGap = Math.max(MARGIN_PX, window.innerWidth - (left + w));
        left = window.innerWidth - w - rightGap;
      } else {
        left = Math.max(MARGIN_PX, Math.min(left, window.innerWidth - w - MARGIN_PX));
      }
      if (anchor.includes("b")) {
        const bottomGap = Math.max(MARGIN_PX, window.innerHeight - (top + h));
        top = window.innerHeight - h - bottomGap;
      } else {
        top = Math.max(MARGIN_PX, Math.min(top, window.innerHeight - h - MARGIN_PX));
      }
      setRect((r) => ({ ...r, left, top }));
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [anchor, rect.height, rect.width, rect.left, rect.top, setRect]);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: rect.top, left: rect.left,
        width: rect.width,
        height: rect.height,
        maxWidth: "min(92vw, 560px)",
        zIndex: 10,
        background: "rgba(255,255,255,0.94)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "saturate(120%) blur(4px)",
        pointerEvents: "auto",
        touchAction: "none",
      }}
    >
      {/* 標題列 */}
      <div
        onMouseDown={onPointerDownDrag}
        onTouchStart={onPointerDownDrag}
        onDoubleClick={toggleMin}
        style={{
          cursor: locked ? "default" : "move",
          padding: "8px 10px",
          fontSize: 14, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(to bottom, #f8fafc, #eef2f7)",
          borderBottom: "1px solid #e5e7eb",
          userSelect: "none",
          flex: "0 0 auto",
        }}
      >
        {title}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMin(); }}
            title={minimized ? "展開面板" : "最小化面板"}
            style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
          >
            {minimized ? "展開 +" : "收起 –"}
          </button>
          {!minimized && (
            <>
              <span style={{ fontSize: 12, opacity: 0.7 }}>位置：{anchor.toUpperCase()}</span>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                  title="鎖定面板"
                />
                鎖定
              </label>
            </>
          )}
        </div>
      </div>

      {/* 內容（可捲動；最小化隱藏） */}
      {!minimized && (
        <div style={{ flex: "1 1 auto", overflow: "auto", padding: 10, minHeight: 0 }}>
          {children}
        </div>
      )}

      {/* 右下角 resize 把手 */}
      {!minimized && (
        <div
          onMouseDown={onPointerDownResize}
          onTouchStart={onPointerDownResize}
          title={locked ? "" : "拖曳調整大小"}
          style={{
            position: "absolute", right: 6, bottom: 6, width: 14, height: 14,
            borderRight: "2px solid #cbd5e1", borderBottom: "2px solid #cbd5e1",
            cursor: locked ? "default" : "nwse-resize", opacity: 0.85,
          }}
        />
      )}
    </div>
  );
};

// ---------- 主組件 ----------
const Globe = () => {
  const allCodes = useMemo(
    () => data.map((d) => ({
      code: d.code,
      label: `${d.code} — ${d.zh || d.en || ""}`,
      type: d.code.startsWith("S") ? "S" : "H",
    })), []
  );

  const defaultFocus = useMemo(() => {
    const firstS = allCodes.find((c) => c.type === "S");
    return firstS ? { code: firstS.code, type: "S" } : null;
  }, [allCodes]);

  const [focus, setFocus] = useState(defaultFocus);
  const [layers, setLayers] = useState({
    grid: true,
    tiles: true,
    links: true,
    focusHalo: true,
  });
  const [topK, setTopK] = useState(12);
  const [gridOpacity, setGridOpacity] = useState(0.6);

  // ✅ 固定網格：面板可調整，但不受縮放影響
  const [gridRows, setGridRows] = useState(12);
  const [gridCols, setGridCols] = useState(12);

  const goToDetail = (newTab = true) => {
    if (!focus) return;
    const path = `/focus/${encodeURIComponent(focus.code)}`;
    if (newTab) window.open(path, "_blank", "noopener,noreferrer");
    else window.location.href = path;
  };

  return (
    <>
      <DraggableResizablePanel title="層級控制">
        {/* 層級開關 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 8 }}>
          {[
            ["grid", "經緯網格"],
            ["tiles", "標籤方塊"],
            ["links", "相似度連線"],
            ["focusHalo", "焦點高亮"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) => setLayers((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>

        {/* 參數 */}
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <label style={{ fontSize: 12 }}>
            相似度連線 Top-K：{topK}
            <input type="range" min={3} max={24} value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              style={{ width: "100%" }} />
          </label>
          <label style={{ fontSize: 12 }}>
            網格透明度：{gridOpacity.toFixed(2)}
            <input type="range" min={0} max={1} step={0.05} value={gridOpacity}
              onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
              style={{ width: "100%" }} />
          </label>
        </div>

        {/* ✅ 固定網格密度控制（與縮放無關） */}
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <label style={{ fontSize: 12 }}>
            Rows：{gridRows}
            <input type="range" min={6} max={36} step={1} value={gridRows}
              onChange={(e) => setGridRows(parseInt(e.target.value))}
              style={{ width: "100%" }} />
          </label>
          <label style={{ fontSize: 12 }}>
            Cols：{gridCols}
            <input type="range" min={6} max={36} step={1} value={gridCols}
              onChange={(e) => setGridCols(parseInt(e.target.value))}
              style={{ width: "100%" }} />
          </label>
        </div>

        {/* 基準點選擇與前往 */}
        <div style={{ fontSize: 14, marginBottom: 6, fontWeight: 600 }}>請選擇基準點</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={focus ? focus.code : ""}
            onChange={(e) => {
              const code = e.target.value;
              const type = code.startsWith("S") ? "S" : "H";
              setFocus({ code, type });
            }}
            style={{ width: "auto", maxWidth: 320, padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd" }}
          >
            <optgroup label="症狀 (S)">
              {allCodes.filter((c) => c.type === "S").map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="藥物 (H)">
              {allCodes.filter((c) => c.type === "H").map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </optgroup>
          </select>

          <button
            onClick={() => goToDetail(true)}
            disabled={!focus}
            style={{
              marginLeft: "auto", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd",
              background: "#fff", cursor: focus ? "pointer" : "not-allowed", opacity: focus ? 1 : 0.5, whiteSpace: "nowrap",
            }}
            title="在新分頁開啟專屬頁"
          >
            前往專屬頁
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          網格密度固定；縮放只改大小不改密度。點擊球面任一格子可打開詳細頁。
        </div>
      </DraggableResizablePanel>

      {/* Canvas 區域 */}
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }} style={{ width: "100vw", height: "100vh" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls enablePan={false} enableZoom={true} />
        <Scene
          layers={layers}
          focus={focus}
          topK={topK}
          gridOpacity={gridOpacity}
          rows={gridRows}
          cols={gridCols}
        />
      </Canvas>
    </>
  );
};

export default Globe;
