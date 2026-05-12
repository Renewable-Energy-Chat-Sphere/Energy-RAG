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
        electricityAnalysis: "供電成本分析中心",
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

        unit: "台",
        loading: "載入即時機組資料中",
        syncing: "正在同步台電即時發電資料",

        title: "即時電網監控",
        subtitle: "台電 LIVE 機組資料監控系統",

        currentGeneration: "即時發電量",
        capacity: "裝置容量",
        lastUpdate: "最後更新時間",

        apiSource: "台電即時機組 API",

        unavailable: "即時資料暫時無法使用",
        apiError: "台電即時 API 無法連線，請稍後再試。",
        noteTitle: "台電官方資料註解",

        note1Title: "註1：淨發電量",
        note1Desc:
          "指發電廠實際輸出至電力系統之電能，等於毛發電量扣除廠內用電後之數值。",

        note2Title: "註2：裝置容量",
        note2Desc:
          "通常以構成該機組之原動機或發電機之設計容量稱之，民營電廠則依購售電合約之簽約容量計算。",

        note3Title: "註3：淨發電量高於裝置容量",
        note3Desc:
          "部分火力機組可能因設備升級、環境溫度較低或機組效能測試等因素，導致短時間淨發電量高於裝置容量。",

        note4Title: "註4：離島機組說明",
        note4Desc:
          "澎湖尖山：僅含澎湖本島尖山電廠。\n金門塔山：含大、小金門所有電廠。\n馬祖珠山：只含南竿、北竿及珠山等電廠。\n離島其他：含蘭嶼、綠島、小琉球、連江縣[馬祖]離島（東引、東莒、西莒）及澎湖縣離島(七美、望安、虎井，但不含吉貝、鳥嶼)等電廠。\n※顯示之發電量為毛發電量。",

        note5Title: "註5：核能黑起動氣渦輪機",
        note5Desc:
          "核能電廠全黑起動氣渦輪機，其淨尖峰能力15.5萬瓩，但其裝置容量不計入台電系統裝置容量，發電量計入燃油(輕油)發電。",

        note6Title: "註6：小水力分類",
        note6Desc:
          "北部小水力: 圓山、天埤、軟橋、石圳聯通管。\n中部小水力: 后里、社寮、景山、北山、濁水、湖山、集集南岸。\n南部小水力: 六龜、竹門。\n東部小水力: 銅門、龍溪、水簾、清水、清流、初英、榕樹、溪口、東興。",
        note7Title: "註7：太陽能購電",
        note7Desc:
          "所顯示之發電量係參考購電取樣發電量分區比例估算得出。購售電件數請參考本公司首頁：資訊揭露 → 發電資訊 → 購入電力概況 → 購入電力分布情形。",

        note8Title: "註8：N/A",
        note8Desc:
          "淨發電量若標示為N/A，表示無即時資訊。",

        note9Title: "註9：更新頻率",
        note9Desc:
          "本網頁資料為每10分鐘更新，請重新整理頁面，可顯示最新資訊。",
        note10Title: "註10：試運轉機組",
        note10Desc:
          "電廠(機組)換發/取得電業執照前進行測試(試運轉)等程序時，該電廠(機組)暫不計入裝置容量且不揭露其發電百分比。",

        note11Title: "註11：備註欄補充說明",
        note11Desc: "點擊見詳細說明",

        note12Title: "註12：興達#4機",
        note12Desc:
          "興達#4機自113年起第一、四季不運轉，114年起轉為備用機組，僅於第二、三季當預估供電餘裕(率)低於8%時啟用。",

        note13Title: "註13：機組顯示方式",
        note13Desc:
          "裝置容量20MW以上且併接電壓等級69仟伏以上之機組單獨呈現，其餘則整併一筆資料。",

        note14Title: "註14：大林#5機",
        note14Desc:
          "大林#5機111年12月31日除役並轉為緊急備用電力設施。",

        note15Title: "註15：興達#1~#3機",
        note15Desc:
          "興達#1機112年9月30日除役並轉為緊急備用電力設施;\n\n興達#2機112年12月31日除役並轉為緊急備用電力設施;\n\n興達#3機114年10月1日除役並轉為緊急備用電力設施。",

        note16Title: "註16：電池儲能",
        note16Desc:
          "電池裝置容量係指電力交易平台「電能移轉複合動態調節備轉」之得標容量。",
        subtotalDesc1:
          "※目前淨發電量(註2) / 裝置容量(註1)（利用率）",

        subtotalDesc2:
          "※利用率越高，代表目前機組運轉負載越高。",
        subtotal: "小計：",
        gridOverview: "即時電網總覽",
        installedCapacity: "裝置容量",
        netGeneration: "淨發電量",
        utilization: "利用率(%)",
        unit: "台",
        "lng": "燃氣",
        "coal": "燃煤",
        "nuclear": "核能",
        "hydro": "水力",
        "wind": "風力",
        "solar": "太陽能",
        "oil": "燃料油",
        "storage": "儲能",
        "storageLoad": "儲能負載",
        "renewable": "其它再生能源",
        "ippLng": "民營電廠-燃氣",
        "ippCoal": "民營電廠-燃煤",
        tpc: "台電自有",
        ipp: "民營購電",
        solarIpp: "太陽能購電",
        solarTpc: "太陽能台電自有",
        offshoreWindIpp: "離岸風力購電",
        offshoreWindTpc: "離岸風力台電自有",
        landWindIpp: "陸域風力購電",
        landWindTpc: "陸域風力台電自有",

        battery: "電池(Battery)",
        pumpedHydro: "抽蓄水力(Pumped Hydro)",

        "cogen": "汽電共生",
        "diesel": "輕油",
        "oilSub": "燃油",

        other: "其他",
        "liveGeneration": "各能源即時發電量",
        "totalGeneration": "總計",
        "updatedEvery10Min": "各能源即時發電量小計（每10分鐘更新）",
        "liveGeneration": "各能源即時發電量",
        "totalGeneration": "總計",
      }, electricity: {
        title: "AI 供電成本分析",
        subtitle: "即時供電、能源結構、成本壓力與未來趨勢分析",

        updateTime: "即時資料更新時間：",
        loading: "載入供電成本分析中心中",
        loadingSub:
          "即時抓取台電機組數據 · 計算能源結構 · 建立成本壓力模型",

        realtime: "即時供電資訊",

        thermal: "火力發電",
        solar: "太陽能",
        nuclear: "核能",
        wind: "風力",
        hydro: "水力",

        costTitle: "供電成本壓力",
        costIndex: "供電成本壓力指數",

        structure: "能源結構分析",
        impact: "成本影響分析",

        future: "未來成本趨勢",

        futureDesc:
          "未來將結合 Prophet 預測能源比例與供電成本壓力變化。",

        ai: "AI 智慧建議",

        aiLoading: "AI 分析生成中...",

        highRisk: "高供電成本風險",
        mediumRisk: "中度供電成本風險",
        lowRisk: "低供電成本風險", costDescription:
          "本指數根據即時發電結構、不同能源平均發電成本、燃料價格敏感度、碳排特性進行估算。",

        highCost:
          "目前火力發電占比偏高，供電成本壓力較大。",

        mediumCost:
          "目前供電成本壓力中等，需持續觀察能源結構變化。",

        stableCost:
          "目前供電結構相對穩定。",

        impactDescription:
          "本分析根據能源使用比例、平均發電成本（LCOE）、燃料價格敏感度、供電依賴程度進行估算。系統會評估不同能源對整體供電成本與電價風險的影響程度。本系統屬於 AI 能源風險分析模型，並非台電實際電價計算公式。",

        impactVeryHigh: "極高",
        impactHigh: "高",
        impactMedium: "中",
        impactLow: "低",

        impactIndex: "成本影響指數：",
        futureChart: "未來趨勢圖"
      },
      rag: {
        subtitle: "Chat / Web / PDF / Audio,Video / Table — 多模態能源資料檢索",

        badge1: "多模態分析支援",
        badge2: "能源決策助理",
        badge3: "相關問題解答",

        chatMessage: "訊息",
        chat: "對話",

        submit: "送出",
        answer: "回答",

        chatTab: "Chat",
        webTab: "Web",
        pdfTab: "PDF",
        avTab: "影音",
        tableTab: "表格",

        webTitle: "網站分析",
        pdfTitle: "PDF 分析",
        avTitle: "影音分析",
        tableTitle: "表格分析",

        url: "網址",

        chatPlaceholder: "請輸入您的問題。",
        webPlaceholder: "想問什麼？例如：這個網站的功能是甚麼？",
        pdfPlaceholder: "想問任何PDF文件中的什麼內容？",
        avPlaceholder: "想從影片/音訊找什麼？",
        tablePlaceholder: "想分析表格或是問問題嗎？例如：2024 總發電量是多少？",

        uploadPdf: "上傳 PDF",
        uploadAv: "上傳影音",
        uploadTable: "上傳表格",

        thinking: "思考中...",

        loadingWeb: "解析網站中...",
        loadingPdf: "解析 PDF 中...",
        loadingAv: "處理影音中...",
        loadingTable: "解析表格中...",

        noResponse: "(無回應)",

        generated: "已生成完整報告",
        download: "下載檔案 / 報告",

        noExport: "沒有可匯出的結構化資料",

        pdfError: "PDF 生成失敗",
        excelError: "Excel 生成失敗",

        downloadError: "下載失敗",
        excelDownloadError: "Excel 下載失敗",

        formula: "計算公式如下：",

        formulaDesc:
          "將「{{year}}」年度能源平衡表的各能源使用量(x)除以該年度的總使用量(M)，得到各能源的使用比例。",

        commonEnergy: "共同能源",

        yearHighlight: "{{year}}年較突出",

        departmentHighlight: "{{department}}較突出",

        yearLabel: "{{year}}年",

        separator: "、",

        avSource: "影音來源",
        tableSource: "表格來源",

        rows: "列",
        cols: "欄"
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
      electricity: {
        title: "AI Electricity Cost Analysis",
        subtitle:
          "Real-time power supply, energy structure, cost pressure, and future trend analysis",

        updateTime: "Last Update:",
        loading: "Loading Electricity Cost Analysis Center",
        loadingSub:
          "Fetching Taipower live data · Calculating energy structure · Building cost pressure model",

        realtime: "Real-time Power Information",

        thermal: "Thermal Power",
        solar: "Solar",
        nuclear: "Nuclear",
        wind: "Wind",
        hydro: "Hydropower",

        costTitle: "Electricity Cost Pressure",
        costIndex: "Energy Cost Pressure Index",

        structure: "Energy Structure Analysis",
        impact: "Cost Impact Analysis",

        future: "Future Cost Trend",

        futureDesc:
          "Future integration with Prophet prediction for energy ratio and cost pressure changes.",

        ai: "AI Smart Suggestions",

        aiLoading: "Generating AI analysis...",

        highRisk: "High Electricity Cost Risk",
        mediumRisk: "Medium Electricity Cost Risk",
        lowRisk: "Low Electricity Cost Risk",
        costDescription:
          "This index is estimated based on real-time generation structure, average generation cost, fuel sensitivity, and carbon emission characteristics.",

        highCost:
          "Thermal power generation is currently dominant, leading to higher electricity cost pressure.",

        mediumCost:
          "Electricity cost pressure is currently moderate, and energy structure changes should continue to be monitored.",

        stableCost:
          "The current power supply structure is relatively stable.",

        impactDescription:
          "This analysis is estimated based on energy usage ratio, average generation cost (LCOE), fuel price sensitivity, and power dependency. The system evaluates the impact of different energy sources on overall electricity cost and pricing risks. This system is an AI energy risk analysis model and not Taipower's official pricing formula.",

        impactVeryHigh: "Very High",
        impactHigh: "High",
        impactMedium: "Medium",
        impactLow: "Low",

        impactIndex: "Cost Impact Index:",
        futureChart: "Future Trend Chart"
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
        electricityAnalysis: "Electricity Cost Analysis Center",
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

        unit: "Units",
        loading: "Loading live power unit data",
        syncing: "Synchronizing Taipower live generation data",

        title: "Live Grid Monitoring",
        subtitle: "Taipower LIVE Unit Monitoring System",

        currentGeneration: "Current Generation",
        capacity: "Installed Capacity",
        lastUpdate: "Last Update",

        apiSource: "Taipower Live API",

        unavailable: "Live data temporarily unavailable",
        apiError: "Unable to connect to Taipower live API.",
        noteTitle: "Taipower Official Notes",

        note1Title: "Note 1: Net Generation",
        note1Desc:
          "Electricity actually delivered to the power grid after deducting plant self-consumption.",

        note2Title: "Note 2: Installed Capacity",
        note2Desc:
          "Usually refers to the designed capacity of the turbine or generator. IPP capacity is based on contracted values.",

        note3Title: "Note 3: Net Generation Exceeding Installed Capacity",
        note3Desc:
          "Some thermal units may temporarily exceed installed capacity due to upgrades, lower temperatures, or performance testing.",

        note4Title: "Note 4: Offshore Island Units",
        note4Desc:
          "Penghu Jianshan: Includes only the Jianshan Power Plant on the main Penghu Island.\nKinmen Tashan: Includes all power plants in Greater and Lesser Kinmen.\nMatsu Zhushan: Includes only Nangan, Beigan, and Zhushan power plants.\nOther Offshore Islands: Includes Orchid Island, Green Island, Xiaoliuqiu, Matsu outer islands, and Penghu outer islands.\n※Displayed generation values are gross generation.",

        note5Title: "Note 5: Nuclear Black-Start Gas Turbine",
        note5Desc:
          "The black-start gas turbine units at nuclear plants have a net peak capability of 155 MW. Their installed capacity is not included in the Taipower system capacity, and generation is classified under fuel oil (diesel) generation.",

        note6Title: "Note 6: Small Hydropower Classification",
        note6Desc:
          "Northern Small Hydro: Yuanshan, Tianpi, Ruanqiao, Shizun Connection Pipe.\nCentral Small Hydro: Houli, Sheliao, Jingshan, Beishan, Zhuoshui, Hushan, Jiji South Bank.\nSouthern Small Hydro: Liugui, Zhumen.\nEastern Small Hydro: Tongmen, Longxi, Shuilian, Qingshui, Qingliu, Chuying, Rongshu, Xikou, Dongxing.",
        note7Title: "Note 7: Solar Power Purchase",
        note7Desc:
          "Displayed solar generation values are estimated based on sampled purchased solar generation ratios. For detailed purchased power distribution, please refer to the Taipower official website.",

        note8Title: "Note 8: N/A",
        note8Desc:
          "If net generation is marked as N/A, it means no real-time information is currently available.",

        note9Title: "Note 9: Update Frequency",
        note9Desc:
          "This page updates approximately every 10 minutes. Please refresh the page to view the latest information.",
        note10Title: "Note 10: Trial Operation Units",
        note10Desc:
          "Before obtaining or renewing an electricity business license, units undergoing testing or trial operation are temporarily excluded from installed capacity calculations and their generation percentages are not disclosed.",

        note11Title: "Note 11: Additional Remarks",
        note11Desc: "Click to view detailed information.",

        note12Title: "Note 12: Hsinta Unit #4",
        note12Desc:
          "Hsinta Unit #4 does not operate during Q1 and Q4 starting from ROC year 113, and becomes a backup unit from ROC year 114 onward.",

        note13Title: "Note 13: Unit Display Rule",
        note13Desc:
          "Units with installed capacity above 20MW and connected to voltage levels above 69kV are displayed individually; all others are grouped together.",

        note14Title: "Note 14: Talin Unit #5",
        note14Desc:
          "Talin Unit #5 was retired on December 31, ROC year 111 and converted into an emergency backup power facility.",

        note15Title: "Note 15: Hsinta Units #1~#3",
        note15Desc:
          "Hsinta Unit #1 retired on Sept. 30, ROC year 112.\n\nHsinta Unit #2 retired on Dec. 31, ROC year 112.\n\nHsinta Unit #3 will retire on Oct. 1, ROC year 114.",

        note16Title: "Note 16: Battery Energy Storage",
        note16Desc:
          'Battery capacity refers to the awarded capacity in the power trading platform for "Energy Transfer Combined Dynamic Regulation Reserve".',
        subtotalDesc1:
          "※Current Net Generation (Note 2) / Installed Capacity (Note 1) (Utilization Rate)",

        subtotalDesc2:
          "※Higher utilization indicates a higher operating load of the unit.",
        subtotal: "Subtotal:",
        gridOverview: "Live Grid Overview",
        installedCapacity: "Installed Capacity",
        netGeneration: "Net Generation",
        utilization: "Utilization (%)",
        unit: "Units",
        lng: "Liquefied Natural Gas (LNG)",
        coal: "Coal",
        nuclear: "Nuclear",
        hydro: "Hydro",
        wind: "Wind",
        solar: "Solar",
        oil: "Fuel Oil",
        storage: "Energy Storage System",
        storageLoad: "Energy Storage System Load",
        renewable: "Other Renewable Energy",
        "ippLng": "IPP-LNG",
        "ippCoal": "IPP-Coal",
        tpc: "Taipower",
        ipp: "IPP Purchase",
        solarIpp: "IPP Solar",
        solarTpc: "Taipower Solar",
        offshoreWindIpp: "Offshore Wind IPP",
        offshoreWindTpc: "Taipower Offshore Wind",
        landWindIpp: "Onshore Wind IPP",
        landWindTpc: "Taipower Onshore Wind",

        battery: "Battery",
        pumpedHydro: "Pumped Hydro",

        cogen: "Co-Generation",
        diesel: "Diesel",
        oilSub: "Fuel Oil",

        other: "Other",
        "liveGeneration": "Real-Time Power Generation",
        "totalGeneration": "Total",
      },
      rag: {
        subtitle: "Chat / Web / PDF / Audio,Video / Table — Multimodal Energy Retrieval",

        badge1: "Multimodal Analysis",
        badge2: "Energy Decision Assistant",
        badge3: "Question Answering",

        chatMessage: "Message",
        chat: "Conversation",

        submit: "Submit",
        answer: "Answer",

        chatTab: "Chat",
        webTab: "Web",
        pdfTab: "PDF",
        avTab: "Audio / Video",
        tableTab: "Table",

        webTitle: "Website Analysis",
        pdfTitle: "PDF Analysis",
        avTitle: "Audio / Video Analysis",
        tableTitle: "Table Analysis",

        url: "URL",

        chatPlaceholder: "Enter your question.",
        webPlaceholder: "What do you want to ask? Example: What is this website about?",
        pdfPlaceholder: "Ask anything about the PDF document.",
        avPlaceholder: "What do you want to find from the audio/video?",
        tablePlaceholder: "Ask about the table. Example: What was the total power generation in 2024?",

        uploadPdf: "Upload PDF",
        uploadAv: "Upload Audio / Video",
        uploadTable: "Upload Table",

        thinking: "Thinking...",

        loadingWeb: "Analyzing Website...",
        loadingPdf: "Analyzing PDF...",
        loadingAv: "Processing Audio / Video...",
        loadingTable: "Analyzing Table...",

        noResponse: "(No Response)",

        generated: "Full Report Generated",
        download: "Download File / Report",

        noExport: "No exportable structured data.",

        pdfError: "PDF generation failed",
        excelError: "Excel generation failed",

        downloadError: "Download failed",
        excelDownloadError: "Excel download failed",

        formula: "Calculation Formula:",

        formulaDesc:
          'The energy usage value (x) from the "{{year}}" Energy Balance Table is divided by the total energy consumption (M) of that year to calculate the proportional share of each energy source.',

        commonEnergy: "Common Energy Sources",

        yearHighlight: "More Prominent in {{year}}",

        departmentHighlight: "More Prominent in {{department}}",

        yearLabel: "Year {{year}}",

        separator: ", ",

        avSource: "Audio / Video Source",
        tableSource: "Table Source",

        rows: "rows",
        cols: "cols"
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