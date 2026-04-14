from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
import json
import time
from datetime import datetime

ENERGY_NEWS_URL = (
    "https://www.moeaea.gov.tw/ECW/populace/news/News.aspx?kind=1&menu_id=41"
)

OUTPUT_PATH = "energy_news_cache.json"


def crawl_energy_news():
    print("🔥 爬蟲開始執行")

    options = Options()

    # 背景執行
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # ✅ ❗ 關鍵：完全不要 Service
    driver = webdriver.Edge(options=options)

    try:
        print("🌐 抓取能源署公告資料...")
        driver.get(ENERGY_NEWS_URL)

        time.sleep(4)

        items = []
        seen_links = set()

        links = driver.find_elements(By.XPATH, "//a[contains(@href, 'news_id=')]")

        for a in links:
            title = a.text.strip()
            link = a.get_attribute("href")

            if not title or not link:
                continue

            if link in seen_links:
                continue

            if title in ["新聞", "新聞澄清", "查看全部新聞"]:
                continue

            seen_links.add(link)
            items.append({"title": title, "link": link})

            if len(items) >= 5:
                break

        data = {
            "source": "經濟部能源署",
            "synced_at": datetime.now().isoformat(),
            "items": items,
        }

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ 同步完成，共 {len(items)} 則公告")

    except Exception as e:
        print("❌ 爬蟲錯誤:", e)

    finally:
        driver.quit()
