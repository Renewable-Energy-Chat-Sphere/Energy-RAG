import React, { useEffect, useState } from "react";
import "./EnergyNews.css";
import { useTranslation } from "react-i18next";

export default function EnergyNews() {
  const { t } = useTranslation();
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
          <span>{t("energyNews.title")}</span>
        </h2>

        <p className="energy-news-subtitle">{t("energyNews.subtitle")}</p>
      </div>

      {loading && <p className="energy-news-subtitle">{t("energyNews.loading")}</p>}

      {!loading && news.length === 0 && (
        <p className="energy-news-subtitle">{t("energyNews.empty")}</p>
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
        {t("energyNews.source")}
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
        {t("energyNews.more")}
      </button>
    </section>
  );
}