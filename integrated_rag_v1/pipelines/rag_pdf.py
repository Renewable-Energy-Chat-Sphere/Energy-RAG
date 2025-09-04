from typing import Tuple
from io import BytesIO
import os, tempfile
from openai import OpenAI
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings as Emb

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

def _load_pdf_to_docs(file_storage):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file_storage.save(tmp.name)
        loader = PyPDFLoader(tmp.name)
        pages = loader.load()
    try:
        os.remove(tmp.name)
    except Exception:
        pass
    return pages

def qa_over_pdf(question: str, file_storage) -> Tuple[str, list]:
    pages = _load_pdf_to_docs(file_storage)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=200)
    docs = splitter.split_documents(pages)

    embeddings = Emb()
    vectordb = FAISS.from_documents(docs, embeddings)

    rel_docs = vectordb.similarity_search(question, k=4)
    context = "\n\n".join([d.page_content[:1500] for d in rel_docs])

    prompt = (
        "Use the provided PDF context to answer. If the answer isn't in the context, say so.\n"
        f"Question: {question}\n---\nContext:\n{context}"
    )
    resp = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[{"role":"user","content":prompt}],
    )
    answer = resp.choices[0].message.content
    sources = [f"page {d.metadata.get('page', '?')}" for d in rel_docs]
    return answer, sources