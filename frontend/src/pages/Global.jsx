import { useState } from "react";
import GlobeVisualizer from "../components/Globe1.jsx";
import "./global.css";
import BackToTopButton from "../components/BackToTopButton";

export default function Global() {
  const [selection, setSelection] = useState(null);
  const [year, setYear] = useState("113");
  const [showSupply, setShowSupply] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="global-page">

      {/* ===================== */}
      {/* 上方控制面板 */}
      {/* ===================== */}
      <div className="control-panel">

        <div className="panel-title">
          ⚙️ 能源控制面板
        </div>

        {/* 年份選擇 */}
        <div className="panel-row">
          <label>年份</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="113">113</option>
            <option value="112">112</option>
            <option value="111">111</option>
          </select>
        </div>

        {/* 供給線開關 */}
        <div className="panel-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showSupply}
              onChange={() => setShowSupply(!showSupply)}
            />
            顯示供給線
          </label>
        </div>

        {/* 搜尋框 */}
        <div className="panel-row search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜尋部門..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

      </div>

      {/* ===================== */}
      {/* 球體區塊（全寬） */}
      {/* ===================== */}
      <div className="global-layout">

        <div className="globe-area">
          <GlobeVisualizer
            year={year}
            showSupply={showSupply}
            search={search}
            onSelect={setSelection}
          />
        </div>

      </div>

      {/* ===================== */}
      {/* 全畫面展開卡片 */}
      {/* ===================== */}
      {selection && (
        <div className="full-card-overlay">

          <div className="full-card">

            <button
              className="full-close"
              onClick={() => setSelection(null)}
            >
              ✕
            </button>

            <h2>{selection.name}</h2>

            <img
              src={`/images/${selection.code}.jpg`}
              alt=""
              className="full-img"
            />

            <div className="full-content">

              <h3>常用能源</h3>
              <p>電力、石油、天然氣</p>

              <h3>年度分析</h3>
              <p>
                這裡可以放該部門於 {selection.year} 年的
                能源結構比例、需求佔比、趨勢變化等。
              </p>

              <h3>相似度分析</h3>
              <p>
                供給加權相似度 / 需求加權相似度 /
                歐幾里得距離等。
              </p>

            </div>

          </div>

        </div>
      )}

      <BackToTopButton />

    </div>
  );
}