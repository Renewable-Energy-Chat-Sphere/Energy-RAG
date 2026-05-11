from flask import Blueprint, request, send_file

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)

from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

import io
import json
import os


export_bp = Blueprint("export", __name__)


# =========================
# 🔥 註冊中文字型
# =========================
BASE_DIR = os.path.dirname(__file__)

FONT_PATH = os.path.join(
    BASE_DIR,
    "fonts",
    "NotoSansTC-Regular.ttf",
)

pdfmetrics.registerFont(
    TTFont("NotoTC", FONT_PATH)
)


@export_bp.route("/export_pdf", methods=["POST"])
def export_pdf():

    structured_data = request.json.get("structured_data")

    if not structured_data:
        return {"error": "沒有收到 structured_data"}, 400

    if isinstance(structured_data, str):
        structured_data = json.loads(structured_data)

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    elements = []

    styles = getSampleStyleSheet()

    # =========================
    # 🔥 全部改中文字型
    # =========================
    styles["Heading1"].fontName = "NotoTC"
    styles["Heading2"].fontName = "NotoTC"
    styles["BodyText"].fontName = "NotoTC"

    styles["Heading1"].fontSize = 24
    styles["Heading2"].fontSize = 18
    styles["BodyText"].fontSize = 11

    styles["BodyText"].leading = 22

    # =========================
    # 🔥 標題
    # =========================
    title = structured_data.get("title", "AI Report")

    elements.append(
        Paragraph(title, styles["Heading1"])
    )

    elements.append(Spacer(1, 20))

    # =========================
    # 🔥 章節
    # =========================
    for section in structured_data.get("sections", []):

        heading = section.get("heading", "")
        content = section.get("content", "")

        elements.append(
            Paragraph(heading, styles["Heading2"])
        )

        elements.append(Spacer(1, 8))

        elements.append(
            Paragraph(
                content.replace("\n", "<br/>"),
                styles["BodyText"],
            )
        )

        elements.append(Spacer(1, 18))

    # =========================
    # 🔥 結論
    # =========================
    conclusion = structured_data.get("conclusion", "")

    if conclusion:

        elements.append(
            Paragraph("結論", styles["Heading2"])
        )

        elements.append(Spacer(1, 8))

        elements.append(
            Paragraph(
                conclusion.replace("\n", "<br/>"),
                styles["BodyText"],
            )
        )

    # =========================
    # 🔥 建立 PDF
    # =========================
    doc.build(elements)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="AI_Report.pdf",
        mimetype="application/pdf",
    )