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
# 基本資料
# =====================================================
DEPARTMENTS = [
    "工業部門",
    "運輸部門",
    "農業部門",
    "服務業部門",
    "住宅部門",
]

ENERGY_NAMES = sorted(
    {r.get("supply_name_zh", "") for r in records if r.get("supply_name_zh")},
    key=len,
    reverse=True,
)

# 部門同義詞：口語 / 簡稱 -> 正式名稱
DEPARTMENT_SYNONYMS = {
    "工業": "工業部門",
    "工業部門": "工業部門",
    "運輸": "運輸部門",
    "交通": "運輸部門",
    "運輸部門": "運輸部門",
    "農業": "農業部門",
    "農業部門": "農業部門",
    "服務業": "服務業部門",
    "商業": "服務業部門",
    "服務部門": "服務業部門",
    "服務業部門": "服務業部門",
    "住宅": "住宅部門",
    "住家": "住宅部門",
    "家庭": "住宅部門",
    "民生": "住宅部門",
    "住宅部門": "住宅部門",
}

# 能源同義詞：口語 / 簡稱 -> 正式名稱
ENERGY_SYNONYMS = {
    "天然氣": "天然氣",
    "瓦斯": "天然氣",
    "液化天然氣": "天然氣",
    "lng": "天然氣",
    "LNG": "天然氣",

    "電力": "電力",
    "用電": "電力",
    "電": "電力",

    "煤": "煤及煤產品",
    "煤炭": "煤及煤產品",
    "煤及煤產品": "煤及煤產品",

    "石油": "原油及石油產品",
    "油": "原油及石油產品",
    "原油": "原油及石油產品",
    "原油及石油產品": "原油及石油產品",

    "太陽能": "太陽光電",
    "光電": "太陽光電",
    "太陽光電": "太陽光電",

    "風電": "風力",
    "風能": "風力",
    "風力": "風力",

    "熱": "熱能",
    "熱能": "熱能",

    "核電": "核能",
    "核能": "核能",

    "水電": "水力",
    "水力": "水力",

    "生質能": "生質能",
    "廢棄物": "廢棄物",
}

def should_use_energy_rag(user_text: str):
    text = user_text.strip()

    # === 基本解析 ===
    year = extract_year(text)
    years = extract_years(text)
    department = normalize_department(text)
    energy_name = normalize_energy(text)

    intent = detect_intent(
        text,
        year=year,
        department=department,
        energy_name=energy_name,
    )

    # =====================================================
    # 🎯 1. 明確查數據（最重要）
    # =====================================================
    if year is not None or len(years) >= 2:
        if intent != "semantic_search":
            return True

    # =====================================================
    # 🎯 2. 部門 + 能源（一定是查表）
    # =====================================================
    if department and energy_name:
        return True

    # =====================================================
    # 🎯 3. 部門 → 問能源
    # =====================================================
    if department and any(k in text for k in [
        "主要使用", "使用哪些能源", "用哪些能源",
        "主要用什麼", "最多", "前幾", "排名"
    ]):
        return True

    # =====================================================
    # 🎯 4. 能源 → 問部門
    # =====================================================
    if energy_name and any(k in text for k in [
        "哪些部門", "誰在用", "用在哪", "使用情況"
    ]):
        return True

    # =====================================================
    # 🎯 5. 有「能源語意」但沒完全命中
    # =====================================================
    energy_keywords = [
        "能源", "用電", "耗能", "電力",
        "天然氣", "石油", "煤", "再生能源",
        "使用量", "比例", "結構"
    ]

    if any(k in text for k in energy_keywords):
        return True

    # =====================================================
    # ❌ 6. 明顯聊天（避免誤觸 RAG）
    # =====================================================
    casual_keywords = [
        "你好", "嗨", "hello", "hi",
        "你是誰", "可以做什麼",
        "謝謝", "thanks"
    ]

    if any(k.lower() in text.lower() for k in casual_keywords):
        return False

    # =====================================================
    # 🎯 fallback（保守策略）
    # =====================================================
    return False

# =====================================================
# 判斷是不是能源問題
# =====================================================
def is_energy_question(text: str) -> bool:
    keywords = [
        "部門",
        "使用哪些能源",
        "主要使用",
        "哪些部門使用",
        "用在哪些部門",
        "有沒有使用",
        "有沒有用",
        "最多能源",
        "能源資料",
        "比例",
        "排名",
    ]
    return any(k in text for k in keywords)

def extract_top_n(text: str):
    text = text.lower()

    # 🎯 最多 / 最大 → 1筆
    if "最多" in text or "最大" in text:
        return 1

    # 🎯 前幾（中文）
    m = re.search(r"前(\d+)", text)
    if m:
        return int(m.group(1))

    # 🎯 top3 / top 5
    m = re.search(r"top\s*(\d+)", text)
    if m:
        return int(m.group(1))

    # 🎯 前幾（中文數字）
    if "前五" in text:
        return 5
    if "前三" in text:
        return 3
    if "前十" in text:
        return 10

    return 5  # 預設

# =====================================================
# 年份抽取
# =====================================================
def extract_year(text: str):
    text = text.strip()

    # 民國85年 / 113年
    m = re.search(r"(?:民國)?(\d{2,3})年", text)
    if m:
        year = int(m.group(1))
        if 1 <= year <= 300:
            return year

    # 西元年 1996年 -> 民國85年
    m = re.search(r"(19\d{2}|20\d{2})年", text)
    if m:
        ad_year = int(m.group(1))
        roc_year = ad_year - 1911
        if 1 <= roc_year <= 300:
            return roc_year

    # 單獨數字
    m = re.search(r"\b(8[0-9]|9[0-9]|10[0-9]|11[0-9])\b", text)
    if m:
        return int(m.group(1))

    return None


# =====================================================
# 正規化部門
# =====================================================
def normalize_department(text: str):
    # 先找正式名稱
    for dept in DEPARTMENTS:
        if dept in text:
            return dept

    # 再找同義詞
    for alias, canonical in sorted(DEPARTMENT_SYNONYMS.items(), key=lambda x: len(x[0]), reverse=True):
        if alias in text:
            return canonical

    return None


# =====================================================
# 正規化能源
# =====================================================
def normalize_energy(text: str):
    # 先找正式名稱
    for name in ENERGY_NAMES:
        if name and name in text:
            return name

    # 再找同義詞
    for alias, canonical in sorted(ENERGY_SYNONYMS.items(), key=lambda x: len(x[0]), reverse=True):
        if alias in text:
            # 如果 canonical 本身在正式能源名稱中，直接回傳
            if canonical in ENERGY_NAMES:
                return canonical

            # 否則試著找包含 canonical 的正式名稱
            for name in ENERGY_NAMES:
                if canonical and canonical in name:
                    return name

    return None
def extract_years(text: str):
    years = re.findall(r"(?:民國)?(\d{2,3})年", text)
    years = [int(y) for y in years]

    # 補：支援單獨數字（85 113）
    years2 = re.findall(r"\b(8[0-9]|9[0-9]|10[0-9]|11[0-9])\b", text)
    years += [int(y) for y in years2]

    return sorted(list(set(years)))

# =====================================================
# 問題意圖判斷
# =====================================================
def detect_intent(user_text: str, year=None, department=None, energy_name=None):
    text = user_text.strip()
    years = extract_years(text)
    departments = extract_departments(text)
    # 0. 多年份整體最多能源
    if (
        len(years) >= 2
        and ("最多" in text or "最大" in text)
        and ("能源" in text or "資源" in text)
        and ("分別" in text or "各自" in text or "各年" in text or "跟" in text or "和" in text)
        ):
        return "top_energy_overall"
    
    # 0. 多年份整體能源比較
    if (
        len(years) >= 2
        and ("比較" in text or "差異" in text or "差別" in text)
        and ("能源" in text or "資源" in text)
        and department is None
        ):
        return "compare_years_overall"
    
    # 1. 同部門跨年份比較
    if len(years) >= 2 and department and ("差" in text or "比較" in text or "差異" in text):
        return "compare_department_across_years"

    # 2. 同年份跨部門比較
    if len(departments) >= 2 and ("差" in text or "比較" in text or "差異" in text):
        return "compare_departments_same_year"

    # 3. 問整體最多能源
    if (
            ("最多" in text or "最大" in text or "排名" in text 
            or "前" in text   # ⭐關鍵！
            or "top" in text.lower())
            and ("能源" in text or "使用量" in text or energy_name is not None or "資源" in text)
            and department is None
        ):
        return "top_energy_overall"

    # 4. 問某部門主要用哪些能源
    if department and (
        "主要使用" in text
        or "使用哪些能源" in text
        or "用哪些能源" in text
        or "主要用什麼能源" in text
        or "都用什麼" in text
        or ("部門" in text and "能源" in text and "哪些" in text)
        or ("部門" in text and "前五" in text)
        or ("部門" in text and "最多" in text)
    ):
        return "top_energy_by_department"

    # 5. 問某能源用在哪些部門
    if energy_name and (
        "哪些部門使用" in text
        or "用在哪些部門" in text
        or "有哪些部門" in text
        or "哪些部門有用" in text
        or "誰在用" in text
        or "哪些部門有用到" in text
        or "哪些人用" in text
        or ("部門" in text and ("使用" in text or "有用" in text or "有用到" in text))
    ):
        return "top_department_by_energy"

    # 6. 問某部門有沒有使用某能源
    if department and energy_name and (
        "有沒有使用" in text
        or "有沒有用" in text
        or "有用嗎" in text
        or "有用到嗎" in text
        or "是否使用" in text
        or "有沒有" in text
        or ("是否" in text and "使用" in text)
    ):
        return "check_usage"

    # 7. 如果有能源且問部門，但沒明確句型，也視為能源→部門
    if energy_name and department is None and "部門" in text:
        return "top_department_by_energy"

    # 8. 如果有部門但沒明確句型，也常常是部門→能源
    if department and energy_name is None and ("能源" in text or "資源" in text):
        return "top_energy_by_department"
    
    #  fallback（避免掉到 semantic_search）
    if year and ("能源" in text or "使用量" in text or "前" in text):
        return "top_energy_overall"
    
    return "semantic_search"




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
# ratio 資料篩選
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
# 某年某部門主要能源
# =====================================================
def answer_top_energy_by_department(department: str, year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year, department=department)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}{department}」的能源資料。",
            "sources": [],
            "results": [],
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    year_text = f"{year}年" if year else "各年度"
    answer = (
        f"根據{year_text}已生成的能源資料，{department}主要使用的能源包括："
        + "、".join([f"{r['supply_name_zh']}（{round(r['value'],2)}%）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": top,
    }


# =====================================================
# 某年某能源主要用在哪些部門
# =====================================================
def answer_top_department_by_energy(energy_name: str, year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year, energy_name=energy_name)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}{energy_name}」的資料。",
            "sources": [],
            "results": [],
        }

    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    top = ratio_records[:top_n]

    answer_parts = []
    seen = set()
    for r in top:
        dept = r["demand_name"]
        if dept not in seen:
            seen.add(dept)
            answer_parts.append(dept)

    year_text = f"{year}年" if year else "各年度"
    answer = (
        f"根據{year_text}已生成的能源資料，{energy_name}主要使用於："
        + "、".join(answer_parts)
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": top,
    }


# =====================================================
# 某年某部門有沒有使用某能源
# =====================================================
def answer_check_usage(department: str, energy_name: str, year=None):
    matches = get_ratio_records(year=year, department=department, energy_name=energy_name)

    year_text = f"{year}年" if year else "指定年度"

    if not matches:
        return {
            "success": True,
            "answer": f"根據{year_text}已生成的能源資料，{department}沒有使用{energy_name}。",
            "sources": ["energy_rag_all_years_meta.json"],
            "results": [],
        }

    matches = sorted(matches, key=lambda x: x.get("value", 0), reverse=True)
    best = matches[0]

    return {
        "success": True,
        "answer": f"根據{year_text}已生成的能源資料，{department}有使用{energy_name}（（{round(best['value'],2)}%）。",
        "sources": ["energy_rag_all_years_meta.json"],
        "results": [best],
    }


# =====================================================
# 某年整體最多能源
# =====================================================
def answer_top_energy_overall(year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year)

    if not ratio_records:
        year_text = f"{year}年" if year else "指定年度"
        return {
            "success": False,
            "answer": f"找不到「{year_text}」的整體能源資料。",
            "sources": [],
            "results": [],
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
                "value": 0,
            }
        agg[name]["value"] += value

    sorted_items = sorted(agg.values(), key=lambda x: x["value"], reverse=True)
    top = sorted_items[:top_n]

    year_text = f"民國{year}年" if year else "指定年度"
    answer = (
        f"根據{year_text}已生成的能源資料，使用量最多的能源包括："
        + "、".join([f"{r['supply_name_zh']}（{round(r['value'],2)}%）" for r in top])
        + "。"
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json"],
        "results": top,
    }

# =====================================================
# 取得某年某部門 top energies
# =====================================================
def get_top_energies_for_department(department: str, year=None, top_n: int = 5):
    ratio_records = get_ratio_records(year=year, department=department)
    ratio_records = sorted(ratio_records, key=lambda x: x.get("value", 0), reverse=True)
    return ratio_records[:top_n]



def answer_multi_year_top_energy(years, top_n=5):
    results = []

    for y in years:
        r = answer_top_energy_overall(year=y, top_n=top_n)

        if r["success"]:
            results.append({
                "year": y,
                "top": r["results"]
            })

    if not results:
        return {
            "success": False,
            "answer": "找不到多年份資料",
            "results": [],
        }

    answer = "各年度使用量最多能源如下：\n\n"

    for r in results:
        names = "、".join(
            [f"{e['supply_name_zh']}（{round(e['value'],2)}%）" for e in r["top"]]
        )
        answer += f"{r['year']}年：{names}\n"

    return {
    "success": True,
    "answer": answer,
    "years": [r["year"] for r in results],  
    "results": results,
    "card_type": "multi_year",
    "sources": [
        "energy_rag_all_years_meta.json",
        "energy_rag_all_years.index"
    ]
}
def answer_compare_years_overall(years, top_n=5):
    years = sorted(years)

    results = []

    for y in years:
        r = answer_top_energy_overall(year=y, top_n=top_n)
        if r["success"]:
            results.append({
                "year": y,
                "top": r["results"]
            })

    if not results:
        return {
            "success": False,
            "answer": "找不到相關年份資料。",
            "results": [],
        }

    answer = "### 多年度能源比較\n\n"

    for r in results:
        answer += f"**{r['year']}年**\n"
        for e in r["top"]:
            answer += f"- {e['supply_name_zh']}（{round(e['value'],2)}%）\n"
        answer += "\n"

    return {
        "success": True,
        "answer": answer,
        "years": years,
        "results": results,
        "card_type": "comparison",
    }
# =====================================================
# 問題：同部門跨年份比較
# 例：85年和113年工業部門主要能源差異
# =====================================================
def answer_compare_department_across_years(department, years, top_n=5):
    years = sorted(years)

    results = []

    for y in years:
        top = get_top_energies_for_department(department, year=y, top_n=top_n)
        results.append({
            "year": y,
            "top": top
        })

    answer = f"### {department} 多年度能源比較\n\n"

    for r in results:
        names = "、".join([
            f"{e['supply_name_zh']}（{round(e['value'],2)}%）"
            for e in r["top"]
        ])
        answer += f"{r['year']}年：{names}\n\n"

    return {
        "success": True,
        "answer": answer,
        "years": years,
        "results": results,
        "card_type": "comparison",
    }


# =====================================================
# 問題：同年份跨部門比較
# 例：113年工業部門和住宅部門主要能源差異
# =====================================================
def answer_compare_departments_same_year(departments, year=None, top_n=5):
    results = []

    for dept in departments:
        top = get_top_energies_for_department(dept, year=year, top_n=top_n)
        results.append({
            "department": dept,
            "top": top
        })

    year_text = f"{year}年" if year else "指定年度"
    answer = f"### {year_text} 多部門能源比較\n\n"

    for r in results:
        names = "、".join([
            f"{e['supply_name_zh']}（{round(e['value'],2)}%）"
            for e in r["top"]
        ])
        answer += f"{r['department']}：{names}\n\n"

    return {
        "success": True,
        "answer": answer,
        "results": results,
        "card_type": "comparison",
    }


# =====================================================
# 抽兩個部門
# =====================================================
def extract_departments(text: str):
    found = []
    for dept in DEPARTMENTS:
        if dept in text and dept not in found:
            found.append(dept)

    for alias, canonical in sorted(DEPARTMENT_SYNONYMS.items(), key=lambda x: len(x[0]), reverse=True):
        if alias in text and canonical not in found:
            found.append(canonical)

    return found

# =====================================================
# fallback：語意檢索
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
            "results": [],
        }

    year_text = f"{year}年" if year else "相關年度"
    answer = f"根據{year_text}已生成的能源資料，找到以下相關內容：\n" + "\n".join(
        [f"- {r['text']}" for r in final_results]
    )

    return {
        "success": True,
        "answer": answer,
        "sources": ["energy_rag_all_years_meta.json", "energy_rag_all_years.index"],
        "results": final_results,
    }


# =====================================================
# 主路由
# =====================================================
def answer_energy_question(user_text: str):
    year = extract_year(user_text)
    years = extract_years(user_text)
    department = normalize_department(user_text)
    departments = extract_departments(user_text)
    energy_name = normalize_energy(user_text)
    intent = detect_intent(user_text, year=year, department=department, energy_name=energy_name)
    top_n = extract_top_n(user_text)
    
    if intent == "compare_years_overall":
        return answer_compare_years_overall(years, top_n=top_n)

    if intent == "compare_department_across_years":
        target_department = department or (departments[0] if departments else None)
        if target_department and len(years) >= 2:
            return answer_compare_department_across_years(
                target_department,
                years,
                top_n=top_n,
            )

    if intent == "compare_departments_same_year":
        if len(departments) >= 2:
            return answer_compare_departments_same_year(
                departments,
                year=year,
                top_n=top_n,
            )

    if intent == "top_energy_overall":

        # ⭐ 多年份
        if len(years) >= 2:
            return answer_multi_year_top_energy(years, top_n=top_n)

        # ⭐ 單年份
        return answer_top_energy_overall(year=year, top_n=top_n)

    if intent == "top_energy_by_department":
        return answer_top_energy_by_department(department, year=year, top_n=top_n)

    if intent == "top_department_by_energy":
        return answer_top_department_by_energy(energy_name, year=year, top_n=top_n)

    if intent == "check_usage":
        return answer_check_usage(department, energy_name, year=year)

    return answer_by_semantic_search(user_text, year=year)