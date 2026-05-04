import React, { useEffect, useState } from "react";

export default function Feedback() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("全部");
  const [selected, setSelected] = useState(null);
  const API = "http://127.0.0.1:8000";

  useEffect(() => {
    fetch(`${API}/get_feedback`)
      .then((res) => res.json())
      .then((data) => setList(data))
      .catch(() => setList([]));
  }, []);

  // =========================
  // 🔥 排序（高優先 → 上面）
  // =========================
  const sortedList = [...list].sort((a, b) => {
    const order = { 高: 3, 中: 2, 低: 1 };
    return (order[b.priority] || 0) - (order[a.priority] || 0);
  });

  // =========================
  // 🔥 篩選
  // =========================
  const filteredList =
    filter === "全部"
      ? sortedList
      : sortedList.filter((item) => item.sentiment?.trim() === filter.trim());

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <h2 className="feedback-title">
          <i className="fi fi-br-chart-histogram"></i>
          <span>回饋分析</span>
        </h2>

        {/* 篩選 */}
        <div className="filter-bar">
          {["全部", "正面", "中立", "負面"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {filteredList.length === 0 ? (
          <div className="empty-box">📭 目前沒有任何回饋資料</div>
        ) : (
          <div className="list-container">
            {filteredList.map((item, i) => (
              <div
                key={i}
                className="row-card"
                onClick={() => setSelected(item)}
              >
                <div className="col name">{item.name}</div>

                <div className="col feeling">{item.feeling}</div>

                <div className="col message">
                  {item.message?.slice(0, 40)}...
                </div>

                <div className="col tags">
                  <span className={`tag ${item.sentiment}`}>
                    {item.sentiment}
                  </span>

                  {item.priority === "高" && (
                    <span className="tag high">🔥</span>
                  )}

                  {/* ⭐ 新增 status */}
                  <span className={`status ${item.status}`}>
                    {item.status === "closed" ? "已完成" : "處理中"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal">
          <div className="modal-card">
            <h3>📩 意見回饋</h3>

            <p>
              <strong>姓名：</strong>
              {selected.name}
            </p>
            <p>
              <strong>Email：</strong>
              {selected.email}
            </p>
            <p>
              <strong>電話：</strong>
              {selected.phone}
            </p>
            <p>
              <strong>滿意度：</strong>
              {selected.feeling}
            </p>

            <div className="message-box">{selected.message}</div>

            <div className="tags">
              <span className={`tag ${selected.sentiment}`}>
                {selected.sentiment}
              </span>

              <span className="tag category">{selected.category}</span>

              {selected.priority === "高" && (
                <span className="tag high">🔥 高優先</span>
              )}

              {/* ⭐ status */}
              <span className={`status ${selected.status}`}>
                {selected.status === "closed" ? "已完成" : "處理中"}
              </span>
            </div>

            {/* ⭐ AI 回覆 */}
            {selected.reply && (
              <>
                <p style={{ marginTop: "10px" }}>
                  <strong>🤖 系統回覆：</strong>
                </p>
                <div className="reply-box">{selected.reply}</div>
              </>
            )}

            <button onClick={() => setSelected(null)}>關閉</button>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`.feedback-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  font-size: 34px;   /* 🔥 文字變大 */
  font-weight: 700;
}

/* icon */
.feedback-title i {
  font-size: 30px;   /* 比文字小一點才好看 */
  color: #60a5fa;

  /* 微發光（科技感） */
  text-shadow: 0 0 6px rgba(96,165,250,0.6);
}

/* 文字 */
.feedback-title span {
  letter-spacing: 2px;
}
        .feedback-page {
          display: flex;
          justify-content: center;
          padding: 40px;
          color: var(--text);
        }

        .feedback-container {
          width: 100%;
          max-width: 900px;
        }

        h2 {
          text-align: center;
          margin-bottom: 20px;
          color: var(--section-title-color);
        }

        /* 🔘 篩選按鈕 */
        .filter-bar {
          text-align: center;
          margin-bottom: 20px;
        }

        .filter-bar button {
          margin: 0 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text);
          cursor: pointer;
          transition: 0.3s;
        }

        .filter-bar button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-soft);
        }

        .filter-bar .active {
          background: linear-gradient(135deg, #0d2c6e, #2563eb);
          color: white;
          border: none;
        }

        /* 📦 列表卡片 */
        .row-card {
          display: grid;
          grid-template-columns: 1fr 1fr 3fr 2fr;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          backdrop-filter: var(--glass);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: 0.3s ease;
          color: var(--text);
        }

        .row-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-soft);
        }

        /* 文字 */
        .name {
          font-weight: bold;
        }

        .message {
          opacity: 0.8;
        }

        /* 🏷 tags */
        .tags {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }

        .tag {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        /* 情緒 */
        .tag.正面 { background: #22c55e; color: white; }
        .tag.中立 { background: #facc15; color: black; }
        .tag.負面 { background: #ef4444; color: white; }

        /* 高優先 */
        .tag.high {
          background: #ef4444;
          color: white;
        }

        /* 狀態 */
        .status {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .status.open {
          background: #3b82f6;
          color: white;
        }

        .status.closed {
          background: #9ca3af;
          color: white;
        }

        /* 📭 空狀態 */
        .empty-box {
          text-align: center;
          padding: 30px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          color: var(--text);
        }

        /* =========================
          🪟 Modal
        ========================= */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        /* Modal 卡片 */
        .modal-card {
          background: var(--card-bg);
          color: var(--text);
          border: 1px solid var(--card-border);
          backdrop-filter: var(--glass);
          padding: 24px;
          border-radius: 16px;
          width: 420px;
          box-shadow: var(--shadow-soft);
        }

        /* 訊息區 */
        .message-box {
          background: rgba(255,255,255,0.05);
          padding: 12px;
          border-radius: 8px;
          margin: 10px 0;
        }

        /* AI 回覆 */
        .reply-box {
          background: rgba(37, 99, 235, 0.1);
          padding: 12px;
          border-radius: 8px;
          margin-top: 10px;
        }

        /* 🔘 按鈕 */
        button {
          margin-top: 12px;
          padding: 10px 18px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #0d2c6e, #2563eb);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }

        button:active {
          transform: scale(0.95);
        }
        `}</style>
    </div>
  );
}
