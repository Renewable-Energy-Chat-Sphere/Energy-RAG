import React, { useEffect, useState } from "react";
import { HashRouter as Router } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Global from "./pages/Global";
import MobileGlobal from "./pages/MobileGlobal";
import Rag from "./pages/Rag";

/* 🔥 自動判斷裝置 */
function AutoGlobal() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile =
        window.innerWidth <= 768 ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      setIsMobile(mobile);
    };

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile ? <MobileGlobal /> : <Global />;
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