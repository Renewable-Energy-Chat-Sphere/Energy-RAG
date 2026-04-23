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
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const API = `${window.location.protocol}//${window.location.hostname}:8000`;

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API}/dashboard`)
        .then((res) => res.json())
        .then((d) => {
          setData(d);

          const time = d.timestamp?.split(" ")[1];

          setHistory((prev) => [
            ...prev.slice(-20),
            {
              time,
              load: d.power,
              capacity: d.peak,
            },
          ]);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const reserve = ((data.peak - data.power) / data.peak) * 100;

  return (
    <div style={styles.page}>
      <div style={{ padding: 60 }}>
        {/* KPI */}
        <div style={styles.grid4}>
          <KPI title="尖峰負載" value={data.peak} unit="萬瓩" icon="⚡" color="#f97316" />
          <KPI title="備轉容量率" value={reserve.toFixed(1)} unit="%" icon="📊" color="#22c55e" />
          <KPI title="目前用電量" value={data.power} unit="萬瓩" icon="🔌" color="#3b82f6" />
          <KPI title="更新時間" value={data.timestamp?.split(" ")[1]} icon="⏱" color="#ec4899" />
        </div>

        {/* 即時電力狀態 */}
        <div style={{ ...styles.card, marginTop: 30 }}>
          <h2 style={styles.sectionTitle}>即時電力狀態</h2>

          <div style={styles.flex}>
            {/* 左：圓環 */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  ...styles.circle,
                  background: `conic-gradient(#22c55e ${reserve}%, #e5e7eb ${reserve}%)`,
                }}
              >
                <div style={styles.innerCircle}>
                  <div style={styles.circleText}>{reserve.toFixed(1)}%</div>
                  <div style={styles.circleSub}>備轉容量率</div>
                </div>
              </div>
            </div>

            {/* 右：燈號 */}
            <div style={{ flex: 2 }}>
              <div style={styles.statusGrid}>
                <StatusCard color="#22c55e" title="綠燈" desc="備轉容量率 ≥ 10%" />
                <StatusCard color="#facc15" title="黃燈" desc="6% ≤ 備轉容量率 < 10%" />
                <StatusCard color="#f97316" title="橘燈" desc="備轉容量率 < 6%" />
                <StatusCard color="#ef4444" title="紅燈" desc="限電警戒" />
              </div>
            </div>
          </div>
        </div>

        {/* 發電來源分布 */}
        <div style={{ marginTop: 30 }}>
          <h3 style={styles.sectionTitle}>發電來源分布</h3>

          <div style={styles.grid3}>
            <EnergyCard title="核能發電" value={0} color="#9333ea" />
            <EnergyCard title="燃煤發電" value={24} color="#334155" />
            <EnergyCard title="燃氣發電" value={59} color="#0ea5e9" />
            <EnergyCard title="再生能源" value={7} color="#22c55e" />
            <EnergyCard title="水力發電" value={3} color="#06b6d4" />
            <EnergyCard title="燃油發電" value={0} color="#7c2d12" />
          </div>
        </div>

        {/* 用電趨勢 */}
        <div style={{ ...styles.card, marginTop: 30 }}>
          <h2 style={styles.sectionTitle}>今日用電趨勢圖</h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />

              {/* 用電量 */}
              <Line
                type="monotone"
                dataKey="load"
                name="用電量"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
              />

              {/* 供電能力 */}
              <Line
                type="monotone"
                dataKey="capacity"
                name="供電能力"
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function KPI({ title, value, unit, icon, color }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiHeader}>
        <div style={{ ...styles.icon, background: color + "22", color }}>{icon}</div>
        <div style={styles.kpiTitle}>{title}</div>
      </div>

      <div style={styles.kpiValue}>
        {value} <span style={styles.unit}>{unit}</span>
      </div>
    </div>
  );
}

function StatusCard({ color, title, desc }) {
  return (
    <div style={{ ...styles.statusCard, background: color + "22" }}>
      <div style={{ ...styles.dot, background: color }} />
      <div>
        <div style={{ fontWeight: "bold" }}>{title}</div>
        <div style={{ fontSize: 12 }}>{desc}</div>
      </div>
    </div>
  );
}

function EnergyCard({ title, value, color }) {
  return (
    <div style={styles.energyCard}>
      <div style={{ ...styles.energyHeader, background: color }}>
        {title}
      </div>

      <div style={{ padding: 15 }}>
        <div style={styles.barBg}>
          <div style={{ ...styles.bar, width: value + "%", background: color }} />
        </div>

        <div style={{ fontWeight: "bold" }}>{value}%</div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Inter, Noto Sans TC",
  },

  sectionTitle: {
    marginBottom: 15,
  },

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 20,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 20,
  },

  kpi: {
    background: "white",
    borderRadius: 30,
    padding: 30,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },

  kpiHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  kpiTitle: {
    fontSize: 14,
    color: "#64748b",
  },

  kpiValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
  },

  unit: { fontSize: 14 },

  card: {
    background: "white",
    borderRadius: 30,
    padding: 25,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },

  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 40,
  },

  circleWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  circle: {
    width: 160,
    height: 160,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  circleText: {
    fontSize: 28,
    fontWeight: "bold",
  },

  circleSub: {
    fontSize: 12,
    color: "#64748b",
  },

  statusGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  statusCard: {
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: 20,
    borderRadius: 20,
  },

  dot: {
    width: 20,
    height: 20,
    marginLeft: 30,
    marginRight: 20,
    borderRadius: 10,
  },

  energyCard: {
    borderRadius: 20,
    overflow: "hidden",
    background: "white",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },

  energyHeader: {
    color: "white",
    padding: 20,
    fontWeight: "bold",
  },

  barBg: {
    height: 8,
    background: "#e5e7eb",
    borderRadius: 10,
    margin: "10px 0",
  },

  bar: {
    height: "100%",
    borderRadius: 10,
  },
};