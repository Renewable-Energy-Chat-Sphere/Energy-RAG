import { useRef } from "react";
import "./LinkCarousel.css";

export default function LinkCarousel({ title, items }) {
  const scrollRef = useRef();

  const scroll = (dir) => {
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  return (
    <div className="carousel-section">
      <h2 className="carousel-title">{title}</h2>

      <div className="carousel-wrapper">
        {/* 左箭頭 */}
        <button className="arrow left" onClick={() => scroll("left")}>
          ◀
        </button>

        {/* 滑動區 */}
        <div className="carousel" ref={scrollRef}>
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="carousel-item"
            >
              <img src={item.img} alt="" />
            </a>
          ))}
        </div>

        {/* 右箭頭 */}
        <button className="arrow right" onClick={() => scroll("right")}>
          ▶
        </button>
      </div>
    </div>
  );
}
