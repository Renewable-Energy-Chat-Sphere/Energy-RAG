import React, { useState } from "react";
import "./sign.css"; // ⭐ 已拆分 CSS
import { Link } from "react-router-dom";


export default function Register() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="register-wrapper">
      <div className="form-box register">
        <h2>註冊</h2>

        {/* ⭐ PHP action 保留，你可改成後端 API */}
        <form action="insert.php" method="POST">
          {/* 帳號 */}
          <div className="input-box">
            <span className="icon">
              <ion-icon name="person-outline"></ion-icon>
            </span>
            <input type="text" name="User_Name" placeholder="請輸入帳號" required />
          </div>

          {/* Email */}
          <div className="input-box">
            <span className="icon">
              <ion-icon name="mail-outline"></ion-icon>
            </span>
            <input type="email" name="Email" placeholder="請輸入 EMAIL" required />
          </div>

          {/* 密碼 */}
          <div className="input-box">
            <span className="icon">
              <ion-icon name="lock-closed-outline"></ion-icon>
            </span>

            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="Password"
              placeholder="請輸入密碼"
              required
            />

            <span className="show-password-btn" onClick={togglePassword}>
              <ion-icon
                id="eye-icon"
                name={showPassword ? "eye-outline" : "eye-off-outline"}
              ></ion-icon>
            </span>
          </div>

          {/* 確認密碼 */}
          <div className="input-box">
            <span className="icon">
              <ion-icon name="lock-closed-outline"></ion-icon>
            </span>

            <input
              type={showPassword ? "text" : "password"}
              id="confirm_password"
              name="Confirm_Password"
              placeholder="請再次輸入密碼"
              required
            />

            <span className="show-password-btn" onClick={togglePassword}>
              <ion-icon
                id="confirm-eye-icon"
                name={showPassword ? "eye-outline" : "eye-off-outline"}
              ></ion-icon>
            </span>
          </div>

          <button type="submit" className="btn">註冊</button>

          <div className="login-register">
            <p>
              已經擁有帳號 ? 
              <Link
                to="/login"
                className="hero-login-btn"
                style={{ textDecoration: "none" }} // 去除底線
                >
                <button className="login-btn">登入</button>
            </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Ionicons 必須保留 */}
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
