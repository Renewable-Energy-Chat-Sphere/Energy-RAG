import { useEffect } from "react";

// =============================
// 返回頂部按鈕（⇧）
// =============================
function BackToTopButton() {
  useEffect(() => {
    const btn = document.querySelector(".back-to-top");

    const onScroll = () => {
      if (window.scrollY > 300) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button className="back-to-top" onClick={scrollToTop}>
      ⬆︎
    </button>
  );
}

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
      {/* HERO BANNER */}
      <section
        className="hero-banner"
        style={{
          position: "relative",
          width: "100%",
          height: "300px",
          background:
            "url('https://tse4.mm.bing.net/th/id/OIP.xBTpZMfmXk8z6uNbQHNZUgHaE8') center/cover no-repeat",
          marginTop: "70px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
          }}
        ></div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "60px",
            color: "white",
          }}
        >
          <h1
            style={{ fontSize: "40px", fontWeight: 700, marginBottom: "40px" }}
          >
            多模態視覺能源球 · 智慧代理系統
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.9 }}>
            結合能源資料、三維視覺化與 AI RAG 的新一代能源決策平台。
          </p>
        </div>
      </section>

      {/* HERO TITLE */}
      <section className="hero">
        <h1>多模態視覺能源球 · 智慧代理系統</h1>
        <p>適用一般民眾、能源管理單位與研究人員的智慧能源決策平台。</p>
        <button>登入/註冊</button>
      </section>

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

      {/* SECTION PLACEHOLDERS */}
      <section id="viz" className="section">
        <h2>能源視覺化總覽</h2>
        <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
          這裡是能源視覺化總覽內容。
        </p>
      </section>

      <section id="viz-detail1" className="section">
        <h2>視覺化細節 1</h2>
        <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
          視覺化細節 1 的說明文字。
        </p>
      </section>

      <section id="viz-detail2" className="section">
        <h2>視覺化細節 2</h2>
        <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
          視覺化細節 2 的說明文字。
        </p>
      </section>

      <section id="rag" className="section">
        <h2>智慧查詢</h2>
        <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
          智慧查詢功能介紹。
        </p>
      </section>

      <section id="contact" className="section">
        <h2>聯絡我們</h2>
        <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
          歡迎透過以下方式聯絡我們。<br />
          智慧能源專案組長：石佳惠教授 Email:159931@mail.fju.edu.tw <br />
          智慧能源專案專員：陳相叡同學 Email:412402165@m365.fju.edu.tw <br />
          智慧能源專案專員：周子芹同學 Email:412402036@m365.fju.edu.tw<br />
          智慧能源專案專員：張宇承同學 Email:412402335@m365.fju.edu.tw<br />
          智慧能源專案專員：呂羿辰同學 Email:412402244@m365.fju.edu.tw<br />
        </p>
      </section>

      {/* ✔ 返回頂部按鈕 */}
      <BackToTopButton />
    </>
  );
}
