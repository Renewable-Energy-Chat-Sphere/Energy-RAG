@echo off
REM 切換到專案目錄
cd /d C:\xampp\htdocs\Web\Energy-RAG\integrated_rag_v1

REM 啟動虛擬環境
call .venv\Scripts\activate

REM 啟動 Flask 伺服器
python app.py

REM 停止伺服器後，不要直接關掉終端機，方便查看錯誤訊息
pause
