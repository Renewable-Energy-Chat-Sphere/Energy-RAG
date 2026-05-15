import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
import io
import os, json, re, pickle
from datetime import datetime
from flask import request, jsonify
from power_api import get_power_units
import logging

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
# 資料庫 專用
import sqlite3
from db import get_db

# 權限管理 專用
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps

# 🔮 Predict 專用（新增）
from prophet import Prophet
import pandas as pd

load_dotenv()

from openai import OpenAI

openai_client = OpenAI()

from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf

# from pipelines.rag_av import qa_over_av

from chat import chat_bp
from tables import tables_bp

app = Flask(__name__)
app.secret_key = "enerSphere_2026"
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024

app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    # QA_OVER_AV=qa_over_av,
)

app.register_blueprint(chat_bp)
app.register_blueprint(tables_bp)


# =========================
# 🔐 Register
# =========================
@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "user").strip()

    if not username or not password:
        return jsonify({"error": "請輸入帳號與密碼"}), 400

    if role != "manager":
        return jsonify({"error": "只能註冊 manager"}), 403

    DB_PATH = os.path.join(os.path.dirname(__file__), "energy.db")

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO users (username, password, role)
            VALUES (?, ?, ?)
            """,
            (username, generate_password_hash(password), role),
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "註冊成功", "username": username, "role": role})

    except sqlite3.IntegrityError:
        return jsonify({"error": "帳號已存在"}), 409


# =========================
# 🔐 Auth Login
# =========================
@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}

    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "請輸入帳號與密碼"}), 400

    DB_PATH = os.path.join(os.path.dirname(__file__), "energy.db")

    conn = get_db()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "帳號不存在"}), 401

    if not check_password_hash(user["password"], password):
        return jsonify({"error": "密碼錯誤"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]

    return jsonify(
        {"message": "登入成功", "username": user["username"], "role": user["role"]}
    )


@app.route("/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})

    return jsonify(
        {
            "logged_in": True,
            "username": session.get("username"),
            "role": session.get("role"),
        }
    )


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({"message": "已登出"})


# =========================
# 🔒 權限檢查工具
# =========================
def require_role(*allowed_roles):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            role = session.get("role", "user")

            if role not in allowed_roles:
                return jsonify({"error": "權限不足"}), 403

            return func(*args, **kwargs)

        return wrapper

    return decorator


import smtplib
from email.mime.text import MIMEText

# =========================
# 🔮 Predict Department Energy (FULL VERSION + EVALUATION + MAPE 🔥)
# =========================

import os, json, re, pickle
import pandas as pd
from datetime import datetime
from flask import request, jsonify
from prophet import Prophet

# =========================
# 📂 路徑
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "../src/data")

MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

SERIES_CACHE = {}
MODEL_CACHE = {}
ACCURACY_CACHE = {}  # 🔥 新增（完全不影響原本）
EVALUATION_CACHE = {}

# =========================
# 🧠 hierarchy
# =========================
HIERARCHY_PATH = os.path.join(DATA_DIR, "hierarchy.json")


def load_hierarchy():
    with open(HIERARCHY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


HIERARCHY = load_hierarchy()


# =========================
# 🧠 建 mapping
# =========================
def build_dept_map(hierarchy):
    mapping = {}

    def traverse(obj):
        for code, val in obj.items():

            if not isinstance(val, dict):
                continue

            name = val.get("name_zh") or val.get("name_en")

            if not name:
                continue

            mapping[name] = code
            mapping[name.replace("部門", "")] = code
            mapping[name.replace("業", "")] = code

            children = val.get("children")

            if isinstance(children, dict):
                traverse(children)

    traverse(hierarchy)
    return mapping


DEPT_NAME_MAP = build_dept_map(HIERARCHY)


# =========================
# 🔥 子節點
# =========================
def get_descendants(target_code, hierarchy):
    result = set()

    def traverse(obj):
        for code, val in obj.items():
            if code == target_code:
                collect(val)
            if "children" in val:
                traverse(val["children"])

    def collect(node):
        for c, v in node.get("children", {}).items():
            result.add(c)
            collect(v)

    traverse(hierarchy)
    return result


def expand_depts(dept_code):
    expanded = set([dept_code])
    expanded.update(get_descendants(dept_code, HIERARCHY))
    return expanded


# =========================
# 🧠 判斷部門
# =========================
def detect_depts(question):
    matches = []

    for name, code in DEPT_NAME_MAP.items():
        if name in question:
            matches.append((name, code))

    if matches:
        matches.sort(key=lambda x: len(x[0]), reverse=True)
        best = matches[0][1]
        return expand_depts(best)

    return None


# =========================
# 📥 讀資料
# =========================
def load_all_years():
    data = {}

    for file in os.listdir(DATA_DIR):
        if file.endswith("_energy_demand_supply.json"):
            try:
                year = int(file.split("_")[0])
                with open(os.path.join(DATA_DIR, file), "r", encoding="utf-8") as f:
                    data[year] = json.load(f)
            except:
                continue

    return dict(sorted(data.items()))


def normalize(data):
    result = {}
    for dept, energies in data.items():
        total = sum(energies.values())
        result[dept] = {e: v / total if total else 0 for e, v in energies.items()}
    return result


# =========================
# 🔥 初始化（只加準確度）
# =========================
def init_data(force_retrain=False):
    global SERIES_CACHE, MODEL_CACHE, ACCURACY_CACHE, EVALUATION_CACHE

    print("⚡ 初始化資料...")

    model_path = os.path.join(MODEL_DIR, "models.pkl")
    series_path = os.path.join(MODEL_DIR, "series.pkl")
    acc_path = os.path.join(MODEL_DIR, "accuracy.pkl")
    eval_path = os.path.join(MODEL_DIR, "evaluation.pkl")
    if not force_retrain:
        try:
            MODEL_CACHE = pickle.load(open(model_path, "rb"))
            SERIES_CACHE = pickle.load(open(series_path, "rb"))
            ACCURACY_CACHE = pickle.load(open(acc_path, "rb"))
            EVALUATION_CACHE = pickle.load(open(eval_path, "rb"))
            print("✅ 已載入模型 + 準確度")
            return
        except:
            print("⚠️ 沒模型，開始訓練")

    all_data = load_all_years()
    normalized = {y: normalize(d) for y, d in all_data.items()}

    series = {}
    models = {}
    accuracy = {}
    evaluation = {}
    for year, data in normalized.items():
        for dept, energies in data.items():
            for e, v in energies.items():
                key = f"{dept}_{e}"

                if key not in series:
                    series[key] = {"years": [], "values": []}

                series[key]["years"].append(year)
                series[key]["values"].append(v)

    for key, s in series.items():
        if len(s["years"]) < 3:
            continue

        try:
            years_ad = [y + 1911 for y in s["years"]]

            df = pd.DataFrame(
                {"ds": pd.to_datetime([str(y) for y in years_ad]), "y": s["values"]}
            )

            model = Prophet()
            model.fit(df)

            # 🔥 新增：準確度
            forecast = model.predict(df)
            evaluation[key] = {
                "years": years_ad,
                "actual": list(df["y"]),
                "predicted": list(forecast["yhat"]),
            }
            actual = list(df["y"])
            predicted = list(forecast["yhat"])

            errors = []
            for a, p in zip(actual, predicted):
                if a != 0:
                    errors.append(abs((a - p) / a))

            mape = round(sum(errors) / len(errors) * 100, 2) if errors else 0

            models[key] = model
            accuracy[key] = mape

        except:
            continue

    SERIES_CACHE = series
    MODEL_CACHE = models
    ACCURACY_CACHE = accuracy
    EVALUATION_CACHE = evaluation
    pickle.dump(MODEL_CACHE, open(model_path, "wb"))
    pickle.dump(SERIES_CACHE, open(series_path, "wb"))
    pickle.dump(ACCURACY_CACHE, open(acc_path, "wb"))
    pickle.dump(EVALUATION_CACHE, open(eval_path, "wb"))

    print("✅ 訓練完成 + 準確度完成")


# =========================
# 📈 預測
# =========================
def run_prediction(target_year, dept_filters=None, mode="full"):
    result = {}

    for key in SERIES_CACHE:
        dept, energy = key.split("_")

        # 🔹 部門篩選
        if dept_filters and dept not in dept_filters:
            continue

        years = SERIES_CACHE[key]["years"]
        values = SERIES_CACHE[key]["values"]

        # 🔵 模式 A：Prediction 頁（固定模型）
        if mode == "full":
            model = MODEL_CACHE.get(key)
            if model is None:
                continue

            years_ad = [y + 1911 for y in years]
            last_year = max(years_ad)

            periods = max(1, target_year - last_year)

            future = model.make_future_dataframe(periods=periods, freq="Y")
            forecast = model.predict(future)

            pred = float(forecast.iloc[-1]["yhat"])

        # 🔴 模式 B：Global 頁（動態訓練）
        else:
            # ⭐ 只用 target_year 之前的資料
            filtered = [
                (y, v) for y, v in zip(years, values) if y + 1911 <= target_year
            ]

            # ⭐ 避免資料太少
            if len(filtered) < 3:
                continue

            years_f, values_f = zip(*filtered)

            df = pd.DataFrame(
                {"ds": pd.to_datetime([str(y + 1911) for y in years_f]), "y": values_f}
            )

            # ⭐ 每次重新訓練
            model = Prophet()
            model.fit(df)

            # ⭐ 預測下一年
            future = model.make_future_dataframe(periods=1, freq="YE")
            forecast = model.predict(future)

            pred = float(forecast.iloc[-1]["yhat"])

        # 🔹 避免負值
        pred = max(pred, 0)

        result.setdefault(dept, {})
        result[dept][energy] = pred

    # 🔹 正規化成 %
    for dept in result:
        total = sum(result[dept].values())
        if total > 0:
            for energy in result[dept]:
                result[dept][energy] = result[dept][energy] / total * 100

    return result


# =========================
# 📊 evaluation
# =========================
def get_evaluation_data(dept_filters=None):

    result = {}

    for key, val in EVALUATION_CACHE.items():

        dept, energy = key.split("_")

        if dept_filters and dept not in dept_filters:
            continue

        result.setdefault(dept, {})
        result[dept][energy] = val

    return result


# =========================
# 🧠 年份解析
# =========================
def parse_year(text):
    now = datetime.now().year

    if "今年" in text:
        return now
    if "明年" in text:
        return now + 1

    match = re.search(r"\d+", text)
    if match:
        y = int(match.group())
        return y if y > 1911 else y + 1911

    return None


# =========================
# 🌐 API
# =========================
@app.route("/predict_department_energy", methods=["POST"])
def predict_department_energy():

    data = request.json or {}
    question = data.get("question", "")
    question = data.get("question", "")
    target_year = parse_year(question)
    dept_filters = detect_depts(question)
    mode = data.get("mode", "full")

    if not target_year:
        return jsonify({"error": "請輸入年份，例如 2025 或 明年"})

    prediction = run_prediction(target_year, dept_filters, mode)
    evaluation = get_evaluation_data(dept_filters)

    summary = []
    for dept, energies in prediction.items():
        top = sorted(energies.items(), key=lambda x: x[1], reverse=True)[:3]

        summary.append({"dept": dept, "top": top})

    return jsonify(
        {
            "year": target_year,
            "prediction": prediction,
            "summary": summary,
            "evaluation": evaluation,
            "accuracy": ACCURACY_CACHE,  # 🔥 新增
        }
    )


# =========================
# 📩 Contact
# =========================
@app.route("/contact", methods=["POST"])
def contact():
    import json, os, smtplib
    from email.mime.text import MIMEText
    from flask import request, jsonify

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    FILE_PATH = os.path.join(BASE_DIR, "feedback.json")

    # =========================
    # 🗄 SQLite
    # =========================
    DB_PATH = os.path.join(BASE_DIR, "energy.db")

    data = request.json or {}

    name = data.get("name", "")
    email = data.get("email", "")
    phone = data.get("phone", "")
    feeling = data.get("feeling", "")
    message = data.get("message", "")

    # =========================
    # 🤖 分析
    # =========================
    def analyze(feeling, message):

        text = message.lower()

        NEGATIVE_WORDS = [
            "難用",
            "爛",
            "不好",
            "差",
            "沒吸引力",
            "資訊太分散",
            "看不懂",
            "複雜",
            "卡",
            "錯誤",
            "bug",
            "問題",
            "不方便",
            "慢",
            "不好用",
            "不友善",
            "不喜歡",
            "糟",
            "火大",
            "氣死",
            "垃圾",
            "not food",
            "shit",
            "bad",
            "trash",
            "angry",
        ]

        POSITIVE_WORDS = [
            "好用",
            "方便",
            "喜歡",
            "很棒",
            "優秀",
            "清楚",
            "漂亮",
            "讚",
        ]

        SUGGEST_WORDS = [
            "希望",
            "建議",
            "可以",
            "應該",
        ]

        negative_score = sum(word in text for word in NEGATIVE_WORDS)

        positive_score = sum(word in text for word in POSITIVE_WORDS)

        suggest_score = sum(word in text for word in SUGGEST_WORDS)

        # 🔥 feeling 加權
        if "非常不滿意" in feeling:
            negative_score += 3

        elif "不滿意" in feeling:
            negative_score += 2

        elif "非常滿意" in feeling:
            positive_score += 3

        elif "滿意" in feeling:
            positive_score += 1

        # =====================
        # 情緒判定
        # =====================
        if negative_score > positive_score:
            sentiment = "負面"

        elif positive_score > negative_score:
            sentiment = "正面"

        else:
            sentiment = "中立"

        # =====================
        # 類型
        # =====================
        if suggest_score > 0:
            category = "建議"

        elif sentiment == "負面":
            category = "問題"

        else:
            category = "其他"

        # =====================
        # 優先級
        # =====================
        if sentiment == "負面" and negative_score >= 3:
            priority = "高"

        elif sentiment == "負面":
            priority = "中"

        else:
            priority = "低"

        return sentiment, category, priority

    sentiment, category, priority = analyze(feeling, message)

    # =========================
    # 🤖 fallback 回覆（AI掛掉用）
    # =========================
    def auto_reply():
        if feeling == "非常不滿意":
            return "很抱歉造成您的不滿，我們會盡快協助處理 🙏"
        if sentiment == "負面":
            return "了解你的困擾，我們會盡快檢查並改善這個問題"
        if category == "建議":
            return "這個建議很不錯，我們會納入優化方向 👍"
        return "謝謝你的回饋，我們會持續優化體驗 😄"

    # =========================
    # 🤖 AI 回覆（真人客服版🔥）
    # =========================
    def generate_reply():
        try:
            from openai import OpenAI

            client = OpenAI()

            res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""
你是一位「真人客服」，不是機器人。

🎯 任務：
根據使用者內容自然回覆

🔥 規則：
- 每次回覆都要不同（避免模板）
- 不要每次都用「感謝您的回饋」
- 可以口語一點（像人聊天）
- 長度 1~2 句

📊 情境：
情緒：{sentiment}
類型：{category}
優先級：{priority}

👉 回覆方式：

【負面】
- 要有同理心（理解、抱歉）
- 可以安撫

【建議】
- 要肯定（這個想法不錯）
- 可以說會考慮

【正面】
- 輕鬆回應（可加 emoji）

🚫 禁止：
- 模板句
- 每次一樣開頭

👉 直接回覆，不要解釋
""",
                    },
                    {
                        "role": "user",
                        "content": f"""
使用者說：
{message}
""",
                    },
                ],
                temperature=1.1,
            )

            reply = res.choices[0].message.content.strip()
            print("🔥 AI回覆:", reply)
            return reply

        except Exception as e:
            print("⚠ AI 回覆失敗:", e)
            return auto_reply()

    reply_text = generate_reply()

    # =========================
    # 💾 存 SQLite
    # =========================
    conn = get_db()

    cursor = conn.cursor()

    cursor.execute(
        """
    INSERT INTO feedback (

        name,
        email,
        phone,
        feeling,
        message,
        sentiment,
        category,
        priority

    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (name, email, phone, feeling, message, sentiment, category, priority),
    )

    conn.commit()

    conn.close()

    # =========================
    # 📩 寄信
    # =========================
    try:
        print("🔥 開始寄信")

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.ehlo()
        server.starttls()
        server.ehlo()

        server.login("rag412402@gmail.com", "hezo wjxc lpdj ultq")

        # 管理員通知
        admin_msg = MIMEText(
            f"""
📩 EnerSphere 新回饋

姓名: {name}
Email: {email}
電話: {phone}

內容:
{message}

分析:
{sentiment} / {category} / {priority}
""",
            "plain",
            "utf-8",
        )

        admin_msg["Subject"] = "EnerSphere 新回饋通知"
        admin_msg["From"] = "rag412402@gmail.com"
        admin_msg["To"] = "rag412402@gmail.com"

        server.send_message(admin_msg)

        # 使用者回覆
        if email:
            reply_msg = MIMEText(reply_text, "plain", "utf-8")
            reply_msg["Subject"] = "您的回饋已收到"
            reply_msg["From"] = "rag412402@gmail.com"
            reply_msg["To"] = email

            server.send_message(reply_msg)

        server.quit()

    except Exception as e:
        print("❌ Email錯誤:", e)

    return jsonify({"status": "success"})


# =========================
# 📊 讀取
# =========================
@app.route("/get_feedback")
# @require_role("admin")
def get_feedback():

    from flask import jsonify
    import sqlite3
    import os

    DB_PATH = os.path.join(os.path.dirname(__file__), "energy.db")

    conn = get_db()

    # 🔥 row → dict
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM feedback
    ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    conn.close()

    data = [dict(row) for row in rows]

    return jsonify(data)


# =========================
# ✅ 標記完成
# =========================
@app.route("/resolve_feedback", methods=["POST"])
# @require_role("admin")
def resolve_feedback():

    import sqlite3
    import os
    from flask import request, jsonify

    feedback_id = request.json.get("id")

    DB_PATH = os.path.join(os.path.dirname(__file__), "energy.db")

    conn = get_db()

    cursor = conn.cursor()

    cursor.execute(
        """
    UPDATE feedback
    SET status = 'closed'
    WHERE id = ?
    """,
        (feedback_id,),
    )

    conn.commit()

    conn.close()

    return jsonify({"status": "ok"})


# =========================
# ❌ 刪除
# =========================
@app.route("/delete_feedback", methods=["POST"])
# @require_role("admin")
def delete_feedback():

    import sqlite3
    import os
    from flask import request, jsonify

    feedback_id = request.json.get("id")

    DB_PATH = os.path.join(os.path.dirname(__file__), "energy.db")

    conn = get_db()

    cursor = conn.cursor()

    cursor.execute(
        """
    DELETE FROM feedback
    WHERE id = ?
    """,
        (feedback_id,),
    )

    conn.commit()

    conn.close()

    return jsonify({"status": "ok"})


# ====================================
# 1. Web 問答
# ====================================
@app.route("/ask_web", methods=["POST"])
def ask_web():
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    url = (data.get("url") or "").strip() or None

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400

    answer, sources = qa_over_web(question, url=url)
    return jsonify({"answer": answer, "sources": sources})


# ====================================
# 2. PDF 問答
# ====================================
@app.route("/ask_pdf", methods=["POST"])
def ask_pdf():
    question = (request.form.get("question") or "").strip()
    file = request.files.get("file")

    if not question:
        return jsonify({"error": "❌ 必須提供問題內容"}), 400
    if not file:
        return jsonify({"error": "❌ 請上傳 PDF 檔案"}), 400

    answer, sources, structured_data = qa_over_pdf(question, file)

    return jsonify(
        {"answer": answer, "sources": sources, "structured_data": structured_data}
    )


# ====================================
# 3. AV 問答
# ====================================
# @app.route("/ask_av", methods=["POST"])
# def ask_av():
#    question = (request.form.get("question") or "").strip()
#    file = request.files.get("file")
#
#    if not question:
#        return jsonify({"error": "❌ 必須提供問題內容"}), 400
#    if not file:
#        return jsonify({"error": "❌ 請上傳音訊或影片檔案"}), 400
#    answer, sources = qa_over_av(question, file)
#    return jsonify({"answer": answer, "sources": sources})


# ====================================
# 4. 生成 PDF
# ====================================
@app.route("/export_pdf", methods=["POST"])
def export_pdf():

    try:

        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from xml.sax.saxutils import escape

        data = request.get_json()

        structured_data = data.get("structured_data", {})

        # 🔥 讀取自動生成的檔名
        file_name = structured_data.get("file_name", "AI_Report.pdf")

        # 🔥 取出真正內容
        if "data" in structured_data:
            structured_data = structured_data["data"]

        buffer = io.BytesIO()

        # =========================
        # 字型
        # =========================
        font_path = os.path.join(os.path.dirname(__file__), "NotoSansTC-Regular.ttf")

        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont("NotoSansTC", font_path))
            font_name = "NotoSansTC"
        else:
            font_name = "Helvetica"

        styles = getSampleStyleSheet()

        styles["Normal"].fontName = font_name
        styles["Heading1"].fontName = font_name
        styles["Heading2"].fontName = font_name
        styles["BodyText"].fontName = font_name

        doc = SimpleDocTemplate(buffer, pagesize=A4)

        elements = []

        # =========================
        # 如果 structured_data 是原始 JSON
        # =========================
        if "sections" not in structured_data:

            elements.append(Paragraph("AI Analysis Report", styles["Heading1"]))
            elements.append(Spacer(1, 12))

            # 逐行輸出 JSON
            pretty = json.dumps(structured_data, indent=2, ensure_ascii=False)

            for line in pretty.split("\n"):
                elements.append(Paragraph(escape(line), styles["BodyText"]))

        else:

            # =========================
            # Title
            # =========================
            elements.append(
                Paragraph(
                    escape(structured_data.get("title", "AI Report")),
                    styles["Heading1"],
                )
            )

            elements.append(Spacer(1, 12))

            # =========================
            # Sections
            # =========================
            for section in structured_data.get("sections", []):

                heading = section.get("heading", "")
                content = section.get("content", "")

                # 如果 content 是 JSON 字串 → 轉回 dict
                if isinstance(content, str):
                    try:
                        parsed = json.loads(content)
                        if isinstance(parsed, dict):
                            content = "\n".join(f"{k}: {v}" for k, v in parsed.items())
                    except:
                        pass

                # 如果是 dict
                if isinstance(content, dict):
                    content = "\n".join(f"{k}: {v}" for k, v in content.items())

                # 如果是 list
                if isinstance(content, list):
                    content = "\n".join(str(i) for i in content)

                elements.append(Paragraph(escape(heading), styles["Heading2"]))

                elements.append(Spacer(1, 6))

                elements.append(
                    Paragraph(
                        escape(content).replace("\n", "<br/>"), styles["BodyText"]
                    )
                )

                elements.append(Spacer(1, 12))

            # =========================
            # Conclusion
            # =========================
            if "conclusion" in structured_data:

                elements.append(Paragraph("Conclusion", styles["Heading2"]))

                elements.append(
                    Paragraph(
                        escape(structured_data.get("conclusion", "")),
                        styles["BodyText"],
                    )
                )
            elements.append(Spacer(1, 30))
        elements.append(
            Paragraph(
                "Generated by <b>Energy RAG System</b><br/>Fu Jen Catholic University MIS",
                styles["BodyText"],
            )
        )

        doc.build(elements)

        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=file_name,
            mimetype="application/pdf",
        )

    except Exception as e:

        print("🔥 export_pdf crash:", e)

        return jsonify({"error": str(e)}), 500


@app.route("/export_excel", methods=["POST"])
def export_excel():

    from openpyxl import Workbook
    import io

    data = request.get_json()

    structured_data = data.get("structured_data", {})

    # 🔥 取得 PDF 同樣的檔名
    file_name = structured_data.get("file_name", "AI_Table.xlsx")

    # 🔥 如果是 pdf → 改成 xlsx
    file_name = file_name.replace(".pdf", ".xlsx")

    # 🔥 真正表格資料
    table = structured_data.get("data", structured_data)

    if not table:
        return jsonify({"error": "沒有表格資料"}), 400

    wb = Workbook()
    ws = wb.active
    ws.title = "AI Table"

    columns = table.get("columns", [])
    rows = table.get("rows", [])

    if columns:
        ws.append(columns)

    for r in rows:
        if isinstance(r, list):
            ws.append(r)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=file_name,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ====================================
# 5. 能源署公告 API
# ====================================
@app.route("/energy-news", methods=["GET"])
def get_energy_news():
    try:
        with open("energy_news_cache.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        # 👉 如果是空的 → fallback
        if not data.get("items"):
            raise ValueError("cache empty")

        return jsonify(data)

    except Exception as e:
        print("⚠️ cache失敗，改抓RSS:", e)

        import feedparser

        feed = feedparser.parse(
            "https://www.moeaea.gov.tw/ECW/NewsRSS.aspx?kind=1",
            request_headers={"User-Agent": "Mozilla/5.0"},
        )

        data = {
            "source": "經濟部能源署",
            "items": [
                {
                    "title": e.title,
                    "link": e.link,
                    "published": getattr(e, "published", ""),
                }
                for e in feed.entries[:5]
            ],
        }

        return jsonify(data)


@app.route("/power-units")
def power_units():

    return jsonify(get_power_units())


# ====================================
# 🤖 AI 即時電價分析
# ====================================
@app.route("/electricity-ai-analysis", methods=["POST"])
def electricity_ai_analysis():

    try:

        data = request.json or {}

        thermal = data.get("thermal", 0)

        renewable = data.get("renewable", 0)

        nuclear = data.get("nuclear", 0)
        nuclearNote = data.get("nuclearNote", "")
        cost_pressure = data.get("costPressure", 0)
        historical = data.get("historicalAnalysis", {})
        language = data.get("language", "zh")

        prompt = f"""
你是一位台灣能源分析 AI。

請根據以下即時供電資料，
分析目前台灣供電成本與能源結構。

資料：

火力發電：
{thermal} MW

再生能源：
{renewable} MW

核能：
{nuclear} MW

核能狀態（請直接使用此欄位內容，不要自行推論或改寫）：
{nuclearNote}

請優先根據「核能狀態」欄位，不要重新判斷核能是否發電

供電成本壓力：
{cost_pressure}
歷史能源趨勢：
{historical.get("trend", "")}

歷史供電風險：
{historical.get("risk", "")}

再生能源發展：
{historical.get("renewableTrend", "")}

請以「能源分析報告」格式輸出。

要求：

- 直接根據數據分析
- 避免過度推測
- 使用正式能源報告語氣
- 不要過度延伸未提供資料

重點：

1. 即時供電結構
2. 火力依賴程度
3. 供電成本壓力
4. 核能目前狀態
5. 長期能源轉型趨勢
6. 再生能源發展方向
7. 未來供電風險

限制：

- 200字內
- 使用 {"English" if language == "en" else "繁體中文"}
- 像 GPT 專業分析
- 不要條列
"""

        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=0.9,
        )

        text = resp.choices[0].message.content

        return jsonify({"analysis": text})

    except Exception as e:

        print("🔥 electricity-ai-analysis error:", e)

        return jsonify({"analysis": "AI 分析暫時無法使用"})


@app.route("/power-live")
def power_live():

    import requests

    url = (
        "https://www.taipower.com.tw/d006/loadGraph/loadGraph/data/genloadareaperc.json"
    )

    headers = {"User-Agent": "Mozilla/5.0"}

    res = requests.get(url, headers=headers)

    return jsonify(res.json())


# ====================================
# 入口
# ====================================
if __name__ == "__main__":

    print("🔥 初始化預測資料...")
    init_data()  # 🔥 加這行（關鍵）

    app.run(host="0.0.0.0", port=8000)
