import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Header() {

  useEffect(() => {
    // 1. header 滾動變色
    const onScroll = () => {
      const header = document.querySelector("header");
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);

    // 2. 漢堡選單
    const hamburger = document.querySelector(".hamburger");
    const nav = document.querySelector("nav");
    const overlay = document.getElementById("overlay");

    const closeMenu = () => {
      hamburger?.classList.remove("active");
      nav?.classList.remove("open");
      overlay?.classList.remove("active");
    };

    hamburger?.addEventListener("click", () => {
      const active = hamburger.classList.toggle("active");
      nav.classList.toggle("open");
      overlay.classList.toggle("active", active);
    });

    overlay?.addEventListener("click", closeMenu);

    // 3. 下拉選單
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = dropdown?.querySelector(".dropdown-btn");

    dropdownBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    window.addEventListener("click", () => dropdown?.classList.remove("show"));

    // 4. 深色模式（只作用在 main-content）
    const themeToggle = document.getElementById("themeToggle");
    const main = document.getElementById("main-content");

    // 讀取之前的模式
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
    main?.classList.add("dark");
    themeToggle.textContent = "☀️";
    } else {
    themeToggle.textContent = "🌙";
    }

    themeToggle?.addEventListener("click", () => {
    main.classList.toggle("dark");

    if (main.classList.contains("dark")) {
        themeToggle.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    } else {
        themeToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
    });


    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* 手機版遮罩 */}
      <div id="overlay"></div>

      <header>

        {/* 左：Logo */}
        <div className="logo" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img src="/images/logo.png" alt="EnerSphere TW Logo" style={{ height: "70px", width: "auto" }} />
          <span style={{ fontSize: "26px", fontWeight: "700", color: "#f97316" }}>
            EnerSphere TW
          </span>
        </div>

        {/* 右側：nav + 深色模式 → ⭐ 必須包在 nav-right */}
        <div className="nav-right">

          <nav>
            <Link to="/">系統特色</Link>

            <div className="dropdown">
              <div className="dropdown-btn" tabIndex="0">能源視覺化 ▼</div>
              <div className="dropdown-content">
                <Link to="/global">視覺化總覽</Link>
                <a href="#viz-detail1">視覺化細節1</a>
                <a href="#viz-detail2">視覺化細節2</a>
              </div>
            </div>

            <Link to="/rag">智慧查詢</Link>
            <a href="#contact">聯絡我們</a>
          </nav>

          <div id="themeToggle" title="切換深色模式">🌙</div>
        </div>

        {/* 漢堡選單 */}
        <div className="hamburger" aria-label="開啟選單" tabIndex="0" role="button">
          <div></div><div></div><div></div>
        </div>
      </header>
    </>
  );
}
