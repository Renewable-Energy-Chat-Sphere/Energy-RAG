import { useEffect } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import EnergyNews from "../components/EnergyNews";

export default function Home() {
  useEffect(() => {
    /* 卡片進場動畫 */
    const cards = document.querySelectorAll(".card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach((c) => observer.observe(c));

    /* Accordion：事件委派（關鍵） */
    const cardsContainer = document.querySelector(".cards");

    const onAccordionClick = (e) => {
      const acc = e.target.closest(".accordion");
      if (!acc) return;

      const allAccordions = cardsContainer.querySelectorAll(".accordion");

      allAccordions.forEach((other) => {
        if (other !== acc) {
          other.classList.remove("active");
          other.nextElementSibling.classList.remove("open");
        }
      });

      acc.classList.toggle("active");
      acc.nextElementSibling.classList.toggle("open");
    };

    cardsContainer?.addEventListener("click", onAccordionClick);

    return () => {
      observer.disconnect();
      cardsContainer?.removeEventListener("click", onAccordionClick);
    };
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
            "url('https://cdn.orsted.com/-/media/www/images/corp/tw/tw-news/1005preevent.jpg?mh=1440&mw=1440') center/cover no-repeat",
          marginTop: "70px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "60px",
            color: "white",
            zIndex: 2,
          }}
        >
          <h1 style={{ fontSize: "40px", fontWeight: 700 }}>
            讓能源資料真正「看得見、問得到、用得上」
          </h1>
          <p>結合 3D 視覺能源球與 AI 智慧代理的新一代能源決策平台</p>
        </div>

        <div className="hero-banner-login">
          <Link to="/login">
            <button className="hero-login-btn">登入 / 註冊</button>
          </Link>
        </div>
      </section>

      {/* HERO */}
      <section className="hero">
        <h2>多模態視覺能源球 · 智慧代理系統</h2>
        <p>將複雜的能源資料轉化為可探索的三維能源球模型</p>
        <p>透過 AI 與 RAG 技術進行能源查詢與分析</p>
        <p>支援研究與政策決策應用</p>
      </section>

      <EnergyNews />

      {/* FEATURES */}
      <section id="features" className="section">
        <h2 style={{ textAlign: "center" }}>系統特色</h2>

        <div className="cards">
          {[
            {
              title: "3D 能源視覺球",
              desc:
                "以 Google Earth 風格，將台灣各產業能源結構轉換為可旋轉、可比較的三維視覺模型",
              detail:
                "使用最新三維技術，結合實時數據，支援年度切換、產業分層與相似度視覺化。",
            },
            {
              title: "智慧 RAG 查詢",
              desc:
                "結合能源平衡表、電力與政策資料，使用自然語言查詢與比較能源數據。",
              detail:
                "例如：「哪個產業近十年能源結構變化最大？」",
            },
            {
              title: "決策輔助分析",
              desc:
                "透過相似度計算與趨勢視覺化，協助比較產業、年度與區域用能差異。",
              detail:
                "作為能源政策與產業分析的輔助工具。",
            },
          ].map((item, i) => (
            <div className="card" key={i}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>

              <div className="accordion">更多細節說明</div>
              <div className="accordion-content">
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BackToTopButton />
    </>
  );
}
