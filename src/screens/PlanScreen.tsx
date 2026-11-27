import { useEffect, useMemo, useState } from "react";
import { PlanViewer } from "../components/PlanViewer";
import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../i18n/LanguageContext";
import type { Apartment } from "../types";
import { formatNumber, formatPrice } from "../utils/format";

interface PlanScreenProps {
  apartments: Apartment[];
  initialApartmentId: string | null;
  showPrices: boolean;
}

export function PlanScreen({ apartments, initialApartmentId, showPrices }: PlanScreenProps) {
  const { t, language } = useI18n();
  const withPlans = useMemo(() => apartments.filter((apartment) => apartment.planUrl), [apartments]);
  const [activeId, setActiveId] = useState(initialApartmentId);

  useEffect(() => setActiveId(initialApartmentId), [initialApartmentId]);

  const active = withPlans.find((apartment) => apartment.id === activeId) ?? withPlans[0];
  if (!active) {
    return (
      <div className="empty-state compact-empty-state">
        <h2>{t("plans.none")}</h2>
      </div>
    );
  }

  return (
    <section className="plan-layout plan-layout--live gv-plan-layout">
      <div className="plan-layout__viewer">
        <PlanViewer apartment={active} />
      </div>
      <aside className="details-card gv-plan-details">
        <label className="plan-picker">
          <span className="eyebrow">{t("plans.pick")}</span>
          <select value={active.id} onChange={(event) => setActiveId(event.currentTarget.value)}>
            {withPlans.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {t("apartment.title", { n: apartment.number })} · {formatNumber(apartment.rooms)} {t("field.rooms")}
              </option>
            ))}
          </select>
        </label>
        <h2>{t("apartment.title", { n: active.number })}</h2>
        <dl>
          <div>
            <dt>{t("field.floor")}</dt>
            <dd>{active.floor}</dd>
          </div>
          <div>
            <dt>{t("field.rooms")}</dt>
            <dd>{formatNumber(active.rooms)}</dd>
          </div>
          <div>
            <dt>{t("field.area")}</dt>
            <dd>{formatNumber(active.apartmentArea, t("unit.sqm"))}</dd>
          </div>
          <div>
            <dt>{t("field.balcony")}</dt>
            <dd>{formatNumber(active.balconyArea, t("unit.sqm"))}</dd>
          </div>
          <div>
            <dt>{t("field.status")}</dt>
            <dd>
              <StatusBadge status={active.status} />
            </dd>
          </div>
          {showPrices && active.status !== "sold" && (
            <div>
              <dt>{t("field.price")}</dt>
              <dd>{formatPrice(active.price, language)}</dd>
            </div>
          )}
        </dl>
      </aside>
    </section>
  );
}
