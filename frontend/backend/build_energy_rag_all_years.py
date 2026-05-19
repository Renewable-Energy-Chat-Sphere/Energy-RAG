import re
import json
from pathlib import Path

import pandas as pd

from build_energy_rag_core import parse_ratio_like_sheet


# =========================
# 路徑
# =========================
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
YEARLY_DIR = DATA_DIR / "yearly"
PROCESSED_DIR = BASE_DIR / "processed"


RATIO_SHEETS = [
    "總比例換算",
    "出現情況",
    "出現情況(level1)",
    "出現情況(level 2)",
    "出現情況(level 3)",
]


# =========================
# 年份解析
# =========================
def extract_year_from_filename(filename: str):
    m = re.search(r"(\d{2,3})", filename)
    return int(m.group(1)) if m else None


# =========================
# TOTAL MAP（安全版）
# =========================
def build_total_map(excel_path):

    df = pd.read_excel(excel_path, sheet_name="總表")

    # 🔥 找 D1（安全版）
    d1_rows = df[df.iloc[:, 0].astype(str).str.contains("D1", na=False)]

    if len(d1_rows) == 0:
        print("⚠️ 找不到 D1 row，使用第一列")
        d1_row = df.iloc[0]
    else:
        d1_row = d1_rows.iloc[0]

    total_map = {}

    for col in df.columns:

        key = str(col).strip()

        if key.startswith("S"):
            try:
                val = float(d1_row[col])
                total_map[key] = val
            except:
                continue

    return total_map


# =========================
# main
# =========================
def main():

    all_records = []

    yearly_files = sorted(YEARLY_DIR.glob("*.xlsx"))

    if not yearly_files:
        raise FileNotFoundError(f"找不到 Excel：{YEARLY_DIR}")

    # =========================
    # supply catalog（可選）
    # =========================
    supply_catalog_path = DATA_DIR / "supply_catalog.json"

    supply_catalog_map = {}

    if supply_catalog_path.exists():
        supply_catalog_map = json.loads(
            supply_catalog_path.read_text(encoding="utf-8")
        )

    # =========================
    # LOOP YEARS
    # =========================
    for excel_path in yearly_files:

        year = extract_year_from_filename(excel_path.name)

        if year is None:
            print(f"⚠️ skip {excel_path.name}")
            continue

        print(f"📘 處理 {excel_path.name}（{year}）")

        # =========================
        # total map
        # =========================
        try:
            total_map = build_total_map(excel_path)
        except Exception as e:
            print(f"❌ total map error: {e}")
            total_map = {}

        # =========================
        # sheets ingestion
        # =========================
        for sheet_name in RATIO_SHEETS:

            try:
                records = parse_ratio_like_sheet(
                    excel_path,
                    sheet_name,
                    year,
                    total_map,
                    supply_catalog_map
                )

                all_records.extend(records)

                print(f"  ✅ {sheet_name}: {len(records)}")

            except Exception as e:
                print(f"  ❌ {sheet_name}: {e}")

    # =========================
    # output
    # =========================
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    output_path = PROCESSED_DIR / "energy_rag_all_years_meta.json"
    preview_path = PROCESSED_DIR / "energy_rag_all_years_preview.json"

    output_path.write_text(
        json.dumps(all_records, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    preview_path.write_text(
        json.dumps(all_records[:50], ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("\n🎉 完成")
    print(f"📄 total records = {len(all_records)}")
    print(f"📁 output = {output_path}")


if __name__ == "__main__":
    main()