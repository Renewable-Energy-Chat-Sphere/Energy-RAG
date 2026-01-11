import { useEffect, useState } from "react";

export default function EnergyNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/energy-news")
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
      style={{ maxWidth: "1100px", margin: "48px auto" }}
    >
      {/* 標題 */}
      <div>
        <h2 className="energy-news-title">
          <i
            className="fi fi-rr-megaphone"
            aria-hidden="true"
          />
          <span>能源署最新公告</span>
        </h2>

        <p className="energy-news-subtitle">
          同步能源署官方網站公告資訊
        </p>
      </div>

      {loading && (
        <p className="energy-news-subtitle">讀取中…</p>
      )}

      {!loading && news.length === 0 && (
        <p className="energy-news-subtitle">目前沒有公告</p>
      )}

      {/* 公告清單 */}
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

      <small
        className="energy-news-subtitle"
        style={{ marginTop: "16px", display: "block" }}
      >
        資料來源：經濟部能源署
      </small>
    </section>
  );
}
