import { useEffect, useState } from "react";
import { marked } from "marked";
import "./rag.css";
import BackToTopButton from "../components/BackToTopButton";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
export default function Rag() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [structuredData, setStructuredData] = useState(null);
  const [exportFileName, setExportFileName] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionQuery, setPredictionQuery] = useState("");
  const [chatList, setChatList] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const deleteChat = (id) => {
    const updated = chatList.filter((chat) => chat.id !== id);

    if (!updated.length) {
      const newChat = {
        id: Date.now(),
        title: "新對話",
        html: "",
      };

      setChatList([newChat]);
      setCurrentChatId(newChat.id);

      localStorage.setItem("rag_chats", JSON.stringify([newChat]));

      localStorage.setItem("current_chat_id", newChat.id);

      const chatLog = document.getElementById("rag-chat-log");

      if (chatLog) {
        chatLog.innerHTML = "";
      }

      return;
    }

    setChatList(updated);

    localStorage.setItem("rag_chats", JSON.stringify(updated));

    localStorage.setItem("current_chat_id", updated[0].id);
    setCurrentChatId(updated[0].id);

    const chatLog = document.getElementById("rag-chat-log");

    if (chatLog) {
      chatLog.innerHTML = updated[0].html || "";
    }
  };

  const renameChat = (id, newTitle) => {
    const target = chatList.find((chat) => chat.id === id);

    if (!target) return;

    const finalTitle = newTitle.trim();

    if (!finalTitle) {
      return; // 不允許空白名稱
    }

    const updated = chatList.map((chat) =>
      chat.id === id
        ? {
            ...chat,
            title: finalTitle,
          }
        : chat,
    );

    setChatList(updated);

    localStorage.setItem("rag_chats", JSON.stringify(updated));
  };
  const createNewChat = () => {
    if (chatList[0]?.title === "新對話" && chatList[0]?.html === "") {
      return;
    }
    const chatLog = document.getElementById("rag-chat-log");

    if (currentChatId && chatLog) {
      saveCurrentChat(chatLog.innerHTML);
    }
    const newChat = {
      id: Date.now(),
      title: "新對話",
      html: "",
    };

    const updated = [newChat, ...chatList];

    setChatList(updated);
    setCurrentChatId(newChat.id);

    localStorage.setItem("rag_chats", JSON.stringify(updated));

    localStorage.setItem("current_chat_id", newChat.id);

    if (chatLog) {
      chatLog.innerHTML = "";
    }
  };

  const switchChat = (id) => {
    const chatLog = document.getElementById("rag-chat-log");

    if (currentChatId && chatLog) {
      saveCurrentChat(chatLog.innerHTML);
    }

    const target = chatList.find((c) => c.id === id);

    if (!target) return;

    setCurrentChatId(id);

    localStorage.setItem("current_chat_id", id);

    if (chatLog) {
      chatLog.innerHTML = target.html || "";
    }
  };
  const generateChatTitle = (text) => {
    text = text.trim();

    const removeWords = [
      "請問",
      "請幫我",
      "可以幫我",
      "詳細說明",
      "告訴我",
      "請解釋",
    ];

    removeWords.forEach((word) => {
      text = text.replace(word, "");
    });

    if (text.length <= 2) {
      return "新對話";
    }

    return text.length > 15 ? text.substring(0, 15) + "..." : text;
  };
  const saveCurrentChat = (html, chatId = null) => {
    const targetId =
      chatId ||
      currentChatId ||
      Number(localStorage.getItem("current_chat_id"));

    const chats = JSON.parse(localStorage.getItem("rag_chats")) || [];

    const updated = chats.map((chat) =>
      chat.id === targetId
        ? {
            ...chat,
            html,
          }
        : chat,
    );

    localStorage.setItem("rag_chats", JSON.stringify(updated));

    setChatList(updated);
  };
  const quickQuestions = [
    "民國92年使用最多的能源是什麼",

    "民國92年使用前三大的能源是什麼",

    "民國92年和民國93年的能源差異",

    "詳細說明風力發電是什麼",
  ];

  //const API = "/api";
  const API = "http://127.0.0.1:8000";

  async function downloadFile({
    endpoint,
    filename,
    errorKey,
    reportData = structuredData,
  }) {
    if (!reportData) {
      alert(t("rag.noExport"));
      return;
    }

    try {
      const res = await fetch(`${API}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structured_data: reportData,
        }),
      });

      if (!res.ok) {
        throw new Error(t(errorKey));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(t("rag.downloadError"));
    }
  }

  /* CHAT */
  useEffect(() => {
    // 載入聊天紀錄
    const savedChats = JSON.parse(localStorage.getItem("rag_chats")) || [];
    const lastChatId = Number(localStorage.getItem("current_chat_id"));
    if (!savedChats.length) {
      const firstChat = {
        id: Date.now(),
        title: "新對話",
        html: "",
      };

      setChatList([firstChat]);

      setCurrentChatId(firstChat.id);

      localStorage.setItem("rag_chats", JSON.stringify([firstChat]));
      localStorage.setItem("current_chat_id", firstChat.id);
    }
    if (savedChats.length) {
      setChatList(savedChats);

      const activeChat =
        savedChats.find((c) => c.id === lastChatId) || savedChats[0];

      setCurrentChatId(activeChat.id);

      setTimeout(() => {
        const chatLog = document.getElementById("rag-chat-log");

        if (chatLog) {
          chatLog.innerHTML = activeChat.html || "";
        }
      }, 100);
    }

    const form = document.getElementById("rag-form-chat");
    if (!form) return;

    const inputUser = form.querySelector("textarea[name='user']");
    const inputSystem = form.querySelector("input[name='system']");
    const inputSid = form.querySelector("input[name='session_id']");
    const inputRag = form.querySelector("input[name='rag_auto']");
    const chatLog = document.getElementById("rag-chat-log");
    const handleScroll = () => {
      if (!chatLog) return;

      setShowScrollTop(chatLog.scrollTop > 300);
    };

    chatLog?.addEventListener("scroll", handleScroll);
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
      inputUser.addEventListener("input", resetHeight);

      requestAnimationFrame(resetHeight);

      /* Shift+Enter 換行 */
      inputUser.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          form.requestSubmit();
        }
      });
    }

    /* Chat 提交 */
    const handleSubmit = async (e) => {
      chatLog.classList.add("active");
      document.querySelector(".rag-chat-wrapper")?.classList.add("active");

      e.preventDefault();

      const userText = inputUser.value.trim();
      const chats = JSON.parse(localStorage.getItem("rag_chats")) || [];

      const activeChatId = Number(localStorage.getItem("current_chat_id"));

      const currentChat = chats.find((c) => c.id === activeChatId);

      if (
        currentChat &&
        (currentChat.title === "New Chat" || currentChat.title === "新對話")
      ) {
        const updated = chats.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                title: generateChatTitle(userText),
              }
            : chat,
        );

        setChatList(updated);

        localStorage.setItem("rag_chats", JSON.stringify(updated));
      }
      const isPrediction =
        /(預測)|(明年)|(後年)|(未來\s*\d+\s*年)|(203\d)|(204\d)/i.test(
          userText,
        );

      if (isPrediction) {
        const userWrap = document.createElement("div");
        userWrap.className = "rag-message user";

        userWrap.innerHTML = `
    <div class="rag-message-inner">
      <div class="user-bubble">
        ${userText}
      </div>
    </div>
  `;

        chatLog.appendChild(userWrap);

        const aiWrap = document.createElement("div");
        aiWrap.className = "rag-message assistant";

        aiWrap.innerHTML = `
    <div class="rag-message-inner">
      <div class="ai-card prediction-redirect-card">

        <h4
          style="
            display:flex;
            align-items:center;
            gap:8px;
            margin-bottom:10px;
          "
        >
          <i
            class="fi fi-rr-sparkles"
            style="
              color:#a855f7;
              filter:drop-shadow(0 0 6px #a855f7);
            "
          ></i>

          已連接至 AI 預測分析模組
        </h4>

        <p>
          系統偵測到此問題屬於未來能源預測分析，
          即將前往預測頁面進行計算。
        </p>

      </div>
    </div>
  `;

        chatLog.appendChild(aiWrap);

        saveCurrentChat(chatLog.innerHTML, activeChatId);

        sessionStorage.setItem("prediction_return_chat", activeChatId);

        navigate(`/prediction?q=${encodeURIComponent(userText)}`);

        return;
      }
      const fileInput = form.querySelector("input[name='file']");
      const file = fileInput?.files?.[0];

      inputUser.value = "";
      inputUser.style.height = "auto";
      setSelectedFileName("");

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
          ${file ? `<div class="upload-file-name">📄 ${file.name}</div>` : ""}
        </div>
      `;

      userWrap.appendChild(userInner);
      chatLog.appendChild(userWrap);
      chatLog.scrollTop = chatLog.scrollHeight;
      saveCurrentChat(chatLog.innerHTML, currentChatId);
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

        let cleanAnswer = data.answer || data.message || "";

        // 移除 structured_data 區塊
        cleanAnswer = cleanAnswer.replace(
          /structured_data[\s\S]*?(接下來|接著|我將|我會)/gi,
          "$1",
        );

        // 移除 json 標題 + JSON內容
        cleanAnswer = cleanAnswer.replace(
          /json[\s\S]*?(接下來|接著|我將|我會)/gi,
          "$1",
        );

        cleanAnswer = cleanAnswer.replace(/接下來，我將生成[\s\S]*/gi, "");

        // markdown → html
        let answerHtml = marked.parse(cleanAnswer);

        // Source Tooltip
        const sourceMatch = answerHtml.match(
          /🔗\s*(資料來源|Source)[:：]\s*(.+)/,
        );

        if (sourceMatch) {
          const sourceText = sourceMatch[2];

          const years = sourceText.match(/民國\d+年|Year\s*\d+/g) || [];

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

        // 直接渲染 HTML（不要逐字動畫）
        answerBox.innerHTML = answerHtml.replace(
          /<a /g,
          '<a target="_blank" rel="noopener noreferrer" ',
        );

        // 直接加入額外卡片
        if (extraHtml) {
          card.insertAdjacentHTML("beforeend", extraHtml);
        }

        requestAnimationFrame(() => {
          chatLog.scrollTo({
            top: chatLog.scrollHeight,
            behavior: "smooth",
          });
        });

        setTimeout(() => {
          chatLog.scrollTo({
            top: chatLog.scrollHeight,
            behavior: "smooth",
          });
        }, 100);

        // Download Button
        const sd = data?.structured_data?.data || data?.structured_data;

        if (sd) {
          // 存真正表格資料
          setStructuredData(sd);

          // 存檔名
          setExportFileName(
            data?.structured_data?.file_name || "AI_Report.xlsx",
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

          card.insertAdjacentHTML("beforeend", buttons);

          // PDF
          const pdfBtn = card.querySelector(".pdf-btn");

          if (pdfBtn) {
            pdfBtn.onclick = () => {
              downloadFile({
                endpoint: "export_pdf",
                filename:
                  exportFileName.replace(".xlsx", ".pdf") || "AI_Report.pdf",
                errorKey: "rag.pdfError",
                reportData: sd,
              });
            };
          }

          // XLSX
          const excelBtn = card.querySelector(".excel-btn");

          if (excelBtn) {
            excelBtn.onclick = () => {
              downloadFile({
                endpoint: "export_excel",
                filename: exportFileName || "AI_Report.xlsx",
                errorKey: "rag.excelError",
                reportData: sd,
              });
            };
          }
        }

        inner.appendChild(card);
        aiWrap.appendChild(inner);
        chatLog.appendChild(aiWrap);
        saveCurrentChat(chatLog.innerHTML, activeChatId);
        setTimeout(() => {
          const y =
            aiWrap.getBoundingClientRect().bottom +
            window.scrollY -
            window.innerHeight +
            220;

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }, 100);
      } catch (err) {
        console.error(err);

        const errWrap = document.createElement("div");

        errWrap.className = "rag-message assistant";

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

      chatLog?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="rag-page">
      <div className="rag-container">
        {/* HERO */}

        <div className="chat-layout">
          <div className="chat-sidebar">
            <button className="new-chat-btn" onClick={createNewChat}>
              ＋ {t("rag.newChat")}
            </button>

            <div className="history-header">
              <i className="fi fi-rr-time-past"></i>
              <span>{t("rag.history")}</span>
            </div>

            {chatList.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${
                  currentChatId === chat.id ? "active" : ""
                }`}
                onClick={() => switchChat(chat.id)}
              >
                <>
                  <div className="chat-row">
                    {editingChatId === chat.id ? (
                      <input
                        className="chat-title-input"
                        defaultValue={chat.title}
                        autoFocus
                        onBlur={(e) => {
                          renameChat(chat.id, e.target.value);
                          setEditingChatId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameChat(chat.id, e.target.value);
                            setEditingChatId(null);
                          }
                        }}
                      />
                    ) : (
                      <span className="chat-title">{chat.title}</span>
                    )}
                    <i
                      className="fi fi-rr-menu-dots"
                      onClick={(e) => {
                        e.stopPropagation();

                        setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                        document.addEventListener(
                          "click",
                          () => setOpenMenuId(null),
                          { once: true },
                        );
                      }}
                    />

                    {openMenuId === chat.id && (
                      <div className="chat-menu">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(chat.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <i className="fi fi-rr-edit"></i>
                          {t("rag.renameChat")}
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <i className="fi fi-rr-trash"></i>
                          {t("rag.deleteChat")}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              </div>
            ))}
          </div>

          <div className="chat-main">
            <div className="rag-hero">
              <h1>Energy RAG Assistant</h1>

              <p>{t("rag.subtitle")}</p>

              <div className="rag-badges">
                <span className="rag-badge">{t("rag.badge1")}</span>
                <span className="rag-badge alt">{t("rag.badge2")}</span>
                <span className="rag-badge">{t("rag.badge3")}</span>
              </div>
            </div>
            {/* 聊天主區 */}
            <div className="rag-chat-wrapper">
              {/* 聊天紀錄 */}
              <div id="rag-chat-log" className="rag-chat-log"></div>

              {/* 輸入列 */}
              <form
                id="rag-form-chat"
                className="rag-unified-form"
                encType="multipart/form-data"
              >
                {" "}
                {/* 上傳按鈕 */}
                <label
                  className="upload-btn"
                  data-tooltip={t("rag.uploadFile")}
                >
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
                  {/* 快速問題 bubbles */}
                  <div className="quick-question-wrap">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        className="quick-question-bubble"
                        onClick={() => {
                          const textarea = document.querySelector(
                            "#rag-form-chat textarea[name='user']",
                          );

                          if (!textarea) return;

                          // 填入問題
                          textarea.value = q;

                          // 觸發 input 事件（讓 auto resize 生效）
                          textarea.dispatchEvent(
                            new Event("input", { bubbles: true }),
                          );

                          // 自動 submit
                          document
                            .getElementById("rag-form-chat")
                            ?.requestSubmit();
                        }}
                      >
                        <i className="fi fi-sr-bulb bubble-icon"></i>
                        {q}
                      </button>
                    ))}
                  </div>

                  {selectedFileName && (
                    <div className="selected-file-inside">
                      <span className="file-name">🔗 {selectedFileName}</span>

                      <span
                        className="remove-file-btn"
                        onClick={() => {
                          const fileInput =
                            document.getElementsByName("file")[0];

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
                <div className="send-btn-group">
                  {/* 回到最頂 */}
                  <button
                    type="button"
                    className={`
                  scroll-top-floating
                  ${showScrollTop ? "show" : "hide"}
                `}
                    onClick={() => {
                      const chatLog = document.getElementById("rag-chat-log");

                      if (!chatLog) return;

                      chatLog.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    ⬆
                  </button>

                  {/* 送出 */}
                  <button type="submit">➤</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {showPredictionModal && (
        <div className="prediction-modal-overlay">
          <div className="prediction-modal">
            <h3 className="prediction-title">
              <i className="fi fi-sr-sparkles"></i>
              {t("rag.predictionTitle")}
            </h3>
            <p>{t("rag.predictionRedirect")}</p>

            <div className="prediction-modal-actions">
              <button
                className="prediction-cancel"
                onClick={() => setShowPredictionModal(false)}
              >
                {t("rag.cancel")}
              </button>

              <button
                className="prediction-confirm"
                onClick={() => {
                  navigate(
                    `/prediction?q=${encodeURIComponent(predictionQuery)}`,
                  );
                }}
              >
                {t("rag.goPrediction")}
              </button>
            </div>
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}

/* helper functions */
function renderMultiYearCards(results, t) {
  if (!Array.isArray(results) || !results.length) return "";

  return `
    <div class="energy-compare-grid">
      ${results
        .map(
          (item) => `
            ${renderComparePanel(
              t("rag.yearLabel", {
                year: item.year,
              }),
              item.top || [],
            )}
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
      ${results.map(renderEnergyItem).join("")}
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
      ${renderComparePanel(
        t("rag.yearLabel", {
          year: results.year1,
        }),
        top1,
      )}

      ${renderComparePanel(
        t("rag.yearLabel", {
          year: results.year2,
        }),
        top2,
      )}
    </div>
    <div class="energy-tags-wrap">
      ${
        results.common?.length
          ? `
        <div class="energy-tag-block"><strong>${t("rag.commonEnergy")}：</strong> ${results.common.join(t("rag.separator"))}</div>`
          : ""
      }
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
        ${renderComparePanel(
          `${results.department}｜
          ${t("rag.yearLabel", {
            year: results.year1,
          })}`,
          top1,
        )}

        ${renderComparePanel(
          `${results.department}｜
          ${t("rag.yearLabel", {
            year: results.year2,
          })}`,
          top2,
        )}
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
        ${renderComparePanel(
          `${results.department1}${
            results.year
              ? `｜${t("rag.yearLabel", {
                  year: results.year,
                })}`
              : ""
          }`,
          top1,
        )}

        ${renderComparePanel(
          `${results.department2}${
            results.year
              ? `｜${t("rag.yearLabel", {
                  year: results.year,
                })}`
              : ""
          }`,
          top2,
        )}
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

function renderEnergyItem(r, i) {
  const usage =
    r.total_supply && r.value
      ? ((r.total_supply * r.value) / 1000).toLocaleString()
      : null;

  return `
    <div class="energy-card-item">

      <div class="energy-rank">
        #${i + 1}
      </div>

      <div class="energy-main">

        <div class="energy-title">
          ${r.supply_name_zh || r.demand_name || "-"}
        </div>

        <div class="energy-sub">
          ${r.supply_code || r.demand_code || ""}
        </div>

      </div>

      <div class="energy-value">

        <div>
          ${typeof r.value === "number" ? `${r.value.toFixed(2)}%` : "-"}
        </div>

        ${
          usage
            ? `<div class="energy-usage">
                 ${usage} toe
               </div>`
            : ""
        }

      </div>

    </div>
  `;
}

function renderComparePanel(title, items) {
  return `
    <div class="energy-compare-panel">
      <h4>${title}</h4>
      ${items.map(renderEnergyItem).join("")}
    </div>
  `;
}
