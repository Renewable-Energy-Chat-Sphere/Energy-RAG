import React, { useEffect, useState } from "react";
import "./power.css";
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
        setTrendData(res);
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
            opacity: 0.65,
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
            padding: "30px 40px",
            borderRadius: 30,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fi fi-rr-bolt"
              style={{
                color: "#facc15",
                filter: "drop-shadow(0 0 6px #facc15)",
              }}
            ></i>
            {t("daily.total")}
          </h3>
          <h1>{totalPower.toFixed(0)} MW</h1>
        </div>

        <div
          style={{
            background: cardBg,
            padding: "30px 40px",
            borderRadius: 30,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fi fi-rr-sun"
              style={{
                color: "#facc15",
                filter: "drop-shadow(0 0 6px #facc15)",
              }}
            ></i>
            {t("daily.renewable")}
          </h3>

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
            padding: "30px 40px",
            borderRadius: 30,
            transition: "background 0.35s ease, color 0.35s ease",
          }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fi fi-rr-fire-flame-curved"
              style={{
                color: "#ef4444",
                filter: "drop-shadow(0 0 6px #ef4444)",
              }}
            ></i>
            {t("daily.thermal")}
          </h3>

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
                  opacity: 0.65,
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
                background: cardBg,
                borderRadius: 30,
                padding: "30px 40px",
                transition: "background 0.35s ease, color 0.35s ease",
              }}
            >
              <h3
                style={{
                  marginBottom: 20,
                }}
              >
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: 20,
                  }}
                >
                  <i
                    className="fi fi-rr-bolt"
                    style={{
                      color: "#facc15",
                      filter: "drop-shadow(0 0 8px #facc15)",
                    }}
                  ></i>
                  {t("daily.taipower")}
                </h3>
              </h3>

              <div
                style={{
                  background: innerCardBg,
                  transition: "background 0.35s ease, color 0.35s ease",
                  borderRadius: 16,
                  padding: "30px 40px",
                  marginBottom: 16,
                }}
              >
                <h3>{t("daily.load")}</h3>

                <h1
                  style={{
                    fontSize: 48,
                    color: "#2e79d4",
                  }}
                >
                  {taipower.curr_load}
                </h1>

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    color: "#95c5ff",
                    fontWeight: "bold",
                  }}
                >
                  {t("daily.utilRate")}：{taipower.curr_util_rate}%
                </p>
              </div>

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: "30px 40px",
                  marginBottom: 16,
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>{t("daily.forecast")}</h3>

                <h1
                  style={{
                    fontSize: 42,
                    color: "#f55d0b",
                  }}
                >
                  {taipower.fore_peak_dema_load}
                </h1>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    color: "#fa9315",
                    fontWeight: "bold",
                  }}
                >
                  {t("daily.peakRate")}：
                  {(
                    (Number(taipower.fore_peak_dema_load) /
                      Number(taipower.fore_maxi_sply_capacity)) *
                    100
                  ).toFixed(0)}{" "}
                  %
                </p>
                <p>
                  {t("daily.peakTime")}：{taipower.fore_peak_hour_range}
                </p>
              </div>

              {/* 今日最大供電能力 */}

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: "30px 40px",
                  marginBottom: 16,
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>{t("daily.capacity")}</h3>

                <h1
                  style={{
                    fontSize: 42,
                    color: "#8838f8",
                    marginBottom: 10,
                  }}
                >
                  {taipower.fore_maxi_sply_capacity}
                </h1>

                <p>{t("daily.unit")}</p>
              </div>

              {/* 供電狀態 */}

              <div
                style={{
                  background: innerCardBg,
                  borderRadius: 16,
                  padding: "30px 40px",
                  transition: "background 0.35s ease, color 0.35s ease",
                }}
              >
                <h3>{t("daily.status")}</h3>

                <div
                  style={{
                    marginTop: "10px",

                    display: "inline-flex",

                    alignItems: "center",

                    gap: "10px",

                    padding: "10px 18px",

                    borderRadius: "999px",

                    fontWeight: 700,

                    background:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(239,68,68,0.18)",

                    color:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  <div
                    style={{
                      width: "10px",

                      height: "10px",

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

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 18,
                    color:
                      taipower.fore_peak_resv_indicator?.trim() === "G"
                        ? "#088132"
                        : "#ff6666",
                    fontWeight: "bold",
                  }}
                >
                  {t("daily.reserveRate")}：{taipower.fore_peak_resv_rate}%
                </p>

                <p
                  style={{
                    opacity: 0.7,
                    marginTop: 10,
                  }}
                >
                  {t("daily.updateTime")}：{taipower.publish_time}
                </p>
              </div>
            </div>
          )}

          {/* 備轉容量說明 */}

          <div
            style={{
              background: cardBg,
              borderRadius: 30,
              padding: "30px 40px",
              transition: "background 0.35s ease",
            }}
          >
            <h2
              style={{
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <i
                  className="fi fi-rr-lightbulb-on"
                  style={{
                    color: "#facc15",
                    filter: "drop-shadow(0 0 8px #facc15)",
                  }}
                ></i>
                {t("daily.reserveDesc")}
              </h2>
            </h2>

            <img
              src={import.meta.env.BASE_URL + "images/reserve-light.png"}
              alt="備轉容量燈號"
              style={{
                width: "85%",
                maxWidth: 420,
                display: "block",
                marginBottom: 24,
                borderRadius: 18,
              }}
            />

            <div
              style={{
                lineHeight: 2,
                opacity: 0.82,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          
          {/* 圓餅圖 */}

          <div
            style={{
              background: cardBg,
              borderRadius: 30,
              padding: "30px 40px",
              height: 560,
              marginBottom: 30,
              transition: "background 0.35s ease, color 0.35s ease",
            }}
          >
            <h2
              style={{
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <i
                  className="fi fi-rr-chart-pie"
                  style={{
                    color: "#60a5fa",
                    filter: "drop-shadow(0 0 8px #60a5fa)",
                  }}
                ></i>
                {t("daily.pie")}
              </h2>
            </h2>

            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="ratio"
                  nameKey="category"
                  outerRadius={160}
                  label={({ name }) => energyMap[name] || name}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} MW`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ========================= */}
          {/* 右側表格 */}
          {/* ========================= */}
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
                <h2
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <i
                    className="fi fi-rr-document"
                    style={{
                      color: "#60a5fa",
                      filter: "drop-shadow(0 0 6px #60a5fa)",
                    }}
                  ></i>
                  {t("daily.table")}
                </h2>
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
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  padding: "10px 18px",
                  borderRadius: 14,
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 14,

                  display: "flex",
                  alignItems: "center",
                  gap: 10,

                  boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
                }}
              >
                <i
                  className="fi fi-rr-download"
                  style={{
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
          borderRadius: 30,
          padding: "30px 40px",
          marginTop: 30,
          height: 520,
        }}
      >
        <h2
          style={{
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fi fi-rr-chart-line-up"
              style={{
                color: "#22c55e",
                filter: "drop-shadow(0 0 6px #22c55e)",
              }}
            ></i>
            {t("daily.trend")}
          </h2>
        </h2>

        <ResponsiveContainer width="100%" height={430}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" />

            <YAxis domain={[0, 12000]} tickCount={13} />
            <Tooltip
              formatter={(value, name) => [
                `${value} MW`,
                energyMap[name] || name,
              ]}
            />

            {trendKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={false}
              />
            ))}
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
