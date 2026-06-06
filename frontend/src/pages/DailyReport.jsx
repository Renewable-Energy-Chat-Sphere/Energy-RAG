import React, { useEffect, useState } from "react";
import "./power.css";
import {
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  const energyMap = {
    燃氣: t("energy.gas"),
    燃煤: t("energy.coal"),
    太陽能: t("energy.solar"),
    風力: t("energy.wind"),
    水力: t("energy.hydro"),
    核能: t("energy.nuclear"),
    儲能: t("energy.storage"),
  };

  const [isDark, setIsDark] = useState(
    document.body.classList.contains("dark"),
  );

  const pageBg = isDark ? "#0f172a" : "#f1f5f9";
  const cardBg = isDark ? "#1e293b" : "white";
  const innerCardBg = isDark ? "#0f172a" : "#f8fafc";
  const textColor = isDark ? "white" : "#0f172a";
  const borderColor = isDark ? "#334155" : "#e2e8f0";

  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [downloadMode, setDownloadMode] = useState("month");
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taipower, setTaipower] = useState(null);

  const trendKeys =
    trendData.length > 0
      ? Object.keys(trendData[0]).filter((k) => k !== "time")
      : [];

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
        setAllData(res);

        const latestDate = res[0]?.report_date;

        setSelectedDate(latestDate);
        setSelectedMonth(latestDate.slice(0, 7));
        const filtered = res.filter((item) => item.report_date === latestDate);

        setData(filtered);
        setLoading(false);
      });
      
    fetch("http://127.0.0.1:8000/daily-trend")
      .then((res) => res.json())
      .then((res) => {

        const cleaned = res.map((row) => {
          const newRow = { ...row };

          Object.keys(newRow).forEach((key) => {

            if (
              key !== "time" &&
              typeof newRow[key] === "number" &&
              newRow[key] < 0
            ) {
              newRow[key] = 0;
            }

          });

          return newRow;
        });

        setTrendData(cleaned);
      });

    fetch("http://127.0.0.1:8000/taipower-status")
      .then((res) => res.json())
      .then((res) => {
        setTaipower(res);
      });
  }, []);

  // =========================
  // 🔥 下載 Excel(CSV)
  // =========================
  const downloadReport = () => {
    let exportData = [];

    if (downloadMode === "month") {
      exportData = allData.filter(
        (item) => item.report_date.slice(0, 7) === selectedMonth,
      );
    } else {
      exportData = allData.filter((item) => item.report_date === selectedDate);
    }

    const headers = [
      t("daily.date"),
      t("daily.type"),
      t("daily.avg") + "(MW)",
      t("daily.ratio") + "(%)",
    ];

    const rows = exportData.map((item) => [
      item.report_date,
      energyMap[item.category] || item.category,
      item.avg_power,
      item.ratio,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;

    a.download =
      downloadMode === "month"
        ? `${selectedMonth}_energy_report.csv`
        : `${selectedDate}_energy_report.csv`;

    a.click();

    URL.revokeObjectURL(url);
  };
  const handleDateChange = (date) => {
    setSelectedDate(date);

    const filtered = allData.filter((item) => item.report_date === date);

    setData(filtered);
  };
  
  // =========================
  // 🔥 總發電量
  // =========================
  const totalPower = data.reduce((sum, item) => sum + item.avg_power, 0);
  const availableDates = [...new Set(allData.map((d) => d.report_date))];
  const availableMonths = [
    ...new Set(allData.map((d) => d.report_date.slice(0, 7))),
  ];
  if (loading) {
    return (
      <div
        className="power-container"
        style={{
          minHeight: "calc(100vh - 320px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div className="loading-text">
          <i className="fi fi-rr-chart-line-up loading-icon"></i>
          {t("daily.loading")}
          <span className="dot-animation"></span>
        </div>

        <div
          style={{
            opacity: 0.7,
            fontSize: "14px",
            color: isDark ? "#cbd5e1" : "#334155",
          }}
        >
          {t("daily.syncing")}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "80px",
        minHeight: "100vh",
        color: textColor,
        background: pageBg,
        transition: "background 0.35s ease, color 0.35s ease",
      }}
    >

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
            ...cardStyle(cardBg),
            padding: "30px 40px",
          }}
        >
          <div style={sectionTitleStyle}>
            <i
              className="fi fi-rr-battery-bolt"
              style={{
                ...iconStyle,
                color: "#facc15",
                filter: "drop-shadow(0 0 6px #facc15)",
              }}
            ></i>
            {t("daily.total")}
          </div>

          <div style={statValueStyle}>
            {totalPower.toFixed(0)} MW
          </div>
        </div>

        <div
          style={{
            ...cardStyle(cardBg),
            padding: "30px 40px",
          }}
        >
          <div style={sectionTitleStyle}>
            <i
              className="fi fi-rr-solar-panel"
              style={{
                ...iconStyle,
                color: "#facc15",
                filter: "drop-shadow(0 0 6px #facc15)",
              }}
            ></i>
            {t("daily.renewable")}
          </div>

          <div style={statValueStyle}>
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
          </div>
        </div>

        <div
          style={{
            ...cardStyle(cardBg),
            padding: "30px 40px",
          }}
        >
          <div style={sectionTitleStyle}>
            <i
              className="fi fi-rr-fire-flame-curved"
              style={{
                ...iconStyle,
                color: "#ef4444",
                filter: "drop-shadow(0 0 6px #ef4444)",
              }}
            ></i>
            {t("daily.thermal")}
          </div>

          <div style={statValueStyle}>
            {data
              .filter((d) => d.category.includes("燃"))
              .reduce((sum, d) => sum + d.ratio, 0)
              .toFixed(2)}
            %
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
          alignItems: "start",
        }}
      >
        {/* ========================= */}
        {/* 左側資訊卡片 */}
        {/* ========================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >

          {/* 台電即時資訊 */}
          {!taipower ? (
            <div
              style={{
                background: cardBg,
                borderRadius: 30,
                padding: 40,
                minHeight: 420,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "18px",
                transition: "background 0.35s ease",
              }}
            >
              <div className="loading-text">
                <i className="fi fi-rr-bolt loading-icon"></i>
                {t("daily.loading")}
                <span className="dot-animation"></span>
              </div>

              <div
                style={{
                  opacity: 0.7,
                  fontSize: "14px",
                  color: isDark ? "#cbd5e1" : "#334155",
                }}
              >
                {t("daily.syncing")}
              </div>
            </div>
          ) : (
            <div
              style={{
                ...cardStyle(cardBg),
                padding: "40px 50px",
              }}
            >
              
              {/* 目前用電量 */}
              <div
                style={{
                  ...sectionTitleStyle,
                  marginBottom: 20,
                }}
              >
                <i
                  className="fi fi-rr-bolt"
                  style={{
                    ...iconStyle,
                    color: "#facc15",
                    filter: "drop-shadow(0 0 8px #facc15)",
                  }}
                ></i>

                {t("daily.taipower")}
              </div>

              <div style={innerCardStyle(innerCardBg)}>
                
                <div style={cardTitleStyle}>
                  {t("daily.load")}
                </div>

                <div
                  style={{
                    ...statValueStyle,
                    color: "#2e79d4",
                  }}
                >
                  {taipower.curr_load} MW
                </div>

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#a783e7",
                  }}
                >
                  {t("daily.utilRate")}：{taipower.curr_util_rate}%
                </p>
              </div>

              {/* 預估最高用電 */}
              <div style={innerCardStyle(innerCardBg)}>

                <div style={cardTitleStyle}>
                  {t("daily.forecast")}
                </div>

                <div
                  style={{
                    ...statValueStyle,
                    color: "#f55d0b",
                  }}
                >
                  {taipower.fore_peak_dema_load} MW
                </div>

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#a783e7",
                  }}
                >
                  {t("daily.peakRate")}：
                  {(
                    (Number(taipower.fore_peak_dema_load) /
                      Number(taipower.fore_maxi_sply_capacity)) *
                    100
                  ).toFixed(0)}%
                （{t("daily.peakTime")}：{taipower.fore_peak_hour_range}）
                </p>
              </div>

              {/* 今日最大供電能力 */}
              <div style={innerCardStyle(innerCardBg)}>
                <div style={cardTitleStyle}>
                  {t("daily.capacity")}
                </div>

                <div
                  style={{
                    ...statValueStyle,
                    color: "#32d61f",
                    marginBottom: 10,
                  }}
                >
                  {taipower.fore_maxi_sply_capacity} MW
                </div>

                <div
                  style={{
                    marginBottom: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 30px",
                    borderRadius: "999px",
                    fontWeight: 700,
                    background:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "rgba(34, 197, 94, 0.18)"
                        : "rgba(239, 68, 68, 0.18)",

                    color:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background:
                        taipower.fore_peak_resv_indicator?.trim() === "G"
                          ? "#22c55e"
                          : "#ef4444",
                      boxShadow:
                        taipower.fore_peak_resv_indicator?.trim() === "G"
                          ? "0 0 12px #22c55e"
                          : "0 0 12px #ef4444",
                    }}
                  />

                  {taipower.fore_peak_resv_indicator?.trim() === "G"
                    ? t("daily.sufficient")
                    : t("daily.tight")}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#a783e7",
                    }}
                  >
                    {t("daily.reserveRate")}：
                    {taipower.fore_peak_resv_rate} %
                  </span>

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      opacity: 0.5,
                    }}
                  >
                    {t("daily.updateTime")}： {taipower.publish_time}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 備轉容量說明 */}
          <div
            style={{
              background: cardBg,
              borderRadius: 30,
              padding: "40px 50px",
              transition: "background 0.35s ease",
            }}
          >
            <div
              style={{
                ...sectionTitleStyle,
                marginBottom: 24,
              }}
            >
              <i
                className="fi fi-rr-lightbulb-on"
                style={{
                  ...iconStyle,
                  color: "#facc15",
                  filter: "drop-shadow(0 0 8px #facc15)",
                }}
              ></i>

              {t("daily.reserveDesc")}
            </div>

            {/* 燈號說明 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                { color: "#22c55e", title: "綠色", desc: "備轉量 > 10%" },
                { color: "#facc15", title: "黃燈", desc: "備轉量 > 6%" },
                { color: "#f97316", title: "橙燈", desc: "備轉量 ≤ 6%" },
                { color: "#ef4444", title: "紅燈", desc: "備轉量 < 90MW" },
                { color: "#374151", title: "黑燈", desc: "備轉量 < 50MW" },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: innerCardBg,
                    borderRadius: 20,
                    padding: "24px 8px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: item.color,
                      margin: "0 auto 8px",
                      boxShadow: `0 0 12px ${item.color}`,
                    }}
                  />

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                lineHeight: 2,
                opacity: 0.7,
                fontSize: 14,
              }}
            >
              <p>{t("reserveText.p1")}</p>
              <p>{t("reserveText.p2")}</p>
              <p>{t("reserveText.p3")}</p>

              <p style={{ marginTop: 10 }}>{t("reserveText.p4")}</p>
              <p>{t("reserveText.p5")}</p>
              <p>{t("reserveText.p6")}</p>

              <p style={{ marginTop: 10 }}>{t("reserveText.p7")}</p>
              <p>{t("reserveText.p8")}</p>
            </div>
          </div>
        </div>

        {/* ========================= */}
        {/* 右側佔比列表 */}
        {/* ========================= */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          
          {/* 發電佔比排名 */}
          <div
            style={{
              background: cardBg,
              borderRadius: 30,
              padding: "40px 50px",
              height: "100%",
              transition: "background 0.35s ease, color 0.35s ease",
            }}
          >
            <div
              style={{
                ...sectionTitleStyle,
                marginBottom: 20,
              }}
            >
              <i
                className="fi fi-rr-ranking-star"
                style={{
                  ...iconStyle,
                  color: "#60a5fa",
                  filter: "drop-shadow(0 0 8px #60a5fa)",
                }}
              ></i>

              {t("daily.energyRanking")}
            </div>

            <div
              style={{
                marginTop: 20,
              }}
            >
              {[...data]
                .sort((a, b) => b.ratio - a.ratio)
                .slice(0, 5)
                .map((item, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      <span>
                        {index === 0 && "🥇 "}
                        {index === 1 && "🥈 "}
                        {index === 2 && "🥉 "}
                        {energyMap[item.category] || item.category}
                      </span>

                      <span>{Number(item.ratio).toFixed(2)}%</span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: 18,
                        background: isDark ? "#0f172a" : "#e2e8f0",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${item.ratio}%`,
                          height: "100%",
                          background:
                            COLORS[index % COLORS.length],
                          borderRadius: 999,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

         {/* 每日能源報表 */}
          <div
            style={{
              background: cardBg,
              borderRadius: 30,
              padding: "30px 40px",
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
              <div>
                <div
                  style={{
                    ...sectionTitleStyle,
                  }}
                >
                  <i
                    className="fi fi-rr-document"
                    style={{
                      ...iconStyle,
                      color: "#60a5fa",
                      filter: "drop-shadow(0 0 6px #60a5fa)",
                    }}
                  ></i>

                  {t("daily.table")}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 10,
                  }}
                >
                  <select
                    value={downloadMode}
                    onChange={(e) => setDownloadMode(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? "#0f172a" : "white",
                      color: textColor,
                      fontSize: 14,
                      outline: "none",
                    }}
                  >
                    <option value="month">{t("daily.month")}</option>
                    <option value="day">{t("daily.day")}</option>
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? "#0f172a" : "white",
                      color: textColor,
                      fontSize: 14,
                      outline: "none",
                    }}
                  >
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: isDark ? "#0f172a" : "white",
                      color: textColor,
                      fontSize: 14,
                      outline: "none",
                    }}
                  >
                    {availableDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={downloadReport}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  border: "1px solid rgba(96, 165, 250, 0.25)",
                  padding: "10px 18px",
                  borderRadius: 14,
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 14,

                  display: "flex",
                  alignItems: "center",
                  gap: 10,

                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
                }}
              >
                <i
                  className="fi fi-rr-download"
                  style={{
                    ...iconStyle,
                    color: "#bfdbfe",
                  }}
                ></i>
                {t("daily.download")}
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
                  <th style={thStyle}>{t("daily.type")}</th>
                  <th style={thStyle}>{t("daily.avg")}</th>
                  <th style={thStyle}>{t("daily.ratio")}</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>
                      {energyMap[item.category] || item.category}
                    </td>

                    <td style={tdStyle}>{item.avg_power.toFixed(2)} MW</td>
                    <td style={tdStyle}>{item.ratio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* 今日發電走勢 */}
      {/* ========================= */}

      <div
        style={{
          background: isDark ? "#1e293b" : "white",
          transition: "background 0.35s ease, color 0.35s ease",
          borderRadius: 40,
          padding: "30px 40px",
          marginTop: 40,
          minHeight: 760,
        }}
      >
        <div
          style={{
            ...sectionTitleStyle,
            margin: "20px 40px 40px",
          }}
        >
          <i
            className="fi fi-rr-chart-line-up"
            style={{
              ...iconStyle,
              color: "#22c55e",
              filter: "drop-shadow(0 0 6px #22c55e)",
            }}
          ></i>

          {t("daily.trend")}
        </div>

        <ResponsiveContainer width="100%" height={600}>
          <LineChart
            data={trendData}
            margin={{
              top: 20,
              right: 40,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke={isDark ? "#64748b" : "#94a3b8"}
              strokeWidth={1}
              vertical={true}
            />

            <XAxis
              dataKey="time"
              minTickGap={50}
              tickMargin={15}
              tickFormatter={(value, index) =>
                index === 0 ? "" : value
              }
              tickLine={false}
              axisLine={{
                stroke: isDark ? "#64748b" : "#94a3b8",
                strokeWidth: 1.5,
              }}
              tick={{
                fontSize: 16,
                fontWeight: 800,
                fill: isDark ? "#cbd5e1" : "#64748b",
              }}
            />

            <YAxis
              width={150}
              tickMargin={15}
              domain={[0, 'dataMax']}
                ticks={Array.from(
                  { length: 11 },
                  (_, i) => i * 2000
                )}
              tickFormatter={(value) =>
                `${Number(value).toLocaleString()} MW`
              }
              tickLine={false}
              axisLine={{
                stroke: isDark ? "#64748b" : "#94a3b8",
                strokeWidth: 1.5,
              }}
              tick={{
                fontSize: 18,
                fontWeight: 800,
                fill: isDark ? "#cbd5e1" : "#64748b",
              }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const sortedPayload = [...payload].sort(
                  (a, b) => b.value - a.value
                );

                return (
                  <div
                    style={{
                      background: isDark ? "#1e293b" : "#ffffff",
                      border: `2px solid ${
                        isDark ? "#475569" : "#cbd5e1"
                      }`,
                      borderRadius: 30,
                      boxShadow:
                        "0 8px 24px rgba(0, 0, 0, 0.15)",
                      padding: "20px 24px",
                      minWidth: 220,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 14,
                        paddingBottom: 10,
                        fontSize: 14,
                        fontWeight: 800,
                        color: isDark ? "#f8fafc" : "#0f172a",
                        borderBottom: `1px solid ${
                          isDark ? "#475569" : "#e2e8f0"
                        }`,
                      }}
                    >
                      {label}
                    </div>

                    {sortedPayload.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 16,
                          marginBottom: 8,
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: item.color,
                            }}
                          />

                          <span>
                            {energyMap[item.name] || item.name}
                          </span>
                        </div>

                        <span>
                          {Number(item.value).toLocaleString()} MW
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            {trendKeys.map((key, index) => (
              <Line
                key={key}
                type="natural"
                dataKey={key}
                name={energyMap[key] || key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 7,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const statValueStyle = {
  fontSize: 32,
  fontWeight: 800,
};

const sectionTitleStyle = {
  margin: "10px 0px 30px",
  fontSize: 24,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 16,
  lineHeight: 1,
};

const iconStyle = {
  fontSize: 28,
};

const cardTitleStyle = {
  fontSize: 20,
  fontWeight: 700,
};

const cardStyle = (cardBg) => ({
  background: cardBg,
  borderRadius: 30,
  transition: "background 0.35s ease, color 0.35s ease",
});

const innerCardStyle = (innerCardBg) => ({
  background: innerCardBg,
  borderRadius: 30,
  padding: "30px 40px",
  marginBottom: 20,
  transition: "background 0.35s ease, color 0.35s ease",
});

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
