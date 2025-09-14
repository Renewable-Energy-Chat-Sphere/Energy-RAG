// energy_data.sample.js
// 台灣能源資料（示範數據，單位: NT$/kWh, MW, MtCO2e）

export default [
  {
    code: "SOLAR_TW_rooftop",
    zh: "太陽能（屋頂型）",
    en: "Solar Rooftop (Taiwan)",
    kpi: {
      price: 3.2,              // NT$/kWh
      policy_index: 0.78,      // 0~1，政策強度（補助/優先併網）
      usage_match: 0.65,       // 0~1，尖峰用電契合度
      capacity_installed: 3200, // MW
      capacity_potential: 8000, // MW
      emissions_avoided: 4.5    // MtCO2e/yr
    },
    recent_events: [
      { id: "EVT_TARIFF_2025Q2", ts: "2025-06-01", type: "tariff", delta: { price: -0.1, capacity_installed: +120 } },
      { id: "EVT_SUBSIDY_2025Q1", ts: "2025-03-15", type: "subsidy", delta: { policy_index: +0.05 } }
    ],
    similarity: { "SOLAR_TW_utility": 0.82, "WIND_TW_offshore": 0.41 }
  },

  {
    code: "SOLAR_TW_utility",
    zh: "太陽能（地面型）",
    en: "Solar Utility-Scale (Taiwan)",
    kpi: {
      price: 2.8,
      policy_index: 0.72,
      usage_match: 0.55,
      capacity_installed: 4500,
      capacity_potential: 15000,
      emissions_avoided: 6.1
    },
    recent_events: [
      { id: "EVT_AUCTION_2025", ts: "2025-05-10", type: "auction", delta: { price: -0.2, capacity_installed: +200 } }
    ],
    similarity: { "SOLAR_TW_rooftop": 0.82, "WIND_TW_onshore": 0.33 }
  },

  {
    code: "WIND_TW_onshore",
    zh: "陸域風電",
    en: "Onshore Wind (Taiwan)",
    kpi: {
      price: 2.5,
      policy_index: 0.68,
      usage_match: 0.7,
      capacity_installed: 1200,
      capacity_potential: 5000,
      emissions_avoided: 2.4
    },
    recent_events: [
      { id: "EVT_GRID_2025", ts: "2025-04-20", type: "grid", delta: { usage_match: +0.1 } }
    ],
    similarity: { "WIND_TW_offshore": 0.77, "SOLAR_TW_utility": 0.33 }
  },

  {
    code: "WIND_TW_offshore",
    zh: "離岸風電",
    en: "Offshore Wind (Taiwan)",
    kpi: {
      price: 2.6,
      policy_index: 0.85,
      usage_match: 0.72,
      capacity_installed: 2500,
      capacity_potential: 10000,
      emissions_avoided: 6.2
    },
    recent_events: [
      { id: "EVT_AUCTION_2025", ts: "2025-05-10", type: "auction", delta: { price: -0.2, capacity_installed: +300 } }
    ],
    similarity: { "WIND_TW_onshore": 0.77, "SOLAR_TW_rooftop": 0.41 }
  },

  {
    code: "HYDRO_TW",
    zh: "水力發電",
    en: "Hydropower (Taiwan)",
    kpi: {
      price: 1.9,
      policy_index: 0.6,
      usage_match: 0.5,
      capacity_installed: 2100,
      capacity_potential: 3000,
      emissions_avoided: 3.2
    },
    recent_events: [],
    similarity: { "WIND_TW_offshore": 0.52, "SOLAR_TW_utility": 0.28 }
  },

  {
    code: "BIOMASS_TW",
    zh: "生質能",
    en: "Biomass (Taiwan)",
    kpi: {
      price: 3.8,
      policy_index: 0.5,
      usage_match: 0.4,
      capacity_installed: 400,
      capacity_potential: 2000,
      emissions_avoided: 0.9
    },
    recent_events: [
      { id: "EVT_SUBSIDY_2025", ts: "2025-02-01", type: "subsidy", delta: { policy_index: +0.1 } }
    ],
    similarity: { "HYDRO_TW": 0.3, "SOLAR_TW_rooftop": 0.2 }
  }
];
