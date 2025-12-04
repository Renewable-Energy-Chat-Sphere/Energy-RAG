import { useEffect } from "react";
import "./rag.css";

export default function Rag() {
  /* =============================
     (1) Tabs 切換邏輯
  ============================= */
  useEffect(() => {
    const onClick = (e) => {
      const btn = e.target.closest(".rag-tab");
      if (!btn) return;

      const target = btn.dataset.target;

      document
        .querySelectorAll(".rag-tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      document
        .querySelectorAll(".rag-panel")
        .forEach((p) => p.classList.remove("active"));
      document.querySelector(target)?.classList.add("active");
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  /* =============================
     (2) Chat 送出 + 自動撐高 + 泡泡
  ============================= */
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

    /* -------- textarea 自動撐高 -------- */
    const resetHeight = () => {
      inputUser.style.height = "auto";
      inputUser.style.height = `${Math.max(
        inputUser.scrollHeight,
        INPUT_MIN_HEIGHT
      )}px`;
    };
    inputUser.addEventListener("input", resetHeight);
    requestAnimationFrame(resetHeight);

    /* -------- Enter 送出（Shift+Enter 換行） -------- */
    inputUser.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    /* -------- 泡泡 UI -------- */
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
      b.style.lineHeight = "1.55";
      b.style.border = "1px solid var(--border)";

      const isDark = document.documentElement.classList.contains("dark");

      if (role === "user") {
        b.style.background = "linear-gradient(180deg, #34a1d33f, #33a9f2ce)";
        b.style.color = isDark ? "#ffffff" : "var(--text)";
      } else {
        b.style.background = "linear-gradient(180deg, #d389343f, #e78121ce)";
        b.style.color = isDark ? "#ffffff" : "var(--text)";
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

    /* -------- 送出表單 -------- */
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userText = inputUser.value.trim();
      if (!userText) return;

      const submitBtn = form.querySelector("button[type='submit']");
      const card = form.closest(".rag-card");

      // 使用者泡泡
      bubble("user", userText);
      inputUser.value = "";
      resetHeight();
      srcBox.textContent = "";

      // 加入「思考中…」
      bubble("assistant", "思考中…");

      submitBtn?.setAttribute("disabled", "disabled");
      card?.classList.add("loading");

      const payload = {
        user: userText,
        system: inputSystem.value || "",
        session_id: inputSid.value || "web-ui",
        rag_auto: !!inputRag.checked,
        model: "gpt-4o-mini",
      };

      try {
        const res = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        const last = chatLog.lastElementChild;
        if (last) last.remove();

        bubble("assistant", data.answer || data.error || "（無回應）");

        if (Array.isArray(data.sources) && data.sources.length > 0) {
          const lines = data.sources.map((s) =>
            typeof s === "string" ? `• ${s}` : `• ${JSON.stringify(s)}`
          );
          srcBox.textContent = `來源（${data.sources.length}）\n${lines.join(
            "\n"
          )}`;
        } else {
          srcBox.textContent = "";
        }
      } catch (err) {
        const last = chatLog.lastElementChild;
        if (last) last.remove();
        bubble("assistant", `發生錯誤：${err.message}`);
        srcBox.textContent = "";
      } finally {
        submitBtn?.removeAttribute("disabled");
        card?.classList.remove("loading");
      }
    });
  }, []);

  /* =============================
     JSX UI
  ============================= */
  return (
    <div className="rag-page">
      <div className="rag-container">
        {/* HERO */}
        <div className="rag-hero">
          <h1>Energy RAG</h1>
          <p>
            Web · PDF · Audio/Video · Table — 專為能源資料檢索與決策支援打造的
            RAG 介面
          </p>

          <div className="rag-badges">
            <span className="rag-badge">LangChain · FAISS</span>
            <span className="rag-badge alt">OpenAI GPT</span>
            <span className="rag-badge">Clean Energy UI</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="rag-tabs">
          <button className="rag-tab active" data-target="#rag-chat">
            Chat
          </button>
          <button className="rag-tab" data-target="#rag-web">
            Web
          </button>
          <button className="rag-tab" data-target="#rag-pdf">
            PDF
          </button>
          <button className="rag-tab" data-target="#rag-av">
            Audio/Video
          </button>
          <button className="rag-tab" data-target="#rag-table">
            Table
          </button>
        </nav>

        {/* Panels */}
        <main className="rag-grid">
          <section id="rag-chat" className="rag-panel active">
            <div className="rag-card">
              <h3>訊息</h3>

              <form id="rag-form-chat" className="rag-form">
                <label>
                  <textarea
                    required
                    name="user"
                    rows="1"
                    placeholder="輸入你的問題或網址（自動啟用 RAG Web）"
                  />
                </label>

                <label>
                  （可選）系統提示 System
                  <input name="system" placeholder="例如：你是專業的私人助理" />
                </label>

                <label>
                  Session ID
                  <input name="session_id" placeholder="自訂字串或網址" />
                </label>

                <label className="rag-row">
                  <input type="checkbox" name="rag_auto" defaultChecked />
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

          {["web", "pdf", "av", "table"].map((id) => (
            <section key={id} id={`rag-${id}`} className="rag-panel">
              <div className="rag-card">（未實作 UI，可自行加入）</div>
            </section>
          ))}
        </main>
      </div>

      {/* ⭐⭐ 返回頂部按鈕 */}
      <BackToTopButton />
    </div>
  );
}

/* =============================
   返回頂部按鈕 Component
============================= */
function BackToTopButton() {
  useEffect(() => {
    const btn = document.querySelector(".back-to-top");

    const onScroll = () => {
      if (window.scrollY > 300) btn.classList.add("show");
      else btn.classList.remove("show");
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button className="back-to-top" onClick={scrollToTop}>
      ⬆︎
    </button>
  );
}
