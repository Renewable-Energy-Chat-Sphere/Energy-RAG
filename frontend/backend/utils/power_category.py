def get_category(name, value):

    name = str(name).replace("&amp;", "&")

    try:
        value = float(value)
    except:
        value = 0

    # =========================
    # 🔥 民營燃氣 IPP-LNG
    # =========================
    IPP_LNG_UNITS = [
        "海湖#1",
        "海湖#2",
        "新桃#1",
        "國光#1",
        "星彰#1",
        "星元#1",
        "嘉惠#1",
        "嘉惠#2",
        "豐德#1",
        "豐德#2",
        "豐德#3",
    ]

    if any(name.startswith(unit) for unit in IPP_LNG_UNITS):
        return {
            "main": "民營電廠-燃氣(IPP-LNG)",
            "sub": "民營購電",
        }

    # =========================
    # 🔥 民營燃煤
    # =========================
    IPP_COAL_UNITS = [
        "和平#1",
        "和平#2",
        "麥寮#1",
        "麥寮#3",
    ]

    if any(name.startswith(unit) for unit in IPP_COAL_UNITS):
        return {
            "main": "民營電廠-燃煤(IPP-Coal)",
            "sub": "民營購電",
        }

    # =========================
    # 🔥 燃氣 LNG
    # =========================
    LNG_UNITS = [
        "大潭CC#1",
        "大潭CC#2",
        "大潭CC#3",
        "大潭CC#4",
        "大潭CC#5",
        "大潭CC#6",
        "大潭CC#7",
        "大潭CC#8",
        "大潭CC#9",
        "通霄CC#1",
        "通霄CC#2",
        "通霄CC#3",
        "通霄CC#6",
        "通霄GT#9",
        "台中CC#1",
        "台中CC#2",
        "興達新CC#1",
        "興達新CC#2",
        "興達新CC#3",
        "興達CC#1",
        "興達CC#2",
        "興達CC#3",
        "興達CC#4",
        "興達CC#5",
        "南部CC#1",
        "南部CC#2",
        "南部CC#3",
        "南部CC#4",
        "大林#5",
        "大林#6",
    ]

    if any(name.startswith(unit) for unit in LNG_UNITS):
        return {
            "main": "燃氣(LNG)",
            "sub": "台電自有",
        }

    # =========================
    # 🔥 燃煤
    # =========================
    COAL_UNITS = [
        "林口#1",
        "林口#2",
        "林口#3",
        "台中#1",
        "台中#2",
        "台中#3",
        "台中#4",
        "台中#5",
        "台中#6",
        "台中#7",
        "台中#8",
        "台中#9",
        "台中#10",
        "興達#1",
        "興達#2",
        "興達#3",
        "興達#4",
        "大林#1",
        "大林#2",
    ]

    if any(name.startswith(unit) for unit in COAL_UNITS):
        return {
            "main": "燃煤(Coal)",
            "sub": "台電自有",
        }

    # =========================
    # 🔥 汽電共生
    # =========================
    if name.startswith("汽電共生"):
        return {
            "main": "汽電共生(Co-Gen)",
            "sub": "汽電共生",
        }

    # =========================
    # 🔥 燃料油
    # =========================
    OIL_UNITS = [
        "協和#3",
        "協和#4",
        "澎湖尖山",
    ]

    if any(name.startswith(unit) for unit in OIL_UNITS):
        return {
            "main": "燃料油(Fuel Oil)",
            "sub": "燃油(Oil)",
        }

    # =========================
    # 🔥 輕油 Diesel
    # =========================
    DIESEL_UNITS = [
        "核二Gas1",
        "核二Gas2",
        "核三Gas1",
        "核三Gas2",
        "台中Gas1&2",
        "台中Gas3&4",
        "金門塔山",
        "馬祖珠山",
        "離島其它",
    ]

    if any(name.startswith(unit) for unit in DIESEL_UNITS):
        return {
            "main": "燃料油(Fuel Oil)",
            "sub": "輕油(Diesel)",
        }

    # =========================
    # 🔥 核能
    # =========================
    if "核" in name:
        return {
            "main": "核能(Nuclear)",
            "sub": "核能",
        }

    # =========================
    # 🔥 太陽能購電
    # =========================
    SOLAR_IPP_UNITS = [
        "崙尾光",
        "天衝光",
        "天蓬光",
        "寶興光",
        "聯華光",
        "向陽光",
        "星崴光",
        "碩力光",
        "天英光",
        "志光光",
        "永堯光",
        "昱昶光",
        "星崙光",
        "新和光",
        "生利光",
        "廷和光",
        "星股光",
        "其它購電太陽能",
    ]

    if any(unit in name for unit in SOLAR_IPP_UNITS):
        return {
            "main": "太陽能(Solar)",
            "sub": "太陽能購電",
        }

    # =========================
    # 🔥 太陽能台電自有
    # =========================
    SOLAR_TPC_UNITS = ["彰濱光", "南鹽光"]

    if any(unit in name for unit in SOLAR_TPC_UNITS):
        return {
            "main": "太陽能(Solar)",
            "sub": "太陽能台電自有",
        }

    # =========================
    # 🔥 離岸風力台電自有
    # =========================
    OFFSHORE_WIND_UNITS = [
        "離岸一期",
        "離岸二期",
    ]

    if any(name.startswith(unit) for unit in OFFSHORE_WIND_UNITS):
        return {
            "main": "風力(Wind)",
            "sub": "離岸風力台電自有",
        }

    # =========================
    # 🔥 離岸風力購電
    # =========================
    OFFSHORE_WIND_IPP_UNITS = [
        "海洋竹南",
        "海能風",
        "沃一風",
        "沃二風",
        "沃四風",
        "沃南風",
        "芳一風",
        "芳二風",
        "允泓",
        "允西",
        "中能風",
        "龍A風",
        "龍B風",
    ]

    if any(name.startswith(unit) for unit in OFFSHORE_WIND_IPP_UNITS):
        return {
            "main": "風力(Wind)",
            "sub": "離岸風力購電",
        }

    # =========================
    # 🔥 陸域風力購電
    # =========================
    WIND_IPP_UNITS = [
        "苗栗大鵬",
        "鹿威彰濱",
        "觀威觀音&桃威新屋",
        "中威大安",
        "創維風",
        "新源崙背",
        "彰品風",
        "其它購電風力",
    ]

    if any(name.startswith(unit) for unit in WIND_IPP_UNITS):
        return {
            "main": "風力(Wind)",
            "sub": "陸域風力購電",
        }

    # =========================
    # 🔥 陸域風力台電自有
    # =========================
    WIND_TPC_UNITS = [
        "觀園",
        "台中港",
        "王功",
        "彰工",
        "雲麥",
        "四湖",
    ]

    if any(name.startswith(unit) for unit in WIND_TPC_UNITS):
        return {
            "main": "風力(Wind)",
            "sub": "陸域風力台電自有",
        }

    # =========================
    # 🔥 其它台電自有風力
    # =========================
    if name.startswith("其它台電自有") and value >= 30:
        return {
            "main": "風力(Wind)",
            "sub": "陸域風力台電自有",
        }

    # =========================
    # 🔥 電池放電
    # =========================
    if value >= 0 and name.startswith("電池"):
        return {
            "main": "儲能(Energy Storage System)",
            "sub": "電池(Battery)",
        }

    # =========================
    # 🔥 抽蓄
    # =========================
    PUMPED_HYDRO_UNITS = [
        "大觀二#1",
        "大觀二#2",
        "大觀二#3",
        "大觀二#4",
        "明潭#1",
        "明潭#2",
        "明潭#3",
        "明潭#4",
        "明潭#5",
        "明潭#6",
    ]

    # 抽蓄發電
    if value >= 0 and any(name.startswith(unit) for unit in PUMPED_HYDRO_UNITS):
        return {
            "main": "儲能(Energy Storage System)",
            "sub": "抽蓄水力(Pumped Hydro)",
        }

    # 抽蓄負載
    if value < 0 and any(name.startswith(unit) for unit in PUMPED_HYDRO_UNITS):
        return {
            "main": "儲能負載(Energy Storage System Load)",
            "sub": "抽蓄水力(Pumped Hydro)",
        }

    # =========================
    # 🔥 電池負載
    # =========================
    if value < 0 and name.startswith("電池"):
        return {
            "main": "儲能負載(Energy Storage System Load)",
            "sub": "電池(Battery)",
        }

    # =========================
    # 🔥 其它再生能源
    # =========================
    OTHER_RENEWABLE_UNITS = [
        "台電自有地熱",
        "購電地熱",
        "生質能",
    ]

    if any(name.startswith(unit) for unit in OTHER_RENEWABLE_UNITS):
        return {
            "main": "其它再生能源(Other Renewable Energy)",
            "sub": "其它再生能源",
        }

    # =========================
    # 🔥 水力
    # =========================
    HYDRO_UNITS = [
        "德基#1",
        "德基#2",
        "德基#3",
        "青山#1",
        "青山#2",
        "青山#3",
        "青山#4",
        "谷關#1",
        "谷關#2",
        "谷關#3",
        "谷關#4",
        "天輪#1",
        "天輪#2",
        "天輪#3",
        "天輪#4",
        "天輪#5",
        "馬鞍#1",
        "馬鞍#2",
        "卓蘭#1",
        "卓蘭#2",
        "萬大#1",
        "萬大#2",
        "萬大#3",
        "萬大#4",
        "松林#1&2",
        "大觀一#1",
        "大觀一#2",
        "大觀一#3",
        "大觀一#4",
        "大觀一#5",
        "鉅工#1",
        "鉅工#2",
        "水里#1",
        "立霧#1&2",
        "龍澗#1",
        "龍澗#2",
        "碧海",
        "烏來&桂山&粗坑",
        "北部小水力",
        "中部小水力",
        "南部小水力",
        "東部小水力",
        "翡翠#1",
        "石門#1",
        "石門#2",
        "曾文#1",
        "義興#1",
        "名間",
        "嘉南西口、烏山頭和八田",
        "卑南",
        "捷祥關山",
        "其它購電小水力",
    ]

    if any(name.startswith(unit) for unit in HYDRO_UNITS):
        return {
            "main": "水力(Hydro)",
            "sub": "台電自有",
        }

    # =========================
    # 🔥 fallback
    # =========================
    return {
        "main": "其他",
        "sub": "其他",
    }
