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
        import requests
        from datetime import datetime

        url = "https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/genloadareaperc.json"
        headers = {"User-Agent": "Mozilla/5.0"}

        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}")

        data = response.json()

        # 抓目前負載
        current_load = float(data["load"])

        # 抓備轉容量率
        reserve = float(data.get("reservePercent", 0))

        # 再生能源比例（有些欄位叫 renewable）
        renewable = float(data.get("renewable", 0))

        cache = {
            "power": round(current_load, 0),
            "renewable": round(renewable, 2),
            "peak": round(current_load + reserve * 100, 0),
            "carbon": round(current_load * 0.45, 2),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        with open("energy_cache.json", "w", encoding="utf-8") as f:
            json.dump(cache, f)

        print("⚡ 真台電即時資料同步成功")

    except Exception as e:
        print("❌ 電力資料抓取失敗:", e)


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
