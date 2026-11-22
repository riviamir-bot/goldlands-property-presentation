import { useEffect } from "react";
import { Columns3, Star, X } from "lucide-react";
import { PlanViewer } from "./PlanViewer";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../i18n/LanguageContext";
import type { Apartment } from "../types";
import { formatNumber, formatPrice } from "../utils/format";

interface ApartmentDrawerProps {
  apartment: Apartment;
  showPrices: boolean;
  isSelected: boolean;
  isCompared: boolean;
  canCompareMore: boolean;
  onToggleSelection: () => void;
  onToggleCompare: () => void;
  onClose: () => void;
}

export function ApartmentDrawer({
  apartment,
  showPrices,
  isSelected,
  isCompared,
  canCompareMore,
  onToggleSelection,
  onToggleCompare,
  onClose,
}: ApartmentDrawerProps) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: Array<[string, React.ReactNode]> = [
    [t("field.floor"), apartment.floor],
    [t("field.rooms"), formatNumber(apartment.rooms)],
    [t("field.area"), formatNumber(apartment.apartmentArea, t("unit.sqm"))],
    [t("field.balcony"), formatNumber(apartment.balconyArea, t("unit.sqm"))],
    [t("field.status"), <StatusBadge key="s" status={apartment.status} />],
  ];
  if (showPrices && apartment.status !== "sold") rows.push([t("field.price"), formatPrice(apartment.price)]);

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="apartment-drawer" role="dialog" aria-modal="true" aria-label={t("apartment.title", { n: apartment.number })} onClick={(event) => event.stopPropagation()}>
        <header className="apartment-drawer__header">
          <div>
            <span className="eyebrow">{t("apartment.details")}</span>
            <h2>{t("apartment.title", { n: apartment.number })}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </header>

        <div className="apartment-drawer__body">
          <PlanViewer apartment={apartment} />
          <dl className="apartment-drawer__facts">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="apartment-drawer__actions">
          {apartment.status !== "sold" && (
            <button className={isSelected ? "gold-button" : "ghost-button"} type="button" onClick={onToggleSelection} aria-pressed={isSelected}>
              <Star size={16} fill={isSelected ? "currentColor" : "none"} />
              {isSelected ? t("apartment.unselect") : t("apartment.select")}
            </button>
          )}
          <button
            className={isCompared ? "gold-button" : "ghost-button"}
            type="button"
            onClick={onToggleCompare}
            aria-pressed={isCompared}
            disabled={!isCompared && !canCompareMore}
            title={!isCompared && !canCompareMore ? t("compare.limit") : undefined}
          >
            <Columns3 size={16} />
            {isCompared ? t("apartment.inCompare") : t("apartment.compare")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
