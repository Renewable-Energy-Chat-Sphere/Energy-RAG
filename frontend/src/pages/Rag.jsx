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

function renderMultiYearCards(results, t) {
  if (!Array.isArray(results) || !results.length) return "";

  return `
    <div class="energy-compare-grid">
      ${results
        .map(
          (item) => `
            <div class="energy-compare-panel">
<h4>${t("rag.yearLabel", { year: item.year })}</h4>
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

function renderComparisonCards(results, t) {
  if (!results || typeof results !== "object") return "";

  if (results.comparison_type === "years_overall") {
    const top1 = results.top_year1 || [];
    const top2 = results.top_year2 || [];

    return `
    <div class="energy-compare-grid">
      <div class="energy-compare-panel">
       <h4>${t("rag.yearLabel", { year: results.year1 })}</h4>
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
        <h4>${t("rag.yearLabel", { year: results.year2 })}</h4>
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
      ${results.common?.length ? `<div class="energy-tag-block"><strong>${t("rag.commonEnergy")}：</strong> ${results.common.join(t("rag.separator"))}</div>` : ""}
     ${
       results.only_year1?.length
         ? `<div class="energy-tag-block">
        <strong>
          ${t("rag.yearHighlight", { year: results.year1 })}：
        </strong>
        ${results.only_year1.join(t("rag.separator"))}
      </div>`
         : ""
     }

${
  results.only_year2?.length
    ? `<div class="energy-tag-block">
        <strong>
          ${t("rag.yearHighlight", { year: results.year2 })}：
        </strong>
        ${results.only_year2.join(t("rag.separator"))}
      </div>`
    : ""
}
    </div>
  `;
  }

  if (results.comparison_type === "department_across_years") {
    const top1 = results.top_year1 || [];
    const top2 = results.top_year2 || [];

    return `
      <div class="energy-compare-grid">
        <div class="energy-compare-panel">
<h4>
  ${results.department}｜
  ${t("rag.yearLabel", { year: results.year1 })}
</h4>          ${top1
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
          <h4>
  ${results.department}｜
  ${t("rag.yearLabel", { year: results.year2 })}
</h4>
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
           ? `
      <div class="energy-tag-block">
        <strong>${t("rag.commonEnergy")}：</strong>
        ${results.common.join(t("rag.separator"))}
      </div>
    `
           : ""
       }

${
  results.only_year1?.length
    ? `
      <div class="energy-tag-block">
        <strong>
          ${t("rag.yearHighlight", {
            year: results.year1,
          })}：
        </strong>
        ${results.only_year1.join(t("rag.separator"))}
      </div>
    `
    : ""
}

${
  results.only_year2?.length
    ? `
      <div class="energy-tag-block">
        <strong>
          ${t("rag.yearHighlight", {
            year: results.year2,
          })}：
        </strong>
        ${results.only_year2.join(t("rag.separator"))}
      </div>
    `
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
          <h4>${results.department1}${results.year ? `｜${t("rag.yearLabel", { year: results.year })}` : ""}</h4>
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
<h4>
  ${results.department2}
  ${
    results.year
      ? `｜${t("rag.yearLabel", {
          year: results.year,
        })}`
      : ""
  }
</h4>
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
            ? `
      <div class="energy-tag-block">
        <strong>${t("rag.commonEnergy")}：</strong>
        ${results.common.join(t("rag.separator"))}
      </div>
    `
            : ""
        }

${
  results.only_department1?.length
    ? `
      <div class="energy-tag-block">
        <strong>
          ${t("rag.departmentHighlight", {
            department: results.department1,
          })}：
        </strong>
        ${results.only_department1.join(t("rag.separator"))}
      </div>
    `
    : ""
}

${
  results.only_department2?.length
    ? `
      <div class="energy-tag-block">
        <strong>
          ${t("rag.departmentHighlight", {
            department: results.department2,
          })}：
        </strong>
        ${results.only_department2.join(t("rag.separator"))}
      </div>
    `
    : ""
}
      </div>
    `;
  }

  return "";
}

function showLoading(element, text = "Loading...") {
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
import { marked } from "marked";
import "./rag.css";
import BackToTopButton from "../components/BackToTopButton";
import { useTranslation } from "react-i18next";
export default function Rag() {
  const { t } = useTranslation();
  const [structuredData, setStructuredData] = useState(null);
  const [loading, setLoading] = useState(false);
  const API = "/api";
  async function generateFile(reportData = structuredData) {
    if (!reportData) {
      alert(t("rag.noExport"));
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
        throw new Error(t("rag.pdfError"));
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
      alert(t("rag.downloadError"));
    }
  }
  async function generateExcel(reportData = structuredData) {
    if (!reportData) {
      alert(t("rag.noExport"));
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
        throw new Error(t("rag.excelError"));
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
      alert(t("rag.excelDownloadError"));
    }
  }

  /* CHAT */
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

    /* 自動撐高 */
    const resetHeight = () => {
      inputUser.style.height = "auto";
      inputUser.style.height = `${Math.max(
        inputUser.scrollHeight,
        INPUT_MIN_HEIGHT,
      )}px`;
    };
    inputUser.addEventListener("input", resetHeight);
    requestAnimationFrame(resetHeight);

    /* Shift+Enter 換行，Enter 送出 */
    inputUser.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    /* 泡泡 UI */
    const bubble = (role, html, isLoading = false) => {
      const wrap = document.createElement("div");
      wrap.className =
        role === "user" ? "rag-bubble-wrap right" : "rag-bubble-wrap left";

      const b = document.createElement("div");
      b.className =
        role === "user" ? "rag-bubble user" : "rag-bubble assistant";

      if (isLoading) {
        b.innerHTML = t("rag.thinking");
      } else {
        b.innerHTML = marked.parse(html);
      }

      wrap.appendChild(b);
      chatLog.appendChild(wrap);
      chatLog.scrollTop = chatLog.scrollHeight;
    };

    /* Chat 提交 */
    const handleSubmit = async (e) => {
      e.preventDefault();

      const userText = inputUser.value.trim();

      if (!userText) return;
      inputUser.value = "";
      inputUser.value = "";
      inputUser.style.height = "48px";
      
      // 使用者訊息
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

        // AI 回答
        const aiWrap = document.createElement("div");
        aiWrap.className = "rag-message assistant";

        const inner = document.createElement("div");
        inner.className = "rag-message-inner";

        const card = document.createElement("div");
        card.className = "ai-card";

        let extraHtml = "";

        if (data.card_type === "comparison") {
          extraHtml = renderComparisonCards(data.results, t);
        } else if (data.card_type === "multi_year") {
          extraHtml = renderMultiYearCards(data.results, t);
        } else if (Array.isArray(data.results) && data.results.length) {
          const hasValueCards = data.results.every(
            (r) =>
              r && (r.supply_name_zh || r.demand_name) && r.value !== undefined,
          );

          if (hasValueCards) {
            extraHtml = renderEnergyTopCards(data.results);
          }
        }

        card.innerHTML = "";

        // 解析 HTML
        let answerHtml = marked.parse(data.answer || "");

        // 資料來源 icon + tooltip
        const sourceMatch = answerHtml.match(
          /📎\s*(資料來源|Source)[:：]\s*(.+)/,
        );

        if (sourceMatch) {
          const sourceText = sourceMatch[2];

          const years = sourceText.match(/民國\d+年|Year\s*\d+/g) || [];

          const tooltipItems = years
            .map(
              (y) => `
      <div>
        ${t("rag.formula")}<br>
        ${t("rag.formulaDesc", { year: y })}<br>
        <img 
          src="/Ener-Sphere/images/formula.png"
        />
      </div>`,
            )
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

          // 替換原本純文字
          answerHtml = answerHtml.replace(
            /📎\s*(資料來源|Source)[:：].+/,
            sourceHtml,
          );
        }

        // 打字動畫（用新的）
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

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, []);

  /* Web */
  useEffect(() => {
    const form = document.getElementById("rag-form-web");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const question = form.question.value.trim();
      const url = form.url.value.trim();
      const out = document.getElementById("out-web");
      const src = document.getElementById("src-web");

      showLoading(out, t("rag.loadingWeb"));
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
      const html = marked.parse(data.answer || t("rag.noResponse"));

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

  /* PDF */
  useEffect(() => {
    const form = document.getElementById("rag-form-pdf");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();
      const out = document.getElementById("out-pdf");
      const src = document.getElementById("src-pdf");

      showLoading(out, t("rag.loadingPdf"));
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_pdf`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (data.structured_data && data.structured_data.data) {
        setStructuredData(data.structured_data);
        console.log("structuredData:", data.structured_data);
      }
      
      let answerText = data.answer || t("rag.noResponse");
      let buttons = "";

      if (data.structured_data) {
        buttons = `
  <div class="download-section">
    <hr/>
    <p><strong>📄 ${t("rag.generated")}</strong></p>
    <button id="pdf-btn">${t("rag.download")}</button>
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

  /* AV (問影片/音訊) */
  useEffect(() => {
    const form = document.getElementById("rag-form-av");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();

      const out = document.getElementById("out-av");
      const src = document.getElementById("src-av");

      showLoading(out, t("rag.loadingAv"));
      src.textContent = "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("question", question);

      const res = await fetch(`${API}/ask_av`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      // 如果有 structured_data 存起來
      if (data.structured_data) {
        setStructuredData(data.structured_data);
      }

      const html = marked.parse(data.answer || t("rag.noResponse"));

      out.innerHTML = `
      <div class="ai-card">
        ${html}
      </div>
    `;

      // 動畫效果（跟 Web 一樣）
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

      // 來源顯示
      if (data.sources?.length) {
        src.innerHTML = `
        <div class="source-card">
          <strong>🎬 ${t("rag.avSource")}：</strong>
          ${data.sources.map((s) => `<div>• ${s}</div>`).join("")}
        </div>
      `;
      }
    });
  }, []);

  /* TABLE (問 Excel/CSV + 匯出報告) */
  useEffect(() => {
    const form = document.getElementById("rag-form-table");
    if (!form) return;

    const handleSubmit = async (e) => {
      e.preventDefault();

      const file = form.file.files[0];
      const question = form.question.value.trim();

      const out = document.getElementById("out-table");
      const src = document.getElementById("src-table");

      showLoading(out, t("rag.loadingTable"));
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

      const html = marked.parse(data.answer || t("rag.noResponse"));

      let buttons = "";

      if (data.structured_data) {
        buttons = `
        <div class="download-section">
          <hr/>
          <p><strong>📊 ${t("rag.generated")}</strong></p>
          <button id="excel-btn">${t("rag.download")}</button>
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
          <strong>📊 ${t("rag.tableSource")}：</strong>
          ${data.sources
            .map(
              (s) =>
                `<div>• ${s.sheet}（${s.rows} ${t("rag.rows")} / ${s.columns_count} ${t("rag.cols")}</div>`,
            )
            .join("")}
        </div>
      `;
      }
    };

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, []);

  return (
    <div className="rag-page">
      <div className="rag-container">

        {/* HERO */}
        <div className="rag-hero">
          <h1>Energy RAG Assistant</h1>

          <p>{t("rag.subtitle")}</p>

          <div className="rag-badges">
            <span className="rag-badge">{t("rag.badge1")}</span>
            <span className="rag-badge alt">
              {t("rag.badge2")}
            </span>
            <span className="rag-badge">
              {t("rag.badge3")}
            </span>
          </div>
        </div>

        {/* 聊天主區 */}
        <div className="rag-chat-wrapper">

          {/* 聊天紀錄 */}
          <div
            id="rag-chat-log"
            className="rag-chat-log"
          >
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

          {/* 輸入列 */}
          <form
            id="rag-form-chat"
            className="rag-unified-form"
            encType="multipart/form-data"
          >

            {/* 上傳按鈕 */}
            <label className="upload-btn">

              +

              <input
                type="file"
                name="file"
                hidden
                accept="
                  .pdf,
                  .xlsx,
                  .xls,
                  .csv,
                  .txt,
                  audio/*,
                  video/*
                "
              />
            </label>

            {/* 文字輸入 */}
            <textarea
              name="user"
              rows="1"
              required
              placeholder={t("rag.chatPlaceholder")}
            />

            {/* 送出 */}
            <button type="submit">
              ➤
            </button>
          </form>
        </div>
      </div>

      <BackToTopButton />
    </div>
  );
}
