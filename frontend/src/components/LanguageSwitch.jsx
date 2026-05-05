import { useTranslation } from "react-i18next";

export default function LanguageSwitch() {
  const { i18n } = useTranslation();

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <div className="lang-switch">
      <button onClick={() => changeLang("zh")}>中文</button>
      <button onClick={() => changeLang("en")}>EN</button>
    </div>
  );
}