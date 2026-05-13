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
  const [exportFileName, setExportFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  
  const API = "/api";
  // const API = "http://127.0.0.1:8000";
  
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
      a.download = exportFileName.replace(".xlsx", ".pdf") || "AI_Report.pdf";

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
      a.download = exportFileName || "AI_Report.xlsx";

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
    
    /* textarea 存在才綁定 */
    if (inputUser) {

      inputUser.addEventListener(
        "input",
        resetHeight
      );

      requestAnimationFrame(
        resetHeight
      );

      /* Shift+Enter 換行 */
      inputUser.addEventListener(
        "keydown",
        (e) => {

          if (
            e.key === "Enter" &&
            !e.shiftKey
          ) {

            e.preventDefault();

            form.requestSubmit();
          }
        }
      );
    }

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
      chatLog.classList.add("active");
      document
        .querySelector(".rag-chat-wrapper")
        ?.classList.add("active");

      e.preventDefault();
      e.preventDefault();

      const userText = inputUser.value.trim();
      const fileInput = form.querySelector("input[name='file']");
      const file = fileInput?.files?.[0];

      inputUser.value = "";
      inputUser.style.height = "auto";
      setSelectedFileName("");

      if (!userText && !file) return;

      if (!userText && !file) return;

      inputUser.value = "";
      inputUser.style.height = "48px";

      if (fileInput) {
        fileInput.value = "";
      }

      // user message
      const userWrap = document.createElement("div");
      userWrap.className = "rag-message user";

      const userInner = document.createElement("div");
      userInner.className = "rag-message-inner";

      userInner.innerHTML = `
        <div class="user-bubble">
          ${marked.parse(userText || "🔗 Uploaded File")}
          ${
            file
              ? `<div class="upload-file-name">📄 ${file.name}</div>`
              : ""
          }
        </div>
      `;

      userWrap.appendChild(userInner);
      chatLog.appendChild(userWrap);
      chatLog.scrollTop = chatLog.scrollHeight;

      try {

        // Thinking UI
        const thinkingWrap = document.createElement("div");
        thinkingWrap.className = "rag-message assistant";

        const thinkingInner = document.createElement("div");
        thinkingInner.className = "rag-message-inner";

        thinkingInner.innerHTML = `
          <div class="ai-card thinking">
            <span></span>
            <span></span>
            <span></span>
          </div>
        `;

        thinkingWrap.appendChild(thinkingInner);
        chatLog.appendChild(thinkingWrap);
        chatLog.scrollTop = chatLog.scrollHeight;

        // FormData
        const fd = new FormData();
        fd.append("user", userText);
        fd.append("system", inputSystem?.value || "");
        fd.append("session_id", inputSid?.value || "web-ui");
        fd.append("rag_auto", !!inputRag?.checked);
        fd.append("model", "gpt-4o-mini");

        if (file) {
          fd.append("file", file);
        }

        // API
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          body: fd,
        });

        const data = await res.json();

        thinkingWrap.remove();

        // AI Message
        const aiWrap = document.createElement("div");
        aiWrap.className = "rag-message assistant";

        const inner = document.createElement("div");
        inner.className = "rag-message-inner";

        const card = document.createElement("div");
        card.className = "ai-card";

        let extraHtml = "";

        if (data.card_type === "comparison") {
          extraHtml = renderComparisonCards(
            data.results,
            t,
          );

        } else if (
          data.card_type === "multi_year"
        ) {

          extraHtml = renderMultiYearCards(
            data.results,
            t,
          );

        } else if (
          Array.isArray(data.results) &&
          data.results.length
        ) {

          const hasValueCards = data.results.every(
            (r) =>
              r &&
              (
                r.supply_name_zh ||
                r.demand_name
              ) &&
              r.value !== undefined,
          );

          if (hasValueCards) {
            extraHtml = renderEnergyTopCards(
              data.results,
            );
          }
        }

        let cleanAnswer =
          data.answer || t("rag.noResponse");

        // 移除 structured_data 區塊
        cleanAnswer = cleanAnswer.replace(
          /structured_data[\s\S]*?(接下來|接著|我將|我會)/gi,
          "$1"
        );

        // 移除 json 標題 + JSON內容
        cleanAnswer = cleanAnswer.replace(
          /json[\s\S]*?(接下來|接著|我將|我會)/gi,
          "$1"
        );
        cleanAnswer = cleanAnswer.replace(
          /接下來，我將生成[\s\S]*/gi,
          ""
        );
        // markdown → html
        let answerHtml = marked.parse(cleanAnswer);
        

        // Source Tooltip
        const sourceMatch = answerHtml.match(
          /🔗\s*(資料來源|Source)[:：]\s*(.+)/,
        );

        if (sourceMatch) {
          const sourceText = sourceMatch[2];

          const years =
            sourceText.match(
              /民國\d+年|Year\s*\d+/g,
            ) || [];

          const tooltipItems = years
            .map(
              (y) => `
                <div>
                  ${t("rag.formula")}<br>
                  ${t("rag.formulaDesc", {
                    year: y,
                  })}<br>

                  <img 
                    src="/Ener-Sphere/images/formula.png"
                  />
                </div>
              `,
            )
            .join("");

          const sourceHtml = `
            <div class="source-row">
              🔗 ${sourceText}

              <span class="source-icon">
                ⓘ
              </span>

              <div class="source-tooltip">
                ${tooltipItems}
              </div>
            </div>
          `;

          answerHtml = answerHtml.replace(
            /🔗\s*(資料來源|Source)[:：].+/,
            sourceHtml,
          );
        }

        // Typing Animation
        card.innerHTML = `
          <div class="answer-box"></div>
        `;

        const answerBox = card.querySelector(".answer-box");

        // 只打字在 answer box
        sentenceWriter(answerBox, answerHtml, 20);

        // 等動畫完成再加 UI
        setTimeout(() => {

          const extra = extraHtml;

          if (extra) {
            answerBox.insertAdjacentHTML("afterend", extra);
          }

        }, 300);

        // Download Button
        const sd =
          data?.structured_data?.data ||
          data?.structured_data;

        if (sd) {

          // 🔥 存真正表格資料
          setStructuredData(sd);

          // 🔥 存檔名
          setExportFileName(
            data?.structured_data?.file_name ||
            "AI_Report.xlsx"
          );

          const buttons = `
            <div class="download-section">
              <hr/>

              <p>
                <strong>
                  📄 ${t("rag.generated")}
                </strong>
              </p>

              <div class="download-buttons">

                <button class="pdf-btn">
                  PDF
                </button>

                <button class="excel-btn">
                  XLSX
                </button>

              </div>
            </div>
          `;

          card.insertAdjacentHTML(
            "beforeend",
            buttons
          );

          // PDF
          const pdfBtn =
            card.querySelector(".pdf-btn");

          if (pdfBtn) {
            pdfBtn.onclick = () => {
              generateFile(sd);
            };
          }

          // XLSX
          const excelBtn =
            card.querySelector(".excel-btn");

          if (excelBtn) {
            excelBtn.onclick = () => {
              generateExcel(sd);
            };
          }
        }

        inner.appendChild(card);
        aiWrap.appendChild(inner);
        chatLog.appendChild(aiWrap);

        chatLog.scrollTop = chatLog.scrollHeight;
      } catch (err) {

        console.error(err);

        const errWrap =
          document.createElement("div");

        errWrap.className =
          "rag-message assistant";

        errWrap.innerHTML = `
          <div class="rag-message-inner">
            <div class="ai-card">
              ❌ ${err}
            </div>
          </div>
        `;

        chatLog.appendChild(errWrap);
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
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    setSelectedFileName(file.name);
                  }
                }}
              />
            </label>

            {/* 文字輸入 */}
            <div className="chat-input-area">
              {selectedFileName && (
                <div className="selected-file-inside">
                  <span className="file-name">
                    🔗 {selectedFileName}
                  </span>

                  <span
                    className="remove-file-btn"
                    onClick={() => {
                      const fileInput =
                        document.getElementsByName(
                          "file"
                        )[0];

                      if (fileInput) {
                        fileInput.value = "";
                      }

                      setSelectedFileName("");
                    }}
                  >
                    ✕
                  </span>

                </div>
              )}

              <textarea
                name="user"
                rows="1"
                placeholder={t("rag.chatPlaceholder")}
              />

            </div>

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
