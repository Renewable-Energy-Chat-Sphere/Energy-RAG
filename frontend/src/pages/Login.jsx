import React, { useState } from "react";
import "./Login.css"; // ⭐ 已拆分 CSS
import { Link } from "react-router-dom";


export default function Login() {
  const [passwordShown, setPasswordShown] = useState(false);

  // 取得 URL?redirect= 參數
  const redirect = new URLSearchParams(window.location.search).get("redirect") || "";

  const togglePassword = () => {
    setPasswordShown((prev) => !prev);
  };

  return (
    <div className="login-wrapper">
      <h2>登入</h2>

      <form action="/logincheck" method="POST">
        <div className="input-box">
          <span className="icon">
            <ion-icon name="person-outline"></ion-icon>
          </span>
          <input type="text" name="User_Name" placeholder="請輸入帳號" required />
        </div>

        <div className="input-box">
          <span className="icon">
            <ion-icon name="lock-closed-outline"></ion-icon>
          </span>

          <input
            type={passwordShown ? "text" : "password"}
            id="password"
            name="Password"
            placeholder="請輸入密碼"
            required
          />

          <span className="show-password-btn" onClick={togglePassword}>
            <ion-icon
              id="eye-icon"
              name={passwordShown ? "eye-outline" : "eye-off-outline"}
            ></ion-icon>
          </span>
        </div>

        <button type="submit" className="btn">登入</button>

        <div className="login-register">
          <p>
            沒有帳號 ? 
            <Link
              to="/sign"
              className="hero-login-btn"
              style={{ textDecoration: "none" }} // 去除底線
            >
              <button className="login-btn">點擊註冊</button>
            </Link>
          </p>
        </div>

        <input type="hidden" name="redirect" value={redirect} />
      </form>

      {/* Ionicons */}
      <script
        type="module"
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
      ></script>
      <script
        noModule
        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
      ></script>
    </div>
  );
}
