import re
import json
from pathlib import Path

from build_energy_rag_core import (
    parse_ratio_like_sheet,
    parse_hierarchy_json,
    parse_supply_catalog_json,
)

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

def extract_year_from_filename(filename: str):
    m = re.search(r"(\d{2,3})", filename)
    return int(m.group(1)) if m else None


def main():
    all_records = []

    yearly_files = sorted(YEARLY_DIR.glob("*.xlsx"))

    if not yearly_files:
        raise FileNotFoundError(f"找不到任何年度 Excel：{YEARLY_DIR}")

    for excel_path in yearly_files:
        year = extract_year_from_filename(excel_path.name)

        if year is None:
            print(f"⚠️ 無法從檔名判斷年份，跳過：{excel_path.name}")
            continue

        print(f"📘 處理 {excel_path.name}（民國 {year} 年）")

        for sheet_name in RATIO_SHEETS:
            try:
                records = parse_ratio_like_sheet(excel_path, sheet_name, year)
                all_records.extend(records)
                print(f"  ✅ {sheet_name}: {len(records)} 筆")
            except Exception as e:
                print(f"  ❌ {sheet_name} 失敗：{e}")

    # hierarchy / supply catalog 只加一次
    hierarchy_path = DATA_DIR / "hierarchy.json"
    supply_catalog_path = DATA_DIR / "supply_catalog.json"

    if hierarchy_path.exists():
        all_records.extend(parse_hierarchy_json(hierarchy_path))
    if supply_catalog_path.exists():
        all_records.extend(parse_supply_catalog_json(supply_catalog_path))

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

    print(f"\n✅ 完成，共 {len(all_records)} 筆")
    print(f"完整檔案：{output_path}")
    print(f"預覽檔案：{preview_path}")


if __name__ == "__main__":
    main()