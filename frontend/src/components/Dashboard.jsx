import React from "react";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      fetch("http://127.0.0.1:8000/dashboard")
        .then((res) => res.json())
        .then((d) => {
          setData(d);

          const time = d.timestamp?.split(" ")[1];

          setHistory((prev) => [
            ...prev.slice(-20),
            { time, value: d.power },
          ]);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  /* 模擬能源結構（之後可接 API） */
  const energyMix = [
    { name: "燃煤", value: 35 },
    { name: "燃氣", value: 40 },
    { name: "核能", value: 10 },
    { name: "再生能源", value: data.renewable },
  ];

  const COLORS = ["#64748b", "#f97316", "#8b5cf6", "#22c55e"];

  return (
    <div style={{ padding: 30, background: "#f5f7fb", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: 20 }}>⚡ 即時能源儀表板</h2>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
        <KPI title="用電量" value={data.power} unit="MW" />
        <KPI title="尖峰負載" value={data.peak} unit="MW" />
        <KPI title="再生能源" value={data.renewable} unit="%" />
        <KPI title="碳排放" value={data.carbon} unit="噸" />
      </div>

      {/* 主區塊 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: 20,
          marginTop: 30,
        }}
      >
      
      {/* 圓餅圖（即時電力狀態） */}
      <div style={cardStyle}>
        <h4>即時電力狀態</h4>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
              <Pie
                  data={[
                    { name: "已使用", value: data.power },
                    { name: "剩餘", value: Math.max(data.peak - data.power, 0) },
                  ]}
                  dataKey="value"
                  innerRadius={70}   // 🔥 變環形圖
                  outerRadius={100}
              >
                <Cell fill="#22c55e" /> {/* 已使用 */}
                <Cell fill="#1e293b" /> {/* 剩餘 */}
              </Pie>

            {/* 🔥 中間顯示使用率 */}
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: "white", fontSize: 20, fontWeight: "bold" }}
              >
                {((data.power / data.peak) * 100).toFixed(1)}%
            </text>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* 🔥 補資訊（像 datatw） */}
        <div style={{ marginTop: 10, color: "#94a3b8" }}>
          用電量：{data.power} MW / {data.peak} MW
        </div>

        <div style={{ marginTop: 5, color: "#94a3b8" }}>
          備轉容量：{Math.max(data.peak - data.power, 0)} MW
        </div>
      </div>

      {/* 折線圖 */}
      <div style={cardStyle}>
          <h4>用電趨勢</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h4>能源細項</h4>
        <table style={{ width: "100%", marginTop: 10 }}>
          <thead>
            <tr>
              <th>能源類型</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {energyMix.map((e, i) => (
              <tr key={i}>
                <td>{e.name}</td>
                <td>{e.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* KPI 卡 */
function KPI({ title, value, unit }) {
  return (
    <div
      style={{
        background: "white",
        padding: 20,
        borderRadius: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 14, color: "#64748b" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>
        {value} <span style={{ fontSize: 14 }}>{unit}</span>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: 20,
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};