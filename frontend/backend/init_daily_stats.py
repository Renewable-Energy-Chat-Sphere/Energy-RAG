import sqlite3

conn = sqlite3.connect("energy.db")

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS daily_stats (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    report_date TEXT,

    category TEXT,

    avg_power REAL,

    ratio REAL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()

conn.close()

print("✅ daily_stats 建立完成")
