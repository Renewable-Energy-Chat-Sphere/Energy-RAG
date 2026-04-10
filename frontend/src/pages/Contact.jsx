import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSchool, faPeopleGroup } from "@fortawesome/free-solid-svg-icons";
import BackToTopButton from "../components/BackToTopButton";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    feeling: "",
    message: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true); // 🔥 開始動畫

    try {
      const res = await fetch("http://127.0.0.1:8000/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.status === "success") {
        setSubmittedData(form);
        setShowSuccess(true);

        setForm({
          name: "",
          email: "",
          phone: "",
          feeling: "",
          message: "",
        });
      } else {
        alert("❌ 送出失敗");
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ 無法連線後端");
    }

    setLoading(false); // 🔥 結束動畫
  };
  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <h2 className="contact-title">聯絡我們</h2>

        <p className="contact-subtitle">
          如您對 EnerSphere TW（能源球 3D 視覺化與智慧能源代理系統）
          有任何建議、合作意願或技術問題，歡迎與我們聯繫。
        </p>

        <div className="contact-grid">
          {/* 左側資訊 */}
          <div className="contact-info-card">
            <h3 className="section-title">
              <FontAwesomeIcon icon={faPeopleGroup} />
              專案團隊
            </h3>

            <div className="info-block">
              <strong>指導教授</strong>
              <p>石佳惠｜159931@mail.fju.edu.tw</p>
            </div>

            <div className="info-block">
              <strong>專案成員</strong>
              <p>陳相叡｜412402165@cloud.fju.edu.tw</p>
              <p>周子芹｜412402036@cloud.fju.edu.tw</p>
              <p>呂羿辰｜412402244@cloud.fju.edu.tw</p>
              <p>張宇承｜412402335@cloud.fju.edu.tw</p>
            </div>

            <h3 className="section-title">
              <FontAwesomeIcon icon={faSchool} />
              所屬單位
            </h3>

            <p>
              天主教輔仁大學
              <br />
              資訊管理系｜多模態視覺能源研究團隊
            </p>
          </div>

          {/* 右側表單 */}
          <div className="contact-form-card">
            <div className="form-header">
              <h3 className="section-title">
                <FontAwesomeIcon icon={faClipboardList} className="form-icon" />
                意見表
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                姓名
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                電子郵件
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                電話號碼
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  required
                  onChange={handleChange}
                />
              </label>

              <label>
                使用感受
                <div className="radio-group">
                  {["非常滿意", "滿意", "一般", "不滿意", "非常不滿意"].map(
                    (item) => (
                      <label key={item}>
                        <input
                          type="radio"
                          name="feeling"
                          value={item}
                          checked={form.feeling === item}
                          onChange={handleChange}
                        />
                        {item}
                      </label>
                    ),
                  )}
                </div>
              </label>

              <label>
                待改進之處
                <textarea
                  name="message"
                  value={form.message}
                  rows="4"
                  onChange={handleChange}
                />
              </label>
              <button
                type="submit"
                className={`contact-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "寄送中" : "送出 Send"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <BackToTopButton />
      {showSuccess && (
        <div className="success-modal">
          <div className="success-card">
            <h3>✅ 已成功送出！</h3>

            <p className="success-text">以下是您填寫的資訊：</p>

            <div className="success-info">
              <p>
                <strong>姓名：</strong>
                {submittedData?.name}
              </p>
              <p>
                <strong>Email：</strong>
                {submittedData?.email}
              </p>
              <p>
                <strong>電話：</strong>
                {submittedData?.phone}
              </p>
              <p>
                <strong>滿意度：</strong>
                {submittedData?.feeling}
              </p>
              <p>
                <strong>內容：</strong>
                {submittedData?.message}
              </p>
            </div>

            <button
              className="success-btn"
              onClick={() => {
                const modal = document.querySelector(".success-modal");
                modal.classList.remove("show");

                setTimeout(() => {
                  setShowSuccess(false);
                }, 300); // 等動畫跑完
              }}
            >
              關閉
            </button>
          </div>
        </div>
      )}
      {/* CSS */}
      <style>{`
        .contact-section {
  padding: 80px 20px;
  background: transparent;
  color: var(--text);
  transition: background 0.3s ease, color 0.3s ease;
}

        .contact-container {
          max-width: 1100px;
          margin: auto;
        }

        .contact-title {
          text-align: center;
          font-size: 36px;
          margin-bottom: 10px;
        }

        .contact-subtitle {
          text-align: center;
          color: #f97316;
          margin-bottom: 50px;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .contact-info-card,
.contact-form-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: var(--glass);
  box-shadow: var(--shadow-soft);
  padding: 30px;              /* ⭐ 加這行 */
  border-radius: 16px;        /* ⭐ 加圓角 */
  transition: 0.3s ease;
}

        .contact-info-card:hover,
        .contact-form-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
        }

      .section-title {
  color: var(--section-title-color);
  margin-top: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.3s ease;
}

        .info-block {
          margin-bottom: 20px;
        }

        .contact-form-card form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .contact-form-card input,
        .contact-form-card textarea {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: #9c9c9c24;
          color: var(--text);
          border: 1px solid var(--border);
        }

        .contact-form-card input:focus,
        .contact-form-card textarea:focus {
          outline: 2px solid #0d2c6e;
        }

        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
        }

       .contact-btn {
  margin-top: 10px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #0d2c6e); /* ⭐ 直接給色 */
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.contact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.contact-btn:active {
  transform: scale(0.97);
}
  .success-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.success-card {
  background: var(--card-bg);
  color: var(--text);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(12px);

  box-shadow: 0 10px 40px rgba(0,0,0,0.4);

  padding: 30px;
  border-radius: 16px;
  width: 350px;
  text-align: center;
}
  .success-btn {
  margin-top: 15px;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d2c6e, #2563eb);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.success-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.success-btn:active {
  transform: scale(0.95);
}
  .success-text {
  color: var(--text);
  opacity: 0.9;
}
  .contact-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* loading 三點動畫 */
.contact-btn.loading::after {
  content: "...";
  animation: dots 1s steps(3, end) infinite;
}

@keyframes dots {
  0% { content: "."; }
  33% { content: ".."; }
  66% { content: "..."; }
}
      `}</style>
    </section>
  );
}
