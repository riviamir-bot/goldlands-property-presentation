import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { ZoomableImage } from "../components/ZoomableImage";
import { useFullscreen } from "../hooks/useFullscreen";
import { useI18n } from "../i18n/LanguageContext";
import type { GalleryCategory, Project } from "../types";

interface GalleryScreenProps {
  project: Project;
}

const categories: GalleryCategory[] = ["exterior", "interior", "lobby", "surroundings"];

export function GalleryScreen({ project }: GalleryScreenProps) {
  const { t, dir } = useI18n();
  const images = useMemo(() => categories.flatMap((category) => project.gallery[category]), [project.gallery]);
  const [index, setIndex] = useState(0);
  const { isFullscreen, toggle } = useFullscreen();
  const current = Math.min(index, Math.max(images.length - 1, 0));

  useEffect(() => setIndex(0), [project.id]);

  const step = (delta: number) => setIndex((value) => (Math.min(value, images.length - 1) + delta + images.length) % images.length);

  useEffect(() => {
    if (images.length < 2) return undefined;
    // The arrow that points in the reading direction moves forward.
    const forwardKey = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backKey = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === forwardKey) step(1);
      if (event.key === backKey) step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, images.length]);

  if (images.length === 0) {
    return (
      <div className="empty-state gallery-empty-state">
        <h2>{t("gallery.empty")}</h2>
      </div>
    );
  }

  const caption = project.galleryCaptions?.[images[current]] || t("gallery.projectRender");

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <section className={isFullscreen ? "gallery-screen gallery-screen--fullscreen" : "gallery-screen"}>
      <div className="gallery-frame">
        <ZoomableImage key={images[current]} src={images[current]} alt={`${project.name} - ${caption}`} />

        <div className="gallery-caption" aria-live="polite">
          <span className="gallery-caption__title" dir="auto">{caption}</span>
          <span className="gallery-caption__note">{t("gallery.illustrative")}</span>
        </div>

        {images.length > 1 && (
          <>
            <button className="gallery-arrow gallery-arrow--prev" onClick={() => step(-1)} aria-label={t("gallery.prev")}>
              <PrevIcon size={26} />
            </button>
            <button className="gallery-arrow gallery-arrow--next" onClick={() => step(1)} aria-label={t("gallery.next")}>
              <NextIcon size={26} />
            </button>
          </>
        )}

        <div className="gallery-toolbar">
          {images.length > 1 && (
            <span className="gallery-counter">
              {current + 1} / {images.length}
            </span>
          )}
          <button
            className="gallery-toolbar__button"
            type="button"
            onClick={toggle}
            aria-label={isFullscreen ? t("gallery.exitFullscreen") : t("gallery.fullscreen")}
            title={isFullscreen ? t("gallery.exitFullscreen") : t("gallery.fullscreen")}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs" aria-label={t("section.gallery")}>
          {images.map((image, imageIndex) => (
            <button
              key={image}
              className={imageIndex === current ? "gallery-thumb active" : "gallery-thumb"}
              onClick={() => setIndex(imageIndex)}
              aria-label={project.galleryCaptions?.[image] || t("gallery.image", { n: imageIndex + 1 })}
              title={project.galleryCaptions?.[image] || undefined}
              aria-current={imageIndex === current}
            >
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="gallery-hint">{t("gallery.zoomHint")}</p>
    </section>
  );
}
