import os, json
from dotenv import load_dotenv
from openai import OpenAI
from duckduckgo_search import ddgs

# 讀取 .env 裡的 API Key
load_dotenv()
client = OpenAI()

# --- 工具：搜尋 ---
def tool_search(query: str, max_results: int = 3):
    out = []
    with ddgs() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            title = r.get("title", "")
            href  = r.get("href", "")
            out.append(f"- {title}\n  {href}")
    return "\n".join(out) or "沒有找到資料"

TOOLS = {"search": tool_search}

SYSTEM_PROMPT = """
你是一個中文 AI 助理，回答必須是中文。
你可以使用以下工具：
- search：用於查詢最新的網路資訊。

當問題需要查找網路最新資料、新聞或事實時，必須使用 search 工具，
格式如下：
{"tool":"search","args":{"query":"查詢關鍵字"}}

如果問題是一般知識或數學運算，才可直接回答：
{"final_answer":"你的中文回答"}
"""

def ask_llm(user_input: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
        ],
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()

def run_once(user_input: str) -> str:
    raw = ask_llm(user_input)
    try:
        js = json.loads(raw)
    except:
        return raw

    if "final_answer" in js:
        return js["final_answer"]

    tool = js.get("tool")
    if tool in TOOLS:
        result = TOOLS[tool](**js.get("args", {}))
        return ask_llm(f"工具結果如下：\n{result}\n請給出最終回答。")
    else:
        return "未知的工具或格式錯誤。"

if __name__ == "__main__":
    print("🧠 AI Agent 啟動（輸入 exit 離開）")
    while True:
        q = input("\n你：").strip()
        if q.lower() in {"exit", "quit"}:
            break
        print("Agent：", run_once(q))
