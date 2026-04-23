function sentenceWriter(element, html, speed = 20) {
  element.innerHTML = "";

  let i = 0;

  function typing() {
    element.innerHTML = html.slice(0, i + 1);
    i++;

    if (i < html.length) {
      setTimeout(typing, speed);
    }
  }

  typing();
}
function renderMultiYearCards(results) {
  if (!Array.isArray(results) || !results.length) return "";

  return `
    <div class="energy-compare-grid">
      ${results
        .map(
          (item) => `
            <div class="energy-compare-panel">
              <h4>${item.year}年</h4>
              ${(item.top || [])
                .map(
                  (r, i) => `
                    <div class="energy-card-item">
                      <div class="energy-rank">#${i + 1}</div>
                      <div class="energy-main">
                        <div class="energy-title">${r.supply_name_zh}</div>
                        <div class="energy-sub">${r.supply_code}</div>
                      </div>
                      <div class="energy-value">${r.value}</div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}
function renderEnergyTopCards(results) {
  if (!Array.isArray(results) || !results.length) return "";

  return `
    <div class="energy-cards">
      ${results
        .map(
          (r, i) => `
            <div class="energy-card-item">
              <div class="energy-rank">#${i + 1}</div>
              <div class="energy-main">
                <div class="energy-title">${r.supply_name_zh || r.demand_name || "-"}</div>
                <div class="energy-sub">${r.supply_code || r.demand_code || ""}</div>
              </div>
              <div class="energy-value">${r.value ?? "-"}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderComparisonCards(results) {
  if (!results || typeof results !== "object") return "";

  if (results.comparison_type === "years_overall") {
  const top1 = results.top_year1 || [];
  const top2 = results.top_year2 || [];

  return `
    <div class="energy-compare-grid">
      <div class="energy-compare-panel">
        <h4>${results.year1}年</h4>
        ${top1.map((r, i) => `
          <div class="energy-card-item">
            <div class="energy-rank">#${i + 1}</div>
            <div class="energy-main">
              <div class="energy-title">${r.supply_name_zh}</div>
              <div class="energy-sub">${r.supply_code}</div>
            </div>
            <div class="energy-value">${r.value}</div>
          </div>
        `).join("")}
      </div>
      <div class="energy-compare-panel">
        <h4>${results.year2}年</h4>
        ${top2.map((r, i) => `
          <div class="energy-card-item">
            <div class="energy-rank">#${i + 1}</div>
            <div class="energy-main">
              <div class="energy-title">${r.supply_name_zh}</div>
              <div class="energy-sub">${r.supply_code}</div>
            </div>
            <div class="energy-value">${r.value}</div>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="energy-tags-wrap">
      ${results.common?.length ? `<div class="energy-tag-block"><strong>共同能源：</strong> ${results.common.join("、")}</div>` : ""}
      ${results.only_year1?.length ? `<div class="energy-tag-block"><strong>${results.year1}年較突出：</strong> ${results.only_year1.join("、")}</div>` : ""}
      ${results.only_year2?.length ? `<div class="energy-tag-block"><strong>${results.year2}年較突出：</strong> ${results.only_year2.join("、")}</div>` : ""}
    </div>
  `;
}

  if (results.comparison_type === "department_across_years") {
    const top1 = results.top_year1 || [];
    const top2 = results.top_year2 || [];

    return `
      <div class="energy-compare-grid">
        <div class="energy-compare-panel">
          <h4>${results.department}｜${results.year1}年</h4>
          ${top1
            .map(
              (r, i) => `
                <div class="energy-card-item">
                  <div class="energy-rank">#${i + 1}</div>
                  <div class="energy-main">
                    <div class="energy-title">${r.supply_name_zh}</div>
                    <div class="energy-sub">${r.supply_code}</div>
                  </div>
                  <div class="energy-value">${r.value}</div>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="energy-compare-panel">
          <h4>${results.department}｜${results.year2}年</h4>
          ${top2
            .map(
              (r, i) => `
                <div class="energy-card-item">
                  <div class="energy-rank">#${i + 1}</div>
                  <div class="energy-main">
                    <div class="energy-title">${r.supply_name_zh}</div>
                    <div class="energy-sub">${r.supply_code}</div>
                  </div>
                  <div class="energy-value">${r.value}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="energy-tags-wrap">
        ${
          results.common?.length
            ? `<div class="energy-tag-block"><strong>共同能源：</strong> ${results.common.join("、")}</div>`
            : ""
        }
        ${
          results.only_year1?.length
            ? `<div class="energy-tag-block"><strong>${results.year1}年較突出：</strong> ${results.only_year1.join("、")}</div>`
            : ""
        }
        ${
          results.only_year2?.length
            ? `<div class="energy-tag-block"><strong>${results.year2}年較突出：</strong> ${results.only_year2.join("、")}</div>`
            : ""
        }
      </div>
    `;
  }

  if (results.comparison_type === "departments_same_year") {
    const top1 = results.top_department1 || [];
    const top2 = results.top_department2 || [];

    return `
      <div class="energy-compare-grid">
        <div class="energy-compare-panel">
          <h4>${results.department1}${results.year ? `｜${results.year}年` : ""}</h4>
          ${top1
            .map(
              (r, i) => `
                <div class="energy-card-item">
                  <div class="energy-rank">#${i + 1}</div>
                  <div class="energy-main">
                    <div class="energy-title">${r.supply_name_zh}</div>
                    <div class="energy-sub">${r.supply_code}</div>
                  </div>
                  <div class="energy-value">${r.value}</div>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="energy-compare-panel">
          <h4>${results.department2}${results.year ? `｜${results.year}年` : ""}</h4>
          ${top2
            .map(
              (r, i) => `
                <div class="energy-card-item">
                  <div class="energy-rank">#${i + 1}</div>
                  <div class="energy-main">
                    <div class="energy-title">${r.supply_name_zh}</div>
                    <div class="energy-sub">${r.supply_code}</div>
                  </div>
                  <div class="energy-value">${r.value}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="energy-tags-wrap">
        ${
          results.common?.length
            ? `<div class="energy-tag-block"><strong>共同能源：</strong> ${results.common.join("、")}</div>`
            : ""
        }
        ${
          results.only_department1?.length
            ? `<div class="energy-tag-block"><strong>${results.department1}較突出：</strong> ${results.only_department1.join("、")}</div>`
            : ""
        }
        ${
          results.only_department2?.length
            ? `<div class="energy-tag-block"><strong>${results.department2}較突出：</strong> ${results.only_department2.join("、")}</div>`
            : ""
        }
      </div>
    `;
  }

  return "";
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
  const API = `${window.location.origin}/api`;

  async function generateFile(reportData = structuredData) {
    if (!reportData) {
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
          structured_data: reportData,
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
  async function generateExcel(reportData = structuredData) {
    if (!reportData) {
      alert("沒有可匯出的結構化資料");
      return;
    }

    try {
      const res = await fetch(`${API}/export_excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structured_data: reportData,
        }),
      });

      if (!res.ok) {
        throw new Error("Excel 生成失敗");
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = reportData.file_name
        ? reportData.file_name.replace(".pdf", ".xlsx")
        : "AI_Report.xlsx";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Excel 下載失敗");
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

        const data = await res.json(); // ⭐ 只留這一個

        thinkingWrap.remove();

        // ===== AI 回答 =====
        const aiWrap = document.createElement("div");
        aiWrap.className = "rag-message assistant";

        const inner = document.createElement("div");
        inner.className = "rag-message-inner";

        const card = document.createElement("div");
        card.className = "ai-card";

        let extraHtml = "";

        if (data.card_type === "comparison") {
          extraHtml = renderComparisonCards(data.results);
        } else if (data.card_type === "multi_year") {
          extraHtml = renderMultiYearCards(data.results);
        } else if (Array.isArray(data.results) && data.results.length) {
          const hasValueCards = data.results.every(
            (r) =>
              r && (r.supply_name_zh || r.demand_name) && r.value !== undefined,
          );

          if (hasValueCards) {
            extraHtml = renderEnergyTopCards(data.results);
          }
        }

        // 🔥 先放空
        card.innerHTML = "";

        // ⭐ 先解析 HTML
        let answerHtml = marked.parse(data.answer || "");

        // =====================================
        // 📎 資料來源 icon + tooltip（🔥新增）
        // =====================================
        const sourceMatch = answerHtml.match(/📎 資料來源：(.+)/);

        if (sourceMatch) {
          const sourceText = sourceMatch[1];

          const years = sourceText.match(/民國\d+年/g) || [];

          const tooltipItems = years
            .map((y) => `<div>計算公式如下：<br>
            將「${y}」年度能源平衡表的各能源使用量(x)除以該年度的總使用量(M)，得到各能源的使用比例。<br>
            <img 
                src="/Ener-Sphere/images/formula.png"
              />
            </div>`)
            .join("");

          const sourceHtml = `
            <div class="source-row">
              📎 ${sourceText}
              <span class="source-icon">ⓘ</span>
              <div class="source-tooltip">
                ${tooltipItems}
              </div>
            </div>
          `;

          // ⭐ 替換原本純文字
          answerHtml = answerHtml.replace(/📎 資料來源：.+/, sourceHtml);
        }

        // 🔥 打字動畫（用新的）
        sentenceWriter(card, answerHtml, 20);

        // 原本卡片（保留）
        card.insertAdjacentHTML("beforeend", extraHtml);

        inner.appendChild(card);
        aiWrap.appendChild(inner);
        chatLog.appendChild(aiWrap);

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
   TABLE — 問 Excel/CSV + 匯出報告
========================================================= */
  useEffect(() => {
    const form = document.getElementById("rag-form-table");
    if (!form) return;

    const handleSubmit = async (e) => {
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

      if (data.structured_data) {
        setStructuredData(data.structured_data);
      }

      const html = marked.parse(data.answer || "(無回應)");

      let buttons = "";

      if (data.structured_data) {
        buttons = `
        <div class="download-section">
          <hr/>
          <p><strong>📊 已生成完整報告</strong></p>
          <button id="excel-btn">下載檔案/報告</button>
        </div>
      `;
      }

      out.innerHTML = `
      <div class="ai-card">
        ${html}
        ${buttons}
      </div>
    `;

      setTimeout(() => {
        const excelBtn = document.getElementById("excel-btn");

        if (excelBtn) {
          excelBtn.onclick = () => {
            generateExcel(data.structured_data);
          };
        }
      }, 0);

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
    };

    form.addEventListener("submit", handleSubmit);

    // ⭐⭐⭐ 這裡才會真的生效
    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
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
