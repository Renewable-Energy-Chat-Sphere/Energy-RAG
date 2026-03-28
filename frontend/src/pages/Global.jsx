import React from "react";
import { useState, useEffect } from "react";
import GlobeVisualizer from "../components/GlobeVisualizer.jsx";
import "./global.css";
import BackToTopButton from "../components/BackToTopButton";
import hierarchy from "../data/hierarchy.json";

/* ===================== */
/* 遞迴查找節點（支援多層） */
/* ===================== */
function findNodeByCode(code, tree) {
  for (const key in tree) {
    if (key === code) return tree[key];

    if (tree[key].children) {
      const found = findNodeByCode(code, tree[key].children);

      if (found) return found;
    }
  }

  return null;
}

export default function Global() {
  const [selection, setSelection] = useState(null);
  const [hover, setHover] = useState(null);
  const [year, setYear] = useState("113");
  const [showSupply, setShowSupply] = useState(false);
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const handleMouseDown = () => {
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;

    setPosition((prev) => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  };

  const handleMouseUp = () => {
    setDragging(false);
  };
  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer(""); // 清空舊答案

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: question,
          session_id: "energy_sphere",
          rag_auto: true,
        }),
      });

      const data = await res.json();

      // ✨ 打字效果
      typeWriter(data.answer || "沒有回應");
    } catch (err) {
      setAnswer("❌ 發生錯誤");
    } finally {
      setLoading(false);
      setQuestion(""); // 清空輸入
    }
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 防止換行
      handleAsk();
    }
  }
  function typeWriter(text) {
    let i = 0;

    const interval = setInterval(() => {
      setAnswer(text.slice(0, i + 1)); // 🔥用 slice

      i++;

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 20);
  }
  useEffect(() => {
    if (selection) {
      setQuestion(`${year} ${selection.name} 能源比例`);
    }
  }, [selection]);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);
  return (
    <div className="global-page">
      {/* ===================== */}
      {/* 上方控制面板 */}
      {/* ===================== */}

      <div className="control-panel">
        <div className="panel-title">
          <i className="fi fi-br-settings"></i>
          能源控制面板
        </div>

        {/* 年份選擇 */}
        <div className="panel-row">
          <label>年份</label>

          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="113">113</option>
            <option value="112">112</option>
            <option value="111">111</option>
          </select>
        </div>

        {/* 供給線開關 */}
        <div className="panel-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showSupply}
              onChange={() => setShowSupply(!showSupply)}
            />
            顯示供給線
          </label>
        </div>

        {/* 搜尋框 */}
        <div className="panel-row search-box">
          <i className="fi fi-br-search search-icon"></i>

          <input
            type="text"
            placeholder="搜尋部門..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="panel-row">
          <div className="ai-box" onClick={() => setShowAI(true)}>
            <i className="fi fi-br-comments" style={{ marginRight: "6px" }}></i>
            問能源
          </div>
        </div>
      </div>

      {/* ===================== */}
      {/* 下方主區域 */}
      {/* ===================== */}

      <div className="global-layout">
        {/* 左側：球體 */}
        <div className="globe-area">
          <GlobeVisualizer
            year={year}
            showSupply={showSupply}
            search={search}
            selected={selection}
            onSelect={setSelection}
            onHover={setHover}
          />
        </div>

        {/* 右側：資訊欄 */}
        <div className="info-panel">
          {!selection && (
            <div className="info-empty">
              <h3>請點擊需求節點</h3>

              <p>
                點擊球體上的 Demand node
                <br />
                查看能源資訊
              </p>
            </div>
          )}

          {selection && (
            <div className="info-card">
              <h2>{selection.name}</h2>

              {(() => {
                const node = findNodeByCode(selection.code, hierarchy);

                return node?.img ? (
                  <img
                    src={node.img}
                    alt=""
                    className="info-img"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : null;
              })()}

              <div className="info-content">
                <h3>常用能源</h3>

                <p>電力、石油、天然氣</p>

                <h3>年度分析</h3>

                <p>
                  這裡可以放
                  <br />
                  {selection.year} 年能源結構比例
                  <br />
                  部門需求佔比
                  <br />
                  能源趨勢分析
                </p>

                <h3>相似度分析</h3>

                <p>
                  供給加權相似度
                  <br />
                  需求加權相似度
                  <br />
                  歐幾里得距離
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===================== */}
        {/* Hover 卡片 */}
        {/* ===================== */}

        {hover && (
          <div className="hover-overlay">
            <div className="hover-card">
              <div className="hover-header">{hover.name}</div>

              {(() => {
                const node = findNodeByCode(hover.code, hierarchy);

                return node?.img ? (
                  <img
                    src={node.img}
                    alt=""
                    className="hover-img"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : null;
              })()}

              <div className="hover-content">
                常用能源：
                <br />
                電力、石油、天然氣
              </div>
            </div>
          </div>
        )}
      </div>
      {showAI && (
        <div className="ai-overlay">
          <div
            className="ai-panel"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          >
            {/* Header（可拖曳） */}
            <div className="ai-header" onMouseDown={handleMouseDown}>
              <span className="ai-title">
                <i
                  className="fi fi-br-comments"
                  style={{ marginRight: "6px" }}
                ></i>
                Energy Assistant
              </span>
              <span className="ai-close" onClick={() => setShowAI(false)}>
                ✕
              </span>
            </div>

            {/* 輸入框 */}
            <textarea
              placeholder={`例如：${year}年 ${selection?.name || ""} 的能源占比`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {/* 按鈕 */}
            <button onClick={handleAsk}>送出</button>

            {/* 回答 */}
            {answer && <div className="ai-answer">{answer}</div>}
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
