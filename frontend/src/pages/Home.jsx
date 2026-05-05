import React from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import BackToTopButton from "../components/BackToTopButton";
import EnergyNews from "../components/EnergyNews";
import Dashboard from "../components/Dashboard";
import ExternalLinks from "../components/ExternalLinks";
import LinkCarousel from "../components/LinkCarousel";
import "../pages/home.css";

export default function Home() {
  useEffect(() => {
    /* Reveal Observer */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15 },
    );

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    /* Accordion */
    const cardsContainer = document.querySelector(".cards");

    const onAccordionClick = (e) => {
      const acc = e.target.closest(".accordion");
      if (!acc) return;

      document.querySelectorAll(".accordion").forEach((a) => {
        if (a !== acc) {
          a.classList.remove("active");
          a.nextElementSibling?.classList.remove("open");
        }
      });

      acc.classList.toggle("active");
      acc.nextElementSibling?.classList.toggle("open");
    };

    cardsContainer?.addEventListener("click", onAccordionClick);
    console.log("clicked accordion");

    /* 數字滾動動畫 */
    const animateValue = (el) => {
      const raw = el.innerText;
      const number = parseFloat(raw.replace(/[^\d.]/g, ""));
      const suffix = raw.replace(/[\d,.]/g, "");

      let start = 0;
      const duration = 1200;
      const stepTime = 16;
      const totalSteps = duration / stepTime;
      const increment = number / totalSteps;

      const counter = setInterval(() => {
        start += increment;
        if (start >= number) {
          el.innerText = raw;
          clearInterval(counter);
        } else {
          el.innerText = Math.floor(start).toLocaleString() + suffix;
        }
      }, stepTime);
    };

    document.querySelectorAll(".big-number").forEach((el) => animateValue(el));

    return () => {
      observer.disconnect();
      cardsContainer?.removeEventListener("click", onAccordionClick);
    };
  }, []);
  const activityData = [
    {
      img: import.meta.env.BASE_URL + "images/banner1.png",
      link: "https://save3000.moeaea.gov.tw/subsidy02/index/index.aspx",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner2.png",
      link: "https://ea03.moeaea.gov.tw/s0307/",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner3.png",
      link: "https://www.moeaea.gov.tw/ECW/populace/home/Home.aspx",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner4.png",
      link: "https://ea01.moeaea.gov.tw/b0403/Home/Index",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner5.png",
      link: "https://ea01.moeaea.gov.tw/b0403/Home/Index",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner6.png",
      link: "https://2050nzea.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner7.png",
      link: "https://top.energypark.org.tw/topfirm/Services",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner8.png",
      link: "https://www.go-moea.tw/#gsc.tab=0",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner9.png",
      link: "https://ea03.moeaea.gov.tw/a0101/02/#/",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner10.png",
      link: "https://www.moeaea.gov.tw/ECW/populace/content/SubMenu.aspx?menu_id=3124",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner11.png",
      link: "https://ea04.moeaea.gov.tw/c002/",
    },
    {
      img: import.meta.env.BASE_URL + "images/banner12.png",
      link: "https://www.moeaea.gov.tw/ECW/populace/content/ContentLink.aspx?menu_id=13235",
    },
  ];

  const externalLinks = [
    {
      img: import.meta.env.BASE_URL + "images/exter1.png",
      link: "https://www.gov.tw",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter2.png",
      link: "https://taiwan.gov.tw",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter3.png",
      link: "https://www.gov.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter4.png",
      link: "http://cfcmweb.cy.gov.tw/cfcm_w/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter5.png",
      link: "https://elearn.hrd.gov.tw/mooc/index.php",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter6.png",
      link: "https://www.dgpa.gov.tw/mp/archive?uid=327&mid=305",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter7.png",
      link: "https://sunshine.cy.gov.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter8.png",
      link: "https://join.gov.tw/policies/index",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter9.png",
      link: "https://www.einvoice.nat.gov.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter10.png",
      link: "https://www.ecfa.org.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter11.png",
      link: "https://greenlifestyle.moenv.gov.tw/",
    },
    {
      img: import.meta.env.BASE_URL + "images/exter12.png",
      link: "https://www.aac.moj.gov.tw/",
    },
  ];
  return (
    <>
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
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "60px",
            color: "white",
          }}
        >
          <h1 style={{ fontSize: "40px", fontWeight: 700 }}>
            讓能源資料真正「看得見、問得到、用得上」
          </h1>
          <p>結合 3D 視覺能源球與 AI 智慧代理的新一代能源決策平台</p>
        </div>
      </section>

      {/* Dashboard */}
      <div className="reveal">
        <Dashboard />
      </div>

      <div className="page-container">
        {/* Energy News */}
        <div className="reveal">
          <EnergyNews />
        </div>

        {/* FEATURES */}
        <section id="features" className="section reveal">
          <div className="cards">
            {[
              {
                title: "3D 能源視覺球",
                desc: "三維旋轉視覺化能源結構模型",
                detail:
                  "整合近 30 年能源平衡資料，建構三維互動式能源球模型。支援跨年度比較、產業分層結構分析與能源結構相似度研究，讓能源變化趨勢與結構差異一目了然。",
                img: import.meta.env.BASE_URL + "images/sphere.png",
              },
              {
                title: "智慧 RAG 查詢",
                desc: "自然語言驅動的能源資料探索",
                detail:
                  "支援文字、網址、文件、影音與表格等多模態資料輸入。透過語意向量化與相似度檢索機制，結合大型語言模型生成具依據且可追溯來源的分析結果，實現精準且可解釋的能源查詢體驗。",
                img: import.meta.env.BASE_URL + "images/analysis.png",
              },
              {
                title: "主動式能源智慧代理",
                desc: "內含能源預測分析",
                detail:
                  "結合能源預測模型與智慧分析能力，依據歷史資料與使用者查詢，自動生成未來能源趨勢，並提供視覺化決策支援。",
                img: import.meta.env.BASE_URL + "images/ai.jpg",
              },
            ].map((item, i) => (
              <div className="card reveal" key={i}>
                <div className="card-image">
                  <img src={item.img} alt={item.title} />
                </div>

                <div className="card-body">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>

                  <div className="accordion">更多細節說明</div>
                  <div className="accordion-content">
                    <p>{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 活動專區 */}
        <div className="reveal">
          <LinkCarousel title="活動專區" items={activityData} />
        </div>

        <div className="reveal">
          <ExternalLinks items={externalLinks} />
        </div>
      </div>

      <BackToTopButton />
    </>
  );
}
