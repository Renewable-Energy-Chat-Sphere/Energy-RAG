import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Global from "./pages/Global";
import Rag from "./pages/Rag";
import Login from "./pages/Login"; 
import Sign from "./pages/Sign"; 


function App() {
  return (
    <Router>
      {/* ⭐ Header 永遠顯示 */}
      <Header />

      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/global" element={<Global />} />
          <Route path="/rag" element={<Rag />} />

          {/* ⭐ 新增 login 路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/sign" element={<Sign />} />

          {/* 可選：404 */}
          <Route path="*" element={<div style={{ padding: 40 }}>404 Not Found</div>} />
        </Routes>
      </main>

      {/* ⭐ Footer 永遠顯示 */}
      <Footer />
    </Router>
  );
}

export default App;
