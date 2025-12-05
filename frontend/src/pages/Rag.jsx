import { useEffect, useState } from "react";
import "./rag.css";
import BackToTopButton from "../components/BackToTopButton";

export default function Rag() {
  const [tab, setTab] = useState("chat");

  const API = "http://127.0.0.1:8000"; // ⭐ 統一 API

  /* =========================================================
     CHAT — 問答 / 泡泡 / 自動撐高
  ========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-chat");
    if (!form) return;

    const inputUser = form.querySelector("textarea[name='user']");
    const inputSystem = form.querySelector("input[name='system']");
    const inputSid = form.querySelector("input[name='session_id']");
    const inputRag = form.querySelector("input[name='rag_auto']");
    const chatLog = document.getElementById("rag-chat-log");
    const srcBox = document.getElementById("rag-src-chat");

    const INPUT_MIN_HEIGHT = 44;

    /* ------- 自動撐高 ------- */
    const resetHeight = () => {
      inputUser.style.height = "auto";
      inputUser.style.height = `${Math.max(
        inputUser.scrollHeight,
        INPUT_MIN_HEIGHT
      )}px`;
    };
    inputUser.addEventListener("input", resetHeight);
    requestAnimationFrame(resetHeight);

    /* ------- Shift+Enter 換行 / Enter 送出 ------- */
    inputUser.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    /* ------- 泡泡 UI ------- */
    const bubble = (role, html) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.justifyContent = role === "user" ? "flex-end" : "flex-start";

      const b = document.createElement("div");
      b.className = "chat-bubble";

      b.style.maxWidth = "78%";
      b.style.padding = "10px 12px";
      b.style.borderRadius = "14px";
      b.style.boxShadow = "var(--shadow-soft)";
      b.style.whiteSpace = "pre-wrap";
      b.style.border = "1px solid var(--border)";

      const isDark = document.documentElement.classList.contains("dark");

      if (role === "user") {
        b.style.background = "linear-gradient(180deg, #34a1d33f, #33a9f2ce)";
        b.style.color = isDark ? "#fff" : "var(--text)";
      } else {
        b.style.background = "linear-gradient(180deg, #d389343f, #e78121ce)";
        b.style.color = isDark ? "#fff" : "var(--text)";
      }

      try {
        b.innerHTML = window.marked ? marked.parse(html) : html;
      } catch {
        b.textContent = html;
      }

      wrap.appendChild(b);
      chatLog.appendChild(wrap);
      chatLog.scrollTop = chatLog.scrollHeight;
    };

    /* ------- Chat 提交 ------- */
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userText = inputUser.value.trim();
      if (!userText) return;

      bubble("user", userText);
      inputUser.value = "";
      resetHeight();
      srcBox.textContent = "";

      bubble("assistant", "思考中…");

      const payload = {
        user: userText,
        system: inputSystem.value || "",
        session_id: inputSid.value || "web-ui",
        rag_auto: !!inputRag.checked,
        model: "gpt-4o-mini",
      };

      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const txt = await res.text();
        let data = {};
        try {
          data = JSON.parse(txt);
        } catch {
          data = { answer: "(伺服器回傳格式錯誤)", raw: txt };
        }

        chatLog.lastElementChild?.remove();
        bubble("assistant", data.answer || data.error || "（無回應）");

        if (data.sources?.length) {
          srcBox.textContent =
            "來源：\n" + data.sources.map((s) => `• ${s}`).join("\n");
        }
      } catch (err) {
        chatLog.lastElementChild?.remove();
        bubble("assistant", `錯誤：${err.message}`);
      }
    });
  }, []);

  /* =========================================================
     WEB — 問網站內容
  ========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-web");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const question = form.question.value.trim();
      const url = form.url.value.trim();
      const out = document.getElementById("out-web");
      const src = document.getElementById("src-web");

      out.textContent = "解析網站中…";
      src.textContent = "";

      const payload = { question, url };
      const res = await fetch(`${API}/ask_web`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      out.textContent = data.answer || "(無回應)";
      src.textContent = (data.sources || []).join("\n");
    });
  }, []);

  /* =========================================================
     PDF — 問 PDF
  ========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-pdf");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();
      const out = document.getElementById("out-pdf");
      const src = document.getElementById("src-pdf");

      out.textContent = "解析 PDF 中…";
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_pdf`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      out.textContent = data.answer || "(無回應)";
      src.textContent = (data.sources || []).join("\n");
    });
  }, []);

  /* =========================================================
     AV — 問影片/音訊
  ========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-av");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();
      const out = document.getElementById("out-av");
      const src = document.getElementById("src-av");

      out.textContent = "處理影音中…";
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_av`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      out.textContent = data.answer || "(無回應)";
      src.textContent = (data.sources || []).join("\n");
    });
  }, []);

  /* =========================================================
     TABLE — 問 Excel/CSV
  ========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-table");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();

      const out = document.getElementById("out-table");
      const src = document.getElementById("src-table");

      out.textContent = "解析表格中…";
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_table`, {
        method: "POST",
        body: fd,
      });

      const txt = await res.text();
      console.log("TABLE RAW RESPONSE:", txt); // ⭐ 在瀏覽器 console 印出真正回傳內容

      let data = {};
      try {
        data = JSON.parse(txt);
      } catch {
        data = { error: "JSON parse failed", raw: txt };
      }

      out.textContent = data.answer || data.error || "(無回應)";
      src.textContent = JSON.stringify(data.sources || data.raw, null, 2);
    });
  }, []);

  /* =========================================================
     JSX 頁面
  ========================================================= */
  return (
    <div className="rag-page">
      <div className="rag-container">
        {/* HERO */}
        <div className="rag-hero">
          <h1>Energy RAG</h1>
          <p>Web · PDF · Audio/Video · Table — 能源資料檢索與決策支援</p>

          <div className="rag-badges">
            <span className="rag-badge">LangChain · FAISS</span>
            <span className="rag-badge alt">OpenAI GPT</span>
            <span className="rag-badge">Clean Energy UI</span>
          </div>
        </div>

        {/* TABS */}
        <nav className="rag-tabs">
          <button
            className={`rag-tab ${tab === "chat" ? "active" : ""}`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
          <button
            className={`rag-tab ${tab === "web" ? "active" : ""}`}
            onClick={() => setTab("web")}
          >
            Web
          </button>
          <button
            className={`rag-tab ${tab === "pdf" ? "active" : ""}`}
            onClick={() => setTab("pdf")}
          >
            PDF
          </button>
          <button
            className={`rag-tab ${tab === "av" ? "active" : ""}`}
            onClick={() => setTab("av")}
          >
            Audio/Video
          </button>
          <button
            className={`rag-tab ${tab === "table" ? "active" : ""}`}
            onClick={() => setTab("table")}
          >
            Table
          </button>
        </nav>

        {/* PANELS */}
        <main className="rag-grid">
          {/* CHAT */}
          <section
            id="rag-chat"
            className={`rag-panel ${tab === "chat" ? "active" : ""}`}
          >
            <div className="rag-card">
              <h3>訊息</h3>

              <form id="rag-form-chat" className="rag-form">
                <label>
                  <textarea
                    name="user"
                    rows="1"
                    required
                    placeholder="輸入你的問題或網址（自動啟用 RAG Web）"
                  />
                </label>
                <label>
                  System
                  <input name="system" placeholder="你是專業助手…" />
                </label>
                <label>
                  Session ID
                  <input
                    name="session_id"
                    placeholder="自訂 ID（可保持對話）"
                  />
                </label>
                <label className="rag-row">
                  <input type="checkbox" name="rag_auto" defaultChecked />{" "}
                  自動偵測網址 → RAG Web
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>對話</h3>
                <div id="rag-chat-log" className="rag-chat-log"></div>
                <div id="rag-src-chat" className="rag-src"></div>
              </article>
            </div>
          </section>

          {/* WEB */}
          <section
            id="rag-web"
            className={`rag-panel ${tab === "web" ? "active" : ""}`}
          >
            <div className="rag-card">
              <h3>網站分析</h3>
              <form id="rag-form-web" className="rag-form">
                <label>
                  <input
                    name="question"
                    required
                    placeholder="想問什麼？例如：再生能源佔比"
                  />
                </label>
                <label>
                  網址
                  <input name="url" placeholder="https://..." />
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>回答</h3>
                <div id="out-web" className="answer"></div>
                <div id="src-web" className="src"></div>
              </article>
            </div>
          </section>

          {/* PDF */}
          <section
            id="rag-pdf"
            className={`rag-panel ${tab === "pdf" ? "active" : ""}`}
          >
            <div className="rag-card">
              <h3>PDF 分析</h3>
              <form
                id="rag-form-pdf"
                className="rag-form"
                encType="multipart/form-data"
              >
                <label>
                  <input
                    name="question"
                    required
                    placeholder="想問 PDF 什麼內容？"
                  />
                </label>
                <label>
                  上傳 PDF
                  <input
                    name="file"
                    required
                    type="file"
                    accept="application/pdf"
                  />
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>回答</h3>
                <div id="out-pdf" className="answer"></div>
                <div id="src-pdf" className="src"></div>
              </article>
            </div>
          </section>

          {/* AV */}
          <section
            id="rag-av"
            className={`rag-panel ${tab === "av" ? "active" : ""}`}
          >
            <div className="rag-card">
              <h3>影音分析</h3>
              <form
                id="rag-form-av"
                className="rag-form"
                encType="multipart/form-data"
              >
                <label>
                  <input
                    name="question"
                    required
                    placeholder="想從影片 / 音訊找什麼？"
                  />
                </label>
                <label>
                  上傳影音
                  <input
                    name="file"
                    required
                    type="file"
                    accept="audio/*,video/*"
                  />
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>回答</h3>
                <div id="out-av" className="answer"></div>
                <div id="src-av" className="src"></div>
              </article>
            </div>
          </section>

          {/* TABLE */}
          <section
            id="rag-table"
            className={`rag-panel ${tab === "table" ? "active" : ""}`}
          >
            <div className="rag-card">
              <h3>表格分析</h3>
              <form
                id="rag-form-table"
                className="rag-form"
                encType="multipart/form-data"
              >
                <label>
                  <input
                    name="question"
                    required
                    placeholder="例如：2024 總發電量是多少？"
                  />
                </label>
                <label>
                  上傳表格
                  <input
                    name="file"
                    required
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                  />
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>回答</h3>
                <div id="out-table" className="answer"></div>
                <div id="src-table" className="src"></div>
              </article>
            </div>
          </section>
        </main>
      </div>

      <BackToTopButton />
    </div>
  );
}
