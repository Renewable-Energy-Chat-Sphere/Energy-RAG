import React, { useEffect, useState } from "react";
import BackToTopButton from "../components/BackToTopButton";
import "./electricity-analysis.css";
import energyData from "../data/113_energy_demand_supply.json";
import supplyCatalog from "../data/supply_catalog.json";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import costMap from "../data/energy_cost_mapping.json";
import { getCategory } from "./PowerPlantLive";
export default function ElectricityAnalysis() {
  const [liveUnits, setLiveUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aiAnalysis, setAiAnalysis] = useState("");

  const [updateTime, setUpdateTime] = useState("");
  async function fetchPowerData() {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/power-units");

      const data = await res.json();

      console.log("🔥 API =", data);

      if (Array.isArray(data)) {
        setLiveUnits(data);

        setUpdateTime(new Date().toLocaleString());
        setLoading(false);

        setTimeout(() => {
          fetchAIAnalysis(data);
        }, 100);
      } else if (Array.isArray(data.data)) {
        setLiveUnits(data.data);
      } else if (Array.isArray(data.units)) {
        setLiveUnits(data.units);
      }
    } catch (err) {
      console.log(err);
    }
  }
  useEffect(() => {
    fetchPowerData();

    // 🔥 每10分鐘更新
    const interval = setInterval(
      () => {
        fetchPowerData();
      },
      1000 * 60 * 10,
    );

    return () => clearInterval(interval);
  }, []);

  const supplyTotals = {};

  // 🔥 遍歷所有需求部門
  Object.values(energyData).forEach((demand) => {
    Object.entries(demand).forEach(([supplyCode, value]) => {
      // 只算 S 開頭
      if (!supplyCode.startsWith("S")) return;

      if (!supplyTotals[supplyCode]) {
        supplyTotals[supplyCode] = 0;
      }

      supplyTotals[supplyCode] += Number(value);
    });
  });

  // 🔥 PieChart 資料
  const pieData = Object.entries(supplyTotals)

    .sort((a, b) => b[1] - a[1])

    .slice(0, 8)

    .map(([code, value]) => ({
      name: supplyCatalog?.[code]?.name_zh || code,

      value: Number(value),
    }));

  // 🔥 成本影響分析
  const costImpactData = Object.entries(supplyTotals)

    .map(([code, value]) => {
      const mapping = costMap?.[code];

      const lcoe = mapping?.lcoe || 1;

      return {
        code,

        name: supplyCatalog?.[code]?.name_zh || code,

        value,

        impact: Number((value * lcoe).toFixed(2)),
      };
    })

    .sort((a, b) => b.impact - a.impact)

    .slice(0, 6);
  const hydroPlants = [
    "大觀",
    "明潭",
    "曾文",
    "桂山",
    "石門",
    "萬大",
    "蘭陽",
    "東部",
    "大甲溪",
    "高屏",
  ];
  // 🔥 即時能源統計
  const liveEnergy = {
    solar: 0,

    wind: 0,

    hydro: 0,

    nuclear: 0,

    thermal: 0,
  };
  let liveCostPressure = 0;

  // 🔥 即時 API 統計
  liveUnits.forEach((u) => {
    const value = parseFloat(u.value) || 0;

    const plant = u.name || "";
    const percent = value <= 0 ? 0 : value / 1000;
    const category = getCategory(plant, value);

    const main = category.main;

    // ⚛️ 核能（用名稱判斷）
    if (plant.includes("核")) {
      liveEnergy.nuclear += value;
      return;
    }
    // ☀️ 太陽能
    if (main.includes("太陽能")) {
      liveEnergy.solar += value;

      liveCostPressure += percent * 0.7;
    }

    // 🌬️ 風力
    else if (main.includes("風力")) {
      liveEnergy.wind += value;

      liveCostPressure += percent * 0.8;
    }

    // 💧 水力
    else if (main.includes("水力")) {
      liveEnergy.hydro += value;

      liveCostPressure += percent * 0.6;
    }

    // 🔥 火力
    else {
      liveEnergy.thermal += value;

      liveCostPressure += percent * 1.8;
    }
  });
  liveCostPressure = Number(liveCostPressure.toFixed(2));
  // 🔥 PieChart 顏色
  const COLORS = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#84cc16",
  ];
  async function fetchAIAnalysis(units) {
    if (units.length <= 0) return;

    try {
      let thermal = 0;
      let costPressure = 0;
      let renewable = 0;

      let nuclear = 0;

      units.forEach((u) => {
        const value = parseFloat(u.value) || 0;

        const plant = u.name || "";

        const category = getCategory(plant, value);

        const main = category.main;

        if (plant.includes("核")) {
          nuclear += value;
          costPressure += (value / 1000) * 0.5;
        } else if (
          main.includes("太陽能") ||
          main.includes("風力") ||
          main.includes("水力")
        ) {
          renewable += value;

          costPressure += (value / 1000) * 0.7;
        } else {
          thermal += value;

          costPressure += (value / 1000) * 1.8;
        }
      });
      const nuclearNote =
        nuclear === 0
          ? "目前無核能發電資料（依台電即時數據）"
          : `核能發電量為 ${nuclear} MW`;
      const res = await fetch("http://localhost:8000/electricity-ai-analysis", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          thermal,

          renewable,

          nuclear,
          nuclearNote,
          costPressure: Number(costPressure.toFixed(2)),
        }),
      });

      const data = await res.json();

      setAiAnalysis(data.analysis);
    } catch (err) {
      console.log(err);

      setLoading(false);
    }
  }
  function getAnalysisText() {
    const thermal = liveEnergy.thermal || 0;

    const solar = liveEnergy.solar || 0;

    const wind = liveEnergy.wind || 0;

    const hydro = liveEnergy.hydro || 0;

    const nuclear = liveEnergy.nuclear || 0;

    const renewable = solar + wind + hydro;

    const total = thermal + renewable + nuclear;

    const thermalPercent =
      total <= 0 ? 0 : ((thermal / total) * 100).toFixed(1);

    const renewablePercent =
      total <= 0 ? 0 : ((renewable / total) * 100).toFixed(1);

    // 🔥 高火力
    if (thermalPercent >= 80) {
      return `
目前供電高度依賴火力發電，
火力占比約 ${thermalPercent}% 。

代表系統對天然氣、
燃煤與國際燃料價格波動較敏感，
未來可能增加供電成本壓力。

目前再生能源占比約
${renewablePercent}% ，
夜間太陽能發電為零，
因此整體供電結構仍以火力為主。
`;
    }

    // 🔥 中度火力
    if (thermalPercent >= 60) {
      return `
目前供電仍以火力發電為主，
但再生能源已開始提供部分支撐。

目前再生能源占比約
${renewablePercent}% ，
顯示能源轉型正在進行中。

若未來風力、
儲能與綠能占比持續提升，
有機會降低供電成本壓力。
`;
    }

    // 🔥 綠能高
    return `
目前再生能源比例較高，
供電結構相對多元。

系統對化石燃料依賴較低，
有助於降低長期供電成本波動風險，
整體能源結構較穩定。
`;
  }

  return (
    <>
      {loading ? (
        <div className="electricity-page loading-page">
          <div>
            <div className="loading-text">
              <i className="fi fi-rr-bolt loading-icon"></i>
              載入供電成本分析中心中
              <span className="dot-animation"></span>
            </div>

            <p className="loading-subtext">
              即時抓取台電機組數據 · 計算能源結構 · 建立成本壓力模型
            </p>
          </div>
        </div>
      ) : (
        <div className="electricity-page">
          {/* ========================= */}
          {/* 🔥 Title */}
          {/* ========================= */}

          <div className="electricity-hero">
            <h1>AI 供電成本分析</h1>

            <p>即時供電、能源結構、 成本壓力與未來趨勢分析</p>
            <p
              style={{
                opacity: 0.6,
                marginTop: "10px",
                fontSize: "14px",
              }}
            >
              即時資料更新時間：
              {updateTime || "載入中..."}
            </p>
          </div>

          {/* ========================= */}
          {/* 🔥 即時資訊 */}
          {/* ========================= */}

          <div className="electricity-grid">
            <div className="electricity-card">
              <h2>🔋 即時供電資訊</h2>

              <div className="info-row">
                <span>🔥 火力發電</span>

                <strong>
                  {liveEnergy.thermal.toFixed(0)}
                  MW
                </strong>
              </div>

              <div className="info-row">
                <span>☀️ 太陽能</span>

                <strong>
                  {liveEnergy.solar.toFixed(0)}
                  MW
                </strong>
              </div>
              <div className="info-row">
                <span>⚛️ 核能</span>

                <strong>
                  {liveEnergy.nuclear.toFixed(0)}
                  MW
                </strong>
              </div>
              <div className="info-row">
                <span>🌬️ 風力</span>

                <strong>
                  {liveEnergy.wind.toFixed(0)}
                  MW
                </strong>
              </div>

              <div className="info-row">
                <span>💧 水力</span>

                <strong>
                  {liveEnergy.hydro.toFixed(0)}
                  MW
                </strong>
              </div>
            </div>

            {/* ========================= */}
            {/* 🔥 成本壓力 */}
            {/* ========================= */}

            <div className="electricity-card">
              <h2>📈 供電成本壓力</h2>
              <p
                style={{
                  opacity: 0.7,
                  marginTop: "8px",
                  lineHeight: 1.7,
                  fontSize: "14px",
                }}
              >
                本指數根據即時發電結構、 不同能源平均發電成本、 燃料價格敏感度、
                碳排特性進行估算。
              </p>
              <div className="cost-value">{liveCostPressure}</div>

              <div className="cost-label">Energy Cost Pressure Index</div>

              <p className="analysis-text">
                {liveCostPressure >= 40
                  ? "目前火力發電占比偏高，供電成本壓力較大。"
                  : liveCostPressure >= 25
                    ? "目前供電成本壓力中等，需持續觀察能源結構變化。"
                    : "目前供電結構相對穩定。"}
              </p>
              <div
                style={{
                  marginTop: "10px",

                  display: "inline-flex",

                  alignItems: "center",

                  gap: "10px",

                  padding: "10px 18px",

                  borderRadius: "999px",

                  fontWeight: 700,

                  background:
                    liveCostPressure >= 40
                      ? "rgba(239,68,68,0.18)"
                      : liveCostPressure >= 25
                        ? "rgba(249,115,22,0.18)"
                        : "rgba(34,197,94,0.18)",

                  color:
                    liveCostPressure >= 40
                      ? "#ef4444"
                      : liveCostPressure >= 25
                        ? "#f97316"
                        : "#22c55e",
                }}
              >
                <div
                  style={{
                    width: "10px",

                    height: "10px",

                    borderRadius: "50%",

                    background:
                      liveCostPressure >= 40
                        ? "#ef4444"
                        : liveCostPressure >= 25
                          ? "#f97316"
                          : "#22c55e",

                    boxShadow:
                      liveCostPressure >= 40
                        ? "0 0 12px #ef4444"
                        : liveCostPressure >= 25
                          ? "0 0 12px #f97316"
                          : "0 0 12px #22c55e",
                  }}
                />

                {liveCostPressure >= 40
                  ? "高供電成本風險"
                  : liveCostPressure >= 25
                    ? "中度供電成本風險"
                    : "低供電成本風險"}
              </div>
            </div>
          </div>

          {/* ========================= */}
          {/* 🔥 能源結構 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>🌍 能源結構分析</h2>

            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="electricity-card big-card">
            <h2>💰 成本影響分析</h2>
            <p
              style={{
                opacity: 0.75,
                lineHeight: 1.8,
                marginTop: "10px",
                marginBottom: "25px",
                fontSize: "15px",
              }}
            >
              本分析根據能源使用比例、平均發電成本（LCOE）、燃料價格敏感度、供電依賴程度進行估算。
              系統會評估不同能源對整體供電成本與電價風險的影響程度。 本系統屬於
              AI 能源風險分析模型，並非台電實際電價計算公式。
            </p>
            <div className="impact-list">
              {costImpactData.map((item) => {
                const percent = Math.min(item.impact * 8, 100);

                return (
                  <div className="impact-card" key={item.code}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                    >
                      <strong>{item.name}</strong>

                      <span>
                        {item.impact >= 8
                          ? "🔴 極高"
                          : item.impact >= 5
                            ? "🟠 高"
                            : item.impact >= 3
                              ? "🟡 中"
                              : "🟢 低"}
                      </span>
                    </div>

                    <div
                      style={{
                        height: "12px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,

                          height: "100%",

                          borderRadius: "999px",

                          background:
                            item.impact >= 8
                              ? "#ef4444"
                              : item.impact >= 5
                                ? "#f97316"
                                : item.impact >= 3
                                  ? "#facc15"
                                  : "#22c55e",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        opacity: 0.7,
                        fontSize: "14px",
                      }}
                    >
                      成本影響指數：
                      {item.impact}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* ========================= */}
          {/* 🔥 未來趨勢 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>📊 未來成本趨勢</h2>

            <p>未來將結合 Prophet 預測能源比例與供電成本壓力變化。</p>

            <div className="trend-placeholder">Future Trend Chart</div>
          </div>

          {/* ========================= */}
          {/* 🔥 AI 建議 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>🤖 AI 智慧建議</h2>

            <p className="ai-box">
              {aiAnalysis ? aiAnalysis : " AI 分析生成中..."}
            </p>
          </div>
        </div>
      )}
      <BackToTopButton />
    </>
  );
}
