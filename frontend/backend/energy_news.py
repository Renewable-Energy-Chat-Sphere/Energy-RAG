import feedparser
from fastapi import APIRouter

router = APIRouter()

ENERGY_RSS = "https://www.moeaea.gov.tw/ECW/NewsRSS.aspx?kind=1"

@router.get("/energy-news")
def get_energy_news():
    feed = feedparser.parse(
    ENERGY_RSS,
    request_headers={
        "User-Agent": "Mozilla/5.0 (Energy-RAG Project)"
    }
)


    return {
        "source": "經濟部能源署",
        "items": [
            {
                "title": e.title,
                "link": e.link,
                "published": getattr(e, "published", "")
            }
            for e in feed.entries[:5]
        ]
    }
