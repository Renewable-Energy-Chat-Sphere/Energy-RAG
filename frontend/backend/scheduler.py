from apscheduler.schedulers.background import BackgroundScheduler
from crawlers.energy_news_crawler import crawl_energy_news
import requests
import json
from datetime import datetime

scheduler = BackgroundScheduler()


# =========================
# 🔹 更新能源新聞
# =========================
def update_energy_news():
    try:
        crawl_energy_news()
        print("📰 能源新聞更新成功")
    except Exception as e:
        print("❌ 新聞更新失敗:", e)


# =========================
# 🔹 更新 Dashboard（抓真台電負載）
# =========================
def update_dashboard_cache():
    try:
        url = "https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/loadpara.json"
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.taipower.com.tw/",
        }

        response = requests.get(url, headers=headers, timeout=5)

        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}")

        data = response.json()

        current_load = float(data.get("load") or 0)
        peak_load = float(data.get("peakload") or 0)
        capacity = float(data.get("capacity") or 0)

        reserve = float(
            data.get("reserve")
            or data.get("reserveMargin")
            or data.get("reservecapacity")
            or 0
        )

        # 🔥 防呆
        if current_load == 0 or peak_load == 0:
            raise Exception("台電回傳空資料")

        cache = {
            "power": round(current_load, 1),
            "peak": round(peak_load, 1),
            "capacity": round(capacity, 1),
            "reserve": round(reserve, 2),
            "renewable": 0,
            "carbon": round(current_load * 0.45, 2),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "errorType": "ok",  
        }

        with open("energy_cache.json", "w", encoding="utf-8") as f:
            json.dump(cache, f)

        print("⚡ 台電即時資料更新成功")

    except Exception as e:
        error_msg = str(e)

        # 🔴 抓不到 API（timeout / 連線問題）
        if "HTTPSConnectionPool" in error_msg or "timeout" in error_msg:
            error_type = "timeout"

        # 🟡 抓到但空資料
        elif "台電回傳空資料" in error_msg:
            error_type = "empty"

        # ❓ 其他
        else:
            error_type = "unknown"

        print(f"⚠️ 台電API失敗 → {error_type}", e)

        try:
            with open("energy_cache.json", "r", encoding="utf-8") as f:
                cache = json.load(f)

            cache["isLive"] = False
            cache["errorType"] = error_type  # ⭐加這行

            with open("energy_cache.json", "w", encoding="utf-8") as f:
                json.dump(cache, f)

            print("✅ 使用舊快取資料")

        except:
            cache = {
                "power": 30000,
                "peak": 32000,
                "capacity": 35000,
                "reserve": 10,
                "renewable": 20,
                "carbon": 12000,
                "timestamp": "fallback",
                "isLive": False,
                "errorType": error_type,  # ⭐這裡也要加
            }

        with open("energy_cache.json", "w", encoding="utf-8") as f:
            json.dump(cache, f)
        try:
            with open("energy_cache.json", "r", encoding="utf-8") as f:
                cache = json.load(f)

            cache["isLive"] = False  # ⭐這行最重要

            with open("energy_cache.json", "w", encoding="utf-8") as f:
                json.dump(cache, f)

            print("✅ 使用舊快取資料")

        except:
            cache = {
                "power": 30000,
                "peak": 32000,
                "capacity": 35000,
                "reserve": 10,
                "renewable": 20,
                "carbon": 12000,
                "timestamp": "fallback",
                "isLive": False,  # ⭐這行
            }

            with open("energy_cache.json", "w", encoding="utf-8") as f:
                json.dump(cache, f)


# =========================
# 🔹 啟動排程
# =========================
def start_scheduler():
    print("⏰ 啟動所有背景排程")

    # 啟動時先跑一次
    update_energy_news()
    update_dashboard_cache()

    scheduler.add_job(
        update_energy_news,
        trigger="interval",
        minutes=30,
        id="energy_news_sync",
        replace_existing=True,
    )

    scheduler.add_job(
        update_dashboard_cache,
        trigger="interval",
        seconds=30,
        id="dashboard_sync",
        replace_existing=True,
    )

    scheduler.start()
