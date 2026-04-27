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

export default function Global({ isMobile }) {
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
    Renewable: "#F4511E",
    Waste: "#43A047",
    Coal: "#1E88E5",
    Oil: "#D81B60",
    Gas: "#FDD835",
    Electricity: "#00E5FF",
    Other: "#3949AB",
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
          const supply = supplyCatalog.find((s) => s.source_id === supplyId);

          const name = supply?.name_zh || supplyId;

          return {
            id: supplyId,
            name,
            fullName: name,
            value,
            category: supply?.category || "Other",
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
          category: "Other",
        });
      }
    });

    return result.sort((a, b) => b.value - a.value);
  }

  function getPieData() {
    const list = getEnergyList();

    if (list.length === 0) return [];

    const total = list.reduce((a, b) => a + b.value, 0);
    const sorted = [...list].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const topWithPercent = top.map((d) => ({
      ...d,
      value: d.value / total,
    }));

    const topTotal = top.reduce((a, b) => a + b.value, 0);
    const others = total - topTotal;
    const result = [...topWithPercent].sort((a, b) => b.value - a.value);

    if (others > 0.0001) {
      result.push({
        name: "其他",
        fullName: "其他",
        value: others / total,
        category: "Other",
      });
    }

    return result.sort((a, b) => {
      if (a.name === "其他") return 1;
      if (b.name === "其他") return -1;

      return b.value - a.value;
    });
  }

  /* ===================== */
  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/chat", {
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
        <div className="panel-row">
          <span className="title-content">
            <i className="fi fi-br-settings"></i>能源控制面板
          </span>

          <div className="label-group">
            <label>年份</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <label>
            <input
              type="checkbox"
              checked={showFlow}
              onChange={(e) => setShowFlow(e.target.checked)}
            />
            顯示連線
          </label>

          <div className="search-box">
            <i className="fi fi-br-search search-icon"></i>
            <input
              type="text"
              placeholder="搜尋部門..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ai-box" onClick={() => setShowAI(true)}>
            <i className="fi fi-br-comments" style={{ marginRight: "10px" }}></i>點我詢問能源
          </div>
        </div>
      </div>

      <div className={isMobile ? "mobile-layout" : "global-layout"}>
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

        {isMobile && (
          <div className="mobile-bottom-panel">
            {!selected && (
              <div className="info-empty">
                <h3>點擊球體查看資訊</h3>
              </div>
            )}

            {selected && (
              <div className="info-card">
                <h2>{selected.name}</h2>

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
              </div>
            )}
          </div>
        )}
        
        {!isMobile && (
          <div className="info-panel">
            {!selected && (
              <div className="info-empty">
                <h3>點擊模型節點查看資訊</h3>
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
                    <div className="img-box">
                      <img
                        src={`${import.meta.env.BASE_URL}${node.img.replace("/", "")}`}
                        alt=""
                        className="info-img"
                      />
                    </div>
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
                  <p className="chart-note">
                    本圖為該部門內能源使用比例（以部門總能源為基準）
                    <br />
                    <span className="sub-note">
                      *總和 = 100%，與智慧查詢之全國占比不同
                    </span>
                  </p>
                  

                  <div className="pie-container">
                    <PieChart width={300} height={300}>
                      <Pie
                        data={getPieData()}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={100}
                        paddingAngle={4}
                        cornerRadius={6}
                        stroke="none"
                        labelLine={false}
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
                        content={() => (
                          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px", fontSize: 12 }}>
                            {getPieData().slice(0, 6).map((item, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    background: CATEGORY_COLOR[item.category] || "#ccc",
                                    marginRight: 4,
                                  }}
                                />
                                {item.name}
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                    {(() => {
                      const list = getEnergyList(hovered).slice(0, 3);

                      return list.map((d, i) => (
                        <span key={i}>
                          {d.name}
                          {i !== list.length - 1 ? "、" : ""}
                        </span>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="hover-content">
                    相關能源供給：
                    <br />
                    {(() => {
                      const list = getEnergyList(hovered).slice(0, 3);

                      return list.map((d, i) => (
                        <span key={i}>
                          {d.name}
                          {i !== list.length - 1 ? "、" : ""}
                        </span>
                      ));
                    })()}
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
