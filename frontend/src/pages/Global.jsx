import React from "react";
import { Bar } from "react-chartjs-2";
import { BarElement } from "chart.js";
import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend as ChartLegend,
  Tooltip as ChartTooltip, // ⭐ 改名字！
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ChartLegend,
  BarElement,
  ChartTooltip, // ⭐ 用新名字
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
  const [showAccuracyChart, setShowAccuracyChart] = useState(false);
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
  const [language, setLanguage] = useState("zh");

  const TEXT = {
    zh: {
      panel: "能源控制面板",
      year: "年份",
      flow: "顯示連線",
      search: "搜尋部門...",
      ai: "點我詢問能源",

      mainDemand: "主要需求項目",
      mainSupply: "主要供給能源",

      analysis: "本年度分析",

      hoverDemand: "相關需求項目",
      hoverSupply: "相關能源供給",

      empty: "點擊模型節點查看資訊",

      askPlaceholder: `例如：${year}年 ${getName(selected?.code) || ""} 的能源佔比`,
    },

    en: {
      panel: "Energy Control Panel",
      year: "Year",
      flow: "Show Flow",
      search: "Search...",
      ai: "Ask Energy AI",

      mainDemand: "Main Demand Sectors",
      mainSupply: "Main Energy Sources",

      analysis: "Annual Analysis",

      hoverDemand: "Related Demand Sectors",
      hoverSupply: "Related Energy Sources",

      empty: "Click nodes to view information",

      askPlaceholder: `Example: ${year} energy ratio of ${getName(selected?.code) || ""}`,
    },
  };

  const t = TEXT[language];

  function getName(code) {
    if (!code) return "";

    // 供給資料
    if (code.startsWith("S")) {
      const supply = supplyCatalog?.[code];

      return language === "en"
        ? supply?.name_en || supply?.name_zh || code
        : supply?.name_zh || supply?.name_en || code;
    }

    // 需求資料
    function search(nodeMap) {
      for (const key in nodeMap) {
        const node = nodeMap[key];

        if (key === code) {
          return language === "en"
            ? node.name_en || node.name_zh || code
            : node.name_zh || node.name_en || code;
        }

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

          const name = getName(supplyId);

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
    setQuestion(`${year} ${getName(selected.code)} 能源比例`);

    setLoading(true); // ⭐ 開始動畫
    setPredictionData(null); // ⭐ 清空舊資料

    fetch("http://127.0.0.1:8000/predict_department_energy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: `${year}年 ${getName(selected.code)} 下一年能源用量`,
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
    if (!predictionData || !currentData || !selected) return null;

    const deptCode = selected.code;
    const deptPred = predictionData.prediction?.[deptCode];

    if (!deptPred) return null;

    // ⭐ 找下一年
    const sortedYears = Object.keys(energyMap).sort((a, b) => a - b);
    const currentIndex = sortedYears.indexOf(year);
    const nextYear = sortedYears[currentIndex + 1];

    const nextYearData = energyMap[nextYear]?.[deptCode];

    // ⭐ 本年 %
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    const currentPercent = {};
    Object.entries(currentData).forEach(([k, v]) => {
      currentPercent[k] = total ? (v / total) * 100 : 0;
    });

    // ⭐ 下一年實際 %
    let nextPercent = null;

    if (nextYearData) {
      const totalNext = Object.values(nextYearData).reduce((a, b) => a + b, 0);

      nextPercent = {};
      Object.entries(nextYearData).forEach(([k, v]) => {
        nextPercent[k] = totalNext ? (v / totalNext) * 100 : 0;
      });
    }

    // ⭐ 合併 key
    const allKeys = Array.from(
      new Set([
        ...Object.keys(currentPercent),
        ...Object.keys(deptPred),
        ...(nextPercent ? Object.keys(nextPercent) : []),
      ]),
    );

    const datasets = [
      {
        label: `${year}年（實際）`,
        data: allKeys.map((k) => currentPercent[k] || 0),
        backgroundColor: "#3b82f6",
      },
      {
        label: `${Number(year) + 1}年（預測）`,
        data: allKeys.map((k) => deptPred[k] || 0),
        backgroundColor: "#ef4444",
      },
    ];

    // ⭐ 👉 關鍵：綠色
    if (nextPercent) {
      datasets.push({
        label: `${Number(year) + 1}年（實際）`,
        data: allKeys.map((k) => nextPercent[k] || 0),
        backgroundColor: "#22c55e",
      });
    }

    return {
      labels: allKeys.map((code) => getName(code)),
      datasets,
    };
  }
  function getPredictionLineData() {
    if (!selected) return null;

    const yearList = Object.keys(energyMap).sort();

    const datasets = [];

    // ⭐ 抓前 3 個主要能源（避免線太多）
    const topEnergies = getEnergyList()
      .slice(0, 3)
      .map((e) => e.id);

    topEnergies.forEach((energyCode, index) => {
      const data = yearList.map((y) => {
        const dept = energyMap[y]?.[selected.code];
        if (!dept) return 0;

        const total = Object.values(dept).reduce((a, b) => a + b, 0);
        return total ? ((dept[energyCode] || 0) / total) * 100 : 0;
      });

      datasets.push({
        label: getName(energyCode),
        data,
        borderColor: ["#3b82f6", "#ef4444", "#22c55e"][index],
        fill: false,
      });
    });

    return {
      labels: yearList, // ⭐ X軸變年份
      datasets,
    };
  }
  function getAIPredictionLineData() {
    if (!predictionData || !selected) return null;

    const dept = selected.code;

    const deptPred = predictionData.prediction?.[dept];
    if (!deptPred) return null;

    // ⭐ 抓第一個能源（跟另一頁一樣）
    const firstEnergy = Object.keys(deptPred)[0];
    if (!firstEnergy) return null;

    const e = predictionData.evaluation?.[dept]?.[firstEnergy];
    if (!e) return null;

    return {
      labels: e.years,
      datasets: [
        {
          label: "實際值",
          pointRadius: 4, // ⭐ 讓點變大
          pointHoverRadius: 6, // ⭐ hover更好抓
          data: e.actual,
          borderColor: "#3b82f6",
          tension: 0.3,
        },
        {
          label: "預測值",
          pointRadius: 4,
          pointHoverRadius: 6,
          data: e.predicted,
          borderColor: "#ef4444",
          tension: 0.3,
        },
      ],
    };
  }
  function getPredictionAccuracy() {
    if (!predictionData || !currentData || !selected) return null;

    const deptPred = predictionData.prediction?.[selected.code];
    if (!deptPred) return null;

    // ⭐ 把今年轉成 %
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    const currentPercent = {};
    Object.entries(currentData).forEach(([k, v]) => {
      currentPercent[k] = total ? (v / total) * 100 : 0;
    });

    const allKeys = Array.from(
      new Set([...Object.keys(currentPercent), ...Object.keys(deptPred)]),
    );

    let error = 0;

    allKeys.forEach((k) => {
      const now = currentPercent[k] || 0;
      const pred = deptPred[k] || 0;

      error += Math.abs(now - pred);
    });

    // ⭐ 轉成準確度
    const accuracy = 100 - error / 2;

    return Math.max(0, accuracy);
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
            <i className="fi fi-br-settings"></i>{t.panel}
          </span>

          <div className="label-group">
            <label>{t.year}</label>
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
            {t.flow}
          </label>

          <div className="search-box">
            <i className="fi fi-br-search search-icon"></i>
            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ai-box" onClick={() => setShowAI(true)}>
            <i
              className="fi fi-br-comments"
              style={{ marginRight: "10px" }}
            ></i>
            {t.ai}
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
            language={language}
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
                <h3>{t.empty}</h3>
              </div>
            )}

            {selected && (
              <div className="info-card">
                <h2>{getName(selected.code)}</h2>

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
                <h3>{t.empty}</h3>
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
                <h2>{getName(selected.code)}</h2>

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
                      ? t.mainDemand
                      : t.mainSupply
                    }
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

                  <h3>{t.analysis}</h3>
                  <p className="chart-note">
                    {selected?.code?.startsWith("S")
                      ? "本圖呈現所有需求項目在此能源中的使用比例（以此能源總消耗量為基準）"
                      : "本圖呈現所有供給能源在此項目中的使用比例（以此項目總消耗量為基準）"}
                    <br />
                    <span className="sub-note">
                      {selected?.code?.startsWith("S")
                        ? "※ 總和 = 100%，表示此能源在各部門的分配比例"
                        : "※ 總和 = 100%，與智慧查詢之全國佔比不同"}
                    </span>
                  </p>

                  <div className="pie-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart width={300} height={300}>
                        <Pie
                          data={getPieData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={130}
                          paddingAngle={4}
                          cornerRadius={8}
                          stroke="none"
                          labelLine={false}
                        >
                          {getPieData().map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.category === "Other"
                                  ? "#808080"
                                  : selected?.code?.startsWith("S")
                                    ? DEPT_COLOR[getRootDept(entry.id)] ||
                                      "#7b614b"
                                    : CATEGORY_COLOR[entry.category] ||
                                      "#3b82f6"
                              }
                            />
                          ))}
                        </Pie>

                        <Tooltip
                          formatter={(v) => `${(v * 100).toFixed(1)}%`}
                        />

                        <Legend
                          content={() => (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "6px",
                                fontSize: 12,
                                marginTop: 20,
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
                                          item.category === "Other"
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
                    </ResponsiveContainer>
                  </div>
                  {!selected?.code?.startsWith("S") && (
                    <>
                      <h2>能源結構預測（AI模型）</h2>

                      {loading && (
                        <div className="prediction-loading">
                          <div className="loading-bar"></div>
                          <p>AI 正在預測中...</p>
                        </div>
                      )}

                      {getCompareChartData() && (
                        <>
                          <h3 style={{ marginTop: "12px" }}>
                            {year}年 vs {Number(year) + 1}年
                          </h3>{" "}
                          <Bar
                            data={getCompareChartData()}
                            options={{
                              responsive: true,

                              interaction: {
                                mode: "index", // ⭐ 很重要！
                                intersect: false, // ⭐ 很重要！
                              },
                              hover: {
                                mode: "index",
                                intersect: false,
                              },
                              plugins: {
                                tooltip: {
                                  enabled: true,
                                  mode: "index", // ⭐ 加這行（關鍵）
                                  intersect: false, // ⭐ 建議一起加
                                  callbacks: {
                                    label: function (context) {
                                      const yearNow = year;
                                      const yearNext = Number(year) + 1;

                                      let label = "";

                                      if (context.datasetIndex === 0) {
                                        label = `${yearNow}年（實際）`;
                                      } else if (context.datasetIndex === 1) {
                                        label = `${yearNext}年（預測）`;
                                      } else if (context.datasetIndex === 2) {
                                        label = `${yearNext}年（實際）`; // ⭐ 綠色補上
                                      }

                                      return `${label}: ${context.raw.toFixed(1)}%`;
                                    },
                                  },
                                },
                              },

                              scales: {
                                y: {
                                  ticks: {
                                    callback: (v) => v + "%",
                                  },
                                },
                              },
                            }}
                          />
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
                                <div
                                  className="accuracy-badge"
                                  onClick={() => setShowAccuracyChart(true)}
                                >
                                  {getPredictionAccuracy() !== null
                                    ? `${getPredictionAccuracy().toFixed(1)}%`
                                    : "?"}

                                  {/* ⭐ 這個才是你要的 tooltip */}
                                  <div className="tooltip">預測準確度</div>
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
              <div className="hover-header">{getName(hovered.code)}</div>

              {hovered?.code?.startsWith("S") ? (
                <div className="hover-content">
                  {t.hoverDemand}：
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
                  {t.hoverSupply}：
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
              placeholder={t.askPlaceholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button onClick={handleAsk}>送出</button>

            {answer && <div className="ai-answer">{answer}</div>}
          </div>
        </div>
      )}
      {showAccuracyChart && (
        <div className="accuracy-overlay">
          <div className="accuracy-modal">
            <div className="accuracy-header">
              <span>AI預測趨勢分析（歷年實際值 vs 預測值）</span>
              <span
                className="close-btn"
                onClick={() => setShowAccuracyChart(false)}
              >
                ✕
              </span>
            </div>

            {getPredictionLineData() && (
              <Line
                data={getAIPredictionLineData()}
                options={{
                  responsive: true,

                  interaction: {
                    mode: "index", // ⭐ 加這個
                    intersect: false, // ⭐ 加這個
                  },

                  plugins: {
                    tooltip: {
                      enabled: true,
                      mode: "index", // ⭐ 一樣加
                      intersect: false,
                      callbacks: {
                        label: (ctx) =>
                          ctx.dataset.label + ": " + ctx.raw.toFixed(2),
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
