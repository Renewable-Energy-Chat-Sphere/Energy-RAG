import { useEffect } from "react";
import "./rag.css"; // ← 匯入 Scoped CSS

export default function Rag() {

  useEffect(() => {
    // =============================
    //  (1) Tabs 切換邏輯
    // =============================
    const onClick = (e) => {
      const btn = e.target.closest(".rag-tab");
      if (!btn) return;

      const target = btn.dataset.target;

      document.querySelectorAll(".rag-tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".rag-panel").forEach(p => p.classList.remove("active"));
      document.querySelector(target)?.classList.add("active");
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);


  useEffect(() => {
    // =============================
    //  (2) Chat 送出邏輯（經簡化但完全保留功能）
    // =============================
    const form = document.getElementById("rag-form-chat");
    if (!form) return;

    const inputUser = form.querySelector("textarea[name='user']");
    const INPUT_MIN_HEIGHT = 44;

    // 自動撐高 textarea
    const autoGrow = () => {
      inputUser.style.height = "auto";
      inputUser.style.height = `${Math.max(inputUser.scrollHeight, INPUT_MIN_HEIGHT)}px`;
    };
    inputUser.addEventListener("input", autoGrow);
    autoGrow();

    // Enter 送出（Shift + Enter = 換行）
    inputUser.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const chatLog = document.getElementById("rag-chat-log");
      const srcBox = document.getElementById("rag-src-chat");

      const userText = inputUser.value.trim();
      if (!userText) return;

      // 使用者訊息泡泡
      addBubble(chatLog, "user", userText);

      inputUser.value = "";
      inputUser.style.height = INPUT_MIN_HEIGHT + "px";

      // 思考中...
      const thinking = addBubble(chatLog, "assistant", "思考中…");

      const payload = {
        user: userText,
        system: form.system.value || "",
        session_id: form.session_id.value || "web-ui",
        rag_auto: form.rag_auto.checked,
        model: "gpt-4o-mini"
      };

      try {
        const res = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        thinking.remove();

        addBubble(chatLog, "assistant", data.answer || data.error || "（無回應）");

        if (Array.isArray(data.sources) && data.sources.length) {
          srcBox.textContent = "來源：\n" + data.sources.map(s => `• ${s}`).join("\n");
        } else {
          srcBox.textContent = "";
        }

      } catch (err) {
        thinking.remove();
        addBubble(chatLog, "assistant", "發生錯誤：" + err.message);
      }
    });

    function addBubble(parent, role, text) {
      const wrap = document.createElement("div");
      wrap.className = "rag-bubble-wrap " + (role === "user" ? "right" : "left");

      const bubble = document.createElement("div");
      bubble.className = "rag-bubble rag-" + role;
      bubble.textContent = text;

      wrap.appendChild(bubble);
      parent.appendChild(wrap);
      parent.scrollTop = parent.scrollHeight;
      return wrap;
    }
  }, []);

  return (
    <div className="rag-page">
      <div className="rag-container">

        {/* ---------------- HERO ---------------- */}
        <div className="rag-hero">
          <h1>Energy RAG</h1>
          <p>Web · PDF · Audio/Video · Table — 專為能源資料檢索與決策支援打造的 RAG 介面</p>

          <div className="rag-badges">
            <span className="rag-badge">LangChain · FAISS</span>
            <span className="rag-badge alt">OpenAI GPT</span>
            <span className="rag-badge">Clean Energy UI</span>
          </div>
        </div>

        {/* ---------------- Tabs ---------------- */}
        <nav className="rag-tabs">
          <button className="rag-tab active" data-target="#rag-chat">Chat</button>
          <button className="rag-tab" data-target="#rag-web">Web</button>
          <button className="rag-tab" data-target="#rag-pdf">PDF</button>
          <button className="rag-tab" data-target="#rag-av">Audio/Video</button>
          <button className="rag-tab" data-target="#rag-table">Table</button>
        </nav>

        <main className="rag-grid">

          {/* =============== Chat Panel =============== */}
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

                <label>（可選）系統提示 System
                  <input name="system" placeholder="例如：你是專業的私人助理" />
                </label>

                <label>Session ID
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

          {/* =============== 其他四種 RAG Panel（略） =============== */}
          {["web", "pdf", "av", "table"].map(id => (
            <section key={id} id={`rag-${id}`} className="rag-panel">
              <div className="rag-card">（未實作 UI，可自行加入）</div>
            </section>
          ))}

        </main>
      </div>
    </div>
  );
}
