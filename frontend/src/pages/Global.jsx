import React from "react";
import { useState, useEffect } from "react";
import GlobeVisualizer from "../components/GlobeVisualizer.jsx";
import "./global.css";
import BackToTopButton from "../components/BackToTopButton";
import hierarchy from "../data/hierarchy.json";

import supplyCatalog from "../data/supply_catalog.json";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const energyFiles = import.meta.glob("../data/*_energy_demand_supply.json", {
  eager: true,
});

const energyMap = {};

Object.entries(energyFiles).forEach(([path, module]) => {
  const match = path.match(/(\d+)_energy_demand_supply\.json/);
  if (match) {
    energyMap[match[1]] = module.default;
  }
});

const years = Object.keys(energyMap).sort((a, b) => b - a);

export default function Global() {
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
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showFlow, setShowFlow] = useState(true);

  const [year, setYear] = useState("113");
  const [showSupply, setShowSupply] = useState(false);
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const onHover = (data) => {
    setHovered(data);
  };

  const onSelect = (data) => {
    if (selected?.code === data.code) {
      setSelected(null);
    } else {
      setSelected(data);
    }
  };

  const handleMouseDown = () => setDragging(true);

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition((prev) => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  };

  const handleMouseUp = () => setDragging(false);

  const CATEGORY_COLOR = {
    Coal: "#424242",
    Oil: "#ff9800",
    Gas: "#03a9f4",
    Renewable: "#4caf50",
    Other: "#9e9e9e",
  };

  function getEnergyData(year) {
    return energyMap[year] || {};
  }
  const energyData = getEnergyData(year);

  function getDemandName(code) {
    function search(nodeMap) {
      for (const key in nodeMap) {
        const node = nodeMap[key];

        if (key === code) return node.name;

        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    }

    return search(hierarchy) || code;
  }

  function getEnergyList(node = selected) {
    if (!node) return [];

    // 需求對供給關聯
    if (!node.code.startsWith("S")) {
      const demandData = energyData[node.code];
      if (!demandData) return [];

      return Object.entries(demandData)
        .map(([supplyId, value]) => {
          const supply = supplyCatalog.find(
            (s) => s.source_id === supplyId
          );

          const name = supply?.name_zh || supplyId;

          return {
            id: supplyId,
            name,
            fullName: name,
            value,
          };
        })
        .sort((a, b) => b.value - a.value);
    }

    // 供給對需求關聯
    const result = [];

    Object.entries(energyData).forEach(([dCode, supplies]) => {
      if (supplies[node.code]) {
        const name = getDemandName(dCode);

        result.push({
          id: dCode,
          name,
          fullName: name,
          value: supplies[node.code],
        });
      }
    });

    return result.sort((a, b) => b.value - a.value);
  }

  function getPieData() {
    const list = getEnergyList();

    if (list.length === 0) return [];

    const total = list.reduce((a, b) => a + b.value, 0);

    const top = list.slice(0, 6);

    const topWithPercent = top.map((d) => ({
      ...d,
      value: d.value / total,
    }));

    const topTotal = top.reduce((a, b) => a + b.value, 0);
    const others = total - topTotal;

    if (others > 0.0001) {
      topWithPercent.push({
        name: "其他",
        fullName: "其他",
        value: others / total,
        category: "Other",
      });
    }

    return topWithPercent.sort((a, b) => {
      if (a.name === "其他") return 1;
      if (b.name === "其他") return -1;
      return 0;
    });
  }

  /* ===================== */
  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: question,
          session_id: "energy_sphere",
          rag_auto: true,
        }),
      });

      const data = await res.json();
      typeWriter(data.answer || "沒有回應");
    } catch {
      setAnswer("❌ 發生錯誤");
    } finally {
      setLoading(false);
      setQuestion("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function typeWriter(text) {
    let i = 0;
    const interval = setInterval(() => {
      setAnswer(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20);
  }

  useEffect(() => {
    if (selected) {
      setQuestion(`${year} ${selected.name} 能源比例`);
    }
  }, [selected]);

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
      <div className="control-panel">
        <div className="panel-title">
          <i className="fi fi-br-settings"></i>
          能源控制面板
        </div>

        <div className="panel-row">
          <label>年份</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-row">
          <label style={{ marginLeft: "10px", marginRight: "10px" }}>
            <input
              type="checkbox"
              checked={showFlow}
              onChange={(e) => setShowFlow(e.target.checked)}
              style={{ marginRight: "5px" }}
            />
            顯示供給線
          </label>
        </div>

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
            <i className="fi fi-br-comments" style={{ marginRight: "5px" }}></i>
            點我詢問能源
          </div>
        </div>
      </div>

      <div className="global-layout">
        <div
          className="globe-area"
          onMouseMove={(e) => {
            setMousePos({
              x: e.clientX,
              y: e.clientY,
            });
          }}
        >
          <GlobeVisualizer
            year={year}
            onHover={onHover}
            onSelect={onSelect}
            selected={selected}
            showFlow={showFlow}
            hovered={hovered}
          />
        </div>

        <div className="info-panel">
          {!selected && (
            <div className="info-empty">
              <h3>請點擊模型節點查看資訊</h3>
            </div>
          )}

          {selected && (
            <div className="info-card">
              {/* 關閉按鈕 */}
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "15px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
                onClick={() => setSelected(null)}
              >
                ✕
              </div>
              <h2>{selected.name}</h2>

              {(() => {
                const node = findNodeByCode(selected.code, hierarchy);
                return node?.img ? (
                  <img
                    src={`${import.meta.env.BASE_URL}${node.img.replace("/", "")}`}
                    alt=""
                    className="info-img"
                  />
                ) : null;
              })()}

              <div className="info-content">
                <h3>常用能源</h3>
                <p>
                  {(selected?.code?.startsWith("S") ? [] : getEnergyList())
                    .slice(0, 3)
                    .map((e, i) => (
                      <span key={i}>
                        {e.fullName}
                        {i < 2 ? "、" : ""}
                      </span>
                    ))}
                </p>

                <h3>年度分析</h3>

                <div style={{ width: "100%", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <PieChart width={320} height={300}>
                      <Pie
                        data={getPieData()}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label={false}
                      >
                        {getPieData().map((entry, index) => (
                          <Cell
                            key={index}
                            fill={CATEGORY_COLOR[entry.category] || "#ccc"}
                          />
                        ))}
                      </Pie>

                      <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />

                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {hovered && (
          <div
            className="hover-overlay"
            style={{
              left: mousePos.x + 15,
              top: mousePos.y + 15,
            }}
          >
            <div className="hover-card">
              <div className="hover-header">{hovered.name}</div>

              {hovered?.code?.startsWith("S") ? (
                <div className="hover-content">
                  相關需求項目：
                  <br />
                  {getEnergyList(hovered)
                    .slice(0, 3)
                    .map((d, i) => (
                      <span key={i}>
                        {d.name}
                        {i < 2 ? "、" : ""}
                      </span>
                    ))}
                </div>
              ) : (

                <div className="hover-content">
                  相關能源供給：
                  <br />
                  {getEnergyList(hovered)
                    .slice(0, 3)
                    .map((s, i) => (
                      <span key={i}>
                        {s.fullName}
                        {i < 2 ? "、" : ""}
                      </span>
                    ))}
                </div>
              )}
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
            <div className="ai-header" onMouseDown={handleMouseDown}>
              <span className="ai-title">Energy Assistant</span>
              <span className="ai-close" onClick={() => setShowAI(false)}>
                ✕
              </span>
            </div>

            <textarea
              placeholder={`例如：${year}年 ${selected?.name || ""} 的能源占比`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button onClick={handleAsk}>送出</button>

            {answer && <div className="ai-answer">{answer}</div>}
          </div>
        </div>
      )}

      <BackToTopButton />
    </div>
  );
}
