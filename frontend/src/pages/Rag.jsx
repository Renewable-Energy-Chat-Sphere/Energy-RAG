function sentenceWriter(element, html, delay = 250) {
  element.innerHTML = "";

  const temp = document.createElement("div");
  temp.innerHTML = html;

  const nodes = Array.from(temp.childNodes);

  nodes.forEach((node, index) => {
    setTimeout(() => {
      const wrapper = document.createElement("div");
      wrapper.style.opacity = 0;

      wrapper.appendChild(node.cloneNode(true));
      element.appendChild(wrapper);

      setTimeout(() => {
        wrapper.style.transition = "opacity 0.4s ease";
        wrapper.style.opacity = 1;
      }, 50);
    }, index * delay);
  });
}
function showLoading(element, text = "處理中...") {
  element.innerHTML = `
    <div class="ai-card thinking">
      ${text}
      <div class="thinking">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}
import { useEffect, useState } from "react";
import { marked } from "marked"; //新增
import "./rag.css";
import BackToTopButton from "../components/BackToTopButton";

export default function Rag() {
  const [tab, setTab] = useState("chat");
  const [structuredData, setStructuredData] = useState(null);
  const [loading, setLoading] = useState(false);
  const API = "http://127.0.0.1:8000";

  async function generateFile(reportData = structuredData) {
    if (!reportData || !reportData.data) {
      alert("沒有可匯出的結構化資料");
      return;
    }

    try {
      const res = await fetch(`${API}/export_pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structured_data: reportData.data,
          file_name: reportData.file_name || "AI_Report.pdf",
        }),
      });

      if (!res.ok) {
        throw new Error("PDF 生成失敗");
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = reportData.file_name || "AI_Report.pdf";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("下載失敗");
    }
  }
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
        INPUT_MIN_HEIGHT,
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
    const bubble = (role, html, isLoading = false) => {
      const wrap = document.createElement("div");

      // ⭐ 這行決定左右
      wrap.className =
        role === "user" ? "rag-bubble-wrap right" : "rag-bubble-wrap left";

      const b = document.createElement("div");

      // ⭐ 這行決定樣式
      b.className =
        role === "user" ? "rag-bubble user" : "rag-bubble assistant";

      if (isLoading) {
        b.innerHTML = "思考中...";
      } else {
        b.innerHTML = marked.parse(html);
      }

      wrap.appendChild(b);
      chatLog.appendChild(wrap);
      chatLog.scrollTop = chatLog.scrollHeight;
    };

    /* ------- Chat 提交 ------- */
    const handleSubmit = async (e) => {
      e.preventDefault();

      const userText = inputUser.value.trim();

      if (!userText) return;
      inputUser.value = ""; // ⭐ 清空輸入框
      inputUser.value = "";
      inputUser.style.height = "44px";
      // ===== 使用者訊息 =====
      const userWrap = document.createElement("div");
      userWrap.className = "rag-message user";

      const userInner = document.createElement("div");
      userInner.className = "rag-message-inner";

      userInner.innerHTML = `
    <div class="user-bubble">
      ${marked.parse(userText)}
    </div>
  `;

      userWrap.appendChild(userInner);
      chatLog.appendChild(userWrap);
      chatLog.scrollTop = chatLog.scrollHeight;

      const payload = {
        user: userText,
        system: inputSystem?.value || "",
        session_id: inputSid?.value || "web-ui",
        rag_auto: !!inputRag?.checked,
        model: "gpt-4o-mini",
      };

      try {
        const thinkingWrap = document.createElement("div");
        thinkingWrap.className = "rag-message assistant";

        const thinkingInner = document.createElement("div");
        thinkingInner.className = "rag-message-inner";

        thinkingInner.innerHTML = `
    <div class="ai-card thinking">
      <span></span><span></span><span></span>
    </div>
  `;

        thinkingWrap.appendChild(thinkingInner);
        chatLog.appendChild(thinkingWrap);
        chatLog.scrollTop = chatLog.scrollHeight;
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        thinkingWrap.remove();

        // ===== AI 回答 =====
        // ===== AI 回答 =====
        const aiWrap = document.createElement("div");
        aiWrap.className = "rag-message assistant";

        const inner = document.createElement("div");
        inner.className = "rag-message-inner";

        const card = document.createElement("div");
        card.className = "ai-card";

        const html = marked.parse(data.answer || data.error || "（無回應）");
        card.innerHTML = html;

        inner.appendChild(card);
        aiWrap.appendChild(inner);
        chatLog.appendChild(aiWrap);
        chatLog.scrollTop = chatLog.scrollHeight;
        inner.appendChild(card);
        wrap.appendChild(inner);
        chatLog.appendChild(wrap);
        chatLog.scrollTop = chatLog.scrollHeight;
      } catch (err) {
        console.error(err);
      }
    };

    // ⭐ 綁定
    form.addEventListener("submit", handleSubmit);

    // ⭐⭐ 這行是重點（防止重複四次）
    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
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

      showLoading(out, "解析網站中");
      src.textContent = "";

      const payload = { question, url };
      setLoading(true);
      const res = await fetch(`${API}/ask_web`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.structured_data) {
        setStructuredData(data.structured_data);
      }
      const html = marked.parse(data.answer || "(無回應)");

      out.innerHTML = `<div class="ai-card">${html}</div>`;

      setTimeout(() => {
        out.querySelectorAll("h1, h2, ul, p").forEach((el, i) => {
          el.style.opacity = 0;
          el.style.transform = "translateY(10px)";
          setTimeout(() => {
            el.style.transition = "all 0.4s ease";
            el.style.opacity = 1;
            el.style.transform = "translateY(0)";
          }, i * 120);
        });
      }, 50);
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

      showLoading(out, "解析 PDF 中");
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_pdf`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      // ⭐⭐⭐ 加這段
      if (data.structured_data && data.structured_data.data) {
        setStructuredData(data.structured_data);
        console.log("structuredData:", data.structured_data);
      }
      let answerText = data.answer || "(無回應)";

      let buttons = "";

      if (data.structured_data) {
        buttons = `
  <div class="download-section">
    <hr/>
    <p><strong>📄 已生成完整報告</strong></p>
    <button id="pdf-btn">下載檔案/報告</button>
  </div>
`;
      }

      const html = marked.parse(answerText);

      out.innerHTML = `
      <div class="ai-card">
        ${html}
        ${buttons}
      </div>
    `;

      // 綁定按鈕
      setTimeout(() => {
        const pdfBtn = document.getElementById("pdf-btn");

        if (pdfBtn) {
          pdfBtn.onclick = () => {
            generateFile(data.structured_data);
          };
        }
      }, 0);
      src.textContent = (data.sources || []).join("\n");
    });
  }, []);

  /* =========================================================
     AV — 問影片/音訊
  ========================================================= */
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

      showLoading(out, "處理影音中");
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_av`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      // ⭐ 如果有 structured_data 存起來
      if (data.structured_data) {
        setStructuredData(data.structured_data);
      }

      const html = marked.parse(data.answer || "(無回應)");

      out.innerHTML = `
      <div class="ai-card">
        ${html}
      </div>
    `;

      // ⭐ 動畫效果（跟 Web 一樣）
      setTimeout(() => {
        out.querySelectorAll("h1, h2, ul, p").forEach((el, i) => {
          el.style.opacity = 0;
          el.style.transform = "translateY(10px)";
          setTimeout(() => {
            el.style.transition = "all 0.4s ease";
            el.style.opacity = 1;
            el.style.transform = "translateY(0)";
          }, i * 120);
        });
      }, 50);

      // ⭐ 來源顯示
      if (data.sources?.length) {
        src.innerHTML = `
        <div class="source-card">
          <strong>🎬 影音來源：</strong>
          ${data.sources.map((s) => `<div>• ${s}</div>`).join("")}
        </div>
      `;
      }
    });
  }, []);

  /* =========================================================
     TABLE — 問 Excel/CSV
  ========================================================= */
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

      showLoading(out, "解析表格中");
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_table`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!data.success) {
        out.innerHTML = `<div class="ai-card">❌ ${data.error}</div>`;
        return;
      }

      // ⭐ 解析 Markdown
      const html = marked.parse(data.answer || "(無回應)");

      out.innerHTML = `
      <div class="ai-card">
        ${html}
      </div>
    `;

      // ⭐ 來源顯示美化
      if (data.sources?.length) {
        src.innerHTML = `
        <div class="source-card">
          <strong>📊 表格來源：</strong>
          ${data.sources
            .map(
              (s) =>
                `<div>• ${s.sheet}（${s.rows} rows / ${s.columns_count} cols）</div>`,
            )
            .join("")}
        </div>
      `;
      }
    });
  }, []);

  /* =========================================================
     整個RAG頁面
  ========================================================= */
  return (
    <div className="rag-page">
      <div className="rag-container">
        {/* HERO */}
        <div className="rag-hero">
          <h1>Energy RAG</h1>
          <p>Chat / Web / PDF / Audio,Video / Table — 多模態能源資料檢索</p>

          <div className="rag-badges">
            <span className="rag-badge">多模態分析支援</span>
            <span className="rag-badge alt">能源決策助理</span>
            <span className="rag-badge">相關問題解答</span>
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
                    placeholder="請輸入您的問題。"
                  />
                </label>
                <label>
                  提示詞
                  <input name="system" placeholder="你是專業助手…" />
                </label>

                <label className="rag-row">
                  <input type="checkbox" name="rag_auto" defaultChecked />{" "}
                  自動偵測網址
                </label>
                <button type="submit">送出</button>
              </form>

              <article>
                <h3>對話</h3>
                <div id="rag-chat-log" className="rag-chat-log">
                  {loading && (
                    <div className="rag-message assistant">
                      <div className="rag-message-inner">
                        <div className="thinking">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                    placeholder="想問什麼？例如：這個網站的功能是甚麼?"
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
                    placeholder="想問任何PDF文件中的什麼內容？"
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
                    placeholder="想從影片/音訊找什麼？"
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
                    placeholder="想分析表格或是問問題嗎?例如：2024 總發電量是多少？"
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
