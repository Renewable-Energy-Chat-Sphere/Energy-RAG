import json
import re
from pathlib import Path

import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "processed"

META_PATH = PROCESSED_DIR / "energy_rag_all_years_meta.json"
INDEX_PATH = PROCESSED_DIR / "energy_rag_all_years.index"

records = json.loads(META_PATH.read_text(encoding="utf-8"))
index = faiss.read_index(str(INDEX_PATH))
model = SentenceTransformer("all-MiniLM-L6-v2")


# =====================================================
# 基本判斷
# =====================================================
def is_energy_question(text: str) -> bool:
    keywords = [
        "工業部門", "運輸部門", "農業部門", "服務業部門", "住宅部門",
        "能源", "煤", "天然氣", "電力", "石油", "比例", "部門",
        "主要使用", "使用哪些能源", "哪些部門使用", "用在哪些部門",
        "有沒有使用", "有用", "最多", "最大", "前五", "top",
        "D2", "D40", "D47", "D50", "D68"
    ]
    text = text.strip()
    return any(k in text for k in keywords)


# =====================================================
# 抓年份
# 支援：
# - 民國85年
# - 85年
# - 1996年（可轉民國）
# - 純數字 85 / 113
# =====================================================
def extract_year(text: str):
    text = text.strip()

    # 民國85年 / 85年 / 113年
    m = re.search(r"(?:民國)?(\d{2,3})年", text)
    if m:
        year = int(m.group(1))
        if 1 <= year <= 300:
            return year

    # 西元年轉民國，例如 1996年 -> 85
    m = re.search(r"(19\d{2}|20\d{2})年", text)
    if m:
        ad_year = int(m.group(1))
        roc_year = ad_year - 1911
        if 1 <= roc_year <= 300:
            return roc_year

    # 單獨數字：85 / 113
    m = re.search(r"\b(8[0-9]|9[0-9]|10[0-9]|11[0-9])\b", text)
    if m:
        return int(m.group(1))

    return None


# =====================================================
# 抓部門
# =====================================================
def extract_department(text: str):
    departments = [
        "工業部門",
        "運輸部門",
        "農業部門",
        "服務業部門",
        "住宅部門",
    ]
    for dept in departments:
        if dept in text:
            return dept
    return None


# =====================================================
# 抓能源名稱
# 從 records 內所有 supply_name_zh 動態抓
# =====================================================
def extract_energy(text: str):
    energy_names = sorted(
        {r.get("supply_name_zh", "") for r in records if r.get("supply_name_zh")},
        key=len,
        reverse=True,
    )
    for name in energy_names:
        if name and name in text:
            return name
    return None


# =====================================================
# 向量檢索
# =====================================================
def search_energy_records(question: str, k: int = 20):
    q_emb = model.encode([question], convert_to_numpy=True).astype("float32")
    distances, indices = index.search(q_emb, k)

    results = []
    for idx in indices[0]:
        if 0 <= idx < len(records):
            results.append(records[idx])
    return results


# =====================================================
# 依條件抓 ratio 記錄
# =====================================================
def get_ratio_records(year=None, department=None, energy_name=None):
    result = [
        r for r in records
        if r.get("record_type") == "ratio"
        and r.get("sheet") == "總比例換算"
    ]

    if year is not None:
        result = [r for r in result if r.get("year") == year]

    if department is not None:
        result = [
            r for r in result
            if str(r.get("demand_name", "")).strip() == department.strip()
        ]

    if energy_name is not None:
        result = [
            r for r in result
            if str(r.get("supply_name_zh", "")).strip() == energy_name.strip()
        ]

    return result


# =====================================================
# 問題 1：某年某部門主要使用哪些能源
# =====================================================
def answer_top_energy_by_department(department: str, year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year, department=department)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}{department}」的能源資料。",
            "sources": [],
            "results": []
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    year_text = f"{year}年" if year else "各年度"
    answer = (
        f"根據{year_text}已生成的能源資料，{department}主要使用的能源包括："
        + "、".join([f"{r['supply_name_zh']}（{r['value']}）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": top
    }


# =====================================================
# 問題 2：某年某能源主要用在哪些部門
# =====================================================
def answer_top_department_by_energy(energy_name: str, year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year, energy_name=energy_name)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}{energy_name}」的資料。",
            "sources": [],
            "results": []
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    year_text = f"{year}年" if year else "各年度"
    answer = (
        f"根據{year_text}已生成的能源資料，{energy_name}主要使用於："
        + "、".join([f"{r['demand_name']}（{r['value']}）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": top
    }


# =====================================================
# 問題 3：某年某部門有沒有使用某能源
# =====================================================
def answer_check_usage(department: str, energy_name: str, year=None):
    matches = get_ratio_records(year=year, department=department, energy_name=energy_name)

    year_text = f"{year}年" if year else "指定年度"

    if not matches:
        return {
            "success": True,
            "answer": f"根據{year_text}已生成的能源資料，{department}沒有使用{energy_name}。",
            "sources": ["energy_rag_all_years_meta.json"],
            "results": []
        }

    matches = sorted(matches, key=lambda x: x.get("value", 0), reverse=True)
    best = matches[0]

    return {
        "success": True,
        "answer": f"根據{year_text}已生成的能源資料，{department}有使用{energy_name}（{best['value']}）。",
        "sources": ["energy_rag_all_years_meta.json"],
        "results": [best]
    }


# =====================================================
# 問題 4：某年使用最多的能源
# 這裡是把該年所有 ratio 記錄依 supply 聚合後排序
# =====================================================
def answer_top_energy_overall(year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}」的整體能源資料。",
            "sources": [],
            "results": []
        }

    agg = {}
    for r in ratio_records:
        name = r.get("supply_name_zh", "")
        code = r.get("supply_code", "")
        value = r.get("value", 0) or 0

        if name not in agg:
            agg[name] = {
                "supply_name_zh": name,
                "supply_code": code,
                "value": 0
            }
        agg[name]["value"] += value

    sorted_items = sorted(agg.values(), key=lambda x: x["value"], reverse=True)
    top = sorted_items[:top_n]

    year_text = f"民國{year}年" if year else "指定年度"
    answer = (
        f"根據{year_text}已生成的能源資料，使用量最多的能源包括："
        + "、".join([f"{r['supply_name_zh']}（{round(r['value'], 2)}）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json"],
        "results": top
    }


# =====================================================
# fallback：用向量檢索找相關資料
# =====================================================
def answer_by_semantic_search(user_text: str, year=None):
    retrieved = search_energy_records(user_text, k=12)

    if year is not None:
        retrieved = [r for r in retrieved if r.get("year") == year]

    ratio_first = [r for r in retrieved if r.get("record_type") == "ratio"]
    final_results = ratio_first[:5] if ratio_first else retrieved[:5]

    if not final_results:
        return {
            "success": False,
            "answer": "找不到相關能源資料。",
            "sources": [],
            "results": []
        }

    year_text = f"{year}年" if year else "相關年度"
    answer = f"根據{year_text}已生成的能源資料，找到以下相關內容：\n" + "\n".join(
        [f"- {r['text']}" for r in final_results]
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": final_results
    }


# =====================================================
# 主路由函式
# =====================================================
def answer_energy_question(user_text: str):
    year = extract_year(user_text)
    department = extract_department(user_text)
    energy_name = extract_energy(user_text)

    # 1. 問某年整體哪個能源最多
    if ("最多" in user_text or "最大" in user_text) and "能源" in user_text:
        return answer_top_energy_overall(year=year, top_n=5)

    # 2. 問某年某部門主要使用哪些能源
    if department and ("主要使用" in user_text or "使用哪些能源" in user_text):
        return answer_top_energy_by_department(department, year=year, top_n=5)

    # 3. 問某年某能源用在哪些部門
    if energy_name and ("用在哪些部門" in user_text or "哪些部門使用" in user_text):
        return answer_top_department_by_energy(energy_name, year=year, top_n=5)

    # 4. 問某年某部門是否使用某能源
    if department and energy_name and ("有用" in user_text or "有沒有使用" in user_text):
        return answer_check_usage(department, energy_name, year=year)

    # 5. fallback：語意檢索
    return answer_by_semantic_search(user_text, year=year)