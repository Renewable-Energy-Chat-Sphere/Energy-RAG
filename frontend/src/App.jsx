import React, { useEffect, useState } from "react";
import { HashRouter as Router } from "react-router-dom";
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Global from "./pages/Global";
import Rag from "./pages/Rag";

/* 🔥 自動判斷裝置 */
function AutoGlobal() {
  const [isMobile, setIsMobile] = useState(
    window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");

    const listener = (e) => {
      setIsMobile(e.matches);
    };

    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, []);

  // ✅ 改這裡（重點）
  return <Global isMobile={isMobile} />;
}

export default function App() {
  return (
    <Router>
      <Header />

      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* 🔥 這行才是關鍵 */}
          <Route path="/global" element={<AutoGlobal />} />

          <Route path="/rag" element={<Rag />} />

          <Route
            path="*"
            element={<div style={{ padding: 40 }}>404 Not Found</div>}
          />
        </Routes>
      </main>

      <Footer />
    </Router>
  );
}