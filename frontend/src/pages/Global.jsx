import GlobeVisualizer from "../components/GlobeVisualizer";
import "./Global.css";

export default function Global() {
  return (
    <div className="global-layout">
      {/* 左側：球體 */}
      <div className="globe-area">
        <GlobeVisualizer />
      </div>

      {/* 右側：側欄會由 GlobeVisualizer 注入 */}
      <div className="side-area" id="side-panel-container"></div>
    </div>
  );
}
