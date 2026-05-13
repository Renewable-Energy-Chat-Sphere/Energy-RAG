import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitch from "./LanguageSwitch";

export default function Header() {
  const { t } = useTranslation();

  // =========================
  // 🔐 使用者資訊
  // =========================
  const storedUser = localStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : { username: "訪客", role: "user" };

  const isLoggedIn = !!storedUser;
  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";

  // =========================
  // 🔓 登出
  // =========================
  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }

    localStorage.removeItem("user");
    window.location.href = "/Ener-Sphere/";
  };

  useEffect(() => {
    const header = document.querySelector("header");

    const onScroll = () => {
      if (!header) return;

      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
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
       3. 🌙 深色模式
    ------------------------------*/
    const themeToggle = document.getElementById("themeToggle");
    const main = document.getElementById("main-content");
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      main?.classList.add("dark");
      document.body.classList.add("dark");

      if (themeToggle) themeToggle.textContent = "☀️";
    } else {
      main?.classList.remove("dark");
      document.body.classList.remove("dark");

      if (themeToggle) themeToggle.textContent = "🌙";
    }

    const changeTheme = () => {
      main?.classList.toggle("dark");
      document.body.classList.toggle("dark");

      if (main?.classList.contains("dark")) {
        if (themeToggle) themeToggle.textContent = "☀️";
        localStorage.setItem("theme", "dark");
      } else {
        if (themeToggle) themeToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
      }
    };

    themeToggle?.addEventListener("click", changeTheme);

    return () => {
      window.removeEventListener("scroll", onScroll);
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

            <span
              style={{
                fontSize: "26px",
                fontWeight: "700",
                color: "#f97316",
              }}
            >
              EnerSphere TW
            </span>
          </div>
        </Link>

        <div className="nav-right">
          <nav>
            {/* 🔥 手機版語言切換 */}
            <div className="mobile-lang">
              <LanguageSwitch />
            </div>

            {/* 訪客 / admin 才顯示首頁；manager 不顯示首頁 */}
            {(!isLoggedIn || isAdmin) && <Link to="/">{t("nav.home")}</Link>}

            <Link to="/global">{t("nav.global")}</Link>

            <Link to="/powerplant">{t("nav.powerplant")}</Link>

            <Link to="/rag">{t("nav.rag")}</Link>

            {/* manager / admin 才顯示 */}
            {(isManager || isAdmin) && (
              <>
                <Link to="/electricity-analysis">
                  {t("nav.electricityAnalysis")}
                </Link>

                <Link to="/Prediction">{t("nav.prediction")}</Link>
              </>
            )}

            {/* admin 專屬 */}
            {isAdmin && <Link to="/Feedback">{t("nav.feedback")}</Link>}

            {/* admin 不顯示聯絡我們；訪客與 manager 顯示 */}
            {!isAdmin && <Link to="/contact">{t("nav.contact")}</Link>}

            {/* Login / Logout */}
            {isLoggedIn && user.role !== "user" ? (
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "700",
                  fontFamily: "inherit",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  margin: 0,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                {t("nav.logout")}（{user.role}）
              </button>
            ) : (
              <Link
                to="/Login"
                style={{
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "700",
                  textDecoration: "none",
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                {t("nav.login")}
              </Link>
            )}
          </nav>

          <div id="themeToggle">🌙</div>
        </div>

        <div className="hamburger">
          <i className="fi fi-rr-menu-burger"></i>
        </div>
      </header>
    </>
  );
}
