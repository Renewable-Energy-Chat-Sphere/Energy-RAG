import React from "react";
import { Bar } from "react-chartjs-2";
import { BarElement } from "chart.js";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend as ChartLegend,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ChartLegend,
  BarElement,
);
import GlobeVisualizer from "../components/GlobeVisualizer.jsx";
import "./global.css";
import BackToTopButton from "../components/BackToTopButton";
import hierarchy from "../data/hierarchy.json";
import supplyCatalog from "../data/supply_catalog.json";

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
  const [lodLevel, setLodLevel] = useState(0);
  const [showFlow, setShowFlow] = useState(true);

  const [year, setYear] = useState("113");
  const [showSupply, setShowSupply] = useState(false);
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
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
    Renewable: "#f41e1e",
    Waste: "#43A047",
    Coal: "#ff891b",
    Oil: "#782db9",
    Gas: "#0bced5",
    Electricity: "#ffcc00",
    Other: "#808080",
  };

  const DEPT_COLOR = {
    D2: "#3b82f6",
    D40: "#22c55e",
    D47: "#eab308",
    D50: "#f97316",
    D68: "#ef4444",
  };

  function getRootDept(code) {
    function findParent(target, tree, parentKey = null) {
      for (const key in tree) {
        if (key === target) return parentKey;

        if (tree[key].children) {
          const found = findParent(target, tree[key].children, key);
          if (found) return found;
        }
      }
      return null;
    }

    let current = code;

    while (current) {
      if (DEPT_COLOR[current]) return current;

      current = findParent(current, hierarchy);
    }

    return null;
  }

  function getEnergyData(year) {
    return energyMap[year] || {};
  }

  const energyData = getEnergyData(year);

  function getName(code) {
    if (!code) return "";

    // 取得供給資料
    if (code.startsWith("S")) {
      return supplyCatalog?.[code]?.name_zh || code;
    }

    // 取得需求資料
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
          const supply = supplyCatalog[supplyId];

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
        const name = getName(dCode);

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

  function getDepth(code, tree, depth = 0) {
    for (const key in tree) {
      if (key === code) return depth;

      if (tree[key].children) {
        const d = getDepth(code, tree[key].children, depth + 1);
        if (d !== null) return d;
      }
    }
    return null;
  }

  function getPieData() {
    const level = lodLevel;
    const list = getEnergyList();

    if (list.length === 0) return [];

    const isSupply = selected?.code?.startsWith("S");
    let filtered = [];

    if (!isSupply) {
      filtered = list;
    } else {
      if (level === 0) {
        const deptMap = {};

        list.forEach((item) => {
          const root = getRootDept(item.id);
          if (!root) return;

          if (!deptMap[root]) {
            deptMap[root] = {
              name: getName(root),
              value: 0,
              id: root,
            };
          }

          deptMap[root].value += item.value;
        });

        filtered = Object.values(deptMap);
      } else if (level === 1) {
        filtered = list.filter((item) => {
          const depth = getDepth(item.id, hierarchy);
          return depth === 1;
        });
      } else {
        filtered = list.filter((item) => {
          const depth = getDepth(item.id, hierarchy);
          return depth === 2;
        });
      }
    }

    const total = filtered.reduce((a, b) => a + b.value, 0);

    return filtered
      .map((d) => ({
        ...d,
        value: d.value / total,
      }))
      .sort((a, b) => b.value - a.value);
  }

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
    if (!selected) return;
    if (selected.code.startsWith("S")) return;
    setQuestion(`${year} ${selected.name} 能源比例`);

    setLoading(true); // ⭐ 開始動畫
    setPredictionData(null); // ⭐ 清空舊資料

    fetch("http://127.0.0.1:8000/predict_department_energy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: `${year}年 ${selected.name} 下一年能源用量`,
        year: year,
        mode: "dynamic",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTimeout(() => {
          // ⭐ 模擬動畫延遲（很重要）
          setPredictionData(data);
          setLoading(false);
        }, 500); // 0.5秒動畫感
      })
      .catch(() => {
        setPredictionData(null);
        setLoading(false);
      });

    const currentDept = energyData[selected.code];

    if (currentDept) {
      setCurrentData(currentDept);
    }
  }, [selected, year]);
  function getCompareChartData() {
    if (!predictionData || !currentData) return null;

    const deptPred = predictionData.prediction?.[selected.code];

    if (!deptPred) return null; // ⭐ 沒有就不要畫
    const allKeys = Array.from(
      new Set([...Object.keys(currentData), ...Object.keys(deptPred)]),
    );
    // ⭐ 加這段（今年轉 %）
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    return {
      labels: allKeys.map((code) => getName(code)),
      datasets: [
        {
          label: "本年 (所選年度)",
          data: allKeys.map((code) =>
            total ? ((currentData[code] || 0) / total) * 100 : 0,
          ),
          backgroundColor: "#3b82f6",
        },
        {
          label: "隔年（預測）",
          data: allKeys.map((code) => deptPred[code] || 0),
          backgroundColor: "#ef4444",
        },
      ],
    };
  }
  function getPredictionAccuracy() {
    if (!predictionData || !selected) return null;

    // ⭐ 找該部門預測
    const deptPred = predictionData.prediction?.[selected.code];
    if (!deptPred) return null;

    // ⭐ 找該部門「第一個能源」
    const firstEnergy = Object.keys(deptPred)[0];
    if (!firstEnergy) return null;

    // ⭐ 組 key（跟 Prediction.jsx 一樣）
    const fullKey = `${selected.code}_${firstEnergy}`;

    return predictionData.accuracy?.[fullKey] ?? null;
  }
  function getPredictionDiff() {
    if (!predictionData || !currentData || !selected) return [];

    const deptPred = predictionData.prediction?.[selected.code];
    if (!deptPred) return [];

    // ⭐ 今年轉 %
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    const currentPercent = {};
    Object.entries(currentData).forEach(([k, v]) => {
      currentPercent[k] = total ? (v / total) * 100 : 0;
    });

    const allKeys = Array.from(
      new Set([...Object.keys(currentPercent), ...Object.keys(deptPred)]),
    );

    return allKeys.map((code) => {
      const now = currentPercent[code] || 0;
      const future = deptPred[code] || 0;

      return {
        code,
        name: getName(code),
        diff: future - now,
      };
    });
  }

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
                <option key={y} value={y}>
                  {y}
                </option>
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
            <i
              className="fi fi-br-comments"
              style={{ marginRight: "10px" }}
            ></i>
            點我詢問能源
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
            onLODChange={(level) => setLodLevel(level)}
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
                    top: "30px",
                    right: "30px",
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
                  const supply = supplyCatalog?.[selected.code];

                  const data = node || supply;

                  if (!data?.img) return null;

                  return (
                    <div className="img-box">
                      <img
                        src={`${import.meta.env.BASE_URL}${data.img.replace(/^\/+/, "")}`}
                        alt=""
                        className="info-img"
                      />
                    </div>
                  );
                })()}

                <div className="info-content">
                  <h3>
                    {selected?.code?.startsWith("S")
                      ? "主要使用部門"
                      : "常用能源"}
                  </h3>
                  <p>
                    {getEnergyList()
                      .slice(0, 3)
                      .map((e, i) => (
                        <span key={i}>
                          {e.fullName}
                          {i < 2 ? "、" : ""}
                        </span>
                      ))}
                  </p>

                  <h3>本年度分析</h3>
                  <p className="chart-note">
                    {selected?.code?.startsWith("S")
                      ? "本圖為該能源被各部門使用比例（以此能源總使用量為基準）"
                      : "本圖為該部門內能源使用比例（以部門總能源為基準）"}
                    <br />
                    <span className="sub-note">
                      {selected?.code?.startsWith("S")
                        ? "*總和 = 100%，表示此能源在各部門的分配比例"
                        : "*總和 = 100%，與智慧查詢之全國占比不同"}
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
                            fill={
                              entry.name === "其他"
                                ? "#808080"
                                : selected?.code?.startsWith("S")
                                  ? DEPT_COLOR[getRootDept(entry.id)] ||
                                    "#7b614b"
                                  : CATEGORY_COLOR[entry.category] || "#3b82f6"
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />

                      <Legend
                        content={() => (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "center",
                              gap: "6px",
                              fontSize: 12,
                            }}
                          >
                            {getPieData()
                              .slice(0, 6)
                              .map((item, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      background:
                                        item.name === "其他"
                                          ? "#808080"
                                          : selected?.code?.startsWith("S")
                                            ? DEPT_COLOR[
                                                getRootDept(item.id)
                                              ] || "#3b82f6"
                                            : CATEGORY_COLOR[item.category] ||
                                              "#3b82f6",
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
                  {!selected?.code?.startsWith("S") && (
                    <>
                      <h2>預測分析</h2>

                      {loading && (
                        <div className="prediction-loading">
                          <div className="loading-bar"></div>
                          <p>AI 正在預測中...</p>
                        </div>
                      )}

                      {getCompareChartData() && (
                        <>
                          <h3 style={{ marginTop: "12px" }}> 本年 vs 隔年</h3>
                          <Bar data={getCompareChartData()} />
                        </>
                      )}

                      {predictionData && (
                        <div className="prediction-box">
                          <h4 style={{ marginTop: "10px" }}>變化分析</h4>

                          {getPredictionDiff()
                            .filter((item) => Math.abs(item.diff) > 1)
                            .map((item) => (
                              <div key={item.code} className="prediction-item">
                                <span>{item.name}</span>
                                <span
                                  style={{
                                    color:
                                      item.diff > 0 ? "#22c55e" : "#ef4444",
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.diff > 0 ? "↑" : "↓"}{" "}
                                  {Math.abs(item.diff).toFixed(1)}%
                                </span>
                              </div>
                            ))}

                          {/* 原本 prediction-card 保持不動 */}
                          {(() => {
                            const deptPred =
                              predictionData.prediction?.[selected.code];

                            if (!deptPred) {
                              return (
                                <p style={{ opacity: 0.6 }}>
                                  此部門暫無預測資料
                                </p>
                              );
                            }

                            return (
                              <div className="prediction-card">
                                <div className="accuracy-badge">
                                  {getPredictionAccuracy() !== null
                                    ? `${getPredictionAccuracy().toFixed(1)}%`
                                    : "?"}
                                </div>

                                <div className="prediction-title">
                                  {getName(selected.code)}
                                </div>

                                <div className="prediction-list">
                                  {Object.entries(deptPred).map(
                                    ([sCode, value]) => (
                                      <div
                                        key={sCode}
                                        className="prediction-item"
                                      >
                                        <span>{getName(sCode)}</span>
                                        <span className="value">
                                          {Number(value).toFixed(1)}%
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}
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
