import React, { useEffect, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#60a5fa",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

function DailyReport() {
  const [isDark, setIsDark] = useState(
    document.body.classList.contains("dark"),
  );
  const pageBg = isDark ? "#0f172a" : "#f1f5f9";

  const cardBg = isDark ? "#1e293b" : "white";

  const innerCardBg = isDark ? "#0f172a" : "#f8fafc";

  const textColor = isDark ? "white" : "#0f172a";

  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const [data, setData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taipower, setTaipower] = useState(null);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/daily-report")
      .then((res) => res.json())
      .then((res) => {
        // 🔥 找最新日期
        const latestDate = res[0]?.report_date;

        // 🔥 只保留最新日期
        const filtered = res.filter((item) => item.report_date === latestDate);

        setData(filtered);

        setLoading(false);
      });
    fetch("http://127.0.0.1:8000/daily-trend")
      .then((res) => res.json())
      .then((res) => {
        setTrendData(res);
      });
    fetch("http://127.0.0.1:8000/taipower-status")
      .then((res) => res.json())
      .then((res) => {
        setTaipower(res);
      });
  }, []);

  // =========================
  // 🔥 下載 JSON
  // =========================
  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "daily_energy_report.json";

    a.click();

    URL.revokeObjectURL(url);
  };

  // =========================
  // 🔥 總發電量
  // =========================
  const totalPower = data.reduce((sum, item) => sum + item.avg_power, 0);

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          color: "white",
          fontSize: 24,
        }}
      >
        載入每日分析中...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 30,

        minHeight: "100vh",
        color: textColor,
        background: pageBg,
        transition: "background 0.35s ease, color 0.35s ease",
      }}
    >
      {/* ========================= */}
      {/* 標題 */}
      {/* ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 38,
              marginBottom: 10,
            }}
          >
            每日能源分析
          </h1>

          <p
            style={{
              opacity: 0.7,
            }}
          >
            Daily Energy Analytics Report
          </p>
        </div>
      </div>

      {/* ========================= */}
      {/* 總覽卡片 */}
      {/* ========================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: 20,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            background: cardBg,
            padding: 24,
            borderRadius: 20,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3>⚡ 今日平均總發電量</h3>

          <h1>{totalPower.toFixed(0)} MW</h1>
        </div>

        <div
          style={{
            background: cardBg,
            padding: 24,
            borderRadius: 20,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3>☀️ 再生能源占比</h3>

          <h1>
            {data
              .filter(
                (d) =>
                  d.category.includes("太陽") ||
                  d.category.includes("風力") ||
                  d.category.includes("水力"),
              )
              .reduce((sum, d) => sum + d.ratio, 0)
              .toFixed(2)}
            %
          </h1>
        </div>

        <div
          style={{
            background: cardBg,
            padding: 24,
            borderRadius: 20,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3>🔥 火力依賴</h3>

          <h1>
            {data
              .filter((d) => d.category.includes("燃"))
              .reduce((sum, d) => sum + d.ratio, 0)
              .toFixed(2)}
            %
          </h1>
        </div>
      </div>

      {/* ========================= */}
      {/* 圖表 */}
      {/* ========================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
          alignItems: "start",
        }}
      >
        {/* ========================= */}
        {/* 左側 */}
        {/* ========================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          {/* 台電即時資訊 */}

          {taipower && (
            <div
              style={{
                background: cardBg,
                borderRadius: 20,
                padding: 24,
                transition: "background 0.35s ease, color 0.35s ease",
              }}
            >
              <h2
                style={{
                  marginBottom: 20,
                }}
              >
                ⚡ 台電即時資訊
              </h2>

              <div
                style={{
                  background: innerCardBg,
                  transition: "background 0.35s ease, color 0.35s ease",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3>目前用電量</h3>

                <h1
                  style={{
                    fontSize: 48,
                    color: "#60a5fa",
                  }}
                >
                  {taipower.curr_load}
                </h1>

                <p>
                  使用率：
                  {taipower.curr_util_rate}%
                </p>
              </div>

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>預估最高用電</h3>

                <h1
                  style={{
                    fontSize: 42,
                    color: "#f59e0b",
                  }}
                >
                  {taipower.fore_peak_dema_load}
                </h1>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    color: "#facc15",
                    fontWeight: "bold",
                  }}
                >
                  尖峰使用率：
                  {(
                    (Number(taipower.fore_peak_dema_load) /
                      Number(taipower.fore_maxi_sply_capacity)) *
                    100
                  ).toFixed(0)}{" "}
                  %
                </p>
                <p>
                  尖峰時段：
                  {taipower.fore_peak_hour_range}
                </p>
              </div>

              {/* 今日最大供電能力 */}

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>今日最大供電能力</h3>

                <h1
                  style={{
                    fontSize: 42,
                    color: "#38bdf8",
                    marginBottom: 10,
                  }}
                >
                  {taipower.fore_maxi_sply_capacity}
                </h1>

                <p>萬瓩</p>
              </div>

              {/* 供電狀態 */}

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: 20,
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>供電狀態</h3>

                <h1
                  style={{
                    color:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "#22c55e"
                        : "#ef4444",

                    fontSize: 42,
                    marginBottom: 10,
                  }}
                >
                  {taipower.fore_peak_resv_indicator?.trim() === "G"
                    ? "🟢 供電充裕"
                    : "🔴 供電吃緊"}
                </h1>

                <p>
                  備轉率：
                  {taipower.fore_peak_resv_rate}%
                </p>

                <p
                  style={{
                    opacity: 0.7,
                    marginTop: 10,
                  }}
                >
                  更新時間：
                  {taipower.publish_time}
                </p>
              </div>
            </div>
          )}

          {/* 圓餅圖 */}

          <div
            style={{
              background: cardBg,
              borderRadius: 20,
              padding: 20,
              height: 500,
              transition: "background 0.35s ease, color 0.35s ease",
            }}
          >
            <h2
              style={{
                marginBottom: 20,
              }}
            >
              ⚡ 今日能源結構占比
            </h2>

            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="ratio"
                  nameKey="category"
                  outerRadius={160}
                  label
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========================= */}
        {/* 右側表格 */}
        {/* ========================= */}

        <div
          style={{
            background: cardBg,
            borderRadius: 20,
            padding: 20,
            minHeight: 1030,
            overflow: "auto",
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2>📋 今日詳細能源報表</h2>

            <button
              onClick={downloadReport}
              style={{
                background: "#2563eb",
                border: "none",
                padding: "10px 18px",
                borderRadius: 12,
                color: isDark ? "white" : "#0f172a",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ⬇️ 下載報表
            </button>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              transition: "background 0.35s ease, color 0.35s ease",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>類型</th>

                <th style={thStyle}>平均發電量</th>

                <th style={thStyle}>占比</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{item.category}</td>

                  <td style={tdStyle}>{item.avg_power.toFixed(2)} MW</td>

                  <td style={tdStyle}>{item.ratio}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================= */}
      {/* 今日發電走勢 */}
      {/* ========================= */}

      <div
        style={{
          background: isDark ? "#1e293b" : "white",
          transition: "background 0.35s ease, color 0.35s ease",
          borderRadius: 20,
          padding: 24,
          marginTop: 30,
          height: 520,
        }}
      >
        <h2
          style={{
            marginBottom: 20,
          }}
        >
          📈 今日電力走勢
        </h2>

        <ResponsiveContainer width="100%" height={430}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" />

            <YAxis domain={[0, 12000]} tickCount={13} />
            <Tooltip />

            <Line
              type="linear"
              dataKey="燃氣"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="燃煤"
              stroke="#f97316"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="太陽能"
              stroke="#eab308"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="風力"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="水力"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="核能"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="儲能"
              stroke="#14b8a6"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: 14,
  borderBottom: "1px solid #334155",
};

const tdStyle = {
  padding: 14,
  borderBottom: "1px solid #1e293b",
};

export default DailyReport;
