import React, { useEffect, useState } from "react";

export default function Feedback() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("全部");
  const [selected, setSelected] = useState(null);
  const API = `${window.location.protocol}//${window.location.hostname}:8000`;

  useEffect(() => {
    fetch("${API}/get_feedback")
      .then((res) => res.json())
      .then((data) => setList(data))
      .catch(() => setList([]));
  }, []);

  const filteredList =
    filter === "全部"
      ? list
      : list.filter(
          (item) => item.sentiment?.trim() === filter.trim()
        );

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <h2>📊 回饋分析 Dashboard</h2>

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
          <div className="empty-box">
            📭 目前沒有任何回饋資料
          </div>
        ) : (
          <div className="list-container">
            {filteredList.map((item, i) => (
              <div
                key={i}
                className="row-card"
                onClick={() => setSelected(item)}
              >
                <div className="col name">
                  {item.name}
                </div>

                <div className="col feeling">
                  {item.feeling}
                </div>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 詳細展開（像 Gmail） */}
      {selected && (
        <div className="modal">
          <div className="modal-card">
            <h3>📩 意見回饋</h3>

            <p><strong>姓名：</strong>{selected.name}</p>
            <p><strong>Email：</strong>{selected.email}</p>
            <p><strong>電話：</strong>{selected.phone}</p>
            <p><strong>滿意度：</strong>{selected.feeling}</p>

            <div className="message-box">
              {selected.message}
            </div>

            <div className="tags">
              <span className={`tag ${selected.sentiment}`}>
                {selected.sentiment}
              </span>

              <span className="tag category">
                {selected.category}
              </span>

              {selected.priority === "高" && (
                <span className="tag high">🔥 高優先</span>
              )}
            </div>

            <button onClick={() => setSelected(null)}>
              關閉
            </button>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .feedback-page {
          display: flex;
          justify-content: center;
          padding: 40px;
        }

        .feedback-container {
          width: 100%;
          max-width: 900px;
        }

        h2 {
          text-align: center;
          margin-bottom: 20px;
        }

        .filter-bar {
          text-align: center;
          margin-bottom: 20px;
        }

        .filter-bar button {
          margin: 0 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border: none;
          background: #e5e7eb;
          cursor: pointer;
        }

        .filter-bar .active {
          background: #2563eb;
          color: white;
        }

        /* Gmail列表 */
        .row-card {
          display: grid;
          grid-template-columns: 1fr 1fr 3fr 1fr;
          background: #e9dfd5;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .row-card:hover {
          background: #ddd4ca;
        }

        .name {
          font-weight: bold;
        }

        .message {
          opacity: 0.8;
        }

        .tags {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .tag {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .tag.正面 {
          background: #22c55e;
          color: white;
        }

        .tag.中立 {
          background: #facc15;
        }

        .tag.負面 {
          background: #ef4444;
          color: white;
        }

        .tag.high {
          background: #ef4444;
          color: white;
        }

        /* Modal */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modal-card {
          background: #e9dfd5;
          padding: 20px;
          border-radius: 12px;
          width: 400px;
        }

        .message-box {
          background: #ddd4ca;
          padding: 10px;
          border-radius: 8px;
          margin: 10px 0;
        }

        button {
          margin-top: 10px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          cursor: pointer;
        }

        .empty-box {
          text-align: center;
          padding: 30px;
          background: #eee;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}