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

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  /* THEME CHECK */
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
      padding: "30px 40px",
      boxShadow: isDark
        ? "0 8px 30px rgba(0,0,0,0.6)"
        : "0 4px 20px rgba(0,0,0,0.08)",
      border: `2px solid ${theme.border}`,
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
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? "#9ca3af" : theme.muted,
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
      borderRadius: 50,
      padding: 50,
      boxShadow: isDark
        ? "0 8px 30px rgba(0,0,0,0.6)"
        : "0 4px 20px rgba(0,0,0,0.08)",
      border: `2px solid ${theme.border}`,
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
      position: "relative",
    },

    innerCircle: {
      borderRadius: "50%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
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

    titleRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 15,
    },

    sectionTitle: {
      margin: 10,
      fontSize: 28,
      fontWeight: "bold",
      color: isDark ? "#f1f5f9" : theme.text,
    },

    titleIcon: {
      margin: 10,
      fontSize: 28,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
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
      padding: 30,
      borderRadius: 30,
      background: theme.card2,
      color: isDark ? "#e5e7eb" : theme.text,
    },

    dot: {
      width: 25,
      height: 25,
      marginLeft: 30,
      marginRight: 20,
      borderRadius: 50,
    },

    /* energy card */
    energyCard: {
      borderRadius: 40,
      overflow: "hidden",
      background: theme.card2,
      border: `2px solid ${theme.border}`,
      boxShadow: isDark
        ? "0 6px 20px rgba(0,0,0,0.5)"
        : "0 4px 20px rgba(0,0,0,0.08)",
    },
  };

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

  // 假數據
  const fakeEnergy = {
    nuclear: 7.5,
    coal: 28.0,
    gas: 42.0,
    renewable: 10.0,
    hydro: 9.0,
    oil: 4.5
  };

  const energySource = data.energy || fakeEnergy;

  const reserve = ((data.peak - data.power) / data.peak) * 100;

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
    <div style={styles.page}>
      <div style={styles.topSection}>
        <div style={styles.grid4}>
          <KPI title="尖峰負載" value={data.peak} unit="萬瓩" icon="fi fi-br-bolt" color="#f97316" styles={styles} />
          <KPI title="備轉容量率" value={reserve.toFixed(1)} unit="%" icon="fi fi-br-battery-half" color="#22c55e" styles={styles} />
          <KPI title="目前用電量" value={data.power} unit="萬瓩" icon="fi fi-br-plug" color="#3b82f6" styles={styles} />
          <KPI title="更新時間" value={data.timestamp?.split(" ")[1]} icon="fi fi-br-time-fast" color="#ec4899" styles={styles} />
        </div>

        <div style={{ marginTop: 50, ...styles.flex }}>
          <div style={styles.circleSection}>
            <div style={styles.circleOuter}>
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

              <div style={{ ...styles.innerCircle, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <div style={styles.circleText}>{reserve.toFixed(1)}%</div>
                <div style={styles.circleSub}>備轉容量率</div>
              </div>
            </div>
          </div>

          <div style={{ ...styles.card, flex: 1.5 }}>
            <div style={styles.statusGrid}>
              <StatusCard color="#22c55e" title="綠燈" desc="備轉容量率 ≥ 10%" styles={styles} />
              <StatusCard color="#facc15" title="黃燈" desc="6% ≤ 備轉容量率 < 10%" styles={styles} />
              <StatusCard color="#f97316" title="橘燈" desc="備轉容量率 < 6%" styles={styles} />
              <StatusCard color="#ef4444" title="紅燈" desc="限電警戒" styles={styles} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 30 }}>
          <div style={styles.titleRow}>
            <i className="fi fi-br-chart-simple" style={{ ...styles.titleIcon, color: "#3b82f6" }}></i>
            <p style={styles.sectionTitle}>發電來源分布</p>
          </div>

          <div style={styles.grid3}>
            {energyData.map((e) => (
              <EnergyCard key={e.title} {...e} styles={styles} />
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, marginTop: 30 }}>
          <div style={styles.titleRow}>
            <i className="fi fi-br-tachometer-fast" style={{ ...styles.titleIcon, color: "#22c55e" }}></i>
            <p style={styles.sectionTitle}>即時用電趨勢圖</p>
          </div>
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
        <div style={{ lineHeight: 1, color, fontSize: 24 }}>
          <i className={icon}></i>
        </div>
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
        <div style={{ fontSize: 14 }}>{desc}</div>
      </div>
    </div>
  );
}

function EnergyCard({ title, value, color, icon, styles }) {
  return (
    <div
      style={{
        ...styles.energyCard,
        padding: "30px 40px",
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            color,
            fontSize: 24,
          }}
        >
          <i className={icon}></i>
        </div>

        <div style={{ fontWeight: "bold", fontSize: 20 }}>{title}</div>
      </div>

      <div style={{ marginTop: 10, fontSize: 24, fontWeight: "bold", color }}>
        {value.toFixed(1)}%
      </div>

      <div style={{ marginTop: 10 }}>
        <div
          style={{
            height: 10,
            borderRadius: 10,
            background: "#e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: value + "%",
              height: "100%",
              borderRadius: 10,
              background: `linear-gradient(90deg, ${color}, ${color}aa)`,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}