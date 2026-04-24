import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Header() {
  useEffect(() => {
    /* ------------------------------
       1. Header 滾動變色
    ------------------------------*/
    const header = document.querySelector("header");

    const onScroll = () => {
      if (!header) return; // ✅ 防炸

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
      if (!dropdown) return;
      dropdown.classList.toggle("show");
    };

    const closeDropdown = (e) => {
      if (!dropdown) return;

      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    };

    dropdownBtn?.addEventListener("click", toggleDropdown);
    window.addEventListener("click", closeDropdown);

    /* ------------------------------
       4. 深色模式
    ------------------------------*/
    const themeToggle = document.getElementById("themeToggle");
    const main = document.getElementById("main-content");

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      main?.classList.add("dark");
      if (themeToggle) themeToggle.textContent = "☀️"; // ✅ 防炸
    } else {
      if (themeToggle) themeToggle.textContent = "🌙"; // ✅ 防炸
    }

    const changeTheme = () => {
      main?.classList.toggle("dark");

      if (main?.classList.contains("dark")) {
        if (themeToggle) themeToggle.textContent = "☀️";
        localStorage.setItem("theme", "dark");
      } else {
        if (themeToggle) themeToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
      }
    };

    themeToggle?.addEventListener("click", changeTheme);

    /* ------------------------------
       5. 清除事件
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
      <div id="overlay"></div>

      <header>
        <Link to="/" className="logo-link">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src={import.meta.env.BASE_URL + "images/logo.png"}
              alt="EnerSphere TW Logo"
              style={{ height: "70px" }}
            />
            <span style={{ fontSize: "26px", fontWeight: "700", color: "#f97316" }}>
              EnerSphere TW
            </span>
          </div>
        </Link>

        <div className="nav-right">
          <nav>
            <Link to="/">首頁</Link>
            <Link to="/global">視覺化總覽</Link>
            <Link to="/rag">智慧查詢</Link>
            <Link to="/contact">聯絡我們</Link>
            <Link to="/Feedback">回饋分析</Link>
          </nav>

          <div id="themeToggle">🌙</div>
        </div>

        <div className="hamburger" role="button">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </header>
    </>
  );
}