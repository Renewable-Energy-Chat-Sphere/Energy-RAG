import React, { useState, useEffect } from "react";

import PowerPlant from "./PowerPlant";

import PowerPlantLive from "./PowerPlantLive";

export default function PowerPlantController() {
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
          padding: "50px",
          textAlign: "center",
        }}
      >
        ⚡ 載入電網資料中...
      </div>
    );
  }

  /* ========================
     🔥 自動切換
  ======================== */
  return useLive ? <PowerPlantLive /> : <PowerPlant />;
}
