import React, { useState, useEffect } from "react";

import PowerPlant from "./PowerPlant";

import PowerPlantLive from "./PowerPlantLive";
import { useTranslation } from "react-i18next";
export default function PowerPlantController() {
  const { t } = useTranslation();
  const [useLive, setUseLive] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/power-units")
      .then((res) => {
        if (!res.ok) {
          throw new Error("API Error");
        }

        return res.json();
      })

      .then((res) => {
        if (res && res.length > 0) {
          console.log("🟢 使用即時模式");

          setUseLive(true);
        } else {
          console.log("🟡 即時資料為空");

          setUseLive(false);
        }
      })

      .catch((err) => {
        console.log("❌ 使用備援模式");

        console.log(err);

        setUseLive(false);
      });
  }, []);

  /* ========================
     🔥 loading
  ======================== */
  if (useLive === null) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 320px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div className="loading-text">
          <i className="fi fi-rr-bolt loading-icon"></i>
          {t("power.loading")}
          <span className="dot-animation"></span>
        </div>
        <div
          style={{
            opacity: 0.65,
            fontSize: "14px",
          }}
        >
          {t("power.syncing")}
        </div>
      </div>
    );
  }

  /* ========================
     🔥 自動切換
  ======================== */
  return useLive ? <PowerPlantLive /> : <PowerPlant />;
}
