from typing import Tuple
import os, tempfile
from openai import OpenAI
from moviepy.editor import VideoFileClip, AudioFileClip
import whisper
import re

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o")

_model = None


def _get_whisper():
    global _model
    if _model is None:
        _model = whisper.load_model("small")
    return _model


def _extract_audio_to_wav(in_path: str, out_path: str):
    ext = os.path.splitext(in_path)[1].lower()
    if ext in [".mp4", ".mov", ".mkv", ".avi", ".m4v"]:
        clip = VideoFileClip(in_path)
        if clip.audio is None:
            clip.close()
            raise ValueError("No audio track found.")
        clip.audio.write_audiofile(out_path, logger=None)
        clip.close()
    else:
        clip = AudioFileClip(in_path)
        clip.write_audiofile(out_path, logger=None)
        clip.close()


# 🔎 根據問題抓相關時間段
def _search_relevant_segments(question, segments, top_k=15):
    keywords = re.findall(r"\w+", question.lower())
    scored = []

    for s in segments:
        text = s["text"].lower()
        score = sum(1 for k in keywords if k in text)
        if score > 0:
            scored.append((score, s))

    scored.sort(reverse=True, key=lambda x: x[0])
    return [s for _, s in scored[:top_k]]


def qa_over_av(question: str, file_storage) -> Tuple[str, list]:

    with tempfile.TemporaryDirectory() as td:
        in_path = os.path.join(td, file_storage.filename)
        file_storage.save(in_path)

        wav_path = os.path.join(td, "audio.wav")

        try:
            _extract_audio_to_wav(in_path, wav_path)
        except Exception:
            return "No audio detected in this media file.", ["speech"]

        model = _get_whisper()

        result = model.transcribe(wav_path, fp16=False, temperature=0.0, language=None)

        transcript = result.get("text", "").strip()
        segments = result.get("segments", [])

    if not transcript:
        return "No speech detected in this media.", ["speech"]

    # ----------------------------
    # 1️⃣ 問題導向時間段搜尋
    # ----------------------------
    relevant_segments = _search_relevant_segments(question, segments)

    if not relevant_segments:
        relevant_segments = segments[:20]

    context = "\n".join(
        f"[{round(s['start']/60,2)} min] {s['text']}" for s in relevant_segments
    )

    # ----------------------------
    # 2️⃣ 自動生成影片摘要
    # ----------------------------
    summary_prompt = f"""
Summarize the following transcript clearly in bullet points:

{transcript[:6000]}
"""

    summary_resp = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[{"role": "user", "content": summary_prompt}],
        temperature=0.2,
    )

    summary_text = summary_resp.choices[0].message.content

    # ----------------------------
    # 3️⃣ 問題精準回答
    # ----------------------------
    qa_prompt = f"""
You are analyzing a video transcript.

STRICT RULES:
- Answer strictly based on the provided transcript segments.
- Quote relevant sentences.
- Mention the approximate minute when it occurs.
- If not mentioned, say clearly it is not present.

Question:
{question}

Relevant Transcript Segments:
{context}
"""

    qa_resp = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[{"role": "user", "content": qa_prompt}],
        temperature=0.2,
    )

    answer_text = qa_resp.choices[0].message.content

    # ----------------------------
    # 最終回傳（整合）
    # ----------------------------
    final_answer = f"""
📌 **影片摘要：**
{summary_text}

━━━━━━━━━━━━━━━━━━

🎯 **問題回答：**
{answer_text}
"""

    return final_answer, ["speech transcript + timeline search"]
