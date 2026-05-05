import { useRef } from "react";
import "./LinkCarousel.css";
import { useTranslation } from "react-i18next";

export default function ExternalLinks({ items }) {
  const { t } = useTranslation();
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
      <h2 className="carousel-title">{t("section.external")}</h2>

      <div className="carousel-wrapper">
        <button className="arrow left" onClick={() => scroll("left")}>
          ◀
        </button>

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

        <button className="arrow right" onClick={() => scroll("right")}>
          ▶
        </button>
      </div>
    </div>
  );
}
