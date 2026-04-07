@echo off
title Energy-RAG 啟動器

:: -------------------------------
:: 🔹 啟動後端
:: -------------------------------
echo 🚀 啟動後端...

start "Backend" cmd /k ^
"cd /d C:\xampp\htdocs\Web\Energy-RAG\frontend\backend ^
& .venv\Scripts\python app.py"

:: 等待後端
timeout /t 8 >nul

:: -------------------------------
:: 🔹 啟動前端
:: -------------------------------
echo 🌐 啟動前端...

start "Frontend" cmd /k ^
"cd /d C:\xampp\htdocs\Web\Energy-RAG\frontend ^
& npm run dev"

echo ==========================
echo ✅ 系統啟動完成
echo ==========================
pause