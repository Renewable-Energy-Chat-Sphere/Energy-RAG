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
  const [currentYearIndex, setCurrentYearIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("structure");

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
    const timer = setInterval(() => {
      setCurrentYearIndex((prev) =>
        (prev + 1) % yearlyData.length
      );
    }, 1500); // 1.5秒換一次

    return () => clearInterval(timer);
  }, []);

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
  // 長期能源結構資料
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
  
  const currentYearData =
    yearlyData[currentYearIndex];

  const yearSupplyTotals = {};

  Object.values(currentYearData).forEach((demand) => {
    Object.entries(demand).forEach(
      ([supplyCode, value]) => {
        if (!supplyCode.startsWith("S")) return;

        if (!yearSupplyTotals[supplyCode]) {
          yearSupplyTotals[supplyCode] = 0;
        }

        yearSupplyTotals[supplyCode] += Number(value);
      }
    );
  });

  // 成本影響分析
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
  
  // 即時能源統計
  const liveEnergy = {
    solar: 0,
    wind: 0,
    hydro: 0,
    nuclear: 0,
    thermal: 0,
  };
  let liveCostPressure = 0;

  // 即時 API 統計
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

  const compareLineData = yearlyData.map(
    (yearData, index) => {

      const categoryTotals = {
        Coal: 0,
        Oil: 0,
        Gas: 0,
        Renewable: 0,
        Nuclear: 0,
      };

      Object.values(yearData).forEach((demand) => {
        Object.entries(demand).forEach(([code, value]) => {

          if (!code.startsWith("S")) return;
          if (code === "S51") return; // 排除電力

          const category =
            supplyCatalog?.[code]?.category;

          if (category === "Coal") {
            categoryTotals.Coal += Number(value);
          }

          else if (category === "Oil") {
            categoryTotals.Oil += Number(value);
          }

          else if (category === "Gas") {
            categoryTotals.Gas += Number(value);
          }

          else if (category === "Renewable") {
            categoryTotals.Renewable += Number(value);
          }

          else if (code === "S46") {
            categoryTotals.Nuclear += Number(value);
          }
        });
      });

      const total =
        categoryTotals.Coal +
        categoryTotals.Oil +
        categoryTotals.Gas +
        categoryTotals.Renewable +
        categoryTotals.Nuclear;

      return {
        year: 104 + index,

        coal:
          ((categoryTotals.Coal / total) * 100).toFixed(1),

        oil:
          ((categoryTotals.Oil / total) * 100).toFixed(1),

        gas:
          ((categoryTotals.Gas / total) * 100).toFixed(1),

        renewable:
          ((categoryTotals.Renewable / total) * 100).toFixed(1),

        nuclear:
          ((categoryTotals.Nuclear / total) * 100).toFixed(1),
      };
    }
  );

  // 計算天數
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

    // 商業（簡化版）
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

  // 官方台電試算
  const estimatedBill = Math.round(originalBill);

  // AI 分析用（非官方）
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

  // 加入未來年份
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

  // 自訂 Tooltip
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

  async function fetchAIAnalysis() {
    if (liveUnits.length <= 0) return;

    try {
      // 直接使用頁面已經算好的資料
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
          {/* Title */}
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
          {/* 電力健康度儀錶板 */}
          {/* ========================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: "20px",
              marginTop: "24px",
            }}
          >
            <div
              className="dashboard-item"
              style={{
                color: "#ef4444",
              }}
            >
              <div className="dashboard-title">
                <i className="fi fi-rr-fire-flame-curved"/>
                {t("electricity.thermal")}
              </div>
              <span>{liveEnergy.thermal.toFixed(0)} MW</span>
            </div>

            <div
              className="dashboard-item"
              style={{
                color: "#22c55e",
              }}
            >
              <div className="dashboard-title">
                <i className="fi fi-rr-leaf"/>
                {t("electricity.renewable")}
              </div>

              <span>
                {(
                  liveEnergy.solar +
                  liveEnergy.wind +
                  liveEnergy.hydro
                ).toFixed(0)} MW
              </span>
            </div>

            <div
              className="dashboard-item"
              style={{
                color: "#8b5cf6",
              }}
            >
              <div className="dashboard-title">
                <i className="fi fi-rr-radiation"/>
                {t("electricity.nuclear")}
              </div>

              <span>{liveEnergy.nuclear.toFixed(0)} MW</span>
            </div>

            <div
              className="dashboard-item"
              style={{
                color: "#60a5fa",
              }}
            >
              <div className="dashboard-title">
                <i className="fi fi-rr-chart-line-up"/>
                {t("electricity.costTitle")}

                <div className="info-wrapper">
                  <i
                    className="fi fi-rr-lightbulb-on"
                    style={{
                      color: "#facc15",
                      marginLeft: 4,
                      cursor: "help",
                      fontSize: 16,
                    }}
                  />

                  <div className="info-tooltip">
                    {t("electricity.costPressureTip")}
                  </div>
                </div>
              </div>

              <span>{liveCostPressure}</span>
            </div>

            <div
              className="dashboard-item"
              style={{
                color:
                  liveCostPressure >= 40
                    ? "#ef4444"
                    : liveCostPressure >= 25
                      ? "#f97316"
                      : "#22c55e",
              }}
            >
              <div className="dashboard-title">
                <i
                  className={
                    liveCostPressure >= 40
                      ? "fi fi-rr-exclamation"
                      : liveCostPressure >= 25
                        ? "fi fi-rr-warning"
                        : "fi fi-rr-shield-check"
                  }
                />
                {t("electricity.riskLevel")}

                <div className="info-wrapper">
                  <i
                    className="fi fi-rr-lightbulb-on"
                    style={{
                      color: "#facc15",
                      marginLeft: 4,
                      cursor: "help",
                      fontSize: 16,
                    }}
                  />

                  <div className="info-tooltip">
                    {t("electricity.riskLevelTip")}
                  </div>
                </div>
              </div>

              <span>
                {liveCostPressure >= 40
                  ? t("electricity.riskHigh")
                  : liveCostPressure >= 25
                    ? t("electricity.riskMedium")
                    : t("electricity.riskLow")}
              </span>
            </div>
          </div>

          {/* ========================= */}
          {/* ⚡ AI 電費試算 */}
          {/* ========================= */}

          <div className="electricity-card">
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
              {/* 台電官方計價 */}
              <div
                style={{
                  padding: "40px",
                  borderRadius: "30px",
                  background:
                    "linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(37, 99, 235, 0.05))",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                }}
              >
                <div
                  style={{
                    opacity: 0.7,
                    marginBottom: "12px",
                    fontSize: 24,
                    fontWeight: "bold",
                  }}
                >
                  <i
                    className="fi fi-rr-file-invoice-dollar"
                    style={{
                      marginRight: "8px",
                      fontSize: 28,
                      color: "#60a5fa",
                    }}
                  ></i>

                  {i18n.language === "en"
                    ? " Taipower's Official Pricing Calculation"
                    : " 台電官方計價試算"}
                </div>

                <div className="bill-price">NT$ {estimatedBill}</div>
                <div
                  style={{
                    marginTop: "20px",
                    opacity: 0.7,
                    fontSize: "14px",
                    lineHeight: 1.8,
                  }}
                >
                  <div
                    style={{
                      marginBottom: "8px",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {i18n.language === "en"
                      ? "Calculation Formula"
                      : "電費計算公式"}
                  </div>

                  {billResult.formulas.map((f, idx) => (
                    <div key={idx}>✦　{f}</div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    opacity: 0.7,
                    lineHeight: 1.8,
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
                  padding: "40px",
                  borderRadius: "30px",
                  background:
                    liveCostPressure >= 40
                      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(127, 29, 29, 0.05))"
                      : liveCostPressure >= 25
                        ? "linear-gradient(135deg, rgba(249, 115, 22, 0.16), rgba(154, 52, 18, 0.05))"
                        : "linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(20, 83, 45, 0.05))",
                  border:
                    liveCostPressure >= 40
                      ? "1px solid rgba(239, 68, 68, 0.25)"
                      : liveCostPressure >= 25
                        ? "1px solid rgba(249, 115, 22, 0.25)"
                        : "1px solid rgba(34, 197, 94, 0.25)",
                }}
              >
                <div
                  style={{
                    opacity: 0.7,
                    marginBottom: "12px",
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  <i
                    className="fi fi-rr-robot"
                    style={{
                      marginRight: "8px",
                      fontSize: 28,
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

          {/* 能源結構 */}
          {activeTab === "structure" && (
            <div className="electricity-card">
              <div className="analysis-header">
                <h2>
                  {t("electricity.structureTitle")}
                </h2>

                <div className="analysis-tabs">
                  <button
                    className={`analysis-tab ${
                      activeTab === "structure"
                        ? "active-structure"
                        : ""
                    }`}
                    onClick={() => setActiveTab("structure")}
                  >
                    {t("electricity.structure")}
                  </button>

                  <button
                    className={`analysis-tab ${
                      activeTab === "forecast"
                        ? "active-forecast"
                        : ""
                    }`}
                    onClick={() => setActiveTab("forecast")}
                  >
                    {t("electricity.forecast")}
                  </button>
                </div>
              </div>

              <p
                style={{
                  opacity: 0.75,
                  marginTop: "10px",
                  lineHeight: 1.8,
                }}
              >
                {t("electricity.structureDesc")}
              </p>

              <div
                style={{
                  width: "100%",
                  height: "600px",
                  marginTop: "30px",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={compareLineData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      opacity={0.8}
                    />

                    <XAxis
                      dataKey="year"
                      tickMargin={15}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                      axisLine={{
                        stroke: "#475569",
                        strokeWidth: 2,
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      tickMargin={15}
                      tickFormatter={(value) => `${value}%`}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                      axisLine={{
                        stroke: "#475569",
                        strokeWidth: 2,
                      }}
                      tickLine={false}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={false}
                    />

                    <Legend
                      wrapperStyle={{
                        paddingTop: 40,
                      }}
                    />

                    <Line
                      dataKey="coal"
                      name={t("energy.coal")}
                      stroke="#64748b"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                    />

                    <Line
                      dataKey="gas"
                      name={t("energy.gas")}
                      stroke="#3b82f6"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                    />

                    <Line
                      dataKey="nuclear"
                      name={t("energy.nuclear")}
                      stroke="#8b5cf6"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                    />

                    <Line
                      dataKey="renewable"
                      name={t("energy.renewable")}
                      stroke="#22c55e"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                    />

                    <Line
                      dataKey="oil"
                      name={t("energy.oil")}
                      stroke="#f97316"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 未來趨勢 */}
          {activeTab === "forecast" && (
            <div className="electricity-card">
              <div className="analysis-header">
                <h2>
                  {t("electricity.future")}
                </h2>

                <div className="analysis-tabs">
                  <button
                    className={`analysis-tab ${
                      activeTab === "structure"
                        ? "active-structure"
                        : ""
                    }`}
                    onClick={() => setActiveTab("structure")}
                  >
                    {t("electricity.structure")}
                  </button>

                  <button
                    className={`analysis-tab ${
                      activeTab === "forecast"
                        ? "active-forecast"
                        : ""
                    }`}
                    onClick={() => setActiveTab("forecast")}
                  >
                    {t("electricity.forecast")}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  className="forecast-badge"
                  style={{
                    padding: "4px 30px",
                    borderRadius: "999px",
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    color: "#60a5fa",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  <i className="fi fi-rr-chart-line-up"></i>
                  {i18n.language === "en"
                    ? " Trend Forecast"
                    : " 趨勢預測模型"}
                </div>

                <div
                  style={{
                    padding: "4px 30px",
                    borderRadius: "999px",
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    color: "#4ade80",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {i18n.language === "en"
                    ? "Reference Value"
                    : "具參考性"}
                </div>

                <div
                  style={{
                    padding: "4px 30px",
                    borderRadius: "999px",
                    background: "rgba(168, 85, 247, 0.12)",
                    border: "1px solid rgba(168, 85, 247, 0.25)",
                    color: "#c084fc",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  MAPE {forecastMAPE.toFixed(1)}%
                </div>
              </div>

              <p>{t("electricity.futureDesc")}</p>

              <div
                style={{
                  width: "100%",
                  height: "600px",
                  marginTop: "30px",
                }}
              >
                <div
                  style={{
                    margin: "10px 0",
                    color: "#94a3b8",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {t("electricity.historyForecast")}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 40,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#475569"
                      opacity={0.5}
                    />

                    <XAxis
                      dataKey="year"
                      tickMargin={15}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                      axisLine={{
                        stroke: "#475569",
                        strokeWidth: 2,
                      }}
                      tickLine={false}
                    />
                    
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickMargin={15}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                      axisLine={{
                        stroke: "#475569",
                        strokeWidth: 2,
                      }}
                      tickLine={false}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={false}
                      wrapperStyle={{
                        pointerEvents: "none",
                      }}
                    />

                    <Legend
                      wrapperStyle={{
                        paddingTop: 40,
                      }}
                    />

                    <ReferenceLine
                      x={2026}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={i18n.language === "en" ? "Current" : "目前"}
                    />

                    {/* 歷史 */}
                    <Area
                      type="monotone"
                      dataKey="historical"
                      hide
                      legendType="none"
                      stroke="none"
                      fill="rgba(34, 197, 94, 0.08)"
                    />
                    
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="#22c55e"
                      strokeWidth={4}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      name={i18n.language === "en" ? "Historical Cost Pressure" : "歷史成本壓力"}
                    />

                    {/* 預測 */}
                    <Area
                      type="monotone"
                      dataKey="interval"
                      legendType="none"
                      stroke="transparent"
                      fill="rgba(59, 130, 246, 0.2)"
                      baseLine={(d) => d.lower}
                      activeDot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      strokeDasharray="6 6"
                      dot={{ r: 5 }}
                      name={i18n.language === "en" ? "Prediction" : "未來預測"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ========================= */}
          {/* AI 建議 */}
          {/* ========================= */}

          <div className="electricity-card">
            <h2>
              <i
                className="fi fi-rr-robot"
                style={{
                  marginRight: "12px",
                  fieldSize: 28,
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
