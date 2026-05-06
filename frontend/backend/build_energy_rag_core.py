import json
from pathlib import Path
from typing import Any, Dict, Iterable, List

import pandas as pd


# =========================
# 可調整設定
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
# 小工具
# =========================
def safe_float(value: Any):
    try:
        if pd.isna(value) or value == "":
            return None
        return float(value)
    except Exception:
        return None


def normalize_code(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def normalize_text(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


# =========================
# Excel: 總比例換算 / 出現情況 類
# =========================
def parse_ratio_like_sheet(file_path: Path, sheet_name: str, year: int) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None).ffill()

    # 第 0 列: S1~S54
    supply_codes = [normalize_code(v) for v in df.iloc[0, 2:].tolist()]
    # 第 1 列: 中文能源名稱
    supply_names_zh = [normalize_text(v) for v in df.iloc[1, 2:].tolist()]
    # 第 2 列: 英文能源名稱
    supply_names_en = [normalize_text(v) for v in df.iloc[2, 2:].tolist()]

    records: List[Dict[str, Any]] = []

    # 第 3 列開始才是 D1 / D2 / ...
    for row_idx in range(3, len(df)):
        row = df.iloc[row_idx]

        demand_code = normalize_code(row.iloc[0])
        demand_name = normalize_text(row.iloc[1])

        if not demand_code or not demand_name:
            continue

        for col_idx, supply_code in enumerate(supply_codes):
            supply_name_zh = supply_names_zh[col_idx]
            supply_name_en = supply_names_en[col_idx]
            raw_value = row.iloc[col_idx + 2]
            value = safe_float(raw_value)

            # 跳過空值、0
            if value is None or value == 0:
                continue

            if supply_code == "S54" or supply_name_zh == "總計":
                text = (
                    f"{year}年，{demand_name}（代碼 {demand_code}）"
                    f"在「{sheet_name}」表中的總值為 {value}。"
                )
                records.append({
                    "text": text,
                    "source_type": "excel",
                    "source_file": file_path.name,
                    "sheet": sheet_name,
                    "record_type": "total" if sheet_name == "總比例換算" else "presence_total",
                    "year": year,
                    "demand_code": demand_code,
                    "demand_name": demand_name,
                    "supply_code": supply_code,
                    "supply_name_zh": supply_name_zh,
                    "supply_name_en": supply_name_en,
                    "value": value,
                    "row_index": row_idx + 1,
                    "col_index": col_idx + 3,
                })
                continue

            if sheet_name == "總比例換算":
                text = (
                    f"{year}年，{demand_name}（代碼 {demand_code}）"
                    f"在「{sheet_name}」表中使用的能源為{supply_name_zh}（代碼 {supply_code}），"
                    f"數值為 {value}。"
                )
                record_type = "ratio"
            else:
                text = (
                    f"{year}年，{demand_name}（代碼 {demand_code}）"
                    f"在「{sheet_name}」表中是否出現{supply_name_zh}（代碼 {supply_code}）的結果為 {int(value)}。"
                )
                record_type = "presence"

            records.append({
                "text": text,
                "source_type": "excel",
                "source_file": file_path.name,
                "sheet": sheet_name,
                "record_type": record_type,
                "year": year,
                "demand_code": demand_code,
                "demand_name": demand_name,
                "supply_code": supply_code,
                "supply_name_zh": supply_name_zh,
                "supply_name_en": supply_name_en,
                "value": value,
                "row_index": row_idx + 1,
                "col_index": col_idx + 3,
            })

    return records


# =========================
# hierarchy.json
# 預期格式：
# {
#   "D2": {
#     "name": "工業部門",
#     "level": 1,
#     "children": {
#       "D3": {"name": "...", "level": 2}
#     }
#   }
# }
# =========================
def walk_hierarchy(node_code: str, node_data: Dict[str, Any], parent_code: str = "", parent_name: str = "") -> Iterable[Dict[str, Any]]:
    node_name = normalize_text(node_data.get("name_zh", ""))
    level = node_data.get("level", None)
    children = node_data.get("children", {}) or {}

    text = f"需求節點 {node_code} 的名稱是 {node_name}。"
    if level is not None:
        text += f" 它屬於第 {level} 層。"
    if parent_code:
        text += f" 上層節點是 {parent_name}（代碼 {parent_code}）。"

    yield {
        "text": text,
        "source_type": "json",
        "source_file": "hierarchy.json",
        "record_type": "hierarchy_node",
        "node_code": node_code,
        "node_name": node_name,
        "level": level,
        "parent_code": parent_code,
        "parent_name": parent_name,
    }

    if children:
        child_pairs = []
        for child_code, child_data in children.items():
            child_pairs.append(f"{normalize_text(child_data.get('name_zh', ''))}（代碼 {child_code}）")

        children_text = (
            f"{node_name}（代碼 {node_code}）的下層節點包含："
            + "、".join(child_pairs)
            + "。"
        )
        yield {
            "text": children_text,
            "source_type": "json",
            "source_file": "hierarchy.json",
            "record_type": "hierarchy_children",
            "node_code": node_code,
            "node_name": node_name,
            "level": level,
            "children_codes": list(children.keys()),
            "children_names": [normalize_text(c.get("name_zh", "")) for c in children.values()],
        }

        for child_code, child_data in children.items():
            yield from walk_hierarchy(child_code, child_data, node_code, node_name)


def parse_hierarchy_json(file_path: Path) -> List[Dict[str, Any]]:
    data = json.loads(file_path.read_text(encoding="utf-8"))
    records: List[Dict[str, Any]] = []

    for root_code, root_data in data.items():
        records.extend(list(walk_hierarchy(root_code, root_data)))

    return records


# =========================
# supply_catalog.json
# 預期格式：
# {
#   "S1": {"name_zh": "煤及煤產品", "name_en": "Coal and Coal Products", "category": "Coal"},
#   ...
# }
# 也支援：
# {"S1": {"zh": "...", "en": "...", "category": "..."}}
# =========================
def parse_supply_catalog_json(file_path: Path) -> List[Dict[str, Any]]:
    data = json.loads(file_path.read_text(encoding="utf-8"))
    records: List[Dict[str, Any]] = []

    for supply_code, item in data.items():
        if not isinstance(item, dict):
            continue

        name_zh = normalize_text(
            item.get("name_zh")
            or item.get("zh")
            or item.get("name")
            or item.get("label_zh")
            or ""
        )
        name_en = normalize_text(
            item.get("name_en")
            or item.get("en")
            or item.get("label_en")
            or ""
        )
        category = normalize_text(item.get("category") or item.get("type") or "")

        text = f"供給代碼 {supply_code} 的名稱是 {name_zh}。"
        if name_en:
            text += f" 英文名稱是 {name_en}。"
        if category:
            text += f" 類別是 {category}。"

        records.append({
            "text": text,
            "source_type": "json",
            "source_file": "supply_catalog.json",
            "record_type": "supply_catalog",
            "supply_code": supply_code,
            "supply_name_zh": name_zh,
            "supply_name_en": name_en,
            "category": category,
        })

    return records


# =========================
# 主流程
# =========================
def main():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    output_dir = base_dir / "processed"
    output_dir.mkdir(exist_ok=True)

    excel_path = data_dir / "85_energy_ratio.xlsx"
    hierarchy_path = data_dir / "hierarchy.json"
    supply_catalog_path = data_dir / "supply_catalog.json"

    all_records: List[Dict[str, Any]] = []

    # Excel
    for sheet_name in RATIO_LIKE_SHEETS:
        all_records.extend(parse_ratio_like_sheet(excel_path, sheet_name, YEAR))

    # hierarchy.json
    if hierarchy_path.exists():
        all_records.extend(parse_hierarchy_json(hierarchy_path))

    # supply_catalog.json
    if supply_catalog_path.exists():
        all_records.extend(parse_supply_catalog_json(supply_catalog_path))

    # 輸出
    output_path = output_dir / "energy_rag_core_records.json"
    output_path.write_text(json.dumps(all_records, ensure_ascii=False, indent=2), encoding="utf-8")

    # 額外輸出前 20 筆方便檢查
    preview_path = output_dir / "energy_rag_core_preview.json"
    preview_path.write_text(json.dumps(all_records[:20], ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"完成，共輸出 {len(all_records)} 筆紀錄")
    print(f"主檔案：{output_path}")
    print(f"預覽檔：{preview_path}")


if __name__ == "__main__":
    main()
