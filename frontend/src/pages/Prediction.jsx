import React, { useState, useEffect } from "react";

// ✅ 改這裡（重點🔥）
import hierarchy from "../data/hierarchy.json";
import supplyCatalog from "../data/supply_catalog.json";

export default function Prediction() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [deptMap, setDeptMap] = useState({});
  const [energyMap, setEnergyMap] = useState({});

  // =========================
  // 📥 載入 JSON（改成 import🔥）
  // =========================
  useEffect(() => {
    // 🔹 hierarchy
    const map = {};

    const traverse = (obj) => {
      Object.entries(obj).forEach(([key, val]) => {
        map[key] = val.name;
        if (val.children) traverse(val.children);
      });
    };

    traverse(hierarchy);
    setDeptMap(map);

    // 🔹 supply catalog
    const energy = {};
    supplyCatalog.forEach(item => {
      energy[item.source_id] = item.name_zh;
    });
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const result = await res.json();

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

  return (
    <div style={{ padding: "100px 20px", color: "white", maxWidth: "900px", margin: "auto" }}>
      <h2>🔮 能源預測</h2>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="輸入：預測2025工業能源 或 明年工業用電"
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "10px",
          borderRadius: "8px",
          border: "none"
        }}
      />

      <button
        onClick={runPredict}
        style={{
          marginTop: "10px",
          padding: "12px",
          width: "100%",
          borderRadius: "8px",
          border: "none",
          background: "#22c55e",
          color: "white",
          cursor: "pointer"
        }}
      >
        開始預測
      </button>

      {loading && <p style={{ marginTop: "20px" }}>⏳ 預測中...</p>}

      {data?.error && (
        <p style={{ marginTop: "20px", color: "#ef4444" }}>
          ❌ {data.error}
        </p>
      )}

      {data && !data.error && (
        <div style={{ marginTop: "30px" }}>
          
          <div style={{ marginBottom: "20px", color: "#94a3b8" }}>
            您的問題：{question}
          </div>

          {data.summary.map((item, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "15px"
              }}
            >
              <h3>
                🏭 {deptMap[item.dept] || item.dept}
              </h3>

              {item.top.map((t, idx) => (
                <div key={idx}>
                  🔹 {energyMap[t[0]] || t[0]}：{t[1].toFixed(1)}%
                </div>
              ))}

              <div style={{ marginTop: "10px", color: "#94a3b8" }}>
                📊 分析：{getAnalysis(item.top, energyMap)}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "10px", color: "#64748b" }}>
            預測年份：{data.year}
          </div>

        </div>
      )}
    </div>
  );
}

// =========================
// 🔥 分析
// =========================
function getAnalysis(top, energyMap) {
  if (!top || top.length === 0) return "資料不足";

  const main = energyMap[top[0][0]];

  if (main?.includes("電")) return "電力需求上升，顯示電氣化趨勢";
  if (main?.includes("氣")) return "氣體能源使用增加，可能與能源轉型有關";
  if (main?.includes("煤")) return "煤炭仍占重要比例，但長期可能下降";

  return "能源結構正在變化";
}