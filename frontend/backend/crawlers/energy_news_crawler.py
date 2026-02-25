from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
import json
import time
from datetime import datetime
import os

ENERGY_NEWS_URL = (
    "https://www.moeaea.gov.tw/ECW/populace/news/News.aspx"
    "?kind=1&menu_id=41"
)

OUTPUT_PATH = "energy_news_cache.json"

def crawl_energy_news():
    print("🔥 爬蟲開始執行")

    options = Options()
    # options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")

    # ⭐ 指定本地 driver（完全離線）
    driver_path = os.path.join(os.getcwd(), "msedgedriver.exe")
    service = Service(driver_path)

    driver = webdriver.Edge(service=service, options=options)

    print("🌐 開啟能源署公告頁…")
    driver.get(ENERGY_NEWS_URL)

    time.sleep(6)

    items = []

    links = driver.find_elements(
        By.XPATH,
        "//a[contains(@href, 'News.aspx')]"
    )

    for a in links:
        title = a.text.strip()
        link = a.get_attribute("href")

        if not title:
            continue
        if "menu_id" not in link:
            continue

        items.append({
            "title": title,
            "link": link
        })

        if len(items) >= 5:
            break

    driver.quit()

    data = {
        "source": "經濟部能源署",
        "synced_at": datetime.now().isoformat(),
        "items": items
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ 同步完成，共 {len(items)} 則公告")


if __name__ == "__main__":
    crawl_energy_news()