from apscheduler.schedulers.background import BackgroundScheduler
from crawlers.energy_news_crawler import crawl_energy_news

scheduler = BackgroundScheduler()


def start_scheduler():
    print("⏰ 啟動公告同步排程")  # ← 有這行最好

    # 啟動時先同步一次
    crawl_energy_news()

    scheduler.add_job(
        crawl_energy_news,
        trigger="interval",
        minutes=30,
        id="energy_news_sync",
        replace_existing=True,
    )

    scheduler.start()
