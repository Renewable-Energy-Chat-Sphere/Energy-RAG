import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// 🔥 Chart.js
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend);

// JSON
import hierarchy from "../data/hierarchy.json";
import supplyCatalog from "../data/supply_catalog.json";
import BackToTopButton from "../components/BackToTopButton";
export default function Prediction() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [deptMap, setDeptMap] = useState({});
  const [energyMap, setEnergyMap] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedForecastYear, setSelectedForecastYear] = useState(null);
  const { t } = useTranslation();
  // =========================
  // 📥 JSON mapping
  // =========================
  useEffect(() => {
    const map = {};
    const traverse = (obj) => {
      Object.entries(obj).forEach(([key, val]) => {
        map[key] = val.name_zh || val.name_en || key;
        if (val.children) traverse(val.children);
      });
    };
    traverse(hierarchy);
    setDeptMap(map);

    const energy = {};
    Object.entries(supplyCatalog).forEach(([id, item]) => {
      energy[id] = item.name_zh || item.name || id;
    });
    setEnergyMap(energy);
  }, []);

  // =========================
  // 🔮 API
  // =========================
  const runPredict = async () => {
    if (!question) {
      setData({
        mode: "guide",
        message:
          "💡 請輸入預測問題，例如：114工業部門能源結構、未來5年農業能源。",
      });

      return;
    }

    setLoading(true);
    setData(null);
    setSelectedCard(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/predict_department_energy",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question,
          }),
        },
      );

      const result = await res.json();

      // =========================
      // 🔥 guide mode
      // =========================
      if (result.mode === "guide") {
        setData({
          mode: "guide",
          message: result.message,
        });

        setLoading(false);
        return;
      }

      // =========================
      // 🔥 backend error
      // =========================
      if (result.error) {
        setData({
          mode: "guide",
          message: result.error,
        });

        setLoading(false);
        return;
      }

      // =========================
      // ✅ success
      setData(result);

      // 🔥 未來多年預測
      if (result.mode === "forecast_range" && result.available_years?.length) {
        setSelectedForecastYear(result.available_years[0]);
      }
    } catch (err) {
      console.error(err);

      // 🔥 真正 API 壞掉才顯示這個
      setData({
        mode: "guide",
        message: "系統目前無法連接 AI 預測服務。",
      });
    }

    setLoading(false);
  };

  // =========================
  // 📊 圖表
  // =========================
  const getCurrentKey = () => {
    if (!data?.summary?.length) return null;

    return {
      dept: data.summary[0].dept,
      energy: data.summary[0].top[0][0],
    };
  };

  const getChartData = () => {
    if (!data?.evaluation) return null;

    const key = getCurrentKey();
    if (!key) return null;

    const e = data.evaluation?.[key.dept]?.[key.energy];
    if (!e) return null;

    return {
      labels: e.years,
      datasets: [
        {
          label: t("prediction.actual"),
          data: e.actual,
          borderColor: "#3b82f6",
          tension: 0.3,
        },
        {
          label: t("prediction.predicted"),
          data: e.predicted,
          borderColor: "#22c55e",
          tension: 0.3,
        },
      ],
    };
  };
  const getEnergyColor = (name) => {
    // 🔥 火力 / 石油
    if (name.includes("煤") || name.includes("油") || name.includes("柴油")) {
      return {
        color: "#ef4444",
        glow: "0 0 10px #ef4444",
      };
    }

    // ☀️ 太陽能
    if (name.includes("太陽") || name.includes("光")) {
      return {
        color: "#facc15",
        glow: "0 0 10px #facc15",
      };
    }

    // 🌬️ 風力
    if (name.includes("風")) {
      return {
        color: "#38bdf8",
        glow: "0 0 10px #38bdf8",
      };
    }

    // 💧 水力
    if (name.includes("水")) {
      return {
        color: "#3b82f6",
        glow: "0 0 10px #3b82f6",
      };
    }

    // ⚛️ 核能
    if (name.includes("核")) {
      return {
        color: "#a855f7",
        glow: "0 0 10px #a855f7",
      };
    }

    // ⚡ 電力
    if (name.includes("電")) {
      return {
        color: "#22c55e",
        glow: "0 0 10px #22c55e",
      };
    }

    return {
      color: "#94a3b8",
      glow: "0 0 10px #94a3b8",
    };
  };
  const getAccuracy = () => {
    if (!data?.accuracy) return null;

    const key = getCurrentKey();
    if (!key) return null;

    return data.accuracy[`${key.dept}_${key.energy}`];
  };

  return (
    <div style={container}>
      {/* 🔹 Header */}
      <div style={headerRow}>
        <h2
          style={{
            ...title,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <i
            className="fi fi-rr-sparkles"
            style={{
              color: "#a855f7",
              filter: "drop-shadow(0 0 6px #a855f7)",
            }}
          ></i>{" "}
          {t("prediction.title")}
        </h2>

        <div style={analysisBtn} onClick={() => setShowAnalysis(true)}>
          <i
            className="fi fi-rr-chart-line-up"
            style={{
              fontSize: "20px",
              color: "#60a5fa",
            }}
          ></i>
        </div>
      </div>

      {/* 🔹 Input */}
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("prediction.inputPlaceholder")}
        style={inputStyle}
      />

      <button
        onClick={runPredict}
        style={btnStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px) scale(1.02)";

          e.target.style.boxShadow = "0 8px 24px rgba(197, 121, 34, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0) scale(1)";

          e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        }}
      >
        {t("prediction.start")}
      </button>

      {loading && (
        <p style={{ marginTop: 20 }}>
          <i
            className="fi fi-rr-spinner spinner-icon"
            style={{
              marginRight: "8px",
              color: "#60a5fa",
            }}
          ></i>{" "}
          {t("prediction.loading")}
        </p>
      )}
      {/* 🔥 Guide / Error Message */}
      {data?.mode === "guide" && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 18px",
            borderRadius: "14px",

            background: "rgba(59,130,246,0.12)",

            border: "1px solid rgba(59,130,246,0.35)",

            color: "#93c5fd",

            lineHeight: 1.8,
            fontSize: "15px",
          }}
        >
          {data.message}
        </div>
      )}

      {/* 🔹 卡片 */}
      {data && data.mode !== "guide" && !data.error && (
        <div style={{ marginTop: 40 }}>
          {/* 🔹 使用者問題 */}
          <div style={{ marginBottom: 20 }}>
            {t("prediction.yourQuestion")}：{question}
          </div>

          {/* 🔥 歷史 / AI 模式提示 */}
          <div
            style={{
              marginBottom: 24,
              padding: "14px 18px",
              borderRadius: "12px",

              background:
                data.mode === "history"
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(34,197,94,0.12)",

              border:
                data.mode === "history"
                  ? "1px solid rgba(59,130,246,0.35)"
                  : "1px solid rgba(34,197,94,0.35)",

              color: data.mode === "history" ? "#4ca0ff" : "#00c448",

              lineHeight: 1.7,
              fontSize: "15px",

              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",

                background: data.mode === "history" ? "#3b82f6" : "#22c55e",

                boxShadow:
                  data.mode === "history"
                    ? "0 0 12px #3b82f6"
                    : "0 0 12px #22c55e",
              }}
            />

            {data.mode === "history"
              ? "此年份已有真實能源資料，以下為實際能源結構結果。"
              : "此結果為 AI 未來能源預測，僅供趨勢分析與研究參考。"}
          </div>

          {/* 🔥 多年份切換 */}
          {data.mode === "forecast_range" && (
            <div
              style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                <i
                  className="fi fi-rr-calendar"
                  style={{
                    marginRight: "8px",
                    color: "#60a5fa",
                  }}
                ></i>
                選擇年份
              </span>

              <select
                value={selectedForecastYear || ""}
                onChange={(e) =>
                  setSelectedForecastYear(Number(e.target.value))
                }
                style={selectStyle}
              >
                {data.available_years?.map((y) => (
                  <option
                    key={y}
                    value={y}
                    style={{
                      background: "white",
                      color: "#111827",
                    }}
                  >
                    {y} 年
                  </option>
                ))}
              </select>
            </div>
          )}

          {(data.mode === "forecast_range"
            ? data.years?.[selectedForecastYear]?.summary
            : data.summary
          )?.map((item, i) => {
            // 🔥 多年份 / 單年份共用
            const fullData =
              data.mode === "forecast_range"
                ? data?.years?.[selectedForecastYear]?.prediction?.[
                    item.dept
                  ] || {}
                : data?.prediction?.[item.dept] || {};

            return (
              <div
                key={i}
                style={{
                  ...card,
                  transform: selectedCard === i ? "scale(1.03)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";

                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";

                  e.currentTarget.style.boxShadow = "none";
                }}
                onClick={() => setSelectedCard(selectedCard === i ? null : i)}
              >
                {/* 🔹 部門名稱 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h3 style={cardTitle}>
                    <i
                      className="fi fi-rr-industry"
                      style={{
                        marginRight: "8px",
                        color: "#22c55e",
                      }}
                    ></i>

                    {deptMap[item.dept] || item.dept}
                  </h3>

                  <i
                    className={
                      selectedCard === i
                        ? "fi fi-rr-angle-small-up"
                        : "fi fi-rr-angle-small-down"
                    }
                    style={{
                      fontSize: "22px",
                      color: "#94a3b8",
                      transition: "0.25s",
                    }}
                  ></i>
                </div>

                {/* 🔹 Top3 */}
                {item.top?.map((t, idx) => (
                  <div key={idx} style={row}>
                    <span style={label}>{energyMap[t[0]] || t[0]}</span>

                    <div style={barBg}>
                      <div
                        style={{
                          ...barFill,
                          width: `${t[1]}%`,

                          background: getEnergyColor(energyMap[t[0]] || t[0])
                            .color,
                        }}
                      />
                    </div>

                    <span style={percent}>{t[1].toFixed(1)}%</span>
                  </div>
                ))}

                {/* 🔹 詳細資料 */}
                <div
                  style={{
                    ...detailBox,

                    maxHeight: selectedCard === i ? "1000px" : "0px",

                    opacity: selectedCard === i ? 1 : 0,

                    transform:
                      selectedCard === i ? "translateY(0)" : "translateY(-8px)",

                    padding: selectedCard === i ? "10px" : "0 10px",
                  }}
                >
                  <h4>
                    <i
                      className="fi fi-rr-list"
                      style={{
                        marginRight: "8px",
                        color: "#facc15",
                      }}
                    ></i>{" "}
                    {t("prediction.allEnergy")}
                  </h4>

                  {Object.keys(fullData).length === 0 && (
                    <p>{t("prediction.noData")}</p>
                  )}

                  {Object.entries(fullData)
                    .sort((a, b) => b[1] - a[1])
                    .map(([energy, value], idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            width: "140px",
                            fontSize: "14px",
                          }}
                        >
                          {energyMap[energy] || energy}
                        </span>

                        <div style={barBg}>
                          <div
                            style={{
                              ...barFill,
                              width: `${value}%`,

                              background: getEnergyColor(
                                energyMap[energy] || energy,
                              ).color,
                            }}
                          />
                        </div>

                        <span
                          style={{
                            width: "60px",
                            textAlign: "right",
                            fontSize: "14px",
                          }}
                        >
                          {value.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔹 趨勢圖 modal */}
      {showAnalysis && (
        <div style={overlayStyle} onClick={() => setShowAnalysis(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setShowAnalysis(false)}>
              <i className="fi fi-rr-cross-small"></i>
            </button>

            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <i
                className="fi fi-rr-chart-line-up"
                style={{
                  color: "#60a5fa",
                  filter: "drop-shadow(0 0 6px #60a5fa)",
                }}
              ></i>{" "}
              {t("prediction.analysis")}
            </h3>

            <p style={{ color: "#22c55e" }}>
              {t("prediction.accuracy")}：{getAccuracy() ?? "--"}%
            </p>

            <div style={{ marginTop: 20 }}>
              {getChartData() ? (
                <Line data={getChartData()} />
              ) : (
                <div style={chartBox}>{t("prediction.noData")}</div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
.spinner-icon {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  animation: spin 1s linear infinite;

  transform-origin: center center;

  vertical-align: middle;

  width: 16px;
  height: 16px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

`}</style>
      <BackToTopButton />
    </div>
  );
}

// ================= UI =================

const container = {
  minHeight: "calc(100vh - 220px)",
  padding: "80px 20px",
  maxWidth: "900px",
  margin: "auto",
  color: "var(--text-color)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
};

const title = {
  fontSize: "22px",
};

const analysisBtn = {
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.05)",
  color: "var(--text-color)",
};

const btnStyle = {
  marginTop: "12px",
  padding: "14px",
  width: "100%",

  borderRadius: "10px",

  background: "#f97316",

  color: "white",

  cursor: "pointer",

  transition: "all 0.25s ease",

  border: "1px solid rgba(255,255,255,0.08)",

  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};

const card = {
  background: "var(--card-bg)",
  padding: "20px",
  borderRadius: "16px",
  marginBottom: "18px",
  border: "1px solid rgba(148, 163, 184, 0.56)",
  transition: "transform 0.25s ease, box-shadow 0.25s ease",
  cursor: "pointer",
};

const cardTitle = {
  marginBottom: "12px",
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const label = {
  width: "110px",
};

const percent = {
  width: "60px",
  textAlign: "right",
};

const barBg = {
  flex: 1,
  height: "8px",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "8px",
};

const barFill = {
  height: "100%",
  background: "#22c55e",
  borderRadius: "8px",
};

const detailBox = {
  marginTop: "12px",

  padding: "10px",

  background: "rgba(255,255,255,0.05)",

  borderRadius: "10px",

  overflow: "hidden",

  maxHeight: "1000px",

  opacity: 1,

  transform: "translateY(0)",

  transition: "max-height 0.45s ease, opacity 0.3s ease, transform 0.3s ease",
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle = {
  width: "520px",
  background: "var(--card-bg)",
  padding: "24px",
  borderRadius: "16px",
  position: "relative",
};

const closeBtn = {
  position: "absolute",
  right: "10px",
  top: "10px",
};

const chartBox = {
  height: "260px",
};
const selectStyle = {
  padding: "10px 14px",
  borderRadius: "12px",

  border: "1px solid rgba(148,163,184,0.35)",

  background: "var(--card-bg)",
  color: "var(--text-color)",

  fontSize: "15px",
  fontWeight: "600",

  outline: "none",
  cursor: "pointer",
};
