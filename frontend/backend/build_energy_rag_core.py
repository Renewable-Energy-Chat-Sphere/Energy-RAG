import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


# =========================
# config
# =========================
YEAR = 85

RATIO_LIKE_SHEETS = [
    "總比例換算",
    "出現情況",
    "出現情況(level1)",
    "出現情況(level 2)",
    "出現情況(level 3)",
]


# =========================
# utils
# =========================
def safe_float(v):
    try:
        if pd.isna(v) or v == "":
            return None
        return float(v)
    except:
        return None


def norm(v):
    if pd.isna(v):
        return ""
    return str(v).strip()


# =========================
# 🔥 TOTAL MAP (ROBUST)
# =========================
def build_total_map(excel_path):

    df = pd.read_excel(excel_path, sheet_name="總表")

    d1_rows = df[df.iloc[:, 0].astype(str).str.contains("D1|總計", na=False)]

    if len(d1_rows) == 0:
        d1_row = df.iloc[0]
    else:
        d1_row = d1_rows.iloc[0]

    total_map = {}

    for col in df.columns:

        key = str(col).strip().replace(" ", "")

        if "S" in key:
            try:
                val = float(d1_row[col])
                total_map[key] = val
            except:
                continue

    return total_map


# =========================
# parser
# =========================
def parse_ratio_like_sheet(file_path, sheet_name, year, total_map, supply_catalog_map):

    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None).ffill()

    supply_codes = [norm(v) for v in df.iloc[0, 2:].tolist()]
    supply_names_zh = [norm(v) for v in df.iloc[1, 2:].tolist()]
    supply_names_en = [norm(v) for v in df.iloc[2, 2:].tolist()]

    records = []

    for i in range(3, len(df)):
        row = df.iloc[i]

        demand_code = norm(row.iloc[0])
        demand_name = norm(row.iloc[1])

        if not demand_code:
            continue

        for j, code in enumerate(supply_codes):

            value = safe_float(row.iloc[j + 2])
            if value is None or value == 0:
                continue

            zh = supply_names_zh[j]
            en = supply_names_en[j]

            total_value = total_map.get(code)

            catalog = supply_catalog_map.get(code, {})
            en_name = catalog.get("name_en", en)

            text = (
                f"{year}年 {demand_name} 使用 {zh}/{en_name}（{code}）"
                f" 比例 {value}"
            )

            if total_value is not None:
                text += f"｜總用量 {total_value}"

            records.append({
                "text": text,

                "year": year,

                # 🔥 新增
                "record_type": "ratio",
                "sheet": sheet_name,

                # 原本
                "type": "excel",

                "demand_code": demand_code,
                "demand_name": demand_name,

                "supply_code": code,

                "supply_name_zh": zh,
                "supply_name_en": en_name,

                "value": value,
                "total_supply": total_value
            })

    return records


# =========================
# main
# =========================
def main():

    # ✔ 正確 root（避免 frontend/frontend / backend 問題）
    BASE_DIR = Path(__file__).resolve().parent

    DATA_DIR = BASE_DIR / "src" / "data"
    OUTPUT_DIR = BASE_DIR / "src" / "processed"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    excel_path = Path(__file__).resolve().parent / "data" / "yearly" / "85_energy_ratio.xlsx"

    # =========================
    # DEBUG（避免 silent fail）
    # =========================
    print("📂 BASE_DIR =", BASE_DIR)
    print("📄 Excel =", excel_path)

    if not excel_path.exists():
        raise FileNotFoundError(f"❌ 找不到 Excel: {excel_path}")

    # =========================
    # supply catalog
    # =========================
    supply_catalog_path = DATA_DIR / "supply_catalog.json"

    supply_catalog_map = {}

    if supply_catalog_path.exists():
        supply_catalog_map = json.loads(
            supply_catalog_path.read_text(encoding="utf-8")
        )

    # =========================
    # total map
    # =========================
    total_map = build_total_map(excel_path)

    # =========================
    # ingestion
    # =========================
    all_records = []

    for sheet in RATIO_LIKE_SHEETS:

        try:
            rec = parse_ratio_like_sheet(
                excel_path,
                sheet,
                YEAR,
                total_map,
                supply_catalog_map
            )

            all_records.extend(rec)
            print(f"✅ {sheet}: {len(rec)}")

        except Exception as e:
            print(f"❌ {sheet} error: {e}")

    # =========================
    # hierarchy
    # =========================
    hierarchy_path = DATA_DIR / "hierarchy.json"

    if hierarchy_path.exists():
        all_records.append({
            "text": "hierarchy loaded",
            "type": "meta"
        })

    # =========================
    # output
    # =========================
    output_path = OUTPUT_DIR / "energy_rag_core_meta.json"

    output_path.write_text(
        json.dumps(all_records, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("\n🎉 DONE")
    print(f"📦 total records = {len(all_records)}")
    print(f"📁 output = {output_path}")


if __name__ == "__main__":
    main()