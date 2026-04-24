# app.py
import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import requests

from datetime import datetime

load_dotenv()

from openai import OpenAI

openai_client = OpenAI()

from pipelines.rag_web import qa_over_web
from pipelines.rag_pdf import qa_over_pdf

# from pipelines.rag_av import qa_over_av

from chat import chat_bp
from tables import tables_bp

# 🔥 加回 scheduler
from scheduler import start_scheduler

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024

app.config.update(
    OPENAI_CLIENT=openai_client,
    QA_OVER_WEB=qa_over_web,
    QA_OVER_PDF=qa_over_pdf,
    # QA_OVER_AV=qa_over_av,
)

app.register_blueprint(chat_bp)
app.register_blueprint(tables_bp)
import smtplib
from email.mime.text import MIMEText


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
    # 📥 JSON
    # =========================
    def load_data():
        if not os.path.exists(FILE_PATH):
            return []
        try:
            with open(FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []

    def save_data(data):
        with open(FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

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
        if "非常不滿意" in feeling or len(message) > 40:
            return "負面", "問題", "高"
        if "不滿意" in feeling:
            return "負面", "問題", "中"
        if "希望" in message:
            return "中立", "建議", "低"
        return "正面", "其他", "低"

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
"""
                    },
                    {
                        "role": "user",
                        "content": f"""
使用者說：
{message}
"""
                    }
                ],
                temperature=1.1
            )

            reply = res.choices[0].message.content.strip()
            print("🔥 AI回覆:", reply)
            return reply

        except Exception as e:
            print("⚠ AI 回覆失敗:", e)
            return auto_reply()

    reply_text = generate_reply()

    # =========================
    # 💾 存 JSON
    # =========================
    data_list = load_data()

    new_record = {
        "name": name,
        "email": email,
        "phone": phone,
        "feeling": feeling,
        "message": message,
        "sentiment": sentiment,
        "category": category,
        "priority": priority,
        "reply": reply_text,
        "status": "open"
    }

    data_list.append(new_record)
    save_data(data_list)

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
        admin_msg = MIMEText(f"""
📩 EnerSphere 新回饋

姓名: {name}
Email: {email}
電話: {phone}

內容:
{message}

分析:
{sentiment} / {category} / {priority}
""", "plain", "utf-8")

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
def get_feedback():
    import json, os
    from flask import jsonify

    FILE_PATH = os.path.join(os.path.dirname(__file__), "feedback.json")

    if not os.path.exists(FILE_PATH):
        return jsonify([])

    try:
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except:
        data = []

    return jsonify(data)


# =========================
# ✅ 標記完成
# =========================
@app.route("/resolve_feedback", methods=["POST"])
def resolve_feedback():
    import json, os
    from flask import request, jsonify

    index = request.json.get("index")

    FILE_PATH = os.path.join(os.path.dirname(__file__), "feedback.json")

    with open(FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    if 0 <= index < len(data):
        data[index]["status"] = "closed"

    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok"})


# =========================
# ❌ 刪除
# =========================
@app.route("/delete_feedback", methods=["POST"])
def delete_feedback():
    import json, os
    from flask import request, jsonify

    index = request.json.get("index")

    FILE_PATH = os.path.join(os.path.dirname(__file__), "feedback.json")

    with open(FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    if 0 <= index < len(data):
        data.pop(index)

    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok"})



@app.route("/dashboard", methods=["GET"])
def dashboard():
    try:
        import requests
        from bs4 import BeautifulSoup

        url = "https://datatw.net/data/energy"
        res = requests.get(url, timeout=10)

        soup = BeautifulSoup(res.text, "html.parser")

        # 👉 找數字（比抓 JSON 穩）
        text = soup.get_text()

        import re

        # 🔥 改成抓「即時用電量 + 支援逗號」
        power_match = re.search(r"即時用電量.*?([\d,]+)", text)
        if power_match:
            power = int(power_match.group(1).replace(",", ""))
        else:
            power = 30000

        # 🔥 再生能源（避免抓錯）
        renewable_match = re.search(r"再生能源.*?([\d]+)\s*%", text)
        if renewable_match:
            renewable = int(renewable_match.group(1).replace(",", ""))
        else:
            renewable = 20

        return {
            "power": power,
            "renewable": renewable,
            "peak": power + 2000,
            "carbon": 12000,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    except Exception as e:
        print(e)
        return {
            "power": 30000,
            "renewable": 20,
            "peak": 35000,
            "carbon": 12000,
            "timestamp": "error",
        }


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
#@app.route("/ask_av", methods=["POST"])
#def ask_av():
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


# ====================================
# 入口
# ====================================
if __name__ == "__main__":

    print("🔥 Scheduler starting...")
    start_scheduler()  # ✅ 加在這裡

    app.run(host="0.0.0.0", port=8000)
