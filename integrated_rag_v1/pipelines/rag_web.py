from typing import List, Tuple, Optional
import os
from openai import OpenAI
import openai

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

def qa_over_web(question: str, url: Optional[str] = None) -> Tuple[str, list]:
    system = (
        "You are a helpful RAG assistant. "
        "If a URL is provided, you may reference public information from it if available; "
        "otherwise answer from general knowledge and say you didn't browse."
    )
    content = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Question: {question}\nURL(optional): {url or 'N/A'}\n"
                                    "Return Markdown with short bullets and a final takeaway."}
    ]

    try:
        resp = client.chat.completions.create(model=CHAT_MODEL, messages=content)
        answer = resp.choices[0].message.content
        sources = [url] if url else []
    except openai.RateLimitError as e:
        answer = "⚠️ API 額度不足或流量限制，請稍後再試，或更換新的 API Key。"
        sources = []
    except Exception as e:
        answer = f"⚠️ 呼叫模型時發生錯誤：{str(e)}"
        sources = []

    return answer, sources

