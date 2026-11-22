import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryCategory, Project } from "../types";

interface GalleryScreenProps {
  project: Project;
}

const tabs: Array<{ id: GalleryCategory; label: string }> = [
  { id: "exterior", label: "חוץ" },
  { id: "interior", label: "פנים" },
  { id: "lobby", label: "לובי" },
  { id: "surroundings", label: "סביבה" },
];

export function GalleryScreen({ project }: GalleryScreenProps) {
  const filledTabs = useMemo(() => tabs.filter((tab) => project.gallery[tab.id].length > 0), [project.gallery]);
  const [active, setActive] = useState<GalleryCategory>(filledTabs[0]?.id ?? "exterior");
  const [index, setIndex] = useState(0);
  const category = filledTabs.some((tab) => tab.id === active) ? active : filledTabs[0]?.id ?? "exterior";
  const images = project.gallery[category];
  const current = Math.min(index, Math.max(images.length - 1, 0));

  useEffect(() => {
    setIndex(0);
  }, [category, project.id]);

  useEffect(() => {
    if (images.length < 2) return undefined;

    // RTL: the left arrow key moves forward.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setIndex((value) => (Math.min(value, images.length - 1) + 1) % images.length);
      if (event.key === "ArrowRight") {
        setIndex((value) => (Math.min(value, images.length - 1) - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="empty-state gallery-empty-state">
        <h2>אין עדיין הדמיות לפרויקט</h2>
      </div>
    );
  }

  const step = (delta: number) => setIndex((current + delta + images.length) % images.length);

  return (
    <section className="gallery-screen">
      {filledTabs.length > 1 && (
        <div className="tab-row" role="tablist" aria-label="קטגוריות הדמיה">
          {filledTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={category === tab.id}
              className={category === tab.id ? "active" : ""}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="gallery-frame">
        <img src={images[current]} alt={`${project.name} - הדמיה ${current + 1}`} />
        {images.length > 1 && (
          <>
            <button className="gallery-arrow gallery-arrow--prev" onClick={() => step(-1)} aria-label="ההדמיה הקודמת">
              <ChevronRight size={26} />
            </button>
            <button className="gallery-arrow gallery-arrow--next" onClick={() => step(1)} aria-label="ההדמיה הבאה">
              <ChevronLeft size={26} />
            </button>
            <span className="gallery-counter">
              {current + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs" aria-label="כל ההדמיות">
          {images.map((image, imageIndex) => (
            <button
              key={image}
              className={imageIndex === current ? "gallery-thumb active" : "gallery-thumb"}
              onClick={() => setIndex(imageIndex)}
              aria-label={`הדמיה ${imageIndex + 1}`}
              aria-current={imageIndex === current}
            >
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
