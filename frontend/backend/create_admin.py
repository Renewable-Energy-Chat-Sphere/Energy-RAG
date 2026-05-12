import sqlite3
from db import get_db
import os

from werkzeug.security import generate_password_hash

# =========================
# 📂 資料庫路徑
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "energy.db")

# =========================
# 🔗 連接 SQLite
# =========================
conn = get_db()

cursor = conn.cursor()

# =========================
# 🔐 建立 admin
# =========================
username = "admin"

password = generate_password_hash("123")

role = "admin"

cursor.execute(
    """
    INSERT INTO users (
        username,
        password,
        role
    )
    VALUES (?, ?, ?)
    """,
    (username, password, role),
)

conn.commit()

conn.close()

print("✅ admin 建立完成")
print("帳號：admin")
print("密碼：123")