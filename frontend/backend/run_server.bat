@echo off

cd /d C:\inetpub\wwwroot\Ener-Sphere\Energy-RAG\frontend\backend

echo 🚀 啟動 Flask (Waitress)...

.venv\Scripts\waitress-serve --host=0.0.0.0 --port=8000 app:app

pause