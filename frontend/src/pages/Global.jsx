import React from "react";
import { Bar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
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
  Tooltip as ChartTooltip,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ChartLegend,
  BarElement,
  ChartTooltip,
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
const API = "http://127.0.0.1:8000";
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
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  const onHover = (data) => {
    setHovered(data);
  };

  const onSelect = (data) => {
    if (!data) return;

    if (selected?.code === data.code) {
      return;
    }

    setSelected(data);
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
    function search(tree, root = null) {
      for (const key in tree) {
        const node = tree[key];

        const currentRoot = root || key;

        if (key === code) {
          return currentRoot;
        }

        if (node.children) {
          const found = search(node.children, currentRoot);
          if (found) return found;
        }
      }

      return null;
    }

    return search(hierarchy);
  }

  function getEnergyData(year) {
    return energyMap[year] || {};
  }

  const energyData = getEnergyData(year);
  const { i18n } = useTranslation();
  const language = i18n.language;

  const TEXT = {
    zh: {
      panel: "能源控制面板",
      year: "年份",
      flow: "顯示連線",
      search: "搜尋部門...",
      ai: "點我詢問能源",
      send: "送出",
      mainDemand: "主要需求項目",
      mainSupply: "主要供給能源",
      analysis: "本年度分析",
      hoverDemand: "相關需求項目",
      hoverSupply: "相關能源供給",
      empty: "點擊模型節點查看資訊",
      askPlaceholder: `例如：${formatYear(year, language)} ${getName(selected?.code) || ""} 的能源佔比`,
      aiPrediction: "能源結構預測（AI 模型）",
      aiLoading: "AI 正在預測中...",
      changeAnalysis: "變化分析",
      noPrediction: "此部門暫無預測資料",
      accuracy: "預測準確度",
      trendAnalysis: "AI 預測趨勢分析（歷年實際值 vs 預測值）",
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
      send: "Send",
      hoverDemand: "Related Demand Sectors",
      hoverSupply: "Related Energy Sources",
      empty: "Click nodes to view information",
      askPlaceholder: `Example: ${formatYear(year, language)} energy ratio of ${getName(selected?.code) || ""}`,
      aiPrediction: "AI Energy Structure Prediction",
      aiLoading: "AI is predicting...",
      changeAnalysis: "Change Analysis",
      noPrediction: "No prediction data available for this sector.",
      accuracy: "Prediction Accuracy",
      trendAnalysis:
        "AI Prediction Trend Analysis (Historical Actual vs Predicted)",
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
  function formatYear(year, lang) {
    const y = Number(year);

    if (lang === "en") {
      return y + 1911;
    }

    return y; // 中文維持民國
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
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          year: year,
          from_global: true,
          mode: "dynamic",
        }),
      });

      const data = await res.json();

      if (!data?.answer) {
        setAnswer(
          language === "en" ? "❌ Invalid backend response" : "❌ 後端回傳錯誤",
        );

        console.error("Backend Error:", data);

        return;
      }

      typeWriter(data.answer);
    } catch {
      setAnswer(language === "en" ? "❌ Error occurred" : "❌ 發生錯誤");
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
  }, [selected?.code, year]);
  useEffect(() => {
    if (!selected) return;
    if (selected.code.startsWith("S")) return;

    const timer = setTimeout(() => {
      setLoading(true);
      setPredictionData(null);

      fetch(`${API}/predict_department_energy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: `${formatYear(year, language)} ${getName(selected.code)} 下一年能源用量`,

          year: year,

          // ⭐ 告訴 backend
          // 這是球頁 AI 回驗
          from_global: true,

          // ⭐ 動態訓練
          // 用80~108預測109
          mode: "dynamic",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setPredictionData(data);
          setLoading(false);
        })
        .catch(() => {
          setPredictionData(null);
          setLoading(false);
        });
    }, 400);

    const currentDept = energyData[selected.code];

    if (currentDept) {
      setCurrentData(currentDept);
    }

    return () => clearTimeout(timer);
  }, [selected?.code, year]);
  function getCompareChartData() {
    if (!predictionData || !currentData || !selected) return null;

    const deptCode = selected.code;
    const deptPred = predictionData.prediction?.[deptCode];

    if (!deptPred) return null;

    // 找下一年
    const sortedYears = Object.keys(energyMap).sort((a, b) => a - b);
    const currentIndex = sortedYears.indexOf(year);
    const nextYear = sortedYears[currentIndex + 1];

    const nextYearData = energyMap[nextYear]?.[deptCode];

    // 本年 %
    const total = Object.values(currentData).reduce((a, b) => a + b, 0);

    const currentPercent = {};
    Object.entries(currentData).forEach(([k, v]) => {
      currentPercent[k] = total ? (v / total) * 100 : 0;
    });

    // 下一年實際 %
    let nextPercent = null;

    if (nextYearData) {
      const totalNext = Object.values(nextYearData).reduce((a, b) => a + b, 0);

      nextPercent = {};
      Object.entries(nextYearData).forEach(([k, v]) => {
        nextPercent[k] = totalNext ? (v / totalNext) * 100 : 0;
      });
    }

    // 合併 key
    const allKeys = Array.from(
      new Set([
        ...Object.keys(currentPercent),
        ...Object.keys(deptPred),
        ...(nextPercent ? Object.keys(nextPercent) : []),
      ]),
    );

    const datasets = [
      {
        label:
          language === "en"
            ? `${formatYear(year, language)} (Actual)`
            : `${formatYear(year, language)}年（實際）`,
        data: allKeys.map((k) => currentPercent[k] || 0),
        backgroundColor: "#3b82f6",
      },
      {
        label:
          language === "en"
            ? `${formatYear(Number(year) + 1, language)} (Predicted)`
            : `${formatYear(Number(year) + 1, language)}年（預測）`,
        data: allKeys.map((k) => deptPred[k] || 0),
        backgroundColor: "#ef4444",
      },
    ];

    // 關鍵：綠色
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

    // 抓前 3 個主要能源
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
      labels: yearList, // X軸年份
      datasets,
    };
  }
  function getAIPredictionLineData() {
    if (!predictionData || !selected) return null;

    const dept = selected.code;

    const deptPred = predictionData.prediction?.[dept];
    if (!deptPred) return null;

    // 抓第一個能源（跟另一頁一樣）
    const firstEnergy = Object.keys(deptPred)[0];
    if (!firstEnergy) return null;

    const e = predictionData.evaluation?.[dept]?.[firstEnergy];
    if (!e) return null;

    return {
      labels: e.years,
      datasets: [
        {
          label: "實際值",
          pointRadius: 4,
          pointHoverRadius: 6,
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

    // 轉成準確度
    const accuracy = 100 - error / 2;

    return Math.max(0, accuracy);
  }
  function getPredictionDiff() {
    if (!predictionData || !currentData || !selected) return [];

    const deptPred = predictionData.prediction?.[selected.code];
    if (!deptPred) return [];

    // 今年轉 %
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
            <i className="fi fi-br-settings"></i>
            {t.panel}
          </span>

          <div className="label-group">
            <label>{t.year}</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {formatYear(y, language)}
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
                    .filter((e) => e.fullName)
                    .map((e, i, arr) => (
                      <span key={i}>
                        {e.fullName}
                        {i !== arr.length - 1
                          ? language === "en"
                            ? ", "
                            : "、"
                          : ""}
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
                      : t.mainSupply}
                  </h3>
                  <p>
                    {getEnergyList()
                      .slice(0, 3)
                      .filter((e) => e.fullName)
                      .map((e, i, arr) => (
                        <span key={i}>
                          {e.fullName}
                          {i !== arr.length - 1
                            ? language === "en"
                              ? ", "
                              : "、"
                            : ""}
                        </span>
                      ))}
                  </p>

                  <h3>{t.analysis}</h3>
                  <p className="chart-note">
                    {selected?.code?.startsWith("S")
                      ? language === "en"
                        ? "This chart shows the proportion of demand sectors using this energy source (based on total consumption of this energy)."
                        : "本圖呈現所有需求項目在此能源中的使用比例（以此能源總消耗量為基準）"
                      : language === "en"
                        ? "This chart shows the proportion of energy sources used in this sector (based on total consumption of this sector)."
                        : "本圖呈現所有供給能源在此項目中的使用比例（以此項目總消耗量為基準）"}

                    <br />
                    <span className="sub-note">
                      {selected?.code?.startsWith("S")
                        ? language === "en"
                          ? "※ Total is 100%, representing how this energy is distributed across sectors."
                          : "※ 總和 = 100%，表示此能源在各部門的分配比例"
                        : language === "en"
                          ? "※ Total is 100%, different from nationwide proportions in AI search."
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
                          innerRadius={60}
                          outerRadius={140}
                          paddingAngle={4}
                          cornerRadius={8}
                          stroke="none"
                          labelLine={false}
                        >
                          {getPieData().map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                selected?.code?.startsWith("S")
                                  ? DEPT_COLOR[getRootDept(entry.id)] ||
                                    "#808080"
                                  : CATEGORY_COLOR[entry.category] || "#808080"
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
                                gap: "5px",
                                fontSize: 12,
                                margin: "20px 0",
                              }}
                            >
                              {getPieData()
                                .slice(0, 5)
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
                                        background: selected?.code?.startsWith(
                                          "S",
                                        )
                                          ? DEPT_COLOR[getRootDept(item.id)] ||
                                            "#808080"
                                          : CATEGORY_COLOR[item.category] ||
                                            "#808080",
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
                      {user?.role === "admin" || user?.role === "manager" ? (
                        <>
                          <h2>{t.aiPrediction}</h2>

                          {loading && (
                            <div className="prediction-loading">
                              <div className="loading-bar"></div>
                              <p>{t.aiLoading}</p>
                            </div>
                          )}

                          {getCompareChartData() && (
                            <>
                              <h3>
                                {formatYear(year, language)}{" "}
                                {language === "en" ? "" : "年"} vs{" "}
                                {formatYear(Number(year) + 1, language)}{" "}
                                {language === "en" ? "" : "年"}
                              </h3>{" "}
                              <Bar
                                data={getCompareChartData()}
                                options={{
                                  responsive: true,

                                  interaction: {
                                    mode: "index",
                                    intersect: false,
                                  },
                                  hover: {
                                    mode: "index",
                                    intersect: false,
                                  },
                                  plugins: {
                                    tooltip: {
                                      enabled: true,
                                      mode: "index",
                                      intersect: false,
                                      callbacks: {
                                        label: function (context) {
                                          const yearNow = year;
                                          const yearNext = Number(year) + 1;
                                          const y1 = formatYear(
                                            yearNow,
                                            language,
                                          );
                                          const y2 = formatYear(
                                            yearNext,
                                            language,
                                          );

                                          let label = "";

                                          if (context.datasetIndex === 0) {
                                            label =
                                              language === "en"
                                                ? `${y1} (Actual)`
                                                : `${y1}年（實際）`;
                                          } else if (
                                            context.datasetIndex === 1
                                          ) {
                                            label =
                                              language === "en"
                                                ? `${y2} (Predicted)`
                                                : `${y2}年（預測）`;
                                          } else if (
                                            context.datasetIndex === 2
                                          ) {
                                            label =
                                              language === "en"
                                                ? `${y2} (Actual)`
                                                : `${y2}年（實際）`;
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
                              <h4 style={{ marginTop: "10px" }}>
                                {t.changeAnalysis}
                              </h4>

                              {getPredictionDiff()
                                .filter((item) => Math.abs(item.diff) > 1)
                                .map((item) => (
                                  <div
                                    key={item.code}
                                    className="prediction-item"
                                  >
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

                              {(() => {
                                const deptPred =
                                  predictionData.prediction?.[selected.code];

                                if (!deptPred) {
                                  return (
                                    <p style={{ opacity: 0.6 }}>
                                      {t.noPrediction}
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

                                      <div className="tooltip">
                                        {t.accuracy}
                                      </div>
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
                      ) : (
                        <div className="permission-lock">
                          🔒 AI 預測分析僅限有登入的使用者查看
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

                    return list.map((d, i, arr) => (
                      <span key={i}>
                        {d.name}
                        {i !== arr.length - 1
                          ? language === "en"
                            ? ", "
                            : "、"
                          : ""}
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

                    return list.map((d, i, arr) => (
                      <span key={i}>
                        {d.name}
                        {i !== arr.length - 1
                          ? language === "en"
                            ? ", "
                            : "、"
                          : ""}
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
              <span className="ai-title">
                {language === "en" ? "Energy Assistant" : "能源助理"}
              </span>
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

            <button onClick={handleAsk}>{t.send}</button>

            {answer && <div className="ai-answer">{answer}</div>}
          </div>
        </div>
      )}
      {showAccuracyChart && (
        <div className="accuracy-overlay">
          <div className="accuracy-modal">
            <div className="accuracy-header">
              <span>{t.trendAnalysis}</span>
              <span
                className="close-btn"
                onClick={() => setShowAccuracyChart(false)}
              >
                ✕
              </span>
            </div>

            {getAIPredictionLineData() && (
              <Line
                data={getAIPredictionLineData()}
                options={{
                  responsive: true,

                  interaction: {
                    mode: "index",
                    intersect: false,
                  },

                  plugins: {
                    tooltip: {
                      enabled: true,
                      mode: "index",
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
