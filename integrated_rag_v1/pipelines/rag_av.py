from typing import Tuple
import os, tempfile
from openai import OpenAI
from moviepy.editor import VideoFileClip, AudioFileClip
import whisper

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

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
        clip.audio.write_audiofile(out_path, logger=None)
        clip.close()
    else:
        clip = AudioFileClip(in_path)
        clip.write_audiofile(out_path, logger=None)
        clip.close()

def qa_over_av(question: str, file_storage) -> Tuple[str, list]:
    with tempfile.TemporaryDirectory() as td:
        in_path = os.path.join(td, file_storage.filename)
        file_storage.save(in_path)
        wav_path = os.path.join(td, "audio.wav")
        _extract_audio_to_wav(in_path, wav_path)

        model = _get_whisper()
        result = model.transcribe(wav_path)
        transcript = result.get("text", "").strip()

    prompt = (
        "You are given a transcript from an audio/video. Answer the user's question using only this transcript. "
        "If missing info, say it's not present and suggest a follow-up.\n\n"
        f"Question: {question}\n---\nTranscript:\n{transcript[:8000]}"
    )
    resp = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[{"role":"user","content":prompt}],
    )
    answer = resp.choices[0].message.content
    sources = ["transcript"]
    return answer, sources
