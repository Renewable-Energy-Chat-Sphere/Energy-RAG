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
  
  /* STYLES */
  const [isDark, setIsDark] = useState(false);

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

  const theme = isDark
  ? {
      card: "#1e293b",
      card2: "#111827",
      text: "#f8fafc",
      muted: "#94a3b8",
      border: "#334155",
    }
  : {
      bg: "#f1f5f9",
      card: "#ffffff",
      card2: "#f8fafc",
      text: "#0f172a",
      muted: "#64748b",
      border: "#e5e7eb",
    };

  const styles = {
    topSection: {
      padding: 60,
      background: theme.card,
      color: isDark ? "#e5e7eb" : theme.text,
    },

    page: {
      background: theme.bg,
      minHeight: "100vh",
      fontFamily: "Inter, Noto Sans TC",
      color: isDark ? "#e5e7eb" : theme.text,
    },

    sectionTitle: {
      marginBottom: 15,
      color: isDark ? "#f1f5f9" : theme.text,
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

    /* KPI */
    kpi: {
      background: theme.card,
      borderRadius: 30,
      padding: 30,
      boxShadow: isDark
        ? "0 8px 30px rgba(0,0,0,0.6)"
        : "0 4px 20px rgba(0,0,0,0.08)",
      border: `1px solid ${theme.border}`,
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
      color: isDark ? "#9ca3af" : theme.muted, // 🔥 小字柔化
    },

    kpiValue: {
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 10,
      color: isDark ? "#f9fafb" : theme.text,
    },

    unit: {
      fontSize: 14,
      color: isDark ? "#e5e7eb" : theme.text,
    },

    /* card */
    card: {
      background: theme.card,
      borderRadius: 40,
      padding: "40px 60px",
      boxShadow: isDark
        ? "0 8px 30px rgba(0,0,0,0.6)"
        : "0 4px 20px rgba(0,0,0,0.08)",
      border: `1px solid ${theme.border}`,
    },

    flex: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 40,
    },

    circleSection: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },

    circleOuter: {
      padding: 10,
      borderRadius: "50%",
      background: theme.card,
    },

    circle: {
      width: 300,
      height: 300,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isDark
        ? "0 8px 30px rgba(0,0,0,0.6)"
        : "0 4px 20px rgba(0,0,0,0.1)",
    },

    innerCircle: {
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: theme.card2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      border: `1px solid ${theme.border}`,
    },

    circleText: {
      fontSize: 36,
      fontWeight: "bold",
      letterSpacing: "1px",
      color: isDark ? "#f9fafb" : theme.text,
    },

    circleSub: {
      fontSize: 18,
      color: isDark ? "#9ca3af" : theme.muted,
    },

    /* status */
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
      background: theme.card2,
      border: `1px solid ${theme.border}`,
      color: isDark ? "#e5e7eb" : theme.text,
    },

    dot: {
      width: 20,
      height: 20,
      marginLeft: 30,
      marginRight: 20,
      borderRadius: 10,
    },

    /* energy */
    energyCard: {
      borderRadius: 20,
      overflow: "hidden",
      background: theme.card2,
      border: `1px solid ${theme.border}`,
      boxShadow: isDark
        ? "0 6px 20px rgba(0,0,0,0.5)"
        : "0 4px 20px rgba(0,0,0,0.08)",
    },

    energyHeader: {
      color: isDark ? "#f1f5f9" : theme.text,
      padding: 20,
      fontWeight: "bold",
    },

    barBg: {
      height: 8,
      background: isDark ? "#1e293b" : theme.border,
      borderRadius: 10,
      margin: "10px 0",
    },

    bar: {
      height: "100%",
      borderRadius: 10,
    },
  };

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
  const getColor = (r) => {
    const value = Number(r); 
    if (r >= 10) return "#22c55e";
    if (r >= 6) return "#facc15";
    if (r < 3) return "#f97316";
    return "#ef4444";
  };

  return (
    <div style={styles.page}>
      <div style={ styles.topSection }>
        {/* KPI */}
        <div style={styles.grid4}>
          <KPI title="尖峰負載" value={data.peak} unit="萬瓩" icon="⚡" color="#f97316" styles={styles} />
          <KPI title="備轉容量率" value={reserve.toFixed(1)} unit="%" icon="📊" color="#22c55e" styles={styles} />
          <KPI title="目前用電量" value={data.power} unit="萬瓩" icon="🔌" color="#3b82f6" styles={styles} />
          <KPI title="更新時間" value={data.timestamp?.split(" ")[1]} icon="⏱" color="#ec4899" styles={styles} />
        </div>

      <div style={{ marginTop: 50 }}>
        <div style={styles.flex}>
          {/* 左：圓環 */}
          <div style={styles.circleSection}>
            <div style={styles.circleOuter}>
              <div
                style={{
                  ...styles.circle,
                  background: `conic-gradient(${getColor(reserve)} ${reserve}%, #e5e7eb 0%)`
                }}
              >
                <div style={styles.innerCircle}>
                  <div style={styles.circleText}>{reserve.toFixed(1)}%</div>
                  <div style={styles.circleSub}>備轉容量率</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右：卡片 */}
          <div style={{ ...styles.card, flex: 1.5 }}>
            <h2 style={styles.sectionTitle}>即時電力狀態</h2>

            <div style={styles.statusGrid}>
              <StatusCard color="#22c55e" title="綠燈" desc="備轉容量率 ≥ 10%" styles={styles} />
              <StatusCard color="#facc15" title="黃燈" desc="6% ≤ 備轉容量率 < 10%" styles={styles} />
              <StatusCard color="#f97316" title="橘燈" desc="備轉容量率 < 6%" styles={styles} />
              <StatusCard color="#ef4444" title="紅燈" desc="限電警戒" styles={styles} />
            </div>
          </div>
        </div>
      </div>

        {/* 發電來源分布 */}
        <div style={{ marginTop: 30 }}>
          <h2 style={styles.sectionTitle}>發電來源分布</h2>

          <div style={styles.grid3}>
            <EnergyCard title="核能發電" value={0} color="#9333ea" styles={styles} />
            <EnergyCard title="燃煤發電" value={24} color="#334155" styles={styles} />
            <EnergyCard title="燃氣發電" value={59} color="#0ea5e9" styles={styles} />
            <EnergyCard title="再生能源" value={7} color="#22c55e" styles={styles} />
            <EnergyCard title="水力發電" value={3} color="#06b6d4" styles={styles} />
            <EnergyCard title="燃油發電" value={0} color="#7c2d12" styles={styles} />
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

/* COMPONENTS */

function KPI({ title, value, unit, icon, color, styles }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiHeader}>
        <div style={{ ...styles.icon, background: color + "20", color }}>{icon}</div>
        <div style={styles.kpiTitle}>{title}</div>
      </div>

      <div style={styles.kpiValue}>
        {value} <span style={styles.unit}>{unit}</span>
      </div>
    </div>
  );
}

function StatusCard({ color, title, desc, styles }) {
  return (
    <div style={{ ...styles.statusCard, background: color + "20" }}>
      <div style={{ ...styles.dot, background: color }} />
      <div>
        <div style={{ fontWeight: "bold" }}>{title}</div>
        <div style={{ fontSize: 12 }}>{desc}</div>
      </div>
    </div>
  );
}

function EnergyCard({ title, value, color, styles }) {
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
