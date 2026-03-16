from typing import Tuple, Optional
import os
import requests
from bs4 import BeautifulSoup
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")


# ------------------------------------------------
# 抓取網站內容
# ------------------------------------------------
def fetch_web_content(url: str) -> str:

    try:

        headers = {"User-Agent": "Mozilla/5.0"}

        r = requests.get(url, headers=headers, timeout=10)

        soup = BeautifulSoup(r.text, "html.parser")

        # 移除 script/style
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()

        text = soup.get_text(separator="\n")

        # 清理空白
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        clean_text = "\n".join(lines)

        # 避免 token 過多
        return clean_text[:15000]

    except Exception as e:

        return f"(Failed to fetch website content: {e})"


# ------------------------------------------------
# Web QA
# ------------------------------------------------
def qa_over_web(question: str, url: Optional[str] = None) -> Tuple[str, list]:

    web_text = ""

    if url:
        web_text = fetch_web_content(url)

    system_prompt = """
You are an AI Energy Analysis Assistant in an intelligent energy decision platform.

Language Rules:
- Always respond in the SAME language as the user's question.
- All section titles must also be translated into that language.

Structure Rules:
You must ALWAYS follow this Markdown structure.

# 🌍 AI Website Analysis
**Target URL:** (show the URL if provided)

---

## Overview
- Bullet point 1
- Bullet point 2
- Bullet point 3

---

## Key Features
- Bullet point 1
- Bullet point 2

---

## Strategic Insight
Provide a short professional summary (2-3 sentences).

Rules:
- Translate headings into the user's language
- Keep Markdown structure
- Be concise and professional
"""

    user_prompt = f"""
User Question:
{question}

Target URL:
{url or "N/A"}

Website Content:
{web_text}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    resp = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.3,
    )

    answer = resp.choices[0].message.content.strip()

    sources = [url] if url else []

    return answer, sources
