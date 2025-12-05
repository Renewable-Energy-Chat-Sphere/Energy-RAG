import React, { useState } from "react";
import "./Login.css"; 
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { faKey,faEye } from "@fortawesome/free-solid-svg-icons";
import BackToTopButton from "../components/BackToTopButton";

export default function Login() {
  const [passwordShown, setPasswordShown] = useState(false);

  // 取得 URL?redirect= 參數
  const redirect = new URLSearchParams(window.location.search).get("redirect") || "";

  const togglePassword = () => {
    setPasswordShown((prev) => !prev);
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <h2>登入</h2>

        <form action="/logincheck" method="POST">
          <div className="input-box">
            <span className="icon">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <input type="text" name="User_Name" placeholder="請輸入帳號" required />
          </div>

          <div className="input-box">
            <span className="icon">
              <FontAwesomeIcon icon={faKey} />
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
              <Link to="/sign" className="text-link">
                點擊註冊
              </Link>
            </p>
          </div>

          <input type="hidden" name="redirect" value={redirect} />
        </form>

      </div>
      <BackToTopButton />
    </div>
    
  );
}
