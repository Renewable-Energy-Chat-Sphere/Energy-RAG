import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMediaQuery } from "react-responsive";

/* =========================
   🔵 簡化球體（手機版）
========================= */
function SimpleGlobe() {
  return (
    <mesh>
      <sphereGeometry args={[3, 64, 64]} />
      <meshStandardMaterial
        color="#1e3a8a"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

/* =========================
   📊 底部面板
========================= */
function BottomPanel({ open, setOpen, data }) {
  return (
    <div className={`bottom-panel ${open ? "open" : ""}`}>
      {/* 拖曳條 */}
      <div
        className="drag-bar"
        onClick={() => setOpen(!open)}
      />

      <div className="panel-content">
        <h3>能源資訊</h3>

        {data ? (
          <div>
            <p><b>部門：</b>{data.name}</p>
            <p><b>能源：</b>{data.energy}</p>
          </div>
        ) : (
          <p>點擊球體查看資料</p>
        )}
      </div>
    </div>
  );
}

/* =========================
   🤖 AI 全螢幕
========================= */
function AIChat({ onClose }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const send = () => {
    if (!input) return;

    const userMsg = { role: "user", text: input };
    const botMsg = {
      role: "bot",
      text: "（這裡串你的 /chat API）",
    };

    setMessages([...messages, userMsg, botMsg]);
    setInput("");
  };

  return (
    <div className="ai-fullscreen">
      <div className="ai-header">
        <span>問能源</span>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="ai-body">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="ai-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入問題..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>送出</button>
      </div>
    </div>
  );
}

/* =========================
   📱 主畫面
========================= */
export default function MobileGlobal() {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const [panelOpen, setPanelOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  if (!isMobile) return <div>請用 Desktop 版</div>;

  return (
    <div className="mobile-container">
      {/* 🔍 搜尋 */}
      <div className="top-search">
        <input
          placeholder="搜尋部門..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 🌍 3D 球 */}
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={1} />
        <SimpleGlobe />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.6}
        />
      </Canvas>

      {/* 📊 底部面板 */}
      <BottomPanel
        open={panelOpen}
        setOpen={setPanelOpen}
        data={selected}
      />

      {/* 🤖 AI 按鈕 */}
      <div className="ai-fab" onClick={() => setShowAI(true)}>
        💬
      </div>

      {/* 🤖 AI 全螢幕 */}
      {showAI && <AIChat onClose={() => setShowAI(false)} />}
    </div>
  );
}