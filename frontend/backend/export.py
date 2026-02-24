from flask import Blueprint, request, send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
import io
import json

export_bp = Blueprint("export", __name__)


@export_bp.route("/export_pdf", methods=["POST"])
def export_pdf():

    structured_data = request.json.get("structured_data")

    if not structured_data:
        return {"error": "沒有收到 structured_data"}, 400

    if isinstance(structured_data, str):
        structured_data = json.loads(structured_data)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # 標題
    elements.append(
        Paragraph(structured_data.get("title", "AI Report"), styles["Heading1"])
    )
    elements.append(Spacer(1, 12))

    # 章節
    for section in structured_data.get("sections", []):
        elements.append(Paragraph(section.get("heading", ""), styles["Heading2"]))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(section.get("content", ""), styles["BodyText"]))
        elements.append(Spacer(1, 12))

    # 結論
    elements.append(Paragraph("Conclusion", styles["Heading2"]))
    elements.append(
        Paragraph(structured_data.get("conclusion", ""), styles["BodyText"])
    )

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="AI_Report.pdf",
        mimetype="application/pdf",
    )
