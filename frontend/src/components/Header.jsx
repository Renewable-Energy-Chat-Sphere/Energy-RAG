import React from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Header() {
  useEffect(() => {
    /* ------------------------------
       1. Header 滾動變色
    ------------------------------*/
    const header = document.querySelector("header");

    const onScroll = () => {
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };

    window.addEventListener("scroll", onScroll);

    /* ------------------------------
       2. 漢堡選單
    ------------------------------*/
    const hamburger = document.querySelector(".hamburger");
    const nav = document.querySelector("nav");
    const overlay = document.getElementById("overlay");

    const closeMenu = () => {
      hamburger?.classList.remove("active");
      nav?.classList.remove("open");
      overlay?.classList.remove("active");
    };

    const toggleMenu = () => {
      const active = hamburger?.classList.toggle("active");
      nav?.classList.toggle("open");
      overlay?.classList.toggle("active", active);
    };

    hamburger?.addEventListener("click", toggleMenu);
    overlay?.addEventListener("click", closeMenu);

    /* ------------------------------
       3. 下拉選單
    ------------------------------*/
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = dropdown?.querySelector(".dropdown-btn");

    const toggleDropdown = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    };

    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    };

    dropdownBtn?.addEventListener("click", toggleDropdown);
    window.addEventListener("click", closeDropdown);

    /* ------------------------------
       4. 深色模式（作用在 main-content）
    ------------------------------*/
    const themeToggle = document.getElementById("themeToggle");
    const main = document.getElementById("main-content");

    // 初始讀取
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      main?.classList.add("dark");
      themeToggle.textContent = "☀️";
    } else {
      themeToggle.textContent = "🌙";
    }

    const changeTheme = () => {
      main?.classList.toggle("dark");

      if (main?.classList.contains("dark")) {
        themeToggle.textContent = "☀️";
        localStorage.setItem("theme", "dark");
      } else {
        themeToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
      }
    };

    themeToggle?.addEventListener("click", changeTheme);

    /* ------------------------------
       5. 清除事件（避免 React 重複註冊）
    ------------------------------*/
    return () => {
      window.removeEventListener("scroll", onScroll);
      dropdownBtn?.removeEventListener("click", toggleDropdown);
      window.removeEventListener("click", closeDropdown);
      hamburger?.removeEventListener("click", toggleMenu);
      overlay?.removeEventListener("click", closeMenu);
      themeToggle?.removeEventListener("click", changeTheme);
    };
  }, []);

  return (
    <>
      {/* 手機版遮罩 */}
      <div id="overlay"></div>

      <header>
        {/* 左邊 LOGO */}
        <Link to="/" className="logo-link">
          <div
            className="logo"
            style={{ display: "flex", alignItems: "center", gap: "14px" }}
          >
            <img
              src={import.meta.env.BASE_URL + "images/logo.png"}
              alt="EnerSphere TW Logo"
              style={{ height: "70px" }}
            />
            <span
              style={{ fontSize: "26px", fontWeight: "700", color: "#f97316" }}
            >
              EnerSphere TW
            </span>
          </div>
        </Link>

        {/* 右邊導航 */}
        <div className="nav-right">
          <nav>
            <Link to="/">首頁</Link>

            {/* Dropdown */}
            <div className="dropdown">
              <div className="dropdown-btn" tabIndex="0">
                能源視覺化 ▼
              </div>
              <div className="dropdown-content">
                <Link to="/global">視覺化總覽</Link>
                <Link to="/global">視覺化細節1</Link>
                <Link to="/global">視覺化細節2</Link>
              </div>
            </div>

            <Link to="/rag">智慧查詢</Link>
            <Link to="/contact">聯絡我們</Link>
            <Link to="/Feedback">回饋分析</Link>
          </nav>

          {/* 深色模式 */}
          <div id="themeToggle">🌙</div>
        </div>

        {/* 漢堡 */}
        <div className="hamburger" role="button">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </header>
    </>
  );
}
