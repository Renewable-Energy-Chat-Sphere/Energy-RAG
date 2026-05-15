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
      }
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
    // =========================
    setData(result);

  } catch (err) {

    console.error(err);

    // 🔥 真正 API 壞掉才顯示這個
    setData({
      mode: "guide",
      message:
        "❌ 無法連接 AI 預測服務，請確認後端是否已啟動。",
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
        <h2 style={title}>🔮 {t("prediction.title")}</h2>

        <div style={analysisBtn} onClick={() => setShowAnalysis(true)}>
          📊
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
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      >
        {t("prediction.start")}
      </button>

      {loading && <p style={{ marginTop: 20 }}>⏳ {t("prediction.loading")}</p>}
      {/* 🔥 Guide / Error Message */}
      {data?.mode === "guide" && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 18px",
            borderRadius: "14px",

            background: "rgba(59,130,246,0.12)",

            border:
              "1px solid rgba(59,130,246,0.35)",

            color: "#93c5fd",

            lineHeight: 1.8,
            fontSize: "15px",
          }}
        >
          {data.message}
        </div>
      )}

      {/* 🔹 卡片 */}
      {data &&
      data.mode !== "guide" &&
      !data.error && (
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

              color:
                data.mode === "history"
                  ? "#93c5fd"
                  : "#86efac",

              lineHeight: 1.7,
              fontSize: "15px",
            }}
          >
            {data.mode === "history"
              ? "📘 此年份已有真實能源資料，以下為實際能源結構結果。"
              : "🔮 此結果為 AI 未來能源預測，僅供趨勢分析與研究參考。"}
          </div>

          {data.summary?.map((item, i) => {

            // 🔥 改成 prediction
            const fullData =
              data?.prediction?.[item.dept] || {};

            return (
              <div
                key={i}
                style={{
                  ...card,
                  transform:
                    selectedCard === i
                      ? "scale(1.03)"
                      : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-6px)";

                  e.currentTarget.style.boxShadow =
                    "0 0 25px rgba(34,197,94,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(0)";

                  e.currentTarget.style.boxShadow =
                    "none";
                }}
                onClick={() =>
                  setSelectedCard(
                    selectedCard === i ? null : i
                  )
                }
              >
                {/* 🔹 部門名稱 */}
                <h3 style={cardTitle}>
                  🏭 {deptMap[item.dept] || item.dept}
                </h3>

                {/* 🔹 Top3 */}
                {item.top?.map((t, idx) => (
                  <div key={idx} style={row}>
                    <span style={label}>
                      {energyMap[t[0]] || t[0]}
                    </span>

                    <div style={barBg}>
                      <div
                        style={{
                          ...barFill,
                          width: `${t[1]}%`,
                        }}
                      />
                    </div>

                    <span style={percent}>
                      {t[1].toFixed(1)}%
                    </span>
                  </div>
                ))}

                {/* 🔹 詳細資料 */}
                {selectedCard === i && (
                  <div style={detailBox}>
                    <h4>
                      📌 {t("prediction.allEnergy")}
                    </h4>

                    {Object.keys(fullData).length === 0 && (
                      <p>
                        {t("prediction.noData")}
                      </p>
                    )}

                    {Object.entries(fullData)
                      .sort((a, b) => b[1] - a[1])
                      .map(([energy, value], idx) => (
                        <div
                          key={idx}
                          style={detailRow}
                        >
                          <span>
                            {energyMap[energy] || energy}
                          </span>

                          <span>
                            {value.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                  </div>
                )}
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
              ✖
            </button>

            <h3>📊 {t("prediction.analysis")}</h3>

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
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "white",
};

const card = {
  background: "var(--card-bg)",
  padding: "20px",
  borderRadius: "16px",
  marginBottom: "18px",
  border: "1px solid rgba(34,197,94,0.3)",
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
  boxShadow: "0 0 10px #22c55e",
};

const detailBox = {
  marginTop: "12px",
  padding: "10px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "10px",
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
