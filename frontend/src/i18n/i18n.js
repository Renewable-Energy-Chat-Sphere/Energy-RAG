import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      hero: {
        title: "讓能源資料真正「看得見、問得到、用得上」",
        subtitle: "結合 3D 視覺能源球與 AI 智慧代理的新一代能源決策平台"
      },
      energyNews: {
        title: "能源署最新公告新聞",
        subtitle: "同步能源署官方網站新聞資訊",
        loading: "讀取中…",
        empty: "目前沒有公告的新聞",
        source: "新聞資料來源：經濟部能源署",
        more: "查看全部新聞 ➡"
      },
      energy: {
        nuclear: "核能發電",
        coal: "燃煤發電",
        gas: "燃氣發電",
        renewable: "再生能源",
        hydro: "水力發電",
        oil: "燃油發電"
      },
      dashboard: {
        status_live: "目前使用即時資料",
        status_empty: "目前台電資料為空（使用備援）",
        status_timeout: "無法連線台電（使用備援）",
        status_backup: "目前使用備援資料",

        peak: "尖峰負載",
        reserve: "備轉容量率",
        power: "目前用電量",
        update: "更新時間",

        energy_title: "發電來源分布",
        trend_title: "即時用電趨勢圖",

        reserve_label: "備轉容量率",

        green: "綠燈",
        yellow: "黃燈",
        orange: "橘燈",
        red: "紅燈",

        green_desc: "備轉容量率 ≥ 10%",
        yellow_desc: "6% ≤ 備轉容量率 < 10%",
        orange_desc: "備轉容量率 < 6%",
        red_desc: "限電警戒"
      },
      unit: {
        power: "萬瓩"
      },
      features: [
        {
          title: "3D 能源視覺球",
          desc: "三維旋轉視覺化能源結構模型",
          detail: "整合近 30 年能源平衡資料，建構三維互動式能源球模型。支援跨年度比較、產業分層結構分析與能源結構相似度研究，讓能源變化趨勢與結構差異一目了然。"
        },
        {
          title: "智慧 RAG 查詢",
          desc: "自然語言驅動的能源資料探索",
          detail: "支援文字、網址、文件、影音與表格等多模態資料輸入。透過語意向量化與相似度檢索機制，結合大型語言模型生成具依據且可追溯來源的分析結果，實現精準且可解釋的能源查詢體驗。"
        },
        {
          title: "主動式能源智慧代理",
          desc: "內含能源預測分析",
          detail: "結合能源預測模型與智慧分析能力，依據歷史資料與使用者查詢，自動生成未來能源趨勢，並提供視覺化決策支援。"
        }
      ],
      features_more: "更多細節說明",
      section: {
        activity: "活動專區",
        external: "外網連結"
      },
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
      },
      contact: {
        title: "聯絡我們",
        subtitle:
          "如您對 EnerSphere TW（能源球 3D 視覺化與智慧能源代理系統）有任何建議、合作意願或技術問題，歡迎與我們聯繫。",
        team: "專案團隊",
        professor: "指導教授",
        members: "專案成員",
        org: "所屬單位",
        school: "天主教輔仁大學",
        department: "資訊管理系｜多模態視覺能源研究團隊",
        form: "意見表",

        name: "姓名",
        email: "電子郵件",
        phone: "電話號碼",
        feeling: "使用感受",
        message: "待改進之處",

        submit: "送出",
        sending: "寄送中",

        success: "已成功送出！",
        successInfo: "以下是您填寫的資訊：",

        close: "關閉",
        error: "發生錯誤",

        feelings: ["非常滿意", "滿意", "一般", "不滿意", "非常不滿意"]
      },
      feedback: {
        title: "回饋分析",
        empty: "目前沒有任何回饋資料",

        filter: ["全部", "正面", "中立", "負面"],

        name: "姓名",
        email: "Email",
        phone: "電話",
        feeling: "滿意度",
        message: "內容",

        modalTitle: "意見回饋",
        reply: "系統回覆",

        close: "關閉",

        statusOpen: "處理中",
        statusClosed: "已完成",

        priorityHigh: "高優先"
      },
      prediction: {
        title: "能源預測",
        inputPlaceholder: "輸入：預測2025工業能源 或 明年工業用電",
        start: "開始預測",
        loading: "預測中...",
        error: "API 連線失敗",

        yourQuestion: "您的問題",
        noData: "沒有圖表資料",
        unknown: "資料不詳",

        actual: "實際值",
        predicted: "預測值",

        analysis: "預測分析",
        accuracy: "準確度",

        allEnergy: "全部能源",
        toe: "噸油當量"
      },
      power: {
        live: "🟢 即時模式（台電API）",
        offline: "🟡 離線模式（本地資料）",

        generation: "即時發電量",
        load: "用電負載",
        reserve: "備轉容量",
        update: "更新時間",

        output: "發電量(已/可)",
        local: "（使用本地資料）",

        maintenance: "維修中機組",
        repair: "維修中",

        region_north: "北部",
        region_central: "中部",
        region_south: "南部",
        region_east: "東部",

        solar: "太陽能",
        wind: "風力",
        hydro: "水力",
        bio: "生質能",
        geo: "地熱",
        other: "其他",

        unit: "台"
      },
    }
  },
  en: {
    translation: {
      hero: {
        title: "Make energy data visible, queryable, and actionable",
        subtitle: "A next-generation energy decision platform combining 3D energy globe and AI agents"
      },
      energyNews: {
        title: "Latest News from Energy Administration",
        subtitle: "Synchronized with official Energy Administration website",
        loading: "Loading...",
        empty: "No news available at the moment",
        source: "Source: Bureau of Energy, MOEA",
        more: "View All News ➡"
      },
      energy: {
        nuclear: "Nuclear",
        coal: "Coal",
        gas: "Natural Gas",
        renewable: "Renewables",
        hydro: "Hydropower",
        oil: "Oil"
      },
      dashboard: {
        status_live: "Using real-time data",
        status_empty: "No data from Taipower (fallback used)",
        status_timeout: "Connection failed (fallback used)",
        status_backup: "Using fallback data",

        peak: "Peak Load",
        reserve: "Reserve Margin",
        power: "Current Load",
        update: "Last Update",

        energy_title: "Energy Source Distribution",
        trend_title: "Real-time Load Trend",

        reserve_label: "Reserve Margin",

        green: "Green",
        yellow: "Yellow",
        orange: "Orange",
        red: "Red",

        green_desc: "Reserve ≥ 10%",
        yellow_desc: "6% ≤ Reserve < 10%",
        orange_desc: "Reserve < 6%",
        red_desc: "Power Alert"
      },
      unit: {
        power: "MW"
      },
      features: [
        {
          title: "3D Energy Globe",
          desc: "3D visualization of energy structure",
          detail: "Integrating nearly 30 years of energy balance data, a three-dimensional interactive energy sphere model is constructed. It supports cross-year comparisons, industry stratification analysis, and energy structure similarity studies, making energy change trends and structural differences readily apparent."
        },
        {
          title: "Smart RAG Query",
          desc: "Natural language energy exploration",
          detail: "It supports multimodal data input, including text, URLs, documents, videos, and forms. Through semantic vectorization and similarity retrieval mechanisms, combined with a large language model, it generates evidence-based and traceable analysis results, achieving an accurate and interpretable energy query experience."
        },
        {
          title: "AI Energy Agent",
          desc: "Built-in energy prediction",
          detail: "By combining energy forecasting models with intelligent analytics capabilities, and based on historical data and user queries, it automatically generates future energy trends and provides visual decision support."
        }
      ],
      features_more: "More Details",
      section: {
        activity: "Activities",
        external: "External Links",
      },
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
      },
      contact: {
        title: "Contact Us",
        subtitle:
          "If you have any suggestions, collaboration ideas, or technical issues regarding EnerSphere TW, feel free to contact us.",
        team: "Project Team",
        professor: "Supervisor",
        members: "Members",
        org: "Organization",
        school: "Fu Jen Catholic University",
        department: "Department of Information Management | Multimodal Visual Energy Research Team",
        form: "Feedback Form",

        name: "Name",
        email: "Email",
        phone: "Phone",
        feeling: "Experience",
        message: "Suggestions",

        submit: "Submit",
        sending: "Sending",

        success: "Submitted Successfully!",
        successInfo: "Here is your submitted information:",

        close: "Close",
        error: "Error",

        feelings: ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied", "Very Unsatisfied"]
      },
      feedback: {
        title: "Feedback Analysis",
        empty: "No feedback available",

        filter: ["All", "Positive", "Neutral", "Negative"],

        name: "Name",
        email: "Email",
        phone: "Phone",
        feeling: "Satisfaction",
        message: "Message",

        modalTitle: "Feedback Detail",
        reply: "AI Response",

        close: "Close",

        statusOpen: "Processing",
        statusClosed: "Completed",

        priorityHigh: "High Priority"
      },
      prediction: {
        title: "Energy Prediction",
        inputPlaceholder: "Enter: predict 2025 industry energy or next year electricity",
        start: "Start Prediction",
        loading: "Predicting...",
        error: "API connection failed",

        yourQuestion: "Your Question",
        noData: "No chart data",
        unknown: "Unknown",

        actual: "Actual",
        predicted: "Predicted",

        analysis: "Prediction Analysis",
        accuracy: "Accuracy",

        allEnergy: "All Energy",
        toe: "toe"
      },
      power: {
        live: "🟢 Real-time Mode (Taipower API)",
        offline: "🟡 Offline Mode (Local Data)",

        generation: "Generation",
        load: "Current Load",
        reserve: "Reserve Margin",
        update: "Last Update",

        output: "Power Output",
        local: "(Using Local Data)",

        maintenance: "Units Under Maintenance",
        repair: "Under Repair",

        region_north: "North",
        region_central: "Central",
        region_south: "South",
        region_east: "East",

        solar: "Solar",
        wind: "Wind",
        hydro: "Hydro",
        bio: "Biomass",
        geo: "Geothermal",
        other: "Other",

        unit: "Units"
      },

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