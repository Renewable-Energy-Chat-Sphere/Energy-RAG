// SidePanel.jsx — Clean & Beautiful Info Panel
export default function SidePanel({ selection, onClear }) {
  // 預設圖片（放在 public/images/energy-default.svg）
  const imageUrl = selection?.imageUrl
    ? selection.imageUrl
    : "/images/energy-default.svg";

  // 描述（目前沒資料 → 顯示暫無）
  const description = selection
    ? "暫無詳細資料。"
    : "";

  return (
    <div className="side-panel-container">

      {/* 標題：如果沒有選擇 → 顯示提示 */}
      <div className="panel-title">
        {selection ? selection.name : "點擊球體查看詳細資訊"}
      </div>

      {/* 清除按鈕（只有選擇後才出現） */}
      {selection && (
        <button className="clear-btn" onClick={onClear}>
          清除
        </button>
      )}

      {/* 如果有選擇 → 顯示內容 */}
      {selection && (
        <>
          {/* 🟦 圖片卡片（玻璃特效） */}
          <div className="info-card image-card">
            <img src={imageUrl} alt={selection.name} />
          </div>

          {/* 🟨 描述區（純文字，不是卡片） */}
          <div className="description-section">
            {description}
          </div>
        </>
      )}

    </div>
  );
}
