import React, { useState, useEffect } from "react";
import data from "../data/power_full.json";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./power.css";

/* ========================
   🔥 分類函數（只算一次）
======================== */
function getCategoryMap(data) {
  const solar = Object.keys(data).filter(
    (p) => p.includes("光") || p.includes("太陽") || p === "其它購電太陽能",
  );

  const wind = Object.keys(data).filter(
    (p) => p.includes("風") || p.includes("離岸") || p === "鹿威彰濱",
  );

  const hydro = [
    "大觀",
    "明潭",
    "曾文",
    "桂山",
    "石門",
    "萬大",
    "蘭陽",
    "東部",
    "大甲溪",
    "高屏",
    "卑南上圳小型",
    "烏來&桂山&粗坑",
    "觀威觀音&桃威新屋",
    "嘉南西口、烏山頭和八田",
    "其它購電小水力",
  ];

  const bio = ["生質能"];
  const geo = ["購電地熱", "台電自有地熱"];

  return { solar, wind, hydro, bio, geo };
}

const { solar, wind, hydro, bio, geo } = getCategoryMap(data);

/* ========================
   🔥 區域分類
======================== */
const REGION_MAP = {
  北部: ["林口", "大潭", "石門", "海湖"],
  中部: ["台中", "麥寮", "大甲溪"],
  南部: ["興達", "大林", "南部"],
  東部: ["和平", "東部"],

  太陽能: solar,
  風力: wind,
  水力: hydro,
  生質能: bio,
  地熱: geo,

  其他: Object.keys(data).filter(
    (p) =>
      ![
        ...solar,
        ...wind,
        ...hydro,
        ...bio,
        ...geo,
        "林口",
        "大潭",
        "石門",
        "海湖",
        "台中",
        "麥寮",
        "大甲溪",
        "興達",
        "大林",
        "南部",
        "和平",
        "東部",
      ].includes(p),
  ),
};

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
   🔥 卡片
======================== */
function PlantCard({ unit }) {
  const percent =
    unit.max === 0 ? 0 : ((unit.value / unit.max) * 100).toFixed(1);

  const isOffline = unit.value === 0 && unit.max > 0;
  const color = isOffline ? "#ef4444" : getColor(percent);

  const isDark = document.body.classList.contains("dark");

  return (
    <div className={`plant-card ${isOffline ? "offline" : ""}`}>
      <div className="gauge">
        <CircularProgressbar
          value={percent}
          text={`${percent}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: isDark ? "#e2e8f0" : "#111",
            trailColor: isDark ? "#334155" : "#e5e7eb",
          })}
        />
      </div>

      <h4>{unit.name}</h4>

      {isOffline && <span className="offline-tag">維修中🔧</span>}

      <p>
        {unit.value} / {unit.max} MW
      </p>
    </div>
  );
}

/* ========================
   🔥 主元件
======================== */
export default function PowerPlant() {
  const [selected, setSelected] = useState("林口");

  // 🔥 即時資料
  const [liveData, setLiveData] = useState(null);
  const [useLive, setUseLive] = useState(true);

  useEffect(() => {
    fetch(
      "https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/genloadareaperc.json",
    )
      .then((res) => res.json())
      .then((res) => {
        setLiveData(res);
        setUseLive(true);
      })
      .catch(() => {
        console.log("⚠️ API抓不到 → 使用本地資料");
        setUseLive(false);
      });
  }, []);

  return (
    <div className="power-container">
      {/* 🔥 模式顯示 */}
      <p style={{ fontSize: "14px", opacity: 0.7 }}>
        {useLive ? "🟢 即時模式（台電API）" : "🟡 離線模式（本地資料）"}
      </p>

      {/* 🔥 分類 */}
      {Object.entries(REGION_MAP).map(([region, plants]) => (
        <div key={region} className="region-block">
          <div className="region-title">{region}</div>

          <div className="plant-tabs">
            {plants
              .filter((p) => data[p])
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  className={selected === p ? "active" : ""}
                >
                  {p}
                </button>
              ))}
          </div>
        </div>
      ))}

      {/* 🔥 總量 */}
      <div>
        <h2>{selected}</h2>

        {useLive && liveData ? (
          <div>
            <p>⚡ 即時發電量：{liveData.gen} 萬瓩</p>
            <p>📊 用電負載：{liveData.load} 萬瓩</p>
            <p>🟢 備轉容量：{liveData.reserve}%</p>
            <p>🕒 更新時間：{liveData.time}</p>
          </div>
        ) : (
          <div>
            <p>
              ⚡ 發電量(已/可)： {data[selected].total.value} /{" "}
              {data[selected].total.max} MW
            </p>
            <p style={{ color: "#f59e0b" }}>（使用本地資料）</p>
          </div>
        )}
      </div>

      {/* 🔧 維修 */}
      <p style={{ color: "#ef4444", fontWeight: 600 }}>
        維修中機組：
        {
          data[selected].units.filter((u) => u.value === 0 && u.max > 0).length
        }{" "}
        台
      </p>

      {/* 🔥 機組 */}
      <div className="card-grid">
        {data[selected].units.map((u, i) => (
          <PlantCard key={i} unit={u} />
        ))}
      </div>
    </div>
  );
}
