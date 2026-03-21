import json
from pathlib import Path

import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "processed"

META_PATH = PROCESSED_DIR / "energy_rag_core_meta.json"
INDEX_PATH = PROCESSED_DIR / "energy_rag_core.index"

records = json.loads(META_PATH.read_text(encoding="utf-8"))
index = faiss.read_index(str(INDEX_PATH))
model = SentenceTransformer("all-MiniLM-L6-v2")


def is_energy_question(text: str) -> bool:
    keywords = [
        "工業部門", "運輸部門", "農業部門", "服務業部門", "住宅部門",
        "能源", "煤", "天然氣", "電力", "石油", "比例", "部門",
        "主要使用", "使用哪些能源", "哪些部門使用", "用在哪些部門",
        "有沒有使用", "有用", "D2", "D40", "D47", "D50", "D68"
    ]
    text = text.strip()
    return any(k in text for k in keywords)


def search_energy_records(question: str, k: int = 20):
    q_emb = model.encode([question], convert_to_numpy=True).astype("float32")
    distances, indices = index.search(q_emb, k)

    results = []
    for idx in indices[0]:
        if 0 <= idx < len(records):
            results.append(records[idx])
    return results


def extract_department(text: str):
    departments = ["工業部門", "運輸部門", "農業部門", "服務業部門", "住宅部門"]
    for dept in departments:
        if dept in text:
            return dept
    return None


def extract_energy(text: str):
    energy_names = sorted(
        {r.get("supply_name_zh", "") for r in records if r.get("supply_name_zh")},
        key=len,
        reverse=True
    )
    for name in energy_names:
        if name and name in text:
            return name
    return None


def answer_top_energy_by_department(department: str, top_n: int = 5):
    ratio_records = [
        r for r in records
        if r.get("record_type") == "ratio"
        and r.get("sheet") == "總比例換算"
        and str(r.get("demand_name", "")).strip() == department.strip()
    ]

    if not ratio_records:
        return {
            "success": False,
            "answer": f"找不到「{department}」的能源資料。",
            "sources": [],
            "results": []
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    answer = (
        f"根據已生成的能源資料，{department}主要使用的能源包括："
        + "、".join([f"{r['supply_name_zh']}（{r['value']}）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_core_meta.json", "energy_rag_core.index"],
        "results": top
    }


def answer_top_department_by_energy(energy_name: str, top_n: int = 5):
    ratio_records = [
        r for r in records
        if r.get("record_type") == "ratio"
        and r.get("sheet") == "總比例換算"
        and str(r.get("supply_name_zh", "")).strip() == energy_name.strip()
    ]

    if not ratio_records:
        return {
            "success": False,
            "answer": f"找不到能源「{energy_name}」的資料。",
            "sources": [],
            "results": []
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    answer = (
        f"根據已生成的能源資料，{energy_name}主要使用於："
        + "、".join([f"{r['demand_name']}（{r['value']}）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_core_meta.json", "energy_rag_core.index"],
        "results": top
    }


def answer_check_usage(department: str, energy_name: str):
    matches = [
        r for r in records
        if r.get("record_type") == "ratio"
        and r.get("sheet") == "總比例換算"
        and str(r.get("demand_name", "")).strip() == department.strip()
        and str(r.get("supply_name_zh", "")).strip() == energy_name.strip()
    ]

    if not matches:
        return {
            "success": True,
            "answer": f"根據已生成的能源資料，{department}沒有使用{energy_name}。",
            "sources": ["energy_rag_core_meta.json"],
            "results": []
        }

    matches = sorted(matches, key=lambda x: x.get("value", 0), reverse=True)
    best = matches[0]

    return {
        "success": True,
        "answer": f"根據已生成的能源資料，{department}有使用{energy_name}（{best['value']}）。",
        "sources": ["energy_rag_core_meta.json"],
        "results": [best]
    }


def answer_energy_question(user_text: str):
    department = extract_department(user_text)
    energy_name = extract_energy(user_text)

    if department and ("主要使用" in user_text or "使用哪些能源" in user_text):
        return answer_top_energy_by_department(department)

    if energy_name and ("用在哪些部門" in user_text or "哪些部門使用" in user_text):
        return answer_top_department_by_energy(energy_name)

    if department and energy_name and ("有用" in user_text or "有沒有使用" in user_text):
        return answer_check_usage(department, energy_name)

    retrieved = search_energy_records(user_text, k=12)
    ratio_first = [r for r in retrieved if r.get("record_type") == "ratio"]
    final_results = ratio_first[:5] if ratio_first else retrieved[:5]

    if not final_results:
        return {
            "success": False,
            "answer": "找不到相關能源資料。",
            "sources": [],
            "results": []
        }

    answer = "根據已生成的能源資料，找到以下相關內容：\n" + "\n".join(
        [f"- {r['text']}" for r in final_results]
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_core_meta.json", "energy_rag_core.index"],
        "results": final_results
    }