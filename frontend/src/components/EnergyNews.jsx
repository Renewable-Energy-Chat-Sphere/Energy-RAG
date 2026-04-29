import React, { useEffect, useState } from "react";
import "./EnergyNews.css";

export default function EnergyNews() {
  const API = "http://127.0.0.1:8000";
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/energy-news`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setNews(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="energy-news">
      <div>
        <h2 className="energy-news-title">
          <i className="fi fi-br-megaphone"></i>
          <span>能源署最新公告新聞</span>
        </h2>

        <p className="energy-news-subtitle">同步能源署官方網站新聞資訊</p>
      </div>

      {loading && <p className="energy-news-subtitle">讀取中…</p>}

      {!loading && news.length === 0 && (
        <p className="energy-news-subtitle">目前沒有公告的新聞</p>
      )}

      <div className="energy-news-list">
        {news.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="energy-news-item"
          >
            <span>{n.title}</span>
          </a>
        ))}
      </div>

      <small className="energy-news-subtitle energy-news-source">
        新聞資料來源：經濟部能源署
      </small>

      <button
        className="energy-news-btn"
        onClick={() =>
          window.open(
            "https://www.moeaea.gov.tw/ECW/populace/news/News.aspx?kind=1&menu_id=41",
            "_blank"
          )
        }
      >
        查看全部新聞 →
      </button>
    </section>
  );
}