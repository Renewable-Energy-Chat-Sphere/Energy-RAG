import { useState } from "react";
import GlobeVisualizer from "../components/GlobeTest1";
import SidePanel from "../components/SidePanel";
import "./global.css";
import "./SidePanel.css";
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
      {/* 下方左右布局 */}
      {/* ===================== */}
      <div className="global-layout">

        {/* 左側球體 */}
        <div className="globe-area">
          <GlobeVisualizer
            year={year}
            showSupply={showSupply}
            search={search}
            onSelect={setSelection}
          />
        </div>

        {/* 右側資訊欄 */}
        <div className="side-area">
          <SidePanel
            selection={selection}
            onClear={() => setSelection(null)}
          />
        </div>

      </div>

      <BackToTopButton />

    </div>
  );
}