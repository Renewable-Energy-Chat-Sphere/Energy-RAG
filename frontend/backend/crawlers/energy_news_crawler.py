# crawlers/energy_news_crawler.py
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import json
import time
from datetime import datetime

ENERGY_NEWS_URL = (
    "https://www.moeaea.gov.tw/ECW/populace/news/News.aspx"
    "?kind=1&menu_id=41"
)

OUTPUT_PATH = "energy_news_cache.json"

def crawl_energy_news():
    # ===== 啟動瀏覽器 =====
    options = Options()
    options.add_argument("--headless=new")  # 若抓不到可先改成 False
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )

    print("🌐 開啟能源署公告頁…")
    driver.get(ENERGY_NEWS_URL)
    time.sleep(6)  # ⏳ 等 JS 載入（重要）

    items = []

    # ===== 抓所有「公告連結」（穩定做法）=====
    links = driver.find_elements(
        By.XPATH,
        "//a[contains(@href, 'News.aspx')]"
    )

    for a in links:
        title = a.text.strip()
        link = a.get_attribute("href")

        # 過濾無效項目
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
