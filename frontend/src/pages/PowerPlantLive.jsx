import React, { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./power.css";
import "@flaticon/flaticon-uicons/css/regular/rounded.css";

/* ========================
   🔥 顏色
======================== */
function getColor(percent) {
  if (percent >= 100) return "#ef4444";
  if (percent >= 80) return "#ff7b00";
  if (percent >= 60) return "#f3df00";
  if (percent >= 40) return "#33c004";
  if (percent >= 20) return "#31ccd4";

  return "#939393";
}

/* ========================
   🔥 台電官方分類
======================== */
function getCategory(name, value) {
  // 🔥 修正 HTML 編碼
  name = name.replace(/&amp;/g, "&");

  // 🔥 民營電廠-燃氣(IPP-LNG)
  const IPP_LNG_UNITS = [
    // 🔥 海湖
    "海湖#1",
    "海湖#2",

    // 🔥 新桃
    "新桃#1",

    // 🔥 國光
    "國光#1",

    // 🔥 星彰 / 星元
    "星彰#1",
    "星元#1",

    // 🔥 嘉惠
    "嘉惠#1",
    "嘉惠#2",

    // 🔥 豐德
    "豐德#1",
    "豐德#2",
    "豐德#3",
  ];

  if (IPP_LNG_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "民營電廠-燃氣(IPP-LNG)",
      sub: "民營購電",
    };
  }

  // 🔥 民營燃煤
  // 🔥 民營電廠-燃煤(IPP-Coal)
  const IPP_COAL_UNITS = [
    // 🔥 和平
    "和平#1",
    "和平#2",

    // 🔥 麥寮
    "麥寮#1",
    "麥寮#3",
  ];

  if (IPP_COAL_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "民營電廠-燃煤(IPP-Coal)",
      sub: "民營購電",
    };
  }

  // 🔥 燃氣(LNG)
  const LNG_UNITS = [
    // 🔥 大潭
    "大潭CC#1",
    "大潭CC#2",
    "大潭CC#3",
    "大潭CC#4",
    "大潭CC#5",
    "大潭CC#6",
    "大潭CC#7",
    "大潭CC#8",
    "大潭CC#9",

    // 🔥 通霄
    "通霄CC#1",
    "通霄CC#2",
    "通霄CC#3",
    "通霄CC#6",

    // 🔥 GT
    "通霄GT#9",

    // 🔥 台中CC
    "台中CC#1",
    "台中CC#2",

    // 🔥 興達新CC
    "興達新CC#1",
    "興達新CC#2",
    "興達新CC#3",

    // 🔥 興達CC
    "興達CC#1",
    "興達CC#2",
    "興達CC#3",
    "興達CC#4",
    "興達CC#5",

    // 🔥 南部CC
    "南部CC#1",
    "南部CC#2",
    "南部CC#3",
    "南部CC#4",

    // 🔥 大林
    "大林#5",
    "大林#6",
  ];

  if (LNG_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "燃氣(LNG)",
      sub: "台電自有",
    };
  }

  // 🔥 燃煤
  // 🔥 燃煤(Coal)
  const COAL_UNITS = [
    // 🔥 林口
    "林口#1",
    "林口#2",
    "林口#3",

    // 🔥 台中
    "台中#1",
    "台中#2",
    "台中#3",
    "台中#4",
    "台中#5",
    "台中#6",
    "台中#7",
    "台中#8",
    "台中#9",
    "台中#10",

    // 🔥 興達
    "興達#1",
    "興達#2",
    "興達#3",
    "興達#4",

    // 🔥 大林
    "大林#1",
    "大林#2",
  ];

  if (COAL_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "燃煤(Coal)",
      sub: "台電自有",
    };
  }
  // 🔥 汽電共生
  // 🔥 汽電共生(Co-Gen)
  if (name.startsWith("汽電共生")) {
    return {
      main: "汽電共生(Co-Gen)",
      sub: "汽電共生",
    };
  }

  // 🔥 燃油
  // 🔥 燃油(Oil)
  const OIL_UNITS = [
    // 🔥 協和
    "協和#3",
    "協和#4",

    // 🔥 澎湖
    "澎湖尖山",
  ];

  if (OIL_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "燃料油(Fuel Oil)",
      sub: "燃油(Oil)",
    };
  } // 🔥 輕油(Diesel)
  const DIESEL_UNITS = [
    // 🔥 核二
    "核二Gas1",
    "核二Gas2",

    // 🔥 核三
    "核三Gas1",
    "核三Gas2",

    // 🔥 台中
    "台中Gas1&2",
    "台中Gas3&4",

    // 🔥 金門
    "金門塔山",

    // 🔥 馬祖
    "馬祖珠山",

    // 🔥 離島
    "離島其它",
  ];

  if (DIESEL_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "燃料油(Fuel Oil)",
      sub: "輕油(Diesel)",
    };
  }
  // 🔥 核能
  if (name.includes("核")) {
    return {
      main: "核能(Nuclear)",
      sub: "核能",
    };
  }

  // 🔥 太陽能購電
  const SOLAR_IPP_UNITS = [
    "崙尾光",
    "天衝光",
    "天蓬光",

    "寶興光",
    "聯華光",
    "向陽光",
    "星崴光",
    "碩力光",
    "天英光",
    "志光光",

    "永堯光",
    "昱昶光",

    "星崙光",
    "新和光",
    "生利光",
    "廷和光",
    "星股光",

    "其它購電太陽能",
  ];

  if (SOLAR_IPP_UNITS.some((unit) => name.includes(unit))) {
    return {
      main: "太陽能(Solar)",
      sub: "太陽能購電",
    };
  }
  // 🔥 太陽能台電自有
  const SOLAR_TPC_UNITS = ["彰濱光", "南鹽光"];
  if (SOLAR_TPC_UNITS.some((unit) => name.includes(unit))) {
    return {
      main: "太陽能(Solar)",
      sub: "太陽能台電自有",
    };
  }

  // 🔥 離岸風力台電自有
  const OFFSHORE_WIND_UNITS = ["離岸一期", "離岸二期"];

  if (OFFSHORE_WIND_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "風力(Wind)",
      sub: "離岸風力台電自有",
    };
  }
  // 🔥 離岸風力購電
  const OFFSHORE_WIND_IPP_UNITS = [
    "海洋竹南",
    "海能風",

    "沃一風",
    "沃二風",
    "沃四風",
    "沃南風",

    "芳一風",
    "芳二風",

    "允泓",
    "允西",

    "中能風",

    "龍A風",
    "龍B風",
  ];

  if (OFFSHORE_WIND_IPP_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "風力(Wind)",
      sub: "離岸風力購電",
    };
  }
  // 🔥 陸域風力購電
  const WIND_IPP_UNITS = [
    "苗栗大鵬",
    "鹿威彰濱",
    "觀威觀音&桃威新屋",
    "中威大安",
    "創維風",
    "新源崙背",
    "彰品風",

    "其它購電風力",
  ];

  if (WIND_IPP_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "風力(Wind)",
      sub: "陸域風力購電",
    };
  }

  // 🔥 陸域風力台電自有
  const WIND_TPC_UNITS = ["觀園", "台中港", "王功", "彰工", "雲麥", "四湖"];
  if (WIND_TPC_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "風力(Wind)",
      sub: "陸域風力台電自有",
    };
  }
  // 🔥 風力其它台電自有
  if (name.startsWith("其它台電自有") && parseFloat(value) >= 30) {
    return {
      main: "風力(Wind)",
      sub: "陸域風力台電自有",
    };
  }

  // 🔥 水力(Hydro)
  const HYDRO_UNITS = [
    // 🔥 德基
    "德基#1",
    "德基#2",
    "德基#3",

    // 🔥 青山
    "青山#1",
    "青山#2",
    "青山#3",
    "青山#4",

    // 🔥 谷關
    "谷關#1",
    "谷關#2",
    "谷關#3",
    "谷關#4",

    // 🔥 天輪
    "天輪#1",
    "天輪#2",
    "天輪#3",
    "天輪#4",
    "天輪#5",

    // 🔥 馬鞍
    "馬鞍#1",
    "馬鞍#2",

    // 🔥 卓蘭
    "卓蘭#1",
    "卓蘭#2",

    // 🔥 萬大
    "萬大#1",
    "萬大#2",
    "萬大#3",
    "萬大#4",

    // 🔥 松林
    "松林#1&2",

    // 🔥 大觀
    "大觀一#1",
    "大觀一#2",
    "大觀一#3",
    "大觀一#4",
    "大觀一#5",

    // 🔥 鉅工
    "鉅工#1",
    "鉅工#2",

    // 🔥 水里
    "水里#1",

    // 🔥 立霧
    "立霧#1&2",

    // 🔥 龍澗
    "龍澗#1",
    "龍澗#2",

    // 🔥 碧海
    "碧海",

    // 🔥 烏來
    "烏來&桂山&粗坑",

    // 🔥 小水力
    "北部小水力",
    "中部小水力",
    "南部小水力",
    "東部小水力",

    // 🔥 翡翠
    "翡翠#1",

    // 🔥 石門
    "石門#1",
    "石門#2",

    // 🔥 曾文
    "曾文#1",

    // 🔥 義興
    "義興#1",

    // 🔥 名間
    "名間",

    // 🔥 嘉南西口、烏山頭和八田
    "嘉南西口、烏山頭和八田",

    // 🔥 卑南
    "卑南",

    // 🔥 捷祥關山
    "捷祥關山",

    // 🔥 其它購電小水力
    "其它購電小水力",
  ];

  if (HYDRO_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "水力(Hydro)",
      sub: "台電自有",
    };
  }

  // 🔥 電池(Battery)
  const BATTERY_UNITS = ["電池"];

  // 🔥 放電 → 儲能
  if (value >= 0 && BATTERY_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "儲能(Energy Storage System)",
      sub: "電池(Battery)",
    };
  }
  // 🔥 其它再生能源(Other Renewable Energy)
  const OTHER_RENEWABLE_UNITS = ["台電自有地熱", "購電地熱", "生質能"];

  if (OTHER_RENEWABLE_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "其它再生能源(Other Renewable Energy)",
      sub: "其它再生能源",
    };
  } // 🔥 儲能負載(Energy Storage System Load)

  const PUMPED_HYDRO_UNITS = [
    "大觀二#1",
    "大觀二#2",
    "大觀二#3",
    "大觀二#4",

    "明潭#1",
    "明潭#2",
    "明潭#3",
    "明潭#4",
    "明潭#5",
    "明潭#6",
  ];

  // 🔥 抽蓄發電
  if (value >= 0 && PUMPED_HYDRO_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "儲能(Energy Storage System)",
      sub: "抽蓄水力(Pumped Hydro)",
    };
  }

  // 🔥 抽蓄負載
  if (value < 0 && PUMPED_HYDRO_UNITS.some((unit) => name.startsWith(unit))) {
    return {
      main: "儲能負載(Energy Storage System Load)",
      sub: "抽蓄水力(Pumped Hydro)",
    };
  }

  // 🔥 電池負載
  if (value < 0 && name.startsWith("電池")) {
    return {
      main: "儲能負載(Energy Storage System Load)",
      sub: "電池(Battery)",
    };
  }
  return {
    main: "其他",
    sub: "其他",
  };
}

/* ========================
   🔥 卡片
======================== */
function PlantCard({ unit, isDark }) {
  const max = parseFloat(unit.max);

  const value = parseFloat(unit.value);

  const safeMax = isNaN(max) ? 0 : max;

  const safeValue = isNaN(value) ? 0 : value;

  const percent = safeMax <= 0 ? 0 : ((safeValue / safeMax) * 100).toFixed(1);

  const isOffline = safeValue === 0 && safeMax > 0;

  const color = isOffline ? "#ef4444" : getColor(Number(percent));

  return (
    <div className={`plant-card ${isOffline ? "offline" : ""}`}>
      <div className="gauge">
        <CircularProgressbar
          value={isNaN(Number(percent)) ? 0 : Number(percent)}
          text={`${percent}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: isDark ? "#e2e8f0" : "#111",
            trailColor: isDark ? "#334155" : "#e5e7eb",
          })}
        />
      </div>

      <h4>{unit.name}</h4>

      {isOffline && <span className="offline-tag">維修中 🔧</span>}

      <div
        style={{
          marginTop: "10px",
          width: "100%",
          fontSize: "13px",
          lineHeight: "1.8",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>裝置容量</span>

          <span>{safeMax || "-"}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>淨發電量</span>

          <span>{safeValue}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>利用率(%)</span>

          <span>{percent}%</span>
        </div>
      </div>

      {unit.status && unit.status !== " " && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#f59e0b",
            minHeight: "20px",
          }}
        >
          {unit.status || "正常運轉"}
        </div>
      )}
    </div>
  );
}

/* ========================
   🔥 主頁
======================== */
export default function PowerPlantLive() {
  const [liveUnits, setLiveUnits] = useState([]);
  const [updateTime, setUpdateTime] = useState("");
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);
  const [isDark, setIsDark] = useState(
    document.body.classList.contains("dark"),
  );

  /* ========================
     🔥 真實機組資料
  ======================== */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/power-units")
      .then((res) => res.json())

      .then((res) => {
        console.log("🔥 API回傳資料:", res);

        if (Array.isArray(res)) {
          setLiveUnits(res);
        } else if (Array.isArray(res.data)) {
          setLiveUnits(res.data);
        } else if (Array.isArray(res.units)) {
          setLiveUnits(res.units);
        } else {
          console.log("❌ API格式錯誤");

          setLiveUnits([]);
        }
        const now = new Date();

        setUpdateTime(
          now.toLocaleString("zh-TW", {
            hour12: false,
          }),
        );
        setLoading(false);
      })

      .catch((err) => {
        console.log(err);

        setError(true);

        setLoading(false);
      });
  }, []);
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
  /* ========================
     🔥 loading
  ======================== */
  if (loading) {
    return (
      <div className="power-container">
        <h1>⚡ 即時電網監控</h1>

        <p>載入即時機組資料中...</p>
      </div>
    );
  }

  /* ========================
     🔥 fallback
  ======================== */
  if (error) {
    return (
      <div className="power-container">
        <h1>⚠️ 即時資料暫時無法使用</h1>

        <p>台電即時 API 無法連線，請稍後再試。</p>
      </div>
    );
  }

  /* ========================
     🔥 總量
  ======================== */
  const totalValue = liveUnits.reduce((sum, u) => {
    const value = parseFloat(u.value);

    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const totalMax = liveUnits.reduce((sum, u) => {
    const max = parseFloat(u.max);

    return sum + (isNaN(max) ? 0 : max);
  }, 0);

  const offlineCount = liveUnits.filter((u) => {
    const value = parseFloat(u.value);

    const max = parseFloat(u.max);

    return !isNaN(max) && max > 0 && (isNaN(value) || value === 0);
  }).length;

  /* ========================
     🔥 官方分類
  ======================== */
  const grouped = {};

  liveUnits.forEach((u) => {
    const value = parseFloat(u.value) || 0;

    const category = getCategory(u.name, value);

    const main = category.main;

    const sub = category.sub;

    if (!grouped[main]) {
      grouped[main] = {};
    }

    if (!grouped[main][sub]) {
      grouped[main][sub] = [];
    }

    grouped[main][sub].push(u);
  });

  return (
    <div className="power-container">
      {/* 🔥 標題 */}
      <h1
        style={{
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          fontSize: "42px",
          fontWeight: 900,
        }}
      >
        <i
          className="fi fi-rr-bolt"
          style={{
            color: "#facc15",
            fontSize: "38px",
            display: "flex",
            filter: "drop-shadow(0 0 10px rgba(250,204,21,0.7))",
          }}
        />
        即時電網監控
      </h1>

      <p
        style={{
          opacity: 0.7,
          marginBottom: "30px",
        }}
      ></p>

      {/* 🔥 即時資訊 */}
      <div
        style={{
          marginBottom: "40px",
          padding: "30px",
          borderRadius: "28px",
          background: isDark
            ? "linear-gradient(135deg, rgba(30,41,59,0.88), rgba(30,41,59,0.88))"
            : "linear-gradient(135deg, rgba(219,234,254,0.95), rgba(219,234,254,0.95))",
          backdropFilter: "blur(18px)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          color: isDark ? "#f8fafc" : "#0f172a",
        }}
      >
        {/* 🔥 上方 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 800,
                letterSpacing: "1px",
              }}
            >
              即時電網總覽
            </h2>

            <p
              style={{
                marginTop: "10px",
                opacity: 0.75,
                fontSize: "15px",
              }}
            >
              台電 LIVE 機組資料監控系統
            </p>
          </div>

          {/* 🔥 LIVE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: "#4ade80",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 12px #22c55e",
              }}
            />
            LIVE DATA
          </div>
        </div>

        {/* 🔥 KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "20px",
          }}
        >
          {/* 🔥 即時發電量 */}
          <div
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.72)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i
                className="fi fi-rr-bolt"
                style={{
                  color: "#38bdf8",
                  display: "flex",
                }}
              />
              即時發電量
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#38bdf8",
              }}
            >
              {totalValue.toFixed(1)}
            </div>

            <div
              style={{
                marginTop: "5px",
                opacity: 0.7,
              }}
            >
              MW
            </div>
          </div>

          {/* 🔥 裝置容量 */}
          <div
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.72)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i
                className="i fi-rr-battery-bolt"
                style={{
                  color: "#facc15",
                  display: "flex",
                }}
              />
              裝置容量
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#facc15",
              }}
            >
              {totalMax.toFixed(1)}
            </div>

            <div
              style={{
                marginTop: "5px",
                opacity: 0.7,
              }}
            >
              MW
            </div>
          </div>

          {/* 🔥 維修 */}
          <div
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.72)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i
                className="fi fi-rr-settings"
                style={{
                  color: "#fb7185",
                  display: "flex",
                }}
              />
              維修中機組
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#fb7185",
              }}
            >
              {offlineCount}
            </div>

            <div
              style={{
                marginTop: "5px",
                opacity: 0.7,
              }}
            >
              台
            </div>
          </div>

          {/* 🔥 更新時間 */}
          <div
            style={{
              padding: "22px",
              borderRadius: "22px",
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.72)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i
                className="fi fi-rr-clock-three"
                style={{
                  color: "#4ade80",
                  display: "flex",
                }}
              />
              最後更新時間
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: "1.6",
                color: isDark ? "#e2e8f0" : "#0f172a",
              }}
            >
              {updateTime}
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                opacity: 0.6,
              }}
            >
              台電即時機組 API
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 官方分類 */}
      {Object.entries(grouped).map(([mainCategory, subGroups]) => {
        return (
          <div
            key={mainCategory}
            style={{
              marginBottom: "70px",
            }}
          >
            {/* 🔥 主分類 */}
            <h2
              style={{
                borderBottom: "3px solid #ef4444",

                paddingBottom: "10px",

                marginBottom: "30px",

                textAlign: "left",
              }}
            >
              {mainCategory}
            </h2>

            {/* 🔥 子分類 */}
            {Object.entries(subGroups).map(([subCategory, units]) => {
              const totalValue = units.reduce(
                (sum, u) => sum + (parseFloat(u.value) || 0),
                0,
              );

              const totalMax = units.reduce(
                (sum, u) => sum + (parseFloat(u.max) || 0),
                0,
              );

              const totalPercent =
                totalMax <= 0 ? 0 : ((totalValue / totalMax) * 100).toFixed(2);

              return (
                <div
                  key={subCategory}
                  style={{
                    marginBottom: "40px",
                  }}
                >
                  {/* 🔥 子標題 */}
                  <h3
                    style={{
                      textAlign: "left",

                      marginBottom: "20px",

                      opacity: 0.85,
                    }}
                  >
                    {subCategory}
                  </h3>

                  {/* 🔥 卡片 */}
                  <div className="card-grid">
                    {units.map((u, i) => (
                      <PlantCard key={i} unit={u} isDark={isDark} />
                    ))}
                  </div>

                  {/* 🔥 小計 */}
                  <div
                    style={{
                      marginTop: "20px",

                      padding: "15px 20px",

                      borderRadius: "15px",

                      

                      fontWeight: 700,

                      fontSize: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* 🔥 主數值 */}
                      <div>
                        小計：
                        <span
                          style={{
                            color: "#38bdf8",
                            marginLeft: "6px",
                          }}
                        >
                          {totalValue.toFixed(1)} MW
                        </span>
                        {" / "}
                        <span
                          style={{
                            color: "#facc15",
                          }}
                        >
                          {totalMax.toFixed(1)} MW
                        </span>
                        <span
                          style={{
                            marginLeft: "10px",
                            color: "#4ade80",
                          }}
                        >
                          （{totalPercent}%）
                        </span>
                      </div>

                      {/* 🔥 說明 */}
                      <div
                        style={{
                          fontSize: "13px",
                          opacity: 0.72,
                          lineHeight: "1.7",
                        }}
                      >
                        ※目前淨發電量(註1) / 裝置容量(註2)（利用率）
                        <br />
                        ※利用率越高，代表目前機組運轉負載越高。
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* 🔥 台電官方註解 */}
      <div
        style={{
          marginTop: "90px",
          padding: "35px",
          borderRadius: "30px",
          background: isDark ? "rgba(30,41,59,0.88)" : "rgba(218,234,255,0.82)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <h2
          style={{
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "30px",
            fontWeight: 800,
            color: isDark ? "#f8fafc" : "#081c44",
          }}
        >
          <i
            className="fi fi-rr-document"
            style={{
              color: isDark ? "#38bdf8" : "#081c44",
              display: "flex",
            }}
          />
          台電官方資料註解
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            lineHeight: "2",
          }}
        >
          {/* 註1 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註1：裝置容量
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              通常以構成該機組之原動機或發電機之設計容量稱之，
              民營電廠則依購售電合約之簽約容量計算。
            </div>
          </div>

          {/* 註2 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註2：淨發電量
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              指發電廠實際輸出至電力系統之電能，
              等於毛發電量扣除廠內用電後之數值。
            </div>
          </div>

          {/* 註3 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註3：淨發電量高於裝置容量
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              部分火力機組可能因設備升級、環境溫度較低、 或機組效能測試等因素，
              導致短時間淨發電量高於裝置容量。
            </div>
          </div>

          {/* 註7 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註7：太陽能購電
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              太陽能購電之發電量， 為依購電取樣發電比例推估之即時值。
            </div>
          </div>

          {/* 註8 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註8：N/A
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              表示目前無即時資訊。
            </div>
          </div>

          {/* 註9 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註9：更新頻率
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              本頁資料約每 10 分鐘更新一次。
            </div>
          </div>

          {/* 註16 */}
          <div>
            <div
              style={{
                color: isDark ? "#38bdf8" : "#081c44",
                fontWeight: 800,
                marginBottom: "8px",
                fontSize: "18px",
              }}
            >
              註16：電池儲能
            </div>

            <div
              style={{
                opacity: 0.82,
                color: isDark ? "#cbd5e1" : "#1e293b",
              }}
            >
              電池裝置容量係指電力交易平台 「電能移轉複合動態調節備轉」
              之得標容量。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
