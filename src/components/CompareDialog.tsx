import { useEffect } from "react";
import { X } from "lucide-react";
import { PlanViewer } from "./PlanViewer";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../i18n/LanguageContext";
import type { Apartment } from "../types";
import { formatNumber, formatPrice } from "../utils/format";

interface CompareDialogProps {
  apartments: Apartment[];
  showPrices: boolean;
  onClear: () => void;
  onClose: () => void;
}

export function CompareDialog({ apartments, showPrices, onClear, onClose }: CompareDialogProps) {
  const { t, language } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: Array<[string, (apartment: Apartment) => React.ReactNode]> = [
    [t("field.floor"), (a) => a.floor],
    [t("field.rooms"), (a) => formatNumber(a.rooms)],
    [t("field.area"), (a) => formatNumber(a.apartmentArea, t("unit.sqm"))],
    [t("field.balcony"), (a) => formatNumber(a.balconyArea, t("unit.sqm"))],
    [t("field.status"), (a) => <StatusBadge status={a.status} />],
  ];
  if (showPrices) rows.push([t("field.price"), (a) => (a.status === "sold" ? "—" : formatPrice(a.price, language))]);
  const hasPlans = apartments.some((apartment) => apartment.planUrl);

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <section className="compare-dialog" role="dialog" aria-modal="true" aria-label={t("compare.title")} onClick={(event) => event.stopPropagation()}>
        <header className="apartment-drawer__header">
          <h2>{t("compare.title")}</h2>
          <div className="action-row">
            <button className="ghost-button ghost-button--compact" type="button" onClick={onClear}>
              {t("compare.clear")}
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}>
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="compare-grid" style={{ ["--compare-columns" as string]: apartments.length }}>
          <div className="compare-grid__label" />
          {apartments.map((apartment) => (
            <div key={apartment.id} className="compare-grid__head">
              {t("apartment.title", { n: apartment.number })}
            </div>
          ))}
          {hasPlans && (
            <>
              <div className="compare-grid__label">{t("field.plan")}</div>
              {apartments.map((apartment) => (
                <div key={apartment.id} className="compare-grid__plan">
                  <PlanViewer apartment={apartment} compact />
                </div>
              ))}
            </>
          )}
          {rows.map(([label, render]) => (
            <div key={label} className="compare-grid__row">
              <div className="compare-grid__label">{label}</div>
              {apartments.map((apartment) => (
                <div key={apartment.id} className="compare-grid__cell">
                  {render(apartment)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
