# pipelines/rag_pdf.py
import os, tempfile, time, typing
from typing import Tuple, Union
from io import BytesIO

from dotenv import load_dotenv

load_dotenv()

from openai import OpenAI, APIConnectionError, RateLimitError, OpenAIError
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings as Emb

# ====== 可調參數 ======
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
MAX_PAGES = int(os.getenv("MAX_PAGES", "30"))  # 最多處理頁數
MAX_DOCS = int(os.getenv("MAX_DOCS", "300"))  # 最多分段
TOP_K = int(os.getenv("TOP_K", "5"))  # 取回段數
OPENAI_TO = float(os.getenv("OPENAI_TIMEOUT", "30"))
USE_OCR = os.getenv("USE_OCR", "0") == "1"  # 需要時啟用 OCR 流程（需安裝對應套件）
OCR_STRATEGY = os.getenv("OCR_STRATEGY", "unstructured")  # unstructured | pdf2image

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=OPENAI_TO)

FileLike = Union[
    bytes,
    BytesIO,
    "werkzeug.datastructures.FileStorage",  # Flask
]


def _save_to_temp_pdf(file_storage: FileLike) -> str:
    """把上傳檔存到臨時 .pdf，傳回路徑"""
    if hasattr(file_storage, "save"):  # Flask FileStorage
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_path = tmp.name
        file_storage.save(tmp_path)
        return tmp_path

    if hasattr(file_storage, "read"):
        content = file_storage.read()
        try:
            file_storage.seek(0)
        except Exception:
            pass
    elif isinstance(file_storage, (bytes, bytearray)):
        content = file_storage
    else:
        raise ValueError("Unsupported file_storage type for PDF upload")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        return tmp.name


def _load_pdf_to_docs_basic(tmp_path: str):
    loader = PyPDFLoader(tmp_path)
    return loader.load()  # 每頁 Document，metadata 包含 page (0-based)


def _load_pdf_to_docs_ocr(tmp_path: str):
    """
    簡易 OCR 方案：
    - strategy='unstructured'：需要 `pip install unstructured[local-inference] pdfminer-six pillow`
    - strategy='pdf2image'：需要 `pip install pdf2image pytesseract pillow` 並安裝系統 tesseract + poppler
    """
    if OCR_STRATEGY == "unstructured":
        try:
            from langchain_community.document_loaders import UnstructuredPDFLoader
        except Exception as e:
            raise RuntimeError(
                "缺少 Unstructured 相關套件，請安裝：unstructured[local-inference] pdfminer-six pillow"
            ) from e
        loader = UnstructuredPDFLoader(tmp_path, strategy="hi_res")
        return loader.load()

    elif OCR_STRATEGY == "pdf2image":
        try:
            from pdf2image import convert_from_path
            import pytesseract
            from langchain.schema import Document
        except Exception as e:
            raise RuntimeError(
                "缺少 pdf2image / pytesseract，並需安裝系統 tesseract 與 poppler"
            ) from e

        pages = convert_from_path(tmp_path)
        docs = []
        for i, img in enumerate(pages):
            text = pytesseract.image_to_string(img) or ""
            docs.append(Document(page_content=text, metadata={"page": i}))
        return docs

    else:
        raise ValueError(f"OCR_STRATEGY 不支援：{OCR_STRATEGY}")


def _safe_remove(path: str):
    try:
        os.remove(path)
    except Exception:
        pass


def qa_over_pdf(question: str, file_storage: FileLike) -> Tuple[str, list]:
    t0 = time.time()
    # 1) 存臨時檔
    tmp_path = _save_to_temp_pdf(file_storage)

    try:
        # 2) 先嘗試非 OCR 解析
        pages = _load_pdf_to_docs_basic(tmp_path)

        if not pages:
            return "讀不到任何頁面，檔案可能為空或損毀。", []

        # 限制頁數
        pages = pages[:MAX_PAGES]

        # 3) 判斷是否為掃描 PDF（抽不出文字）
        if all(not (p.page_content or "").strip() for p in pages):
            if USE_OCR:
                # 走 OCR 流程
                pages = _load_pdf_to_docs_ocr(tmp_path)
                if not pages or all(not (p.page_content or "").strip() for p in pages):
                    return (
                        "啟用 OCR 後仍讀不到文字內容，請確認檔案品質或改用可複製文字的 PDF。",
                        [],
                    )
            else:
                return (
                    "這份 PDF 幾乎無可抽取文字（可能是掃描影像）。\n"
                    "若要自動辨識，請把環境變數 USE_OCR=1 並安裝 OCR 套件，或先用可複製文字的 PDF。",
                    [],
                )

        # 4) 分段 + 限制數量
        splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
        docs = splitter.split_documents(pages)
        if len(docs) > MAX_DOCS:
            docs = docs[:MAX_DOCS]

        if not docs:
            return "解析到的文字太少，無法建立檢索索引。", []

        # 5) 向量化與檢索（最耗時處）
        try:
            embeddings = Emb(model=EMBED_MODEL)
            vectordb = FAISS.from_documents(docs, embeddings)
        except (APIConnectionError, RateLimitError) as e:
            return f"嵌入向量服務連線/額度問題：{e}", []
        except OpenAIError as e:
            return f"OpenAI 錯誤：{e}", []
        except Exception as e:
            return f"建立向量索引失敗：{e}", []

        try:
            rel_docs = vectordb.similarity_search(question, k=TOP_K)
        except Exception as e:
            return f"相似檢索失敗：{e}", []

        if not rel_docs:
            return "在可抽取文字中找不到與問題相關的內容。", []

        context = "\n\n".join([d.page_content[:2000] for d in rel_docs])

        prompt = (
            "你是 PDF 助理。請僅依據提供的 PDF 片段回答；若片段沒有答案就說不知道。\n\n"
            f"問題：{question}\n---\n上下文：\n{context}"
        )

        try:
            resp = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                timeout=OPENAI_TO,  # 雙保險
            )
            answer = resp.choices[0].message.content
        except (APIConnectionError, RateLimitError) as e:
            return f"產生答案時連線/額度問題：{e}", []
        except OpenAIError as e:
            return f"產生答案時 OpenAI 錯誤：{e}", []
        except Exception as e:
            return f"產生答案失敗：{e}", []

        sources = [f"page {int(d.metadata.get('page', 0)) + 1}" for d in rel_docs]

        # 6) 耗時提醒（不影響結果）
        elapsed = time.time() - t0
        if elapsed > 25:
            answer = f"[提示] 本次處理花了 {elapsed:.1f}s；可調整 MAX_PAGES / MAX_DOCS 加速。\n\n" + (
                answer or ""
            )

        return answer, sources

    finally:
        _safe_remove(tmp_path)
