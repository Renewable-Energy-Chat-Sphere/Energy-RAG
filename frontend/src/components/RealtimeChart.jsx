import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";

export default function RealtimeChart() {
  const [data, setData] = useState([]);
  const [currentPower, setCurrentPower] = useState(0);

  useEffect(() => {
    const fetchData = () => {
      fetch("http://127.0.0.1:8000/dashboard")
        .then((res) => res.json())
        .then((d) => {
          const time = d.timestamp?.split(" ")[1];

          const fluctuated = d.power + Math.floor(Math.random() * 2000 - 1000);

          setCurrentPower(fluctuated);

          setData((prev) => [...prev.slice(-19), { time, value: fluctuated }]);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ============================= */
  /* 🔥 穩定度邏輯 */
  /* ============================= */

  const stability =
    currentPower < 180000
      ? { text: "系統穩定", color: "#22c55e" }
      : currentPower < 181000
        ? { text: "負載偏高", color: "#facc15" }
        : { text: "高風險負載", color: "#ef4444" };

  /* ============================= */
  /* 🔥 壓力條百分比 */
  /* ============================= */

  const pressurePercent = Math.min(
    100,
    Math.round((currentPower / 185000) * 100),
  );

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "60px auto",
        padding: 50,
        borderRadius: 25,
        color: "white",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(34,197,94,0.15), transparent 40%), linear-gradient(135deg,#0b1220 0%, #0f172a 100%)",
        boxShadow: "0 15px 50px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      {/* 🔵 標題區 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <h3 style={{ fontSize: 22 }}>即時負載趨勢</h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: stability.color,
              boxShadow: `0 0 12px ${stability.color}`,
              animation: "pulseDot 1.5s infinite",
            }}
          />
          <span style={{ color: stability.color }}>{stability.text}</span>
        </div>
      </div>

      {/* 🔵 折線圖 */}
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={data}>
          <CartesianGrid
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />

          <XAxis dataKey="time" stroke="#aaa" tick={{ fill: "#aaa" }} />

          <YAxis stroke="#aaa" tick={{ fill: "#aaa" }} />

          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderRadius: 12,
              border: "none",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            style={{
              filter: "drop-shadow(0 0 15px #3b82f6)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 🔵 壓力條 */}
      <div style={{ marginTop: 35 }}>
        <div
          style={{
            marginBottom: 8,
            opacity: 0.7,
          }}
        >
          負載壓力
        </div>

        <div
          style={{
            height: 14,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pressurePercent}%`,
              height: "100%",
              background:
                pressurePercent < 60
                  ? "#22c55e"
                  : pressurePercent < 85
                    ? "#facc15"
                    : "#ef4444",
              transition: "width 0.5s ease",
              boxShadow: "0 0 15px rgba(255,255,255,0.5)",
            }}
          />
        </div>

        <div style={{ marginTop: 6, opacity: 0.6 }}>{pressurePercent}%</div>
      </div>
    </div>
  );
}
