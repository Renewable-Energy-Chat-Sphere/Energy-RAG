import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      nav: {
        home: "首頁",
        global: "能源視覺化",
        powerplant: "機組資訊",
        rag: "智慧查詢",
        prediction: "能源預測",
        contact: "聯絡我們",
        feedback: "回饋分析"
      },
      footer: {
        desc: "多模態視覺能源球系統，提供能源資料查詢、 三維視覺化與智慧代理決策輔助。",
        links: "快速連結",
        contact: "聯絡資訊",
        address: "地址：新北市新莊區中正路 510 號 天主教輔仁大學",
      }
    }
  },
  en: {
    translation: {
      nav: {
        home: "Home",
        global: "Energy Globe",
        powerplant: "Power Plant",
        rag: "AI Query",
        prediction: "Prediction",
        contact: "Contact",
        feedback: "Feedback"
      },
      footer: {
        desc: "The Multi-modal energy visualization system provides energy data retrieval, 3D visualization, and intelligent agent decision support.",
        links: "Quick Links",
        contact: "Contact Info",
        address: "Address: No. 510, Zhongzheng Rd., Xinzhuang Dist., New Taipei City, Taiwan (R.O.C.)"
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "zh",
  fallbackLng: "zh",
  interpolation: { escapeValue: false }
});

export default i18n;