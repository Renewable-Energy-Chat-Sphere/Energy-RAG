import sqlite3

# 建立 / 連接 SQLite
conn = sqlite3.connect("energy.db")

cursor = conn.cursor()

# =========================
# 📩 feedback table
# =========================
cursor.execute("""
CREATE TABLE IF NOT EXISTS feedback (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT,
    email TEXT,
    phone TEXT,

    feeling TEXT,
    message TEXT,

    sentiment TEXT,
    category TEXT,
    priority TEXT,

    status TEXT DEFAULT 'open',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

# =========================
# 👤 users table
# =========================
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT UNIQUE,
    password TEXT,

    role TEXT DEFAULT 'user',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()

conn.close()

print("✅ SQLite 資料庫初始化完成")