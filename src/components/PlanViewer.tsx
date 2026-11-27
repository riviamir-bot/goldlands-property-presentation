import { Maximize2, Minimize2 } from "lucide-react";
import { useFullscreen } from "../hooks/useFullscreen";
import { PdfPlanImage } from "./PdfPlanImage";
import { ZoomableImage } from "./ZoomableImage";
import { useI18n } from "../i18n/LanguageContext";
import type { Apartment } from "../types";
import { planKind } from "../utils/plans";

export function PlanViewer({ apartment, compact = false }: { apartment: Apartment; compact?: boolean }) {
  const { t } = useI18n();
  const { isFullscreen, toggle } = useFullscreen();
  const kind = planKind(apartment);
  const title = t("apartment.title", { n: apartment.number });

  if (kind === "none") return <div className={compact ? "plan-viewer plan-viewer--compact plan-viewer--empty" : "plan-viewer plan-viewer--empty"}>{t("apartment.noPlan")}</div>;

  const fullscreenLabel = isFullscreen ? t("gallery.exitFullscreen") : t("gallery.fullscreen");
  return (
    <div className={["plan-viewer", compact ? "plan-viewer--compact" : "", isFullscreen ? "plan-viewer--fullscreen" : ""].filter(Boolean).join(" ")}>
      {kind === "image" ? (
        <ZoomableImage src={apartment.planUrl!} alt={`${t("field.plan")} - ${title}`} />
      ) : (
        <PdfPlanImage url={apartment.planUrl!} alt={`${t("field.plan")} - ${title}`} />
      )}
      <button type="button" className="plan-viewer__open" onClick={toggle} title={fullscreenLabel} aria-label={fullscreenLabel}>
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
}
