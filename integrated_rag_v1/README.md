# Integrated RAG v1

## Quickstart
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
# 設定金鑰
copy .env.example .env   # Windows
# 或 cp .env.example .env
# 編輯 .env，把 OPENAI_API_KEY 換成你的

# 系統需先安裝 ffmpeg（用於 Whisper 與 moviepy）
# Windows: choco install ffmpeg  或  winget install Gyan.FFmpeg
# macOS: brew install ffmpeg

python app.py
# 打開 http://127.0.0.1:8000
```
