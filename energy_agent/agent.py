import os, json, math, time,requests
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

# 相容新舊 DuckDuckGo 套件
try:
    from ddgs import DDGS          # 新版
except ImportError:
    from duckduckgo_search import DDGS  # 舊版（可能有 rename 警告）

load_dotenv()
client = OpenAI()

# --- 工具們 -------------------------------------------------
def tool_search(query: str, max_results: int = 5):
    try:
        ddg = DDGS()
        raw = ddg.text(query, max_results=max_results, safesearch="moderate")
        if raw is None:
            raw = []
        if not isinstance(raw, list):
            raw = list(raw)
    except TypeError:
        with DDGS() as ddg:
            raw = ddg.text(query, max_results=max_results, safesearch="moderate") or []
            if not isinstance(raw, list):
                raw = list(raw)
    except Exception as e:
        return f"(search error) {e}"

    lines = []
    for r in raw:
        title = (r.get("title") or "").strip()
        href  = (r.get("href") or r.get("url") or "").strip()
        body  = (r.get("body") or r.get("description") or "").strip()
        snippet = body[:180] + ("…" if len(body) > 180 else "")
        if title or href:
            lines.append(f"- {title}\n  {snippet}\n  {href}")
    return "\n".join(lines) if lines else "（沒有找到合適的結果）"

def tool_today(fmt: str = "%Y年%m月%d日 (%A) %H:%M"):
    # 直接用系統時間，避免模型亂猜
    # 星期會是英文；若要中文星期，可自行對照轉換
    return datetime.now().strftime(fmt)

def tool_calculator(expression: str):
    # 簡單安全計算器（允許數字與四則、括號、小數點）
    allowed = set("0123456789+-*/()., %")
    if any(ch not in allowed for ch in expression):
        return "不允許的字元"
    try:
        result = eval(expression, {"__builtins__": None, "math": math}, {})
        return str(result)
    except Exception as e:
        return f"calc error: {e}"
import os
FRONTEND_API = os.getenv("FRONTEND_API", "http://localhost:3001/api/select")

def tool_select_globe_item(item_name: str):
    try:
        res = requests.post(
            FRONTEND_API,
            json={"name": item_name},
            timeout=5
        )
        if res.status_code == 200:
            return f"✅ 已通知網站選擇「{item_name}」部門"
        else:
            return f"⚠️ 網站回應異常：{res.status_code}"
    except Exception as e:
        return f"❌ 發送請求失敗：{e}"


TOOLS = {
    "search": tool_search,
    "today": tool_today,
    "calculator": tool_calculator,
    "select_globe_item": tool_select_globe_item,
}

# --- 提示詞（更嚴格） ---------------------------------------
SYSTEM_PROMPT = """
你是一個中文 AI 助理，只能輸出 JSON（不要夾雜其他文字）。
可用工具：
- search：查詢最新新聞/網路資訊/不確定的事實
- today：取得目前日期時間（例如「今天幾月幾號」、「現在幾點」）
- calculator：數學計算（四則、括號、百分比）
- select_globe_item：讓網站上的 3D 地球選取指定的部門（參數 item_name）

規則：
1) 使用者要求選擇、切換、打開、查看某個部門或產業 → 必須用 select_globe_item。
2) 問時間 → 用 today。
3) 問新聞/時事 → 用 search。
4) 要計算 → 用 calculator。
5) 其餘一般知識、常識 → 直接回答。
6) 輸出格式固定：
   若需工具：
     {"tool":"<tool_name>","args":{...}}
   若不需工具：
     {"final_answer":"你的中文回答"}
"""

def ask_llm(user_input: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
        ],
        temperature=0.0,   # 降隨機性
    )
    return resp.choices[0].message.content.strip()

def parse_json_maybe(raw: str):
    # 嘗試抓第一個 {...} 區塊，增加容錯
    try:
        return json.loads(raw)
    except Exception:
        s, e = raw.find("{"), raw.rfind("}")
        if s >= 0 and e > s:
            try:
                return json.loads(raw[s:e+1])
            except Exception:
                return None
        return None

def run_once(user_input: str) -> str:
    raw = ask_llm(user_input)
    js = parse_json_maybe(raw)
    if not js:
        return f"(模型輸出格式錯誤)\n{raw}"

    if "final_answer" in js:
        return js["final_answer"]

    tool = js.get("tool")
    if tool not in TOOLS:
        return f"(未知工具){tool} | 可用工具：{list(TOOLS.keys())}"

    args = js.get("args", {})
    result = TOOLS[tool](**args)

    # 二次總結：把工具結果 + 原問題一起交給模型，請它整理成中文最終答
    summary_prompt = (
        f"使用者的問題：{user_input}\n\n"
        f"你使用的工具：{tool}\n"
        f"工具回應：\n{result}\n\n"
        "請用中文清楚回答，若資訊有不確定性請標示。"
    )
    return ask_llm(summary_prompt)

if __name__ == "__main__":
    print("🧠 AI Agent 啟動（輸入 exit 離開）")
    while True:
        q = input("\n你：").strip()
        if q.lower() in {"exit", "quit"}:
            break
        print("Agent：", run_once(q))
