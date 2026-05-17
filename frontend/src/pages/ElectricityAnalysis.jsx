import React, { useEffect, useState } from "react";
import BackToTopButton from "../components/BackToTopButton";
import "./electricity-analysis.css";
import data104 from "../data/104_energy_demand_supply.json";
import data105 from "../data/105_energy_demand_supply.json";
import data106 from "../data/106_energy_demand_supply.json";
import data107 from "../data/107_energy_demand_supply.json";
import data108 from "../data/108_energy_demand_supply.json";
import data109 from "../data/109_energy_demand_supply.json";
import data110 from "../data/110_energy_demand_supply.json";
import data111 from "../data/111_energy_demand_supply.json";
import data112 from "../data/112_energy_demand_supply.json";
import data113 from "../data/113_energy_demand_supply.json";
import supplyCatalog from "../data/supply_catalog.json";
import { useTranslation } from "react-i18next";
import "@flaticon/flaticon-uicons/css/all/all.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Area,
  ReferenceLine,
} from "recharts";
import costMap from "../data/energy_cost_mapping.json";
import historicalCost from "../data/historical_cost_pressure.json";
import predictedCost from "../data/predicted_cost_pressure.json";
import { getCategory } from "./PowerPlantLive";
export default function ElectricityAnalysis() {
  const { t, i18n } = useTranslation();
  const [liveUnits, setLiveUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [forecastMAPE, setForecastMAPE] = useState(0);
  const [aiSwitching, setAiSwitching] = useState(false);
  const [updateTime, setUpdateTime] = useState("");
  // =========================
  // ⚡ 電費試算
  // =========================

  const [usage, setUsage] = useState("300");

  const [userType, setUserType] = useState("home");
  const [startDate, setStartDate] = useState("2026-05-01");

  const [endDate, setEndDate] = useState("2026-05-15");
  async function fetchPowerData() {
    setLoading(true);

    try {
      const metricRes = await fetch("http://localhost:8000/forecast-metrics");

      const metricData = await metricRes.json();

      setForecastMAPE(metricData.mape || 0);

      const res = await fetch("http://localhost:8000/power-units");

      const data = await res.json();
      console.log("🔥 API =", data);

      if (Array.isArray(data)) {
        setLiveUnits(data);

        setUpdateTime(new Date().toLocaleString());
        setLoading(false);
      } else if (Array.isArray(data.data)) {
        setLiveUnits(data.data);
        setUpdateTime(new Date().toLocaleString());
        setLoading(false);
      } else if (Array.isArray(data.units)) {
        setLiveUnits(data.units);
        setUpdateTime(new Date().toLocaleString());
        setLoading(false);
      }
    } catch (err) {
      console.log(err);

      setLoading(false);
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
      if (aiAnalysis) {
        setAiSwitching(true);
      }

      fetchAIAnalysis();
    }
  }, [liveUnits, i18n.language]);
  const yearlyData = [
    data104,
    data105,
    data106,
    data107,
    data108,
    data109,
    data110,
    data111,
    data112,
    data113,
  ];
  // =========================
  // 🔥 長期能源結構資料
  // =========================

  const supplyTotals = {};

  yearlyData.forEach((yearData) => {
    Object.values(yearData).forEach((demand) => {
      Object.entries(demand).forEach(([supplyCode, value]) => {
        if (!supplyCode.startsWith("S")) return;

        if (!supplyTotals[supplyCode]) {
          supplyTotals[supplyCode] = 0;
        }

        supplyTotals[supplyCode] += Number(value);
      });
    });
  });

  const historyPieData = Object.entries(supplyTotals)

    .sort((a, b) => b[1] - a[1])

    .slice(0, 7)

    .map(([code, value]) => ({
      name:
        i18n.language === "en"
          ? supplyCatalog?.[code]?.name_en || code
          : supplyCatalog?.[code]?.name_zh || code,

      value,
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
  const maxImpact = Math.max(...costImpactData.map((d) => d.impact));
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
    const scaledValue = value <= 0 ? 0 : value / 1000;
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

      liveCostPressure += scaledValue * 0.7;
    }

    // 🌬️ 風力
    else if (main.includes("風力")) {
      liveEnergy.wind += value;

      liveCostPressure += scaledValue * 0.8;
    }

    // 💧 水力
    else if (main.includes("水力")) {
      liveEnergy.hydro += value;

      liveCostPressure += scaledValue * 0.6;
    }

    // 🔥 火力
    else {
      liveEnergy.thermal += value;

      liveCostPressure += scaledValue * 1.8;
    }
  });
  liveCostPressure = Number(liveCostPressure.toFixed(2));
  // =========================
  // 🔥 即時供電結構 PieChart
  // =========================

  const pieData = [
    {
      name: i18n.language === "en" ? "Thermal" : "火力發電",

      value: liveEnergy.thermal,
    },

    {
      name: i18n.language === "en" ? "Solar" : "太陽能",

      value: liveEnergy.solar,
    },

    {
      name: i18n.language === "en" ? "Wind" : "風力發電",

      value: liveEnergy.wind,
    },

    {
      name: i18n.language === "en" ? "Hydro" : "水力發電",

      value: liveEnergy.hydro,
    },

    {
      name: i18n.language === "en" ? "Nuclear" : "核能發電",

      value: liveEnergy.nuclear,
    },
  ].filter((item) => item.value > 0);
  // 🔥 計算天數
  function getDaysBetween(start, end) {
    const s = new Date(start);
    const e = new Date(end);

    const diff = Math.abs(e - s);

    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  function calculateElectricityBill(usage, type) {
    const homeRates = [
      {
        limit: 120 * 2,
        rate: 1.78,
      },
      {
        limit: 330 * 2,
        rate: 2.26,
      },
      {
        limit: 500 * 2,
        rate: 3.39,
      },
      {
        limit: 700 * 2,
        rate: 4.97,
      },
      {
        limit: 1000 * 2,
        rate: 6.1,
      },
      {
        limit: Infinity,
        rate: 7.43,
      },
    ];

    // 🔥 商業（簡化版）
    const businessRates = [
      {
        limit: 330 * 2,
        rate: 2.28,
      },
      {
        limit: 700 * 2,
        rate: 3.38,
      },
      {
        limit: Infinity,
        rate: 4.5,
      },
    ];

    const rates = type === "home" ? homeRates : businessRates;

    let total = 0;
    let formulas = [];
    let prevLimit = 0;
    let remaining = usage;

    for (const tier of rates) {
      const usable = Math.min(remaining, tier.limit - prevLimit);

      if (usable <= 0) break;

      total += usable * tier.rate;
      const currentLimit = tier.limit;

      const formulaText =
        prevLimit === 0
          ? `(${tier.rate} × ((${currentLimit / 2} - 0) × 2)) = ${(usable * tier.rate).toFixed(1)}`
          : `(${tier.rate} × (${usage} - ((${prevLimit / 2}) × 2))) = ${(usable * tier.rate).toFixed(1)}`;

      formulas.push(formulaText);
      remaining -= usable;

      prevLimit = tier.limit;
    }

    return {
      total,
      formulas,
    };
  }

  const billResult = calculateElectricityBill(Number(usage || 0), userType);

  const originalBill = billResult.total;

  // 🔥 官方台電試算
  const estimatedBill = Math.round(originalBill);

  // 🔥 AI 分析用（非官方）
  const aiEstimatedBill = Math.round(
    originalBill * (1 + liveCostPressure / 500),
  );
  const trendData = historicalCost.map((item) => {
    const predicted = predictedCost.find((p) => p.year === item.year + 1911);

    return {
      year: item.year + 1911,

      historical: item.costPressure,

      predicted: predicted?.predictedCostPressure || null,

      lower: predicted?.lower || null,

      upper: predicted?.upper || null,
    };
  });

  // 🔥 加入未來年份
  predictedCost.forEach((item) => {
    if (item.year <= 2025) return;

    trendData.push({
      year: item.year,

      historical: null,

      predicted: item.predictedCostPressure,

      lower: item.predictedCostPressure - 4,
      upper: item.predictedCostPressure + 4,
      interval:
        item.predictedCostPressure + 4 - (item.predictedCostPressure - 4),
    });
  });
  // =========================
  // 🔥 自訂 Tooltip
  // =========================

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div
        style={{
          background: "#0f172a",

          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "10px 14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          color: "#fff",
          minWidth: "140px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "8px",
            color: "#94a3b8",
            fontSize: "13px",
          }}
        >
          {label}
        </div>

        {payload.map((entry, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: entry.color,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                letterSpacing: "0.5px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: entry.color,
                }}
              />

              <span>{entry.name}</span>
            </div>

            <span>
              {typeof entry.value === "number"
                ? entry.value.toFixed(1)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
  // 🔥 PieChart 顏色
  const COLORS = [
    "#ef4444", // 火力
    "#f97316", // 石油
    "#facc15", // 天然氣
    "#22c55e", // 綠能
    "#06b6d4", // 水力
    "#3b82f6", // 電力
    "#8b5cf6", // 核能
    "#64748b", // 其他
  ];
  async function fetchAIAnalysis() {
    if (liveUnits.length <= 0) return;

    try {
      // 🔥 直接使用頁面已經算好的資料
      const thermal = liveEnergy.thermal;

      const renewable = liveEnergy.solar + liveEnergy.wind + liveEnergy.hydro;

      const nuclear = liveEnergy.nuclear;

      const costPressure = liveCostPressure;
      const nuclearNote =
        nuclear === 0
          ? i18n.language === "en"
            ? "Currently no nuclear generation data (based on Taipower real-time data)"
            : "目前無核能發電資料（依台電即時數據）"
          : i18n.language === "en"
            ? `Current nuclear generation is ${nuclear} MW`
            : `核能發電量為 ${nuclear} MW`;
      const historicalAnalysis = {
        trend: "近10年台灣供電仍以火力發電為主，但燃氣與再生能源占比持續增加。",

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
              <h2>
                <i
                  className="fi fi-rr-bolt"
                  style={{
                    marginRight: "10px",
                    color: "#facc15",
                  }}
                ></i>

                {t("electricity.realtime")}
              </h2>

              {/* 🔥 火力 */}
              <div className="live-bar-row">
                <div className="live-bar-top">
                  <span>
                    <i
                      className="fi fi-rr-fire-flame-curved"
                      style={{ marginRight: "8px", color: "#ef4444" }}
                    ></i>

                    {t("electricity.thermal")}
                  </span>

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
                  <span>
                    <i
                      className="fi fi-rr-sun"
                      style={{ marginRight: "8px", color: "#facc15" }}
                    ></i>

                    {t("electricity.solar")}
                  </span>

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
                  <span>
                    <i
                      className="fi fi-rr-radiation"
                      style={{
                        marginRight: "8px",
                        color: "#8b5cf6",
                      }}
                    ></i>

                    {t("electricity.nuclear")}
                  </span>

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
                  <span>
                    <i
                      className="fi fi-rr-wind"
                      style={{ marginRight: "8px", color: "#06b6d4" }}
                    ></i>

                    {t("electricity.wind")}
                  </span>

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
                  <span>
                    <i
                      className="fi fi-rr-raindrops"
                      style={{ marginRight: "8px", color: "#3b82f6" }}
                    ></i>

                    {t("electricity.hydro")}
                  </span>

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
              <h2>
                <i
                  className="fi fi-rr-chart-line-up"
                  style={{
                    marginRight: "10px",
                    color: "#60a5fa",
                  }}
                ></i>

                {t("electricity.costTitle")}
              </h2>
              <p
                style={{
                  opacity: 0.7,
                  marginTop: "8px",
                  lineHeight: 1.7,
                  fontSize: "14px",
                }}
              >
                {t("electricity.costDescription")}
                <p
                  style={{
                    marginTop: "12px",
                    opacity: 0.55,
                    fontSize: "12px",
                    lineHeight: 1.7,
                  }}
                >
                  {i18n.language === "en"
                    ? "Based on weighted energy structure analysis and LCOE (Levelized Cost of Energy) reference models."
                    : "依據能源結構加權分析與 LCOE（均化能源成本）概念進行估算。"}
                </p>
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
          {/* ⚡ AI 電費試算 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>
              <i
                className="fi fi-rr-chart-pie"
                style={{
                  marginRight: "10px",
                  color: "#a855f7",
                }}
              ></i>
              {i18n.language === "en"
                ? "AI Electricity Cost Analysis"
                : "AI 電價風險分析"}
            </h2>

            <p
              style={{
                opacity: 0.7,
                marginTop: "10px",
                lineHeight: 1.8,
              }}
            >
              {i18n.language === "en"
                ? "Analyze electricity cost risk based on real-time energy structure and supply pressure."
                : "根據目前供電結構與即時供電壓力，分析未來可能的電價風險與成本變化。"}
            </p>

            {/* 輸入區 */}
            <div className="calculator-grid">
              {/* 日期區間 */}
              <div className="calculator-input-group">
                <label>
                  {i18n.language === "en" ? "Billing Period" : "試算期間"}
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {/* 用電度數 */}
              <div className="calculator-input-group">
                <label>
                  {i18n.language === "en"
                    ? "Electricity Usage (kWh)"
                    : "用電度數（kWh）"}
                </label>

                <input
                  type="text"
                  value={usage}
                  onChange={(e) => {
                    const value = e.target.value;

                    // 只允許數字
                    if (/^\d*$/.test(value)) {
                      setUsage(value);
                    }
                  }}
                />
              </div>

              {/* 用戶類型 */}
              <div className="calculator-input-group">
                <label>
                  {i18n.language === "en" ? "User Type" : "用戶類型"}
                </label>

                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                >
                  <option value="home">
                    {i18n.language === "en" ? "Residential" : "住宅"}
                  </option>

                  <option value="business">
                    {i18n.language === "en" ? "Commercial" : "商業"}
                  </option>
                </select>
              </div>
            </div>

            {/* 結果 */}
            <div
              className="bill-result-card"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                marginTop: "30px",
              }}
            >
              {/* 🔥 官方台電 */}
              <div
                style={{
                  padding: "28px",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.16), rgba(37,99,235,0.05))",

                  border: "1px solid rgba(96,165,250,0.22)",
                }}
              >
                <div
                  style={{
                    opacity: 0.7,
                    marginBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  <i
                    className="fi fi-rr-bolt"
                    style={{
                      marginRight: "8px",
                      color: "#60a5fa",
                    }}
                  ></i>

                  {i18n.language === "en"
                    ? " Official Taipower Estimate"
                    : " 官方台電試算"}
                </div>

                <div className="bill-price">NT$ {estimatedBill}</div>
                <div
                  style={{
                    marginTop: "20px",
                    opacity: 0.78,
                    fontSize: "14px",
                    lineHeight: 1.9,
                  }}
                >
                  <div
                    style={{
                      marginBottom: "8px",
                      fontWeight: 700,
                    }}
                  >
                    {i18n.language === "en"
                      ? "Calculation Formula"
                      : "電費試算公式"}
                  </div>

                  {billResult.formulas.map((f, idx) => (
                    <div key={idx}>• {f}</div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    opacity: 0.65,
                    lineHeight: 1.7,
                    fontSize: "14px",
                  }}
                >
                  {i18n.language === "en"
                    ? "Calculated using Taipower residential tier pricing."
                    : "依照台電住宅累進電價級距進行試算。"}
                </div>
              </div>

              {/* 🤖 AI 分析 */}
              <div
                style={{
                  padding: "28px",
                  borderRadius: "24px",

                  background:
                    liveCostPressure >= 40
                      ? "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(127,29,29,0.05))"
                      : liveCostPressure >= 25
                        ? "linear-gradient(135deg, rgba(249,115,22,0.16), rgba(154,52,18,0.05))"
                        : "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(20,83,45,0.05))",

                  border:
                    liveCostPressure >= 40
                      ? "1px solid rgba(239,68,68,0.25)"
                      : liveCostPressure >= 25
                        ? "1px solid rgba(249,115,22,0.25)"
                        : "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <div
                  style={{
                    opacity: 0.8,
                    marginBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  <i
                    className="fi fi-rr-robot"
                    style={{
                      marginRight: "8px",
                      color:
                        liveCostPressure >= 40
                          ? "#ef4444"
                          : liveCostPressure >= 25
                            ? "#f97316"
                            : "#22c55e",
                    }}
                  ></i>

                  {i18n.language === "en"
                    ? " AI Electricity Cost Risk"
                    : " AI 電價風險分析"}
                </div>

                <div
                  className="bill-price"
                  style={{
                    color:
                      liveCostPressure >= 40
                        ? "#ef4444"
                        : liveCostPressure >= 25
                          ? "#f97316"
                          : "#22c55e",
                  }}
                >
                  NT$ {aiEstimatedBill}
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    opacity: 0.68,
                    fontSize: "14px",
                  }}
                >
                  {i18n.language === "en"
                    ? `Estimated risk-adjusted electricity cost`
                    : `根據即時能源結構推估之風險調整電費`}
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    opacity: 0.72,
                    lineHeight: 1.8,
                    fontSize: "14px",
                  }}
                >
                  {liveCostPressure >= 40
                    ? i18n.language === "en"
                      ? "High thermal generation may increase future electricity costs."
                      : "目前火力發電占比較高，未來電價可能上升。"
                    : liveCostPressure >= 25
                      ? i18n.language === "en"
                        ? "Current energy structure shows moderate cost pressure."
                        : "目前供電成本壓力中等。"
                      : i18n.language === "en"
                        ? "Current energy structure is relatively stable."
                        : "目前供電結構相對穩定。"}
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    opacity: 0.5,
                    fontSize: "12px",
                    lineHeight: 1.7,
                  }}
                >
                  {i18n.language === "en"
                    ? "This analysis is for research and reference purposes only and does not represent official Taipower pricing."
                    : "本分析僅供研究與參考，不代表台電官方電價。"}
                </div>
              </div>
            </div>
          </div>
          {/* ========================= */}
          {/* 🔥 能源結構 */}
          {/* ========================= */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginTop: "24px",
            }}
          >
            <div className="electricity-card big-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ margin: 0 }}>
                  <i
                    className="fi fi-rr-globe"
                    style={{
                      marginRight: "10px",
                      color: "#22c55e",
                    }}
                  ></i>
                  {i18n.language === "en"
                    ? " Real-time Power Structure"
                    : " 即時供電結構"}
                </h2>

                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",

                    background:
                      liveEnergy.thermal /
                        (liveEnergy.thermal +
                          liveEnergy.solar +
                          liveEnergy.wind +
                          liveEnergy.hydro +
                          liveEnergy.nuclear) >
                      0.7
                        ? "rgba(239,68,68,0.12)"
                        : liveEnergy.thermal /
                              (liveEnergy.thermal +
                                liveEnergy.solar +
                                liveEnergy.wind +
                                liveEnergy.hydro +
                                liveEnergy.nuclear) >
                            0.4
                          ? "rgba(249,115,22,0.12)"
                          : "rgba(34,197,94,0.12)",

                    color:
                      liveEnergy.thermal /
                        (liveEnergy.thermal +
                          liveEnergy.solar +
                          liveEnergy.wind +
                          liveEnergy.hydro +
                          liveEnergy.nuclear) >
                      0.7
                        ? "#ef4444"
                        : liveEnergy.thermal /
                              (liveEnergy.thermal +
                                liveEnergy.solar +
                                liveEnergy.wind +
                                liveEnergy.hydro +
                                liveEnergy.nuclear) >
                            0.4
                          ? "#f97316"
                          : "#22c55e",

                    border:
                      liveEnergy.thermal /
                        (liveEnergy.thermal +
                          liveEnergy.solar +
                          liveEnergy.wind +
                          liveEnergy.hydro +
                          liveEnergy.nuclear) >
                      0.7
                        ? "1px solid rgba(239,68,68,0.22)"
                        : liveEnergy.thermal /
                              (liveEnergy.thermal +
                                liveEnergy.solar +
                                liveEnergy.wind +
                                liveEnergy.hydro +
                                liveEnergy.nuclear) >
                            0.4
                          ? "1px solid rgba(249,115,22,0.22)"
                          : "1px solid rgba(34,197,94,0.22)",

                    fontSize: "13px",
                    fontWeight: "700",

                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {liveEnergy.thermal /
                    (liveEnergy.thermal +
                      liveEnergy.solar +
                      liveEnergy.wind +
                      liveEnergy.hydro +
                      liveEnergy.nuclear) >
                  0.7 ? (
                    <>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#ef4444",
                          boxShadow: "0 0 12px #ef4444",
                        }}
                      />
                      火力主導中
                    </>
                  ) : liveEnergy.thermal /
                      (liveEnergy.thermal +
                        liveEnergy.solar +
                        liveEnergy.wind +
                        liveEnergy.hydro +
                        liveEnergy.nuclear) >
                    0.4 ? (
                    <>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#f97316",
                          boxShadow: "0 0 12px #f97316",
                        }}
                      />
                      混合供電中
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#22c55e",
                          boxShadow: "0 0 12px #22c55e",
                        }}
                      />
                      綠能占比提升
                    </>
                  )}
                </div>
              </div>
              <p
                style={{
                  opacity: 0.72,
                  marginTop: "10px",
                  lineHeight: 1.8,
                  fontSize: "14px",
                }}
              >
                {i18n.language === "en"
                  ? "Based on real-time Taiwan power generation data."
                  : "根據台電即時機組發電資料統計目前供電占比。"}
              </p>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={420}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="36%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      label={({ percent }) =>
                        percent > 0.02 ? `${(percent * 100).toFixed(1)}%` : ""
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={false}
                      wrapperStyle={{
                        pointerEvents: "none",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      formatter={(value) => (
                        <span
                          style={{
                            color: "var(--text-color)",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="electricity-card big-card">
              <h2>
                <i
                  className="fi fi-rr-globe"
                  style={{
                    marginRight: "10px",
                    color: "#3b82f6",
                  }}
                ></i>
                {i18n.language === "en"
                  ? " Long-term Energy Structure"
                  : " 長期能源結構"}
                <div
                  className="energy-info-tooltip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    marginLeft: "12px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      background: "rgba(168,85,247,0.12)",
                      border: "1px solid rgba(168,85,247,0.25)",
                      color: "#a855f7",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "help",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#a855f7",
                          boxShadow: "0 0 10px #a855f7",
                        }}
                      />
                      資料分析
                    </>
                  </div>

                  <div className="energy-info-box">
                    <strong>長期能源結構分析</strong>

                    <div
                      style={{
                        marginTop: "10px",
                        lineHeight: 1.8,
                      }}
                    >
                      • 使用台灣近十年能源統計資料
                      <br />
                      • 根據能源平衡表進行比例統計
                      <br />
                      • 非 AI 預測模型
                      <br />
                      • 用於分析長期能源使用結構
                      <br />• 資料來源：能源署歷史能源資料
                    </div>
                  </div>
                </div>
              </h2>

              <p
                style={{
                  opacity: 0.72,
                  marginTop: "10px",
                  lineHeight: 1.8,
                  fontSize: "14px",
                }}
              >
                {i18n.language === "en"
                  ? "The long-term energy structure chart is generated through statistical analysis of Taiwan’s energy consumption data over the past decade."
                  : "長期能源結構圖根據台灣近十年能源統計資料進行能源比例分析與視覺化呈現。"}
              </p>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={420}>
                  <PieChart>
                    <Pie
                      data={historyPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="36%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      label={({ percent }) =>
                        percent > 0.05 ? `${(percent * 100).toFixed(1)}%` : ""
                      }
                      labelLine={false}
                    >
                      {historyPieData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={false}
                      wrapperStyle={{
                        pointerEvents: "none",
                      }}
                    />

                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      formatter={(value) => (
                        <span
                          style={{
                            color: "var(--text-color)",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="electricity-card big-card">
            <h2>
              <i
                className="fi fi-rr-coins"
                style={{
                  marginRight: "10px",
                  color: "#22c55e",
                }}
              ></i>

              {t("electricity.impact")}
            </h2>
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
                const percent = (item.impact / maxImpact) * 100;

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

                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: 700,
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",

                            background:
                              item.impact >= maxImpact * 0.75
                                ? "#ef4444"
                                : item.impact >= maxImpact * 0.45
                                  ? "#f97316"
                                  : item.impact >= maxImpact * 0.2
                                    ? "#facc15"
                                    : "#22c55e",

                            boxShadow:
                              item.impact >= maxImpact * 0.75
                                ? "0 0 12px #ef4444"
                                : item.impact >= maxImpact * 0.45
                                  ? "0 0 12px #f97316"
                                  : item.impact >= maxImpact * 0.2
                                    ? "0 0 12px #facc15"
                                    : "0 0 12px #22c55e",
                          }}
                        />

                        {item.impact >= maxImpact * 0.75
                          ? t("electricity.impactVeryHigh")
                          : item.impact >= maxImpact * 0.45
                            ? t("electricity.impactHigh")
                            : item.impact >= maxImpact * 0.2
                              ? t("electricity.impactMedium")
                              : t("electricity.impactLow")}
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
                            item.impact >= maxImpact * 0.75
                              ? "#ef4444"
                              : item.impact >= maxImpact * 0.45
                                ? "#f97316"
                                : item.impact >= maxImpact * 0.2
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
                      {t("electricity.impactIndex")}：{item.impact}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>
                <i
                  className="fi fi-rr-chart-histogram"
                  style={{
                    marginRight: "10px",
                    color: "#60a5fa",
                  }}
                ></i>

                {t("electricity.future")}
              </h2>

              <div
                className="forecast-badge"
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#60a5fa",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "help",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <i className="fi fi-rr-chart-line-up"></i>

                {i18n.language === "en" ? "Trend Forecast" : "趨勢預測模型"}
                <div className="forecast-tooltip">
                  {i18n.language === "en" ? (
                    <>
                      <strong>Model Methodology</strong>

                      <div style={{ marginTop: "10px", lineHeight: 1.8 }}>
                        • Historical Taiwan energy data over the past 30
                        years(Data Source: Taiwan Energy Balance Sheets
                        published by the Energy Administration)
                        <br />
                        • Prophet time-series forecasting
                        <br />
                        • Energy-type weighted cost estimation
                        <br />• For research and reference purposes only
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>模型依據</strong>

                      <div style={{ marginTop: "10px", lineHeight: 1.8 }}>
                        • 使用台灣 80~113
                        年能源統計資料(資料來源：能源署能源平衡表)
                        <br />
                        • Prophet 時間序列模型
                        <br />
                        • 能源類型權重成本估算
                        <br />• 僅供研究與參考
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.22)",
                  color: "#4ade80",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 10px #22c55e",
                    }}
                  />

                  {i18n.language === "en" ? "Reference Value" : "具參考性"}
                </>
              </div>
              <div
                className="forecast-badge"
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.25)",
                  color: "#c084fc",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  position: "relative",
                  cursor: "help",
                }}
              >
                <>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#c084fc",
                      boxShadow: "0 0 10px #c084fc",
                    }}
                  />
                  MAPE {forecastMAPE.toFixed(1)}%
                </>
                <div className="forecast-tooltip">
                  {i18n.language === "en" ? (
                    <>
                      <strong>MAPE Explanation</strong>

                      <div
                        style={{
                          marginTop: "10px",
                          lineHeight: 1.8,
                        }}
                      >
                        • MAPE represents the average forecasting error rate.
                        <br />
                        • Current model provides trend-level reference value.
                        <br />• Lower MAPE indicates better prediction
                        stability.
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>MAPE 指標說明</strong>

                      <div
                        style={{
                          marginTop: "10px",
                          lineHeight: 1.8,
                        }}
                      >
                        • MAPE 代表模型平均預測誤差率
                        <br />
                        • 目前模型主要提供趨勢參考
                        <br />• MAPE 越低代表模型穩定性越高
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p>{t("electricity.futureDesc")}</p>

            <div
              style={{
                width: "100%",
                height: "420px",
                marginTop: "30px",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />

                  <XAxis dataKey="year" />

                  <YAxis />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={false}
                    wrapperStyle={{
                      pointerEvents: "none",
                    }}
                  />
                  <Legend />
                  <ReferenceLine
                    x={2026}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={i18n.language === "en" ? "Current" : "目前"}
                  />

                  {/* 🔥 預測區間 */}
                  <Area
                    type="monotone"
                    dataKey="interval"
                    stroke="transparent"
                    fill="rgba(59,130,246,0.14)"
                    baseLine={(d) => d.lower}
                    activeDot={false}
                  />
                  {/* 🔥 歷史 */}
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    name={
                      i18n.language === "en" ? "Historical" : "歷史成本壓力"
                    }
                  />

                  {/* 🔥 預測 */}
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    dot={{ r: 4 }}
                    name={i18n.language === "en" ? "Prediction" : "未來預測"}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================= */}
          {/* 🔥 AI 建議 */}
          {/* ========================= */}

          <div className="electricity-card big-card">
            <h2>
              <i
                className="fi fi-rr-robot"
                style={{
                  marginRight: "10px",
                  color: "#a855f7",
                }}
              ></i>

              {t("electricity.ai")}
            </h2>

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
