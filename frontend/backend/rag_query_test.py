import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "processed"
META_PATH = PROCESSED_DIR / "energy_rag_core_meta.json"

records = json.loads(META_PATH.read_text(encoding="utf-8"))

question = "工業部門主要使用哪些能源？"

matches = [
    r for r in records
    if r.get("record_type") == "ratio"
    and r.get("sheet") == "總比例換算"
    and str(r.get("demand_code", "")).strip() == "D2"
]

matches = sorted(matches, key=lambda x: x.get("value", 0), reverse=True)

top_n = 5
top_matches = matches[:top_n]

answer_parts = [
    f"{r['supply_name_zh']}（{r['supply_code']}，{r['value']}）"
    for r in top_matches
]

answer = (
    f"在 85 年的「總比例換算」資料中，工業部門（D2）主要使用的能源包括："
    + "、".join(answer_parts)
    + "。"
)

print(f"\n問題：{question}\n")
print(answer)