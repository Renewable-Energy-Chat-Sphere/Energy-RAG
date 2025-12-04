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
    <>
      <Header />

      <main id="main-content">
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/global" element={<Global />} />
            <Route path="/rag" element={<Rag />} />
          </Routes>
        </Router>
      </main>

      <Footer />
    </>
  );
}

export default App;

