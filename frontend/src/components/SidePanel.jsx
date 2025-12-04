// SidePanel.jsx — Clean Standalone Component

export default function SidePanel({ selection, onClear }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 16,
        overflowY: "auto",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>詳細資訊</div>

        {selection && (
          <button
            onClick={onClear}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "hsla(0, 0%, 100%, 1.00)",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            清除
          </button>
        )}
      </div>

      {!selection && (
        <div style={{ color: "#666" }}>
          點擊球面上的<b>部門或子項目</b>，這裡會顯示資訊。
        </div>
      )}

      {selection?.type === "sector" && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{selection.name}</div>
          <div style={{ color: "#666" }}>（部門）</div>
          <div style={{ marginTop: 12 }}>尚無資料</div>
        </div>
      )}

      {selection?.type === "industry" && (
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>{selection.parentName}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{selection.name}</div>
          <div style={{ color: "#666" }}>（子項目）</div>
          <div style={{ marginTop: 12 }}>尚無資料</div>
        </div>
      )}
    </div>
  );
}
