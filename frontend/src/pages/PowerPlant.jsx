import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./power.css";

const plants = {
  林口: [
    { name: "林口#1", value: 752.4, max: 800 },
    { name: "林口#2", value: 766.2, max: 800 },
    { name: "林口#3", value: 759.2, max: 800 },
  ],
  台中: [
    { name: "台中#1", value: 1800, max: 2000 },
    { name: "台中#2", value: 1700, max: 2000 },
    { name: "台中#3", value: 1750, max: 2000 },
    { name: "台中#4", value: 1680, max: 2000 },
  ],
};

function getColor(percent) {
  if (percent >= 90) return "#ef4444"; // 紅
  if (percent >= 60) return "#22c55e"; // 綠
  return "#94a3b8"; // 灰
}

function PlantCard({ plant }) {
  const percent = ((plant.value / plant.max) * 100).toFixed(1);
  const color = getColor(percent);

  return (
    <div className="plant-card">
      <div className="gauge">
        <CircularProgressbar
          value={percent}
          text={`${percent}%`}
          styles={buildStyles({
            textColor: color,
            pathColor: color,
            trailColor: "#e5e7eb",
          })}
        />
      </div>

      <div className="plant-name">{plant.name}</div>
      <div className="plant-sub">發電機組</div>
      <div className="plant-power">
        {plant.value} MW / {plant.max} MW
      </div>
    </div>
  );
}

export default function PowerPlant() {
  return (
    <div className="power-container">
      {Object.entries(plants).map(([region, list]) => (
        <div key={region} className="region-block">
          <h2 className="region-title">{region}</h2>

          <div className="card-row">
            {list.map((p, i) => (
              <PlantCard key={i} plant={p} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
