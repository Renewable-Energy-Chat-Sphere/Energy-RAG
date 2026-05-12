import React, { useState } from "react";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://127.0.0.1:8000";

  const handleSubmit = async () => {
    if (!username || !password) {
      alert("請輸入帳號與密碼");
      return;
    }

    setLoading(true);

    try {
      const url = mode === "login" ? "/login" : "/register";

      const body =
        mode === "login"
          ? { username, password }
          : { username, password, role: "manager" };

      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "操作失敗");
        return;
      }

      if (mode === "register") {
        alert(`註冊成功：${data.username}（公司高層 manager）`);
        setMode("login");
        setPassword("");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data));

      alert(`登入成功：${data.username}（${data.role}）`);
      window.location.href = "/Ener-Sphere/";
    } catch (err) {
      console.error(err);
      alert("無法連接後端，請確認 Flask 是否有啟動");
    } finally {
      setLoading(false);
    }
  };

  const enterAsGuest = () => {
    localStorage.removeItem("user");
    window.location.href = "/Ener-Sphere/";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {mode === "login" ? "登入" : "註冊"}
        </h1>

        <p style={styles.subtitle}>
          未登入時預設為普通使用者，登入後才會解鎖高層或管理者功能。
        </p>

        <div style={styles.switchBox}>
          <button
            style={mode === "login" ? styles.activeTab : styles.tab}
            onClick={() => setMode("login")}
          >
            登入
          </button>

          <button
            style={mode === "register" ? styles.activeTab : styles.tab}
            onClick={() => setMode("register")}
          >
            註冊高層帳號
          </button>
        </div>

        <input
          style={styles.input}
          placeholder="帳號"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === "register" && (
          <div style={styles.roleHint}>
            註冊後角色固定為：公司高層 manager
          </div>
        )}

        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "處理中..."
            : mode === "login"
              ? "登入"
              : "建立高層帳號"}
        </button>

        <button
          style={styles.guestBtn}
          onClick={enterAsGuest}
        >
          以普通使用者進入
        </button>

        <p style={styles.note}>
          系統管理者 admin 不開放註冊，需由資料庫手動建立。
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e0f2fe, #fff7ed)",
    padding: "40px",
  },
  card: {
    width: "430px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "36px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
    marginBottom: "24px",
    lineHeight: "1.7",
  },
  switchBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "20px",
  },
  tab: {
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
    fontWeight: "700",
  },
  activeTab: {
    padding: "12px",
    borderRadius: "14px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "800",
  },
  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  roleHint: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "14px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2563eb, #f97316)",
    color: "white",
    fontSize: "16px",
    fontWeight: "800",
    cursor: "pointer",
    marginBottom: "12px",
  },
  guestBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
  },
  note: {
    marginTop: "16px",
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: "1.6",
  },
};