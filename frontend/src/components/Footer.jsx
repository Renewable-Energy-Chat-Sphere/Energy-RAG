import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitch from "./LanguageSwitch";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer>
      <div className="footer-grid">

        <div className="footer-col">
          <h3>EnerSphere TW</h3>
          <p>{t("footer.desc")}</p>
        </div>


        <div className="footer-col">
          <h4>{t("footer.contact")}</h4>
          <p>E-mail：rag412402@gmail.com</p>
          <p>{t("footer.address")}</p>
        </div>

      </div>

      <div className="footer-copy">
        <span>© 2026 EnerSphere TW</span>
        <LanguageSwitch />
      </div>
    </footer>
  );
}