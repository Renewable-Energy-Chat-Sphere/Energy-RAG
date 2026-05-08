print("🔥 POWER API LOADED 🔥")

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from bs4 import BeautifulSoup

import json
import time

URL = "https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/genary.json"


def get_power_units():

    try:

        options = Options()

        options.add_argument("--headless")

        driver = webdriver.Edge(options=options)

        driver.get(URL)

        time.sleep(3)

        # 🔥 抓完整 HTML
        html = driver.page_source

        driver.quit()

        # 🔥 解析 <pre> 內的 JSON
        soup = BeautifulSoup(html, "html.parser")

        pre = soup.find("pre")

        if pre is None:

            print("❌ 找不到 JSON <pre>")

            return []

        json_text = pre.text

        # 🔥 轉 JSON
        data = json.loads(json_text)

        # 🔥 真正資料
        rows = data["aaData"]

        result = []

        for row in rows:

            try:

                # 🔥 跳過小計
                if "小計" in str(row[2]):
                    continue

                name = row[2]

                max_power = str(row[3])

                current = str(row[4])

                percent = str(row[5])

                status = str(row[6])

                # 🔥 判斷模式
                mode = "generate"

                # 🔥 台電 '-' 代表抽蓄負載/待機
                if current == "-" or current == "N/A":
                    mode = "load"

                result.append(
                    {
                        "name": name,
                        "max": max_power,
                        "value": current,
                        "percent": percent,
                        "status": status,
                        "mode": mode,
                    }
                )

            except:
                continue

        print(f"✅ 成功取得 {len(result)} 筆機組")

        return result

    except Exception as e:

        print("❌ Selenium 台電API錯誤")

        print(e)

        return []
