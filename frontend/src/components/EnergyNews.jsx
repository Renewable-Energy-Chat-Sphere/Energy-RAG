import React from "react";
import { useEffect, useState } from "react";

export default function EnergyNews() {
  const API = "/api";
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`${API}/energy-news`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section
      className="energy-news"
      style={{
        maxWidth: "1200px",
        margin: "48px auto",
        position: "relative",
        paddingBottom: "90px",
      }}
    >
      {/* 標題 */}
      <div>
        <h2 className="energy-news-title">
          <i class="fi fi-br-megaphone"></i>
          <span>能源署最新公告新聞</span>
        </h2>

        <p className="energy-news-subtitle">同步能源署官方網站新聞資訊</p>
      </div>

      {loading && <p className="energy-news-subtitle">讀取中…</p>}

      {!loading && news.length === 0 && (
        <p className="energy-news-subtitle">目前沒有公告的新聞</p>
      )}

      {/* 公告新聞清單 */}
      <div className="energy-news-list">
        {news.map((n, i) => (
          <a
            key={i}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="energy-news-item"
          >
            <span>{n.title}</span>
          </a>
        ))}
      </div>

      {/* 資料來源 */}
      <small
        className="energy-news-subtitle"
        style={{ marginTop: "16px", display: "block" }}
      >
        新聞資料來源：經濟部能源署
      </small>

      {/* 右下角浮動按鈕 */}
      <button
        onClick={() =>
          window.open(
            "https://www.moeaea.gov.tw/ECW/populace/news/News.aspx?kind=1&menu_id=41",
            "_blank",
          )
        }
        style={{
          position: "absolute",
          right: "24px",
          bottom: "24px",
          padding: "10px 20px",
          backgroundColor: "#0d2c6e",
          color: "white",
          border: "none",
          borderRadius: "999px",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
          transition: "all 0.25s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";
        }}
      >
        查看全部新聞 →
      </button>
    </section>
  );
}
