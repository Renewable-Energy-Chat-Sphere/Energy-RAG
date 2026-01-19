import { useEffect } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import EnergyNews from "../components/EnergyNews";

export default function Home() {
  useEffect(() => {
    // 卡片進場動畫
    const cards = document.querySelectorAll(".card");
    const observerOptions = { root: null, threshold: 0.15 };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    cards.forEach((c) => observer.observe(c));

    // Accordion
    document.querySelectorAll(".accordion").forEach((acc) => {
      acc.addEventListener("click", () => {
        const content = acc.nextElementSibling;
        content.classList.toggle("open");
        acc.classList.toggle("active");
      });
    });
  }, []);

  return (
    <>
      {/* HERO BANNER（有圖片那一塊） */}
      <section
        className="hero-banner"
        style={{
          position: "relative",
          width: "100%",
          height: "300px",
          background:
            "url('https://cdn.orsted.com/-/media/www/images/corp/tw/tw-news/1005preevent.jpg?mh=1440&mw=1440&rev=e3e5ef740b2d47f899c5ee7df1ce75e6&hash=142400333144F591C049C8D872C07F78') center/cover no-repeat",
          marginTop: "70px",
        }}
      >
        {/* 黑色遮罩 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1,
          }}
        />

        {/* 左側文字 */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "60px",
            color: "white",
            zIndex: 2,
          }}
        >
          <h1
            style={{ fontSize: "40px", fontWeight: 700, marginBottom: "20px" }}
          >
            讓能源資料真正「看得見、問得到、用得上」
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9 }}>
            結合 3D 視覺能源球與 AI 智慧代理的新一代能源決策平台
          </p>
        </div>

        {/* 右側登入按鈕 */}
        <div className="hero-banner-login">
          <Link to="/login" style={{ textDecoration: "none" }}>
            <button className="hero-login-btn">登入 / 註冊</button>
          </Link>
        </div>
      </section>

      {/* HERO TITLE */}
      <section className="hero">
        <h2 style={{ fontSize: "32px", fontWeight: 600, textAlign: "center" }}>
          多模態視覺能源球 · 智慧代理系統
        </h2>

        <p>
          將複雜的能源資料轉化為可探索的三維能源球模型，
          直覺呈現產業別能源使用結構與變化趨勢。
        </p>

        <p>
          透過 AI 智慧代理與 RAG 技術，
          使用者可直接以自然語言查詢、比較與分析能源數據，
        </p>

        <p>協助快速理解能源現況，並支援後續研究與策略決策。</p>
      </section>
      <EnergyNews />
      {/* FEATURES */}
      <section id="features" className="section">
        <h2 style={{ fontSize: "32px", fontWeight: 600, textAlign: "center" }}>
          系統特色
        </h2>

        <div className="cards">
          {/* Card 1 */}
          <div className="card">
            <h3>3D 能源視覺球</h3>
            <p>以 Google Earth 風格呈現能源供給、需求與轉換。</p>
            <div className="accordion">更多細節說明</div>
            <div className="accordion-content">
              <p>使用最新三維技術，結合實時數據，提供沉浸式體驗。</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="card">
            <h3>智慧 RAG 查詢</h3>
            <p>整合能源平衡表、氣象資料、電力統計，提供深度數據分析。</p>
            <div className="accordion">更多細節說明</div>
            <div className="accordion-content">
              <p>結合多源資料，提供即時且精準的分析結果。</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="card">
            <h3>決策輔助分析</h3>
            <p>趨勢分析、異常預警與區域比較，提升治理效率。</p>
            <div className="accordion">更多細節說明</div>
            <div className="accordion-content">
              <p>提供多維度視覺化，協助快速判斷與決策。</p>
            </div>
          </div>
        </div>
      </section>


      {/* ✔ 返回頂部按鈕 */}
      <BackToTopButton />
    </>
  );
}
