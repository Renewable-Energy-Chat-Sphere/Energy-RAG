import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t } = useTranslation();

  useEffect(() => {
    const header = document.querySelector("header");

    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
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
            <Link to="/">{t("nav.home")}</Link>
            <Link to="/global">{t("nav.global")}</Link>
            <Link to="/powerplant">{t("nav.powerplant")}</Link>
            <Link to="/rag">{t("nav.rag")}</Link>
            <Link to="/Prediction">{t("nav.prediction")}</Link>
            <Link to="/contact">{t("nav.contact")}</Link>
            <Link to="/Feedback">{t("nav.feedback")}</Link>
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