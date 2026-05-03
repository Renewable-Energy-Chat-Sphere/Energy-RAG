import React, { useState, useEffect } from "react";

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

export default function Prediction() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [deptMap, setDeptMap] = useState({});
  const [energyMap, setEnergyMap] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(false);

  // =========================
  // 📥 載入 JSON（完全保留）
  // =========================
  useEffect(() => {
    const map = {};

    const traverse = (obj) => {
      Object.entries(obj).forEach(([key, val]) => {
        map[key] = val.name;
        if (val.children) traverse(val.children);
      });
    };

    traverse(hierarchy);
    setDeptMap(map);

    const energy = {};

    if (Array.isArray(supplyCatalog)) {
      supplyCatalog.forEach((item) => {
        energy[item.source_id] = item.name_zh || item.name;
      });
    } else {
      Object.entries(supplyCatalog).forEach(([id, item]) => {
        energy[id] = item.name_zh || item.name || id;
      });
    }

    setEnergyMap(energy);
  }, []);

  // =========================
  // 🔮 預測
  // =========================
  const runPredict = async () => {
    if (!question) return alert("請輸入問題");

    setLoading(true);
    setData(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/predict_department_energy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const result = await res.json();
      console.log("API RESULT:", result);

      if (result.error) {
        setData({ error: result.error });
        setLoading(false);
        return;
      }

      setData(result);
    } catch (err) {
      setData({ error: "API 連線失敗" });
    }

    setLoading(false);
  };

  // =========================
  // 🔥 新增：目前選擇的 dept + energy
  // =========================
  const getCurrentKey = () => {
    if (!data?.summary?.length) return null;

    const dept = data.summary[0].dept;
    const energy = data.summary[0].top[0][0];

    return { dept, energy };
  };

  // =========================
  // 🔥 圖表資料（修正）
  // =========================
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
          label: "實際值",
          data: e.actual,
          borderColor: "#3b82f6",
          tension: 0.3,
        },
        {
          label: "預測值",
          data: e.predicted,
          borderColor: "#ef4444",
          tension: 0.3,
        },
      ],
    };
  };

  // =========================
  // 🔥 準確度（MAPE）
  // =========================
  const getAccuracy = () => {
    if (!data?.accuracy) return null;

    const key = getCurrentKey();
    if (!key) return null;

    const fullKey = `${key.dept}_${key.energy}`;
    return data.accuracy[fullKey];
  };

  return (
    <div style={container}>
      
      <div style={headerRow}>
        <h2>🔮 能源預測</h2>

        <div
          style={circleIcon}
          onClick={() => setShowAnalysis(true)}
          title="模型分析"
        >
          ?
        </div>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="輸入：預測2025工業能源 或 明年工業用電"
        style={inputStyle}
      />

      <button onClick={runPredict} style={btnStyle}>
        開始預測
      </button>

      {loading && <p style={{ marginTop: "20px" }}>⏳ 預測中...</p>}

      {data?.error && (
        <p style={{ marginTop: "20px", color: "var(--danger-color)" }}>
          ❌ {data.error}
        </p>
      )}

      {data && !data.error && (
        <div style={{ marginTop: "30px" }}>
          <div style={{ marginBottom: "20px", color: "var(--text-secondary)" }}>
            您的問題：{question}
          </div>

          {data.summary?.map((item, i) => (
            <div key={i} style={card}>
              <h3>🏭 {deptMap[item.dept] || item.dept}</h3>

              {item.top?.map((t, idx) => (
                <div key={idx}>
                  🔹 {energyMap[t[0]] || t[0]}：{t[1].toFixed(1)}%
                </div>
              ))}

              <div style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
                📊 分析：{getAnalysis(item.top, energyMap)}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
            預測年份：{data.year}
          </div>
        </div>
      )}

      {showAnalysis && (
        <div style={overlayStyle} onClick={() => setShowAnalysis(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            
            <button style={closeBtn} onClick={() => setShowAnalysis(false)}>
              ✖
            </button>

            <h3>📊 模型分析</h3>

            <p style={{ color: "var(--success-color)" }}>
              預測誤差：{getAccuracy() ?? "--"}%（MAPE）
            </p>

            <div style={{ marginTop: "20px" }}>
              {getChartData() ? (
                <Line data={getChartData()} />
              ) : (
                <div style={chartBox}>沒有圖表資料</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// 分析（原本保留）
// =========================
function getAnalysis(top, energyMap) {
  if (!top || top.length === 0) return "資料不足";

  const main = energyMap[top[0][0]];

  if (main?.includes("電")) return "電力需求上升";
  if (main?.includes("氣")) return "氣體能源增加";
  if (main?.includes("煤")) return "煤炭仍占重要比例";

  return "能源結構正在變化";
}

// =========================
// UI（美化版 🔥）
// =========================
const container = {
  padding: "80px 20px",
  color: "var(--text-color)",
  maxWidth: "900px",
  margin: "auto",
  fontFamily: "system-ui, sans-serif",
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const circleIcon = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  border: "1px solid var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "0.2s",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginTop: "10px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "var(--text-color)",
  outline: "none",
  fontSize: "14px",
};

const btnStyle = {
  marginTop: "12px",
  padding: "14px",
  width: "100%",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "0.2s",
};

const card = {
  background: "var(--card-bg)",
  padding: "20px",
  marginBottom: "15px",
  borderRadius: "14px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.05)",
  transition: "0.2s",
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(4px)",
};

const modalStyle = {
  width: "520px",
  background: "var(--card-bg)",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  position: "relative",
  border: "1px solid rgba(255,255,255,0.08)",
};

const closeBtn = {
  position: "absolute",
  right: "12px",
  top: "12px",
  border: "none",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: "16px",
  cursor: "pointer",
};

const chartBox = {
  height: "220px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-secondary)",
};