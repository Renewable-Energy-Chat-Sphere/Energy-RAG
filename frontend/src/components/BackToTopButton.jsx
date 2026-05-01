import { useEffect } from "react";
import "./BackToTop.css";


export default function BackToTopButton() {
  useEffect(() => {
    const btn = document.querySelector(".back-to-top");

    const onScroll = () => {
      if (window.scrollY > 300) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button className="back-to-top" onClick={scrollToTop}>
      ⬆︎
    </button>
  );
}