import { useState } from "react";
import GlobeVisualizer from "../components/GlobeVisualizer";
import SidePanel from "../components/SidePanel";
import "./Global.css";

export default function Global() {
  const [selection, setSelection] = useState(null);

  return (
    <div className="global-layout">

      {/* 左側：球體 */}
      <div className="globe-area">
        <GlobeVisualizer onSelect={setSelection} />
      </div>

      {/* 右側：SidePanel（獨立渲染） */}
      <div className="side-area">
        <SidePanel
          selection={selection}
          onClear={() => setSelection(null)}
        />
      </div>

    </div>
  );
}
