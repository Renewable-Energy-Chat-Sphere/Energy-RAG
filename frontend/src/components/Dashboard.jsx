import { useEffect, useState, useRef } from "react";

/* ======================== */
/* 數字動畫 */
/* ======================== */

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = 16;
    const steps = duration / step;
    const increment = value / steps;

    const counter = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(counter);
      } else {
        setDisplay(Math.floor(start));
      }
    }, step);

    return () => clearInterval(counter);
  }, [value]);

  return (
    <span
      style={{
        color: "#4ade80",
        textShadow: "0 0 8px rgba(74,222,128,0.7)",
        animation: "pulseGlow 2s infinite alternate",
      }}
    >
      {display.toLocaleString()}
    </span>
  );
}

/* ======================== */
/* 主 Dashboard */
/* ======================== */

export default function Dashboard() {
  const [data, setData] = useState(null);

  /* ✅ 正確放在 component 內 */
  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (darkMode) {
      document.body.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const fetchData = () => {
      fetch("http://127.0.0.1:8000/dashboard")
        .then((res) => res.json())
        .then(setData);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "80px 40px 40px",
      }}
    >
      <h2 style={{ fontSize: 28, marginBottom: 50 }}>即時能源儀表板</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 40,
        }}
      >
        <Card title="今日用電量" value={data.power} unit="MWh" />
        <RenewableCard value={data.renewable} />
        <Card title="尖峰負載" value={data.peak} unit="MW" />
        <Card title="碳排估算" value={data.carbon} unit="噸 CO₂e" />
      </div>

      <div style={{ marginTop: 20, opacity: 0.7 }}>
        🟢 即時資料 | 最後更新 {data.timestamp?.split(" ")[1]}
      </div>
    </div>
  );
}

/* ======================== */
/* 卡片 */
/* ======================== */

function Card({ title, value, unit }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(10px)",
        padding: 30,
        borderRadius: 20,
        color: "white",
        border: "1px solid rgba(59,130,246,0.2)",
        boxShadow: "0 0 25px rgba(59,130,246,0.2)",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-10px)";
        e.currentTarget.style.boxShadow = "0 0 40px rgba(59,130,246,0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 0 25px rgba(59,130,246,0.2)";
      }}
    >
      <h4 style={{ opacity: 0.6 }}>{title}</h4>
      <div style={{ fontSize: 32, marginTop: 15 }}>
        <AnimatedNumber value={Number(value)} />{" "}
        <span style={{ fontSize: 16, opacity: 0.6 }}>{unit}</span>
      </div>
    </div>
  );
}

/* ======================== */
/* 環形圖 */
/* ======================== */

function RenewableCard({ value }) {
  const radius = 55;
  const stroke = 8;
  const normalized = radius * 2 * Math.PI;
  const offset = normalized - (value / 100) * normalized;

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(10px)",
        padding: 30,
        borderRadius: 20,
        color: "white",
        border: "1px solid rgba(74,222,128,0.2)",
        boxShadow: "0 0 25px rgba(74,222,128,0.2)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-10px)";
        e.currentTarget.style.boxShadow = "0 0 40px rgba(74,222,128,0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 0 25px rgba(74,222,128,0.2)";
      }}
    >
      <h4 style={{ opacity: 0.6 }}>再生能源占比</h4>

      <svg height="150" width="150" style={{ marginTop: 20 }}>
        <circle
          stroke="rgba(255,255,255,0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx="75"
          cy="75"
        />
        <circle
          stroke="#4ade80"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={normalized}
          strokeDashoffset={offset}
          r={radius}
          cx="75"
          cy="75"
          style={{
            transition: "stroke-dashoffset 0.6s ease",
            filter: "drop-shadow(0 0 8px #4ade80)",
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fill="white"
          fontSize="22"
          fontWeight="600"
        >
          {value}%
        </text>
      </svg>
    </div>
  );
}
