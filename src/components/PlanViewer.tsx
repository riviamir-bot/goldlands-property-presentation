import { ExternalLink } from "lucide-react";
import { ZoomableImage } from "./ZoomableImage";
import { useI18n } from "../i18n/LanguageContext";
import type { Apartment } from "../types";
import { planKind } from "../utils/plans";

export function PlanViewer({ apartment, compact = false }: { apartment: Apartment; compact?: boolean }) {
  const { t } = useI18n();
  const kind = planKind(apartment);
  const title = t("apartment.title", { n: apartment.number });

  if (kind === "none") return <div className={compact ? "plan-viewer plan-viewer--compact plan-viewer--empty" : "plan-viewer plan-viewer--empty"}>{t("apartment.noPlan")}</div>;

  return (
    <div className={compact ? "plan-viewer plan-viewer--compact" : "plan-viewer"}>
      {kind === "image" ? (
        <ZoomableImage src={apartment.planUrl!} alt={`${t("field.plan")} - ${title}`} />
      ) : (
        <iframe src={`${apartment.planUrl}#view=FitH`} title={`${t("field.plan")} - ${title}`} />
      )}
      <a className="plan-viewer__open" href={apartment.planUrl} target="_blank" rel="noreferrer" title={t("common.openNewTab")} aria-label={t("common.openNewTab")}>
        <ExternalLink size={16} />
      </a>
    </div>
  );
}
