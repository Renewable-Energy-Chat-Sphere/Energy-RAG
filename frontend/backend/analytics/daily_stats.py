import sqlite3
from collections import defaultdict
from datetime import datetime

DB_PATH = "energy.db"


def generate_daily_stats():

    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    # =========================
    # 今日歷史資料
    # =========================
    cursor.execute("""
    SELECT
        category,
        power
    FROM power_generation_logs
    WHERE DATE(timestamp)=DATE('now')
    """)

    rows = cursor.fetchall()

    if not rows:
        print("⚠️ 今日沒有歷史資料")
        return

    # =========================
    # 分類統計
    # =========================
    category_data = defaultdict(list)

    for category, power in rows:

        try:
            power = float(power)
        except:
            power = 0

        category_data[category].append(power)

    # =========================
    # 總發電量
    # =========================
    total_power = 0

    avg_results = {}

    for category, values in category_data.items():

        avg_power = round(sum(values) / len(values), 2)

        avg_results[category] = avg_power

        # 🔥 只計算正發電
        if avg_power > 0:
            total_power += avg_power

    today = datetime.now().strftime("%Y-%m-%d")

    # =========================
    # 刪除舊資料
    # =========================
    cursor.execute(
        """
    DELETE FROM daily_stats
    WHERE report_date=?
    """,
        (today,),
    )

    # =========================
    # 寫入 daily_stats
    # =========================
    for category, avg_power in avg_results.items():

        # 🔥 跳過負數（儲能負載）
        if avg_power < 0:
            continue

        ratio = 0

        if total_power > 0:

            ratio = round(avg_power / total_power * 100, 2)

        cursor.execute(
            """
        INSERT INTO daily_stats (

            report_date,
            category,
            avg_power,
            ratio

        )

        VALUES (?, ?, ?, ?)

        """,
            (
                today,
                category,
                avg_power,
                ratio,
            ),
        )

    conn.commit()

    conn.close()

    print("✅ 每日分析完成")
