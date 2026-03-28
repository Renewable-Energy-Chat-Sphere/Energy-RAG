import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSchool, faPeopleGroup } from "@fortawesome/free-solid-svg-icons";
import BackToTopButton from "../components/BackToTopButton";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
export default function Contact() {
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
              <p>陳相叡｜412402165@m365.fju.edu.tw</p>
              <p>周子芹｜412402036@m365.fju.edu.tw</p>
              <p>呂羿辰｜412402244@m365.fju.edu.tw</p>
              <p>張宇承｜412402335@m365.fju.edu.tw</p>
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

            <form id="contactForm">
              <label>
                姓名
                <input type="text" required />
              </label>

              <label>
                電子郵件
                <input type="email" required />
              </label>

              <label>
                電話號碼
                <input type="tel" required />
              </label>

              <label>
                使用感受
                <div className="radio-group">
                  {["非常滿意", "滿意", "一般", "不滿意", "非常不滿意"].map(
                    (item) => (
                      <label key={item}>
                        <input type="radio" name="feeling" value={item} />
                        {item}
                      </label>
                    ),
                  )}
                </div>
              </label>

              <label>
                待改進之處
                <textarea rows="4"></textarea>
              </label>

              <button type="submit" className="contact-btn">
                送出 Send
              </button>
            </form>
          </div>
        </div>
      </div>

      <BackToTopButton />

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
      `}</style>
    </section>
  );
}
