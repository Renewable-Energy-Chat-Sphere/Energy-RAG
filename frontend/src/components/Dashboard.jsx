import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./Dashboard.css";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const checkDark = () => {
      const dark = document
        .getElementById("main-content")
        ?.classList.contains("dark");
      setIsDark(dark);
    };

    checkDark();

    const observer = new MutationObserver(checkDark);
    const target = document.getElementById("main-content");

    if (target) {
      observer.observe(target, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = () => {
      fetch("http://127.0.0.1:8000/dashboard")
        .then((res) => res.json())
        .then((d) => {
          setData(d);

          const time = new Date(d.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });

          setHistory((prev) => [
            ...prev.slice(-20),
            {
              time,
              load: d.power,
              capacity: d.peak,
            },
          ]);
        })
        .catch(() => {
          const fakeEnergy = {
            nuclear: 7.5,
            coal: 28.0,
            gas: 42.0,
            renewable: 10.0,
            hydro: 9.0,
            oil: 4.5,
          };

          setData({
            peak: 5000,
            power: 3000,
            timestamp: "2026-04-25 23:00:00",
            energy: fakeEnergy,
          });

          const currentTime = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });

          setHistory((prev) => [
            ...prev.slice(-20),
            {
              time: currentTime,
              load: 3000,
              capacity: 5000,
            },
          ]);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const energySource = data.energy || {};

  const reserve =
    data.peak && data.power
      ? ((data.peak - data.power) / data.peak) * 100
      : 0;

  const getColor = (r) => {
    if (r >= 10) return "#22c55e";
    if (r >= 6) return "#facc15";
    if (r < 3) return "#f97316";
    return "#ef4444";
  };

  const energyMap = {
    nuclear: { label: "核能發電", color: "#8b5cf6", icon: "fi fi-br-radiation" },
    coal: { label: "燃煤發電", color: "#ef4444", icon: "fi fi-br-fireplace" },
    gas: { label: "燃氣發電", color: "#f59e0b", icon: "fi fi-br-flame" },
    renewable: { label: "再生能源", color: "#22c55e", icon: "fi fi-br-leaf" },
    hydro: { label: "水力發電", color: "#06b6d4", icon: "fi fi-br-water" },
    oil: { label: "燃油發電", color: "#f97316", icon: "fi fi-br-oil-can" },
  };

  const energyData = Object.entries(energySource).map(([key, value]) => ({
    title: energyMap[key]?.label || key,
    value: Number(value),
    color: energyMap[key]?.color || "#999",
    icon: energyMap[key]?.icon || "fi fi-rr-bolt",
  }));

  return (
    <div className={`dashboard-page ${isDark ? "dark" : ""}`}>
      <div className="top-section">

        <div className="grid4">
          <KPI title="尖峰負載" value={data.peak} unit="萬瓩" icon="fi fi-br-bolt" color="#f97316" />
          <KPI title="備轉容量率" value={reserve.toFixed(1)} unit="%" icon="fi fi-br-battery-half" color="#22c55e" />
          <KPI title="目前用電量" value={data.power} unit="萬瓩" icon="fi fi-br-plug" color="#3b82f6" />
          <KPI title="更新時間" value={data.timestamp?.split(" ")[1]} icon="fi fi-br-time-fast" color="#ec4899" />
        </div>

        <div className="flex-section">
          <div className="circle-section">
            <div className="circle-outer">
              <ResponsiveContainer width={400} height={400}>
                <PieChart>
                  <Pie
                    data={[
                      { value: reserve },
                      { value: 100 - reserve },
                    ]}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={180}
                    cornerRadius={18}
                    paddingAngle={4}
                    stroke="none"
                  >
                    <Cell fill={getColor(reserve)} />
                    <Cell fill={isDark ? "#334155" : "#e5e7eb"} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="circle-center">
                <div className="circle-text">{reserve.toFixed(1)}%</div>
                <div className="circle-sub">備轉容量率</div>
              </div>
            </div>
          </div>

          <div className="status-wrapper">
            <StatusCard color="#22c55e" title="綠燈" desc="備轉容量率 ≥ 10%" />
            <StatusCard color="#facc15" title="黃燈" desc="6% ≤ 備轉容量率 < 10%" />
            <StatusCard color="#f97316" title="橘燈" desc="備轉容量率 < 6%" />
            <StatusCard color="#ef4444" title="紅燈" desc="限電警戒" />
          </div>
        </div>

        <div className="energy-section">
          <div className="title-row">
            <i className="fi fi-br-chart-simple title-icon blue"></i>
            <div className="section-title">發電來源分布</div>
          </div>

          <div className="grid3">
            {energyData.map((e) => (
              <EnergyCard key={e.title}  {...e} />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="title-row">
            <i className="fi fi-br-tachometer-fast title-icon green"></i>
            <div className="section-title">即時用電趨勢圖</div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(value, index) => (index === 0 ? "" : value)}
              />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line type="monotone" dataKey="load" name="用電量" stroke="#3b82f6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="capacity" name="供電能力" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

function KPI({ title, value, unit, icon, color }) {
  return (
    <div className="kpi">
      <div className="kpi-header">
        <i className={icon} style={{ color }}></i>
        <div className="kpi-title">{title}</div>
      </div>
      <div className="kpi-value">
        {value} <span className="unit">{unit}</span>
      </div>
    </div>
  );
}

function StatusCard({ color, title, desc }) {
  return (
    <div className="status-card" style={{ background: color + "20" }}>
      <div className="dot" style={{ background: color }} />
      <div>
        <div className="bold">{title}</div>
        <div className="small">{desc}</div>
      </div>
    </div>
  );
}

function EnergyCard({ title, value, color, icon }) {
  return (
    <div className="energy-card">
      <div className="energy-top">
        <i className={icon} style={{ color }}></i>
        <div className="energy-title" style={{ color }}>{title}</div>
      </div>

      <div className="energy-value" style={{ color }}>
        {value.toFixed(1)}%
      </div>

      <div className="bar">
        <div className="bar-inner" style={{ width: value + "%", background: color }} />
      </div>
    </div>
  );
}