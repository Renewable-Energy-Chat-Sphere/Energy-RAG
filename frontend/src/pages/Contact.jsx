import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSchool, faPeopleGroup } from "@fortawesome/free-solid-svg-icons";

export default function Contact() {
  return (
    <section id="contact" className="section" style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>聯絡我們</h2>

      <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
        如您對 EnerSphere TW（能源球 3D 視覺化與智慧能源代理系統）
        有任何建議、合作意願、或技術問題，歡迎與我們聯繫。
      </p>

      {/* ⭐⭐⭐ 左右欄位布局（無 Bootstrap） ⭐⭐⭐ */}
      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
        }}
      >
        {/* -------------------------
            左邊：聯絡資訊
        -------------------------- */}
        <div style={{ color: "var(--gray-500)", lineHeight: "1.8",marginLeft:"20px" }}>
          <h3>
            <FontAwesomeIcon icon={faPeopleGroup} /> &nbsp; 專案團隊（MIS 小組）
          </h3>

          <strong>指導教授</strong>
          <br />
          ・石佳惠 | 159931@mail.fju.edu.tw
          <br />
          <br />

          <strong>專案成員</strong>
          <br />
          ・陳相叡 | 412402165@m365.fju.edu.tw <br />
          ・周子芹 | 412402036@m365.fju.edu.tw <br />
          ・呂羿辰 | 412402244@m365.fju.edu.tw <br />
          ・張宇承 | 412402335@m365.fju.edu.tw <br />

          <br />

          <h3>
            <FontAwesomeIcon icon={faSchool} /> &nbsp; 所屬單位
          </h3>
          天主教輔仁大學 <br />
          資訊管理系｜多模態視覺能源研究團隊 <br />
          致力於能源資料整合、3D 視覺化與智慧能源決策系統研究。
        </div>

        {/* -------------------------
            右邊：回饋表單
        -------------------------- */}
        <div>
          <form
            id="contactForm"
            action="insert2.php"
            method="post"
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* 姓名 */}
            <label>
              <b style={{ color: "var(--gray-500)", lineHeight: "1.8"}}>姓名</b>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name..."
                required
                className="input-field"
              />
            </label>

            {/* 電子郵件 */}
            <label>
              <b style={{ color: "var(--gray-500)", lineHeight: "1.8" }}>電子郵件</b>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email..."
                required
                className="input-field"
              />
            </label>

            {/* 電話 */}
            <label>
              <b style={{ color: "var(--gray-500)", lineHeight: "1.8" }}>電話號碼</b>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number..."
                required
                className="input-field"
              />
            </label>

            {/* 使用感受 */}
            <div>
              <b style={{ color: "var(--gray-500)", lineHeight: "1.8" }}>使用感受</b>
              <div style={{ marginTop: "6px" }}>
                {[
                  ["very_satisfied", "非常滿意"],
                  ["satisfied", "滿意"],
                  ["neutral", "一般"],
                  ["dissatisfied", "不滿意"],
                  ["very_dissatisfied", "非常不滿意"],
                ].map(([id, label]) => (
                  <label key={id} style={{ marginRight: "10px" }}>
                    <input type="radio" name="feeling" id={id} value={label} />
                    &nbsp;{label}
                  </label>
                ))}
              </div>
            </div>

            {/* 改進建議 */}
            <label>
              <b style={{ color: "var(--gray-500)", lineHeight: "1.8"}}>待改進之處</b>
              <textarea
                id="message"
                name="message"
                placeholder="Enter your message here..."
                className="input-field"
                style={{ height: "120px", resize: "vertical" }}
              ></textarea>
            </label>

            {/* 提交按鈕 */}
            <button
              type="submit"
              style={{
                backgroundColor: "#00000099",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                width: "140px",
              }}
            >
              送出 Send
            </button>
          </form>
        </div>
      </div>

      {/* ⭐ 純 CSS（放到 Contact.jsx 或 contact.css） */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border, #ccc);
          border-radius: 6px;
          background: var(--card, #f7f7f7);
          color: var(--text, #333);
          margin-top: 6px;
        }

        .input-field:focus {
          outline: none;
          border-color: #888;
        }

        @media (max-width: 768px) {
          #contact .container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
