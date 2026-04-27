import React, { useState } from "react";

export default function Prediction() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const runPredict = async () => {
    if (!question) return alert("請輸入問題");

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("http://127.0.0.1:8000/predict_department_energy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = await res.json();

      if (data.error) {
        setResult("❌ " + data.error);
        setLoading(false);
        return;
      }

      let output = "";
      output += `您的問題：\n${question}\n\n`;
      output += `預測模擬建議：\n`;

      data.summary.forEach(item => {
        output += `【${item.dept}】\n`;

        item.top.forEach(t => {
          output += `- ${t[0]}：${t[1].toFixed(2)}%\n`;
        });

        output += "\n";
      });

      output += `（預測年份：${data.year}）`;

      setResult(output);

    } catch (err) {
      setResult("❌ API 連線失敗");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "100px 20px", color: "white" }}>
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

      {loading && <p style={{ marginTop: "10px" }}>⏳ 預測中...</p>}

      <pre style={{ marginTop: "20px", whiteSpace: "pre-wrap" }}>
        {result}
      </pre>
    </div>
  );
}