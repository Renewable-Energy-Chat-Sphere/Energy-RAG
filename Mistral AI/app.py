# app.py — 智能訂位助理（FastAPI + HuggingFace Inference API + OpenStreetMap + Twilio 可選）
import os, json, re, datetime, difflib, math
from pathlib import Path

import httpx
from fastapi import FastAPI, Body
from pydantic import BaseModel
from dotenv import load_dotenv
from twilio.rest import Client as TwilioClient
from fastapi.responses import Response, JSONResponse, FileResponse, HTMLResponse

# --- 時區備援（Windows 可能沒有 IANA tz） ---
try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    try:
        TZ = ZoneInfo("Asia/Taipei")
    except ZoneInfoNotFoundError:
        TZ = datetime.timezone(datetime.timedelta(hours=8))
except Exception:
    TZ = datetime.timezone(datetime.timedelta(hours=8))

# --- 讀環境 ---
load_dotenv()
app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
TODAY = datetime.datetime.now(TZ).strftime("%Y-%m-%d")
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

# --- 金鑰 / 客戶端 ---
HF_API_KEY = os.getenv("HF_API_KEY")  # 你已有
HF_MODEL = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
NOMINATIM_EMAIL = os.getenv(
    "NOMINATIM_EMAIL", "you@example.com"
)  # 請填你的 email 以符合 Nominatim 使用規範

TW = TwilioClient(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
TW_FROM = os.getenv("TWILIO_FROM_NUMBER")
CALLBACK = os.getenv("CALLBACK_CONFIRM_NUMBER")
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "台北")

BOOKING_HOST_KEYWORDS = (
    "inline.app",
    "inline.com",
    "opentable",
    "reserve.google.com",
    "eztable",
    "tablecheck",
    "funnow",
    "accupass",
    "booknow",
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
    lat: float | None = None
    lng: float | None = None
    radius_m: int | None = 3000


# -------------------- 健康檢查 & UI --------------------
@app.get("/")
def health():
    return {"ok": True, "dry_run": DRY_RUN, "hf_model": HF_MODEL}


@app.get("/env")
def env_check():
    return {
        "HF_API_KEY_set": bool(HF_API_KEY),
        "HF_MODEL": HF_MODEL,
        "NOMINATIM_EMAIL_set": bool(NOMINATIM_EMAIL),
        "TWILIO_FROM_NUMBER_set": bool(TW_FROM),
        "DEFAULT_CITY": DEFAULT_CITY,
        "DRY_RUN": DRY_RUN,
    }


@app.get("/ui", response_class=HTMLResponse)
def ui():
    return FileResponse(str(BASE_DIR / "index.html"))


@app.post("/debug/echo")
def echo(body: dict = Body(...)):
    return {"received": body}


# -------------------- LLM 解析：HuggingFace Inference API --------------------
# 使用 text-generation 端點，要求輸出 JSON
HF_URL = "https://api-inference.huggingface.co/models/"


def _hf_headers():
    if not HF_API_KEY:
        return {"Content-Type": "application/json"}
    return {"Content-Type": "application/json", "Authorization": f"Bearer {HF_API_KEY}"}


def _to_json_safely(text: str):
    # 嘗試從回應中抓出最外層 JSON
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    s = m.group(0)
    try:
        return json.loads(s)
    except Exception:
        # 嘗試修復常見引號/逗號錯
        s2 = s.replace("“", '"').replace("”", '"').replace("’", "'")
        s2 = re.sub(r",\s*}", "}", s2)
        try:
            return json.loads(s2)
        except Exception:
            return None


async def hf_parse_intent(text: str) -> dict:
    prompt = f"{SYSTEM}\n\n使用者：{text}\n\n" "請只輸出 JSON（不要多餘文字）。"
    if DRY_RUN or not HF_API_KEY:
        # 簡單 heuristics 假輸出
        return {
            "cuisine": "拉麵",
            "datetime": datetime.datetime.now(TZ).strftime("%Y-%m-%d 19:00"),
            "party_size": 2,
            "location": DEFAULT_CITY,
            "restaurant": "",
            "notes": "",
        }

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 256,
            "temperature": 0.2,
            "do_sample": True,
            "return_full_text": False,
        },
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{HF_URL}{HF_MODEL}", headers=_hf_headers(), json=payload
        )
        data = r.json()
        # HF 兩種常見回傳格式
        if isinstance(data, list) and data and "generated_text" in data[0]:
            txt = data[0]["generated_text"]
        elif isinstance(data, dict) and "error" in data:
            raise RuntimeError(f"HF error: {data['error']}")
        else:
            # 有些模型回 {'choices':[{'text':...}]}
            txt = json.dumps(data)
        obj = _to_json_safely(txt)
        if not obj:
            # 失敗時用穩健預設
            obj = {
                "cuisine": "",
                "datetime": "",
                "party_size": 2,
                "location": DEFAULT_CITY,
                "restaurant": "",
                "notes": txt[:200],
            }
        # 補預設
        if not obj.get("location"):
            obj["location"] = DEFAULT_CITY
        if not obj.get("party_size"):
            obj["party_size"] = 2
        if not obj.get("datetime"):
            obj["datetime"] = datetime.datetime.now(TZ).strftime("%Y-%m-%d 19:00")
        if "restaurant" not in obj:
            obj["restaurant"] = ""
        return obj


def parse_intent(text: str) -> dict:
    # 同步包裝器（部分端點需要同步）
    # 這裡用簡化版：直接用 httpx 的 event loop 由上層呼叫 async 函數時處理。
    # 實務上我們在 endpoint 中 await hf_parse_intent。
    raise NotImplementedError


# -------------------- OSM 搜尋：Nominatim & Overpass --------------------
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"
OVERPASS_API = "https://overpass-api.de/api/interpreter"


def _ua_headers():
    # Nominatim 要求提供有效的 User-Agent + email
    return {"User-Agent": f"energy-ai-agent/1.0 ({NOMINATIM_EMAIL})"}


def _maps_url(lat, lng):
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=18/{lat}/{lng}"


def _maps_nav_url(lat, lng, name=None):
    label = (name or "").replace(" ", "+")
    # 用 Google Maps 導航 URL，或可改 Apple/OSMAnd
    return f"https://www.google.com/maps/dir/?api=1&destination={lat}%2C{lng}&destination_name={label}"


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def _overpass_fetch_details(client, elements):
    """
    用 Overpass 把電話、官網、opening_hours 補上。
    elements: list of dict with 'osm_id', 'osm_type' ('node'|'way'|'relation')
    """
    if not elements:
        return {}
    # Overpass 需要分 node/way/relation 三段
    nodes = [e for e in elements if e.get("osm_type") == "node"]
    ways = [e for e in elements if e.get("osm_type") == "way"]
    rels = [e for e in elements if e.get("osm_type") == "relation"]

    def id_str(kind, lst):
        if not lst:
            return ""
        ids = ",".join(str(e["osm_id"]) for e in lst)
        return f"{kind}.id({ids});"

    q = f"""
[out:json][timeout:25];
(
  {id_str("node", nodes)}
  {id_str("way", ways)}
  {id_str("relation", rels)}
);
out center tags;
"""
    r = await client.post(OVERPASS_API, data={"data": q}, headers=_ua_headers())
    data = r.json()
    result = {}
    for el in data.get("elements") or []:
        k = f"{el['type']}/{el['id']}"
        tags = el.get("tags", {})
        # 取各種常見欄位
        phone = tags.get("contact:phone") or tags.get("phone")
        website = tags.get("contact:website") or tags.get("website")
        opening = tags.get("opening_hours")
        price = None  # OSM 沒有標準 price_level
        result[k] = {
            "phone": phone,
            "website": website,
            "opening_hours": opening,
            "price_level": price,
        }
    return result


async def search_places_osm(
    cuisine: str,
    location: str,
    limit=5,
    lat: float | None = None,
    lng: float | None = None,
    radius_m: int = 3000,
):
    """
    兩種路徑：
      - 有 GPS：Overpass around 搜尋 amenity=restaurant + 關鍵字匹配
      - 無 GPS：Nominatim Text Search（q=location+cuisine），取前幾筆
    補充：再用 Overpass 把電話/官網/營業時間補齊（能補多少算多少）。
    """
    if DRY_RUN:
        return [
            {
                "name": "範例拉麵一號",
                "address": "台北市XX路1號",
                "rating": 4.5,
                "user_ratings_total": 200,
                "place_id": "osm-demo1",
                "phone": "+886212345678",
                "website": "https://example.com",
                "maps_url": "https://www.openstreetmap.org/",
                "lat": 25.033964,
                "lng": 121.564468,
                "open_now": None,
                "opening_hours": ["Mon-Fri 11:30–21:00"],
                "price_level": 2,
                "photo_url": "",
                "maps_nav_url": "https://maps.google.com/",
            },
            {
                "name": "範例拉麵二號",
                "address": "台北市YY路2號",
                "rating": 4.2,
                "user_ratings_total": 150,
                "place_id": "osm-demo2",
                "phone": "+886298765432",
                "website": "",
                "maps_url": "https://www.openstreetmap.org/",
                "lat": 25.04776,
                "lng": 121.53185,
                "open_now": None,
                "opening_hours": ["Sat-Sun 12:00–22:00"],
                "price_level": 1,
                "photo_url": "",
                "maps_nav_url": "https://maps.google.com/",
            },
        ][:limit]

    async with httpx.AsyncClient(timeout=25) as client:
        out = []
        raw_elems = []
        if lat is not None and lng is not None:
            # Overpass around 搜尋
            # 關鍵字過濾：name 或 cuisine 含關鍵詞（盡量簡單避免漏抓）
            kw = (cuisine or "").strip()
            name_filter = f'["name"~"{re.escape(kw)}", i]' if kw else ""
            cuisine_filter = f'["cuisine"~"{re.escape(kw)}", i]' if kw else ""

            q = f"""
[out:json][timeout:25];
(
  node["amenity"="restaurant"]{name_filter}(around:{max(200, min(50000, radius_m or 3000))},{lat},{lng});
  node["amenity"="restaurant"]{cuisine_filter}(around:{max(200, min(50000, radius_m or 3000))},{lat},{lng});
  way["amenity"="restaurant"]{name_filter}(around:{max(200, min(50000, radius_m or 3000))},{lat},{lng});
  way["amenity"="restaurant"]{cuisine_filter}(around:{max(200, min(50000, radius_m or 3000))},{lat},{lng});
);
out center tags {limit};
"""
            r = await client.post(OVERPASS_API, data={"data": q}, headers=_ua_headers())
            data = r.json()
            for el in (data.get("elements") or [])[:limit]:
                tags = el.get("tags", {})
                name = tags.get("name") or "未命名餐廳"
                # 地址盡量組合
                addr = (
                    tags.get("addr:full")
                    or ", ".join(
                        [
                            tags.get(k)
                            for k in [
                                "addr:city",
                                "addr:district",
                                "addr:road",
                                "addr:housenumber",
                            ]
                            if tags.get(k)
                        ]
                    )
                    or ""
                )
                lat2 = el.get("lat") or (el.get("center") or {}).get("lat")
                lng2 = el.get("lon") or (el.get("center") or {}).get("lon")
                out.append(
                    {
                        "name": name,
                        "address": addr,
                        "rating": None,
                        "user_ratings_total": None,
                        "place_id": f"{el['type']}/{el['id']}",
                        "phone": None,
                        "website": "",
                        "maps_url": _maps_url(lat2, lng2),
                        "lat": lat2,
                        "lng": lng2,
                        "open_now": None,  # OSM 無即時開門狀態
                        "opening_hours": [],  # 稍後用 Overpass tags 補
                        "price_level": None,
                        "photo_url": "",  # OSM 無官方照片
                        "maps_nav_url": _maps_nav_url(lat2, lng2, name),
                    }
                )
                raw_elems.append({"osm_type": el["type"], "osm_id": el["id"]})
        else:
            # Nominatim 文本搜尋
            q = f"{location} {cuisine or ''} restaurant".strip()
            params = {
                "q": q,
                "format": "json",
                "limit": str(limit),
                "addressdetails": 1,
            }
            r = await client.get(NOMINATIM_BASE, params=params, headers=_ua_headers())
            data = r.json()
            for it in data[:limit]:
                name = it.get("display_name", "").split(",")[0]
                addr = it.get("display_name", "")
                lat2 = float(it.get("lat"))
                lng2 = float(it.get("lon"))
                osm_type = it.get("osm_type")  # node/way/relation
                osm_id = it.get("osm_id")
                out.append(
                    {
                        "name": name or "未命名餐廳",
                        "address": addr,
                        "rating": None,
                        "user_ratings_total": None,
                        "place_id": f"{osm_type}/{osm_id}",
                        "phone": None,
                        "website": "",
                        "maps_url": _maps_url(lat2, lng2),
                        "lat": lat2,
                        "lng": lng2,
                        "open_now": None,
                        "opening_hours": [],
                        "price_level": None,
                        "photo_url": "",
                        "maps_nav_url": _maps_nav_url(lat2, lng2, name),
                    }
                )
                raw_elems.append({"osm_type": osm_type, "osm_id": osm_id})

        # 用 Overpass 補充電話/官網/營業時間（盡力而為）
        details = await _overpass_fetch_details(client, raw_elems)
        for r in out:
            d = details.get(r["place_id"]) or {}
            if d.get("phone"):
                r["phone"] = d["phone"]
            if d.get("website"):
                r["website"] = d["website"]
            oh = d.get("opening_hours")
            if oh:
                # 顯示友善一點
                r["opening_hours"] = [oh]
        return out


# -------------------- 工具：挑店 / 電話 / 訂位連結 --------------------
def pick_restaurant(plan: dict, candidates: list):
    if not candidates:
        return None
    target = (plan.get("restaurant") or "").strip().lower()
    if target:
        ranked = sorted(
            candidates,
            key=lambda r: difflib.SequenceMatcher(
                None, target, (r.get("name") or "").lower()
            ).ratio(),
            reverse=True,
        )
        return ranked[0]
    # OSM 沒有評分，用距離或名字排序；這裡先維持原先規則（rating 為 None 時當 0）
    return sorted(
        candidates,
        key=lambda r: ((r.get("rating") or 0), (r.get("user_ratings_total") or 0)),
        reverse=True,
    )[0]


def normalize_phone_for_twilio(phone: str | None) -> str | None:
    if not phone:
        return None
    p = str(phone).strip()
    if p.startswith("+"):
        return p
    digits = re.sub(r"\D", "", p)
    if not digits:
        return None
    if digits.startswith("886"):
        return "+" + digits
    if digits.startswith("0"):
        return "+886" + digits[1:]
    return "+" + digits


def infer_reservation_link(rest: dict) -> str | None:
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
        twiml=f"<Response><Say language='zh-TW'>{tts_text}</Say></Response>",
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
        plan = await hf_parse_intent(q.text)
        candidates = await search_places_osm(
            plan["cuisine"] or "餐廳",
            plan["location"],
            limit=5,
            lat=q.lat,
            lng=q.lng,
            radius_m=q.radius_m or 3000,
        )
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
    輸入一句話（含禮拜幾、幾點、幾位、想吃什麼、可選餐廳名）＋（可選）GPS：
    解析 -> OSM 搜尋(就近或地名) -> 選店 ->（可選）電話代訂 / 連結
    """
    try:
        plan = await hf_parse_intent(q.text)
        candidates = await search_places_osm(
            plan["cuisine"] or "餐廳",
            plan["location"],
            limit=5,
            lat=q.lat,
            lng=q.lng,
            radius_m=q.radius_m or 3000,
        )
        if not candidates:
            return {
                "status": "no_candidates",
                "message": "找不到符合條件的餐廳",
                "plan": plan,
                "candidates": [],
            }

        chosen = pick_restaurant(plan, candidates)
        if not chosen:
            return {
                "status": "no_selection",
                "message": "無法選定餐廳",
                "plan": plan,
                "candidates": candidates,
            }

        phone = normalize_phone_for_twilio(chosen.get("phone"))
        if phone:
            tts = make_call_script(plan, chosen)
            sid = call_restaurant(phone, tts)
            return {
                "status": "requested_via_call",
                "message": "已代為致電餐廳並唸出訂位資訊（是否成功仍以餐廳回覆為準）",
                "sid": sid,
                "plan": plan,
                "restaurant": chosen,
            }

        link = infer_reservation_link(chosen)
        if link:
            return {
                "status": "needs_manual_click",
                "message": "此餐廳可能提供線上資訊/訂位，請點擊查看",
                "url": link,
                "plan": plan,
                "restaurant": chosen,
            }

        return {
            "status": "unsupported",
            "message": "找不到電話或線上連結（OSM 可能沒有這些資料）",
            "plan": plan,
            "restaurant": chosen,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# 轉接
@app.post("/bridge")
def bridge(to: str = "", digits: str = ""):
    if digits == "1":
        twiml = f"<Response><Say language='zh-TW'>即將轉接餐廳。</Say><Dial>{to}</Dial></Response>"
    else:
        twiml = f"<Response><Dial>{to}</Dial></Response>"
    return Response(content=twiml, media_type="application/xml")
