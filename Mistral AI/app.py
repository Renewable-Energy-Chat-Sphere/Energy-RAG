# app.py — 智能訂位助理（FastAPI + Mistral + Google Places + Twilio）
import os, json, re, datetime, difflib
from pathlib import Path

import httpx
from fastapi import FastAPI, Body
from pydantic import BaseModel
from dotenv import load_dotenv
from mistralai import Mistral
from twilio.rest import Client as TwilioClient
from fastapi.responses import (
    Response, JSONResponse, FileResponse, HTMLResponse
)

# --- 時區：Windows 可能沒有 IANA tz，做安全備援 ---
try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    try:
        TZ = ZoneInfo("Asia/Taipei")
    except ZoneInfoNotFoundError:
        TZ = datetime.timezone(datetime.timedelta(hours=8))  # +08:00 備援
except Exception:
    TZ = datetime.timezone(datetime.timedelta(hours=8))

# --- 載入環境變數 ---
load_dotenv()
app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent

# ---------- Env / Globals ----------
TODAY = datetime.datetime.now(TZ).strftime("%Y-%m-%d")
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"   # 開發模式：不打外部 API，回傳假資料

# --- Keys / Clients ---
MISTRAL = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
TW = TwilioClient(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
TW_FROM = os.getenv("TWILIO_FROM_NUMBER")
CALLBACK = os.getenv("CALLBACK_CONFIRM_NUMBER")  # 若要先撥給你確認再轉接，可設定
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "台北")

# 常見線上訂位平台關鍵字（僅用來判斷是否提供外部連結）
BOOKING_HOST_KEYWORDS = (
    "inline.app", "inline.com", "opentable", "reserve.google.com",
    "eztable", "tablecheck", "funnow", "accupass", "booknow"
)

SYSTEM = (
    f"今天是 {TODAY}（Asia/Taipei）。"
    "你是餐廳訂位規劃助手。請把使用者的口語需求轉成 JSON："
    '{"cuisine":"菜系或關鍵字","datetime":"YYYY-MM-DD HH:MM","party_size":2,'
    '"location":"城市或行政區","restaurant":"指定餐廳(可選)","notes":"可選"}。'
    "若使用者提供相對日期（例如今天、明天、這禮拜五），請換算成實際日期 YYYY-MM-DD HH:MM。"
    "若沒給時間，就預設今天 19:00；若沒地點，用台北；若沒人數，預設 2。"
)

# -------------------- 型別 --------------------
class Ask(BaseModel):
    text: str

# -------------------- 健康檢查 & UI --------------------
@app.get("/")
def health():
    return {"ok": True, "dry_run": DRY_RUN}

@app.get("/ui", response_class=HTMLResponse)
def ui():
    """回傳前端頁面（請把 index.html 放在和 app.py 同一層）"""
    return FileResponse(str(BASE_DIR / "index.html"))

@app.post("/debug/echo")
def echo(body: dict = Body(...)):
    return {"received": body}

# -------------------- LLM 解析 --------------------
def parse_intent(text: str) -> dict:
    resp = MISTRAL.chat.complete(
        model="mistral-large-latest",  # 或 "open-mistral-7b"
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": text},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    content = resp.choices[0].message.content
    try:
        plan = json.loads(content)
    except Exception:
        plan = {"cuisine": "", "datetime": "", "party_size": 2,
                "location": DEFAULT_CITY, "restaurant": "", "notes": content}
    # 填補缺省
    if not plan.get("location"): plan["location"] = DEFAULT_CITY
    if not plan.get("party_size"): plan["party_size"] = 2
    if not plan.get("datetime"):
        plan["datetime"] = datetime.datetime.now(TZ).strftime("%Y-%m-%d 19:00")
    if "restaurant" not in plan: plan["restaurant"] = ""
    return plan

# -------------------- Google Places --------------------
async def search_places(cuisine: str, location: str, limit=5):
    # 開發模式 or 沒有 key：回假資料，保證不會空陣列
    if DRY_RUN or not PLACES_KEY:
        return [
            {"name":"範例拉麵一號","address":"台北市XX路1號","rating":4.5,"user_ratings_total":200,
             "place_id":"demo1","phone":"+886212345678","website":"https://example.com","maps_url":"https://maps.google.com/"},
            {"name":"範例拉麵二號","address":"台北市YY路2號","rating":4.2,"user_ratings_total":150,
             "place_id":"demo2","phone":"+886298765432","website":"","maps_url":"https://maps.google.com/"},
        ][:limit]

    q = f"{location} {cuisine} 餐廳 訂位".strip()
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": q, "key": PLACES_KEY, "language": "zh-TW", "region": "tw"}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params=params)
        data = r.json()

    status = data.get("status")
    if status != "OK":
        # 讓前端能看到清楚錯誤訊息（例如 REQUEST_DENIED / OVER_QUERY_LIMIT）
        raise RuntimeError(f"Places error: {status} {data.get('error_message')}")

    results = []
    for it in data.get("results", [])[:limit]:
        results.append({
            "name": it.get("name"),
            "address": it.get("formatted_address"),
            "rating": it.get("rating"),
            "user_ratings_total": it.get("user_ratings_total"),
            "place_id": it.get("place_id"),
        })

    # 詳細資料（電話/官網）
    det_url = "https://maps.googleapis.com/maps/api/place/details/json"
    out = []
    async with httpx.AsyncClient(timeout=15) as client:
        for rsl in results:
            params = {
                "place_id": rsl["place_id"],
                "key": PLACES_KEY,
                "language": "zh-TW",
                "fields": "name,formatted_address,formatted_phone_number,website,url"
            }
            d = (await client.get(det_url, params=params)).json().get("result", {})
            rsl["phone"] = d.get("formatted_phone_number")
            rsl["website"] = d.get("website")
            rsl["maps_url"] = d.get("url")
            out.append(rsl)
    return out

# -------------------- 工具：挑店 / 電話 / 訂位連結 --------------------
def pick_restaurant(plan: dict, candidates: list):
    """若指定餐廳名，做模糊比對；否則選評分/評論數較高者。"""
    if not candidates:
        return None
    target = (plan.get("restaurant") or "").strip().lower()
    if target:
        ranked = sorted(
            candidates,
            key=lambda r: difflib.SequenceMatcher(None, target, (r.get("name") or "").lower()).ratio(),
            reverse=True
        )
        return ranked[0]
    # 沒有指定就選評分較高且有較多評論的
    return sorted(
        candidates,
        key=lambda r: ((r.get("rating") or 0), (r.get("user_ratings_total") or 0)),
        reverse=True
    )[0]

def normalize_phone_for_twilio(phone: str | None) -> str | None:
    """把 02-xxxx、(02)xxxx、09xx-xxx-xxx 轉為 E.164；預設台灣 +886。"""
    if not phone: return None
    p = phone.strip()
    if p.startswith("+"):  # 已經是 E.164
        return p
    digits = re.sub(r"\D", "", p)
    if not digits:
        return None
    if digits.startswith("886"):
        return "+" + digits
    if digits.startswith("0"):
        return "+886" + digits[1:]
    return "+" + digits  # 最保守

def infer_reservation_link(rest: dict) -> str | None:
    """若官網或地圖連結含已知平台關鍵字，就回傳連結（需要人工點擊）。"""
    url = (rest.get("website") or rest.get("maps_url") or "").strip()
    low = url.lower()
    return url if any(k in low for k in BOOKING_HOST_KEYWORDS) else None

# -------------------- 打電話 / 轉接（DRY_RUN 下不外呼） --------------------
def make_call_script(plan: dict, restaurant: dict) -> str:
    dt = plan["datetime"]
    size = plan["party_size"]
    notes = plan.get("notes") or ""
    return (
        f"您好，想訂位。時間 {dt}，{size} 位。"
        f"{(' 備註：' + notes) if notes else ''}。"
        "若可訂位，麻煩回覆確認，謝謝。"
    )

def call_restaurant(restaurant_phone: str, tts_text: str) -> str:
    if DRY_RUN or not TW_FROM:
        return "mock-call-sid"
    call = TW.calls.create(
        to=restaurant_phone,
        from_=TW_FROM,
        twiml=f"<Response><Say language='zh-TW'>{tts_text}</Say></Response>"
    )
    return call.sid

def call_user_then_bridge(user_number: str, restaurant_phone: str) -> str:
    if DRY_RUN or not TW_FROM:
        return "mock-bridge-sid"
    twiml = f"""
<Response>
  <Say language="zh-TW">將為您致電餐廳。待會請說出欲訂位資訊，或按 1 由系統先代為唸出。</Say>
  <Gather numDigits="1" action="/bridge?to={restaurant_phone}" timeout="5">
    <Say language="zh-TW">按 1 由系統代唸。其他鍵直接轉接餐廳。</Say>
  </Gather>
  <Dial>{restaurant_phone}</Dial>
</Response>
"""
    call = TW.calls.create(to=user_number, from_=TW_FROM, twiml=twiml)
    return call.sid

# -------------------- /plan 與 /confirm --------------------
@app.post("/plan")
async def plan_endpoint(q: Ask):
    try:
        plan = parse_intent(q.text)
        candidates = await search_places(plan["cuisine"] or "餐廳", plan["location"])
        return {"plan": plan, "candidates": candidates}
    except Exception as e:
        return JSONResponse(status_code=502, content={"error": str(e)})

@app.post("/confirm")
async def confirm_endpoint(payload: dict = Body(...)):
    plan = payload["plan"]
    rest = payload["restaurant"]
    mode = payload.get("mode", "call")

    if mode == "link_only":
        link = rest.get("website") or rest.get("maps_url")
        return {"status": "link", "url": link}

    tts = make_call_script(plan, rest)
    phone = normalize_phone_for_twilio(rest.get("phone"))
    if not phone:
        link = rest.get("website") or rest.get("maps_url")
        return {"status": "no_phone_link", "url": link}

    if mode == "call_and_bridge" and CALLBACK:
        sid = call_user_then_bridge(CALLBACK, phone)
        return {"status": "bridging", "sid": sid}

    sid = call_restaurant(phone, tts)
    return {"status": "requested_via_call", "sid": sid}

# -------------------- 一句話直達「自動訂位」 --------------------
@app.post("/book")
async def book_endpoint(q: Ask):
    """
    輸入一句話（含禮拜幾、幾點、幾位、想吃什麼、可選餐廳名），
    系統會：解析 -> 搜尋 -> 選店 -> 嘗試自動「電話代訂」，
    若無電話但偵測到線上訂位平台，回傳連結；
    兩者都沒有則回報不支援。
    """
    try:
        plan = parse_intent(q.text)
        candidates = await search_places(plan["cuisine"] or "餐廳", plan["location"])
        if not candidates:
            return {"status": "no_candidates", "message": "找不到符合條件的餐廳", "plan": plan, "candidates": []}

        chosen = pick_restaurant(plan, candidates)
        if not chosen:
            return {"status": "no_selection", "message": "無法選定餐廳", "plan": plan, "candidates": candidates}

        # 優先嘗試電話代訂
        phone = normalize_phone_for_twilio(chosen.get("phone"))
        if phone:
            tts = make_call_script(plan, chosen)
            sid = call_restaurant(phone, tts)
            return {
                "status": "requested_via_call",
                "message": "已代為致電餐廳並唸出訂位資訊（是否成功仍以餐廳回覆為準）",
                "sid": sid,
                "plan": plan,
                "restaurant": chosen
            }

        # 否則給線上訂位連結（若可判斷）
        link = infer_reservation_link(chosen)
        if link:
            return {
                "status": "needs_manual_click",
                "message": "此餐廳提供線上訂位連結，請點擊完成最終確認",
                "url": link,
                "plan": plan,
                "restaurant": chosen
            }

        # 皆無：回報不支援
        return {
            "status": "unsupported",
            "message": "此餐廳沒有電話或可偵測的線上訂位連結，無法自動訂位",
            "plan": plan,
            "restaurant": chosen
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# 轉接（若要先撥給你確認）
@app.post("/bridge")
def bridge(to: str = "", digits: str = ""):
    if digits == "1":
        twiml = f"<Response><Say language='zh-TW'>即將轉接餐廳。</Say><Dial>{to}</Dial></Response>"
    else:
        twiml = f"<Response><Dial>{to}</Dial></Response>"
    return Response(content=twiml, media_type="application/xml")
