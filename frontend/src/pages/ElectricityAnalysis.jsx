import React, { useEffect, useState } from "react";
import BackToTopButton from "../components/BackToTopButton";
import "./electricity-analysis.css";
import energyData from "../data/113_energy_demand_supply.json";
import supplyCatalog from "../data/supply_catalog.json";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import costMap from "../data/energy_cost_mapping.json";
import { getCategory } from "./PowerPlantLive";
export default function ElectricityAnalysis() {
  const { t, i18n } = useTranslation();
  const [liveUnits, setLiveUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiSwitching, setAiSwitching] = useState(false);
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

    const interval = setInterval(
      () => {
        fetchPowerData();
      },
      1000 * 60 * 10,
    );

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (liveUnits.length > 0) {
      // 🔥 已經有 AI 結果才顯示切換動畫
      if (aiAnalysis) {
        setAiSwitching(true);
      }

      fetchAIAnalysis(liveUnits);
    }
  }, [i18n.language]);

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
      name:
        i18n.language === "en"
          ? supplyCatalog?.[code]?.name_en || code
          : supplyCatalog?.[code]?.name_zh || code,
      value: Number(value),
    }));

  // 🔥 成本影響分析
  const costImpactData = Object.entries(supplyTotals)

    .map(([code, value]) => {
      const mapping = costMap?.[code];

      const lcoe = mapping?.lcoe || 1;

      return {
        code,

        name:
          i18n.language === "en"
            ? supplyCatalog?.[code]?.name_en || code
            : supplyCatalog?.[code]?.name_zh || code,

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
          ? i18n.language === "en"
            ? "Currently no nuclear generation data (based on Taipower real-time data)"
            : "目前無核能發電資料（依台電即時數據）"
          : i18n.language === "en"
            ? `Current nuclear generation is ${nuclear} MW`
            : `核能發電量為 ${nuclear} MW`;
      const historicalAnalysis = {
        trend: "近30年台灣供電仍以火力發電為主，但燃氣與再生能源占比持續增加。",

        risk: "目前供電結構仍高度依賴國際燃料價格與火力發電。",

        renewableTrend: "近年太陽能與風力發電量逐年成長，能源轉型持續進行中。",
      };

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

          historicalAnalysis,
          language: i18n.language,
        }),
      });

      const data = await res.json();

      setAiAnalysis(data.analysis);
      setAiSwitching(false);
    } catch (err) {
      setAiSwitching(false);
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
              {t("electricity.loading")}
              <span className="dot-animation"></span>
            </div>

            <p className="loading-subtext">{t("electricity.loadingSub")}</p>
          </div>
        </div>
      ) : (
        <div className="electricity-page">
          {/* ========================= */}
          {/* 🔥 Title */}
          {/* ========================= */}

          <div className="electricity-hero">
            <h1>{t("electricity.title")}</h1>

            <p>{t("electricity.subtitle")}</p>
            <p
              style={{
                opacity: 0.6,
                marginTop: "10px",
                fontSize: "14px",
              }}
            >
              {t("electricity.updateTime")}
              {updateTime || t("electricity.loading")}
            </p>
          </div>

          {/* ========================= */}
          {/* 🔥 即時資訊 */}
          {/* ========================= */}

          <div className="electricity-grid">
            <div className="electricity-card">
              <h2>🔋 {t("electricity.realtime")}</h2>

              {/* 🔥 火力 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>🔥 {t("electricity.thermal")}</span>

                  <span>{liveEnergy.thermal.toFixed(0)} MW</span>
                </div>

                <div className="live-bar-bg">
                  <div
                    className="live-bar-fill thermal"
                    style={{
                      width: `${Math.min(
                        (liveEnergy.thermal /
                          (liveEnergy.thermal +
                            liveEnergy.solar +
                            liveEnergy.wind +
                            liveEnergy.hydro +
                            liveEnergy.nuclear)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* ☀️ 太陽能 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>☀️ {t("electricity.solar")}</span>

                  <span>{liveEnergy.solar.toFixed(0)} MW</span>
                </div>

                <div className="live-bar-bg">
                  <div
                    className="live-bar-fill solar"
                    style={{
                      width: `${Math.min(
                        (liveEnergy.solar /
                          (liveEnergy.thermal +
                            liveEnergy.solar +
                            liveEnergy.wind +
                            liveEnergy.hydro +
                            liveEnergy.nuclear)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* ⚛️ 核能 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>⚛️ {t("electricity.nuclear")}</span>

                  <span>{liveEnergy.nuclear.toFixed(0)} MW</span>
                </div>

                <div className="live-bar-bg">
                  <div
                    className="live-bar-fill nuclear"
                    style={{
                      width: `${Math.min(
                        (liveEnergy.nuclear /
                          (liveEnergy.thermal +
                            liveEnergy.solar +
                            liveEnergy.wind +
                            liveEnergy.hydro +
                            liveEnergy.nuclear)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 🌬️ 風力 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>🌬️ {t("electricity.wind")}</span>

                  <span>{liveEnergy.wind.toFixed(0)} MW</span>
                </div>

                <div className="live-bar-bg">
                  <div
                    className="live-bar-fill wind"
                    style={{
                      width: `${Math.min(
                        (liveEnergy.wind /
                          (liveEnergy.thermal +
                            liveEnergy.solar +
                            liveEnergy.wind +
                            liveEnergy.hydro +
                            liveEnergy.nuclear)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 💧 水力 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>💧 {t("electricity.hydro")}</span>

                  <span>{liveEnergy.hydro.toFixed(0)} MW</span>
                </div>

                <div className="live-bar-bg">
                  <div
                    className="live-bar-fill hydro"
                    style={{
                      width: `${Math.min(
                        (liveEnergy.hydro /
                          (liveEnergy.thermal +
                            liveEnergy.solar +
                            liveEnergy.wind +
                            liveEnergy.hydro +
                            liveEnergy.nuclear)) *
                          100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ========================= */}
            {/* 🔥 成本壓力 */}
            {/* ========================= */}

            <div className="electricity-card">
              <h2>📈 {t("electricity.costTitle")}</h2>
              <p
                style={{
                  opacity: 0.7,
                  marginTop: "8px",
                  lineHeight: 1.7,
                  fontSize: "14px",
                }}
              >
                {t("electricity.costDescription")}
              </p>
              <div className="cost-value">{liveCostPressure}</div>

              <div className="cost-label">{t("electricity.costIndex")}</div>

              <p className="analysis-text">
                {liveCostPressure >= 40
                  ? t("electricity.highCost")
                  : liveCostPressure >= 25
                    ? t("electricity.mediumCost")
                    : t("electricity.stableCost")}
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
                  ? t("electricity.highRisk")
                  : liveCostPressure >= 25
                    ? t("electricity.mediumRisk")
                    : t("electricity.lowRisk")}
              </div>
            </div>
          </div>

          {/* ========================= */}
          {/* 🔥 能源結構 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>🌍 {t("electricity.structure")}</h2>

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
            <h2>💰 {t("electricity.impact")}</h2>
            <p
              style={{
                opacity: 0.75,
                lineHeight: 1.8,
                marginTop: "10px",
                marginBottom: "25px",
                fontSize: "15px",
              }}
            >
              {t("electricity.impactDescription")}
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
                          ? `🔴 ${t("electricity.impactVeryHigh")}`
                          : item.impact >= 5
                            ? `🟠 ${t("electricity.impactHigh")}`
                            : item.impact >= 3
                              ? `🟡 ${t("electricity.impactMedium")}`
                              : `🟢 ${t("electricity.impactLow")}`}
                      </span>
                    </div>

                    <div className="impact-progress-bg">
                      <div
                        className="impact-progress-fill"
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
                      {t("electricity.impactIndex")}
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
            <h2>📊 {t("electricity.future")}</h2>

            <p>{t("electricity.futureDesc")}</p>

            <div className="trend-placeholder">
              {t("electricity.futureChart")}
            </div>
          </div>

          {/* ========================= */}
          {/* 🔥 AI 建議 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>🤖 {t("electricity.ai")}</h2>

            <p className={`ai-box ${aiSwitching ? "ai-switching" : ""}`}>
              {aiSwitching ? (
                <span className="ai-language-loading">
                  🌐{" "}
                  {i18n.language === "en"
                    ? "Switching AI language"
                    : "AI 語言切換中"}
                  <span className="dot-animation"></span>
                </span>
              ) : aiAnalysis ? (
                aiAnalysis
              ) : (
                t("electricity.aiLoading")
              )}
            </p>
          </div>
        </div>
      )}
      <BackToTopButton />
    </>
  );
}
