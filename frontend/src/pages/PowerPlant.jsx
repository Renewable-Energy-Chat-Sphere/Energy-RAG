import React, { useState } from "react";
import data from "../data/power_full.json";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./power.css";
/* 🔥 區域分類 */
const REGION_MAP = {
  北部: ["林口", "大潭", "石門", "海湖"],
  中部: ["台中", "麥寮", "大甲溪"],
  南部: ["興達", "大林", "南部"],
  東部: ["和平", "東部"],
  再生能源: Object.keys(data).filter(
    (p) =>
      p.includes("風") ||
      p.includes("光") ||
      p.includes("水") ||
      p.includes("電"),
  ),
};

function getColor(percent) {
  if (percent >= 100) return "#ef4444"; //  超載
  if (percent >= 80) return "#ff7b00";  //  高
  if (percent >= 60) return "#f3df00";  //  淺綠
  if (percent >= 40) return "#33c004";  //  中
  if (percent >= 20) return "#31ccd4";  //  低
  return "#939393";                     //  很低
}

/* 🔥 卡片 */
function PlantCard({ unit }) {
  const percent =
    unit.max === 0 ? 0 : ((unit.value / unit.max) * 100).toFixed(1);

  const color = getColor(percent);

  // ⭐ 改這裡（關鍵）
  const isDark = document.body.classList.contains("dark");

  return (
    <div className="plant-card">
      <CircularProgressbar
        value={percent}
        text={`${percent}%`}
        styles={buildStyles({
          pathColor: color,
          textColor: isDark ? "#e2e8f0" : "#111",
          trailColor: isDark ? "#334155" : "#e5e7eb",
        })}
      />
      <h4>{unit.name}</h4>
      <p>
        {unit.value} / {unit.max} MW
      </p>
    </div>
  );
}
export default function PowerPlant() {
  const [selected, setSelected] = useState("林口");

  return (
    <div className="power-container">
      {/* 🔥 區域分類 */}
      {Object.entries(REGION_MAP).map(([region, plants]) => (
        <div key={region} className="region-block">
          <div className="region-title">{region}</div>

          <div className="plant-tabs">
            {plants
              .filter((p) => data[p]) // 有資料才顯示
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

      {/* 🔥 總量卡 */}
      <div>
        <h2>{selected}</h2>
        <p>
          發電量： {data[selected].total.value} / {data[selected].total.max} MW
        </p>
      </div>

      {/* 🔥 機組 */}
      <div className="card-grid">
        {data[selected].units.map((u, i) => (
          <PlantCard key={i} unit={u} />
        ))}
      </div>
    </div>
  );
}
