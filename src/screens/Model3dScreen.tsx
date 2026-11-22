import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useFullscreen } from "../hooks/useFullscreen";
import { useI18n } from "../i18n/LanguageContext";
import type { Project } from "../types";

export function Model3dScreen({ project }: { project: Project }) {
  const { t } = useI18n();
  const { isFullscreen, toggle } = useFullscreen();
  const url = project.model3dUrl ?? "";
  if (!url) return null;

  return (
    <section className={isFullscreen ? "model3d-screen model3d-screen--fullscreen" : "model3d-screen"}>
      <div className="model3d-frame">
        <iframe
          src={url}
          title={`${project.name} - ${t("section.model3d")}`}
          allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; autoplay"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className="gallery-toolbar">
          <a className="gallery-toolbar__button" href={url} target="_blank" rel="noreferrer" aria-label={t("common.openNewTab")} title={t("common.openNewTab")}>
            <ExternalLink size={17} />
          </a>
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
      <p className="gallery-hint">{t("model3d.hint")}</p>
    </section>
  );
}
