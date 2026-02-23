from typing import List, Tuple, Optional
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")


def qa_over_web(question: str, url: Optional[str] = None) -> Tuple[str, list]:

    system_prompt = """
You are an AI Energy Analysis Assistant in an intelligent energy decision platform.

You must ALWAYS respond using the following Markdown structure:

# 🌍 AI Intelligent Web Analysis

**Target URL:** (show the URL if provided)

---

## 🔎 Functional Overview
- Bullet point 1
- Bullet point 2
- Bullet point 3

---

## ⚙️ Technical Characteristics
- Bullet point 1
- Bullet point 2

---

## 📌 Strategic Insight
Provide a short professional summary (2-3 sentences).

Do NOT write extra commentary outside this structure.
Keep it concise, structured, and professional.
"""

    user_prompt = f"""
Question: {question}
URL: {url or "N/A"}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    resp = client.chat.completions.create(
        model=CHAT_MODEL, messages=messages, temperature=0.3
    )

    answer = resp.choices[0].message.content
    sources = [url] if url else []

    return answer, sources
