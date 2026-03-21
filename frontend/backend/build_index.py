import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "processed"

INPUT_JSON = PROCESSED_DIR / "energy_rag_all_years_meta.json"
OUTPUT_INDEX = PROCESSED_DIR / "energy_rag_all_years.index"
OUTPUT_META = PROCESSED_DIR / "energy_rag_all_years_meta_index.json"


def main():
    if not INPUT_JSON.exists():
        raise FileNotFoundError(f"找不到檔案: {INPUT_JSON}")

    records = json.loads(INPUT_JSON.read_text(encoding="utf-8"))

    if not records:
        raise ValueError("records 是空的，無法建立索引")

    texts = [r["text"] for r in records]

    print(f"共讀取 {len(texts)} 筆 text，開始 embedding...")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    embeddings = embeddings.astype("float32")
    dim = embeddings.shape[1]

    print(f"向量維度: {dim}")
    print("建立 FAISS 索引中...")

    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    faiss.write_index(index, str(OUTPUT_INDEX))
    OUTPUT_META.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("✅ 建立完成")
    print(f"索引檔: {OUTPUT_INDEX}")
    print(f"中繼資料: {OUTPUT_META}")


if __name__ == "__main__":
    main()