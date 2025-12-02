import "./global.css";

export default function Global() {
  return (
    <div className="global-wrapper">

      {/* 頁面標題列 */}
      <div className="page-header">
        <span className="page-title">能源視覺化</span>

        <div className="page-actions">
          <button>重新整理</button>
          <button>切換模式</button>
          <button>更多操作</button>
        </div>
      </div>

      {/* 主內容：3D球體 + 資訊欄 */}
      <div className="content-area">
        
        <div className="sphere-area">
          <div id="sphere-container"></div>
        </div>

        <div className="info-panel">
          <h3>區域資訊</h3>
          <p className="panel-tip">（這裡顯示能源部門、子項目、供需數據…）</p>

          <div className="panel-section">
            <h4>名稱：</h4>
            <p>尚未選取</p>
          </div>

          <div className="panel-section">
            <h4>供給：</h4>
            <p>尚無資料</p>
          </div>

          <div className="panel-section">
            <h4>需求：</h4>
            <p>尚無資料</p>
          </div>
        </div>
      </div>

    </div>
  );
}
