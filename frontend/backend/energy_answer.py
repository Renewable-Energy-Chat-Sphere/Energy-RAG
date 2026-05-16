import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "processed"
META_PATH = PROCESSED_DIR / "energy_rag_core_meta.json"

records = json.loads(META_PATH.read_text(encoding="utf-8"))

# ===============================
# 工具函式
# ===============================
def get_ratio_records():
    return [
        r for r in records
        if r.get("record_type") == "ratio"
        and r.get("sheet") == "總比例換算"
    ]


def format_value(record):

    value = round(record.get("value") or 0, 2)

    # ratio 才顯示 %
    if record.get("record_type") == "ratio":
        return f"{value}%"

    return str(value)


# ===============================
# 從需求項目查詢能源
# ===============================
def get_top_energy_by_demand(demand_name, top_n=5):
    data = get_ratio_records()

    matches = [
        r for r in data
        if r.get("demand_name") == demand_name
    ]

    if not matches:
        return f"❌ 找不到「{demand_name}」的資料"

    matches = sorted(
        matches,
        key=lambda x: x.get("value") or 0,
        reverse=True
    )

    top = matches[:top_n]

    answer_parts = []

    for r in top:

        # 總計顯示需求項目名稱
        if r.get("supply_name_zh", "") == "總計":
            name = r.get("demand_name", "")

        else:
            name = r.get("supply_name_zh", "")

        answer_parts.append(
            f"{name}（{format_value(r)}）"
        )

    return (
        f"{demand_name}主要使用的能源包括："
        + "、".join(answer_parts)
        + "。"
    )


# ===============================
# 從能源查詢需求項目
# ===============================
def get_top_demand_by_energy(supply_name, top_n=5):

    data = get_ratio_records()

    matches = [
        r for r in data
        if r.get("supply_name_zh") == supply_name
    ]

    if not matches:
        return f"❌ 找不到能源「{supply_name}」的資料"

    matches = sorted(
        matches,
        key=lambda x: x.get("value") or 0,
        reverse=True
    )

    top = matches[:top_n]

    answer_parts = []

    for r in top:

        name = r.get("demand_name", "")

        answer_parts.append(
            f"{name}（{format_value(r)}）"
        )

    return (
        f"{supply_name}主要使用於："
        + "、".join(answer_parts)
        + "。"
    )


# ===============================
# 是否使用
# ===============================
def check_usage(demand_name, supply_name):
    data = get_ratio_records()

    matches = [
        r for r in data
        if r.get("demand_name") == demand_name
        and r.get("supply_name_zh") == supply_name
    ]

    if not matches:
        return f"{demand_name}沒有使用{supply_name}。"

    value = matches[0].get("value") or 0

    if value > 0:

        value_text = round(value, 2)

        if matches[0].get("record_type") == "ratio":
            value_text = f"{value_text}%"

        return (
            f"{demand_name}有使用"
            f"{supply_name}（{value_text}）。"
        )

    else:
        return f"{demand_name}未使用{supply_name}。"


# ===============================
# 測試入口
# ===============================
if __name__ == "__main__":

    print("\n===== Energy RAG Demo =====\n")

    print("① 部門 → 能源")
    print(get_top_energy_by_demand("工業部門"))

    print("\n② 能源 → 部門")
    print(get_top_demand_by_energy("煤及煤產品"))

    print("\n③ 是否使用")
    print(check_usage("工業部門", "天然氣"))