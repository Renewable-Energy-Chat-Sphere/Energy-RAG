import json
import os
import pandas as pd
from prophet import Prophet

print("🔥 predict_cost_pressure.py 啟動")

# =========================
# 🔥 路徑設定
# =========================

BASE_DIR = os.path.dirname(__file__)

DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../src/data"))

# =========================
# 🔥 讀取歷史成本壓力
# =========================

historical_path = os.path.join(DATA_DIR, "historical_cost_pressure.json")

print("📂 讀取：", historical_path)

with open(historical_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"✅ 載入 {len(data)} 筆歷史資料")

# =========================
# 🔥 轉 Prophet 格式
# Prophet 必須使用 ds / y
# =========================

rows = []

for item in data:

    roc_year = item["year"]

    ad_year = roc_year + 1911

    rows.append({"ds": f"{ad_year}-01-01", "y": item["costPressure"]})

df = pd.DataFrame(rows)

print("\n📊 Prophet DataFrame")
print(df.head())

# =========================
# 🔥 建立 Prophet
# =========================

print("\n🔥 Prophet 初始化中...")

model = Prophet(
    yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False
)

# =========================
# 🔥 訓練模型
# =========================

print("🔥 Prophet 訓練中...")

model.fit(df)

print("✅ Prophet 訓練完成")

# =========================
# 🔥 建立未來時間
# =========================

future = model.make_future_dataframe(periods=5, freq="Y")

print("\n📈 未來年份")
print(future.tail())

# =========================
# 🔥 預測
# =========================

print("\n🔮 開始預測...")

forecast = model.predict(future)

print("✅ 預測完成")

# =========================
# 🔥 只保留需要欄位
# =========================

result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]

# =========================
# 🔥 整理輸出
# =========================

final_result = []

for _, row in result.iterrows():

    year = pd.to_datetime(row["ds"]).year

    final_result.append(
        {
            "year": int(year),
            "predictedCostPressure": round(float(row["yhat"]), 2),
            "lower": round(float(row["yhat_lower"]), 2),
            "upper": round(float(row["yhat_upper"]), 2),
        }
    )

# =========================
# 🔥 輸出 JSON
# =========================

output_path = os.path.join(DATA_DIR, "predicted_cost_pressure.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(final_result, f, ensure_ascii=False, indent=2)

print("\n🔥 predicted_cost_pressure.json 建立完成")

print("\n📂 輸出位置：")
print(output_path)
