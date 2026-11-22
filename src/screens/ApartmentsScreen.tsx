import { Columns3, FileSearch, Star } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../i18n/LanguageContext";
import { formatNumber, formatPrice } from "../utils/format";
import type { Apartment } from "../types";

export interface ApartmentTableProps {
  apartments: Apartment[];
  showPrices: boolean;
  selection: Set<string>;
  compare: string[];
  onOpenApartment: (apartmentId: string) => void;
  onToggleSelection: (apartmentId: string) => void;
  onToggleCompare: (apartmentId: string) => void;
}

interface ApartmentsScreenProps extends ApartmentTableProps {
  variant: "available" | "priceList";
}

export const MAX_COMPARE = 3;

export function ApartmentsScreen({
  apartments,
  showPrices,
  selection,
  compare,
  onOpenApartment,
  onToggleSelection,
  onToggleCompare,
  variant,
}: ApartmentsScreenProps) {
  const { t } = useI18n();
  const hasPlans = apartments.some((apartment) => apartment.planUrl);
  const heading = variant === "available" ? t("apartments.heading") : t("prices.heading");
  const eyebrow = variant === "available" ? t("apartments.eyebrow") : t("section.prices");
  const empty = variant === "available" ? t("apartments.none") : t("prices.none");

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{heading}</h2>
        </div>
        <span className="count-pill">{t("count.apartments", { count: apartments.length })}</span>
      </div>

      {apartments.length > 0 ? (
        <div className="table-wrap">
          <table className="lux-table lux-table--interactive">
            <thead>
              <tr>
                <th aria-label={t("apartment.select")} />
                <th>{t("field.apartment")}</th>
                <th>{t("field.floor")}</th>
                <th>{t("field.rooms")}</th>
                <th>{t("field.area")}</th>
                <th>{t("field.balcony")}</th>
                {showPrices && <th>{t("field.price")}</th>}
                <th>{t("field.status")}</th>
                {hasPlans && <th>{t("field.plan")}</th>}
                <th aria-label={t("apartment.compare")} />
              </tr>
            </thead>
            <tbody>
              {apartments.map((apartment) => {
                const isSold = apartment.status === "sold";
                const isSelected = selection.has(apartment.id);
                const isCompared = compare.includes(apartment.id);
                const compareFull = !isCompared && compare.length >= MAX_COMPARE;
                return (
                  <tr
                    key={apartment.id}
                    className={[isSold ? "lux-table__row--sold" : "", isSelected ? "lux-table__row--selected" : ""].join(" ")}
                    onClick={() => onOpenApartment(apartment.id)}
                  >
                    <td className="lux-table__icon-cell">
                      {!isSold && (
                        <button
                          type="button"
                          className={isSelected ? "row-icon active" : "row-icon"}
                          aria-pressed={isSelected}
                          aria-label={isSelected ? t("apartment.unselect") : t("apartment.select")}
                          title={isSelected ? t("apartment.unselect") : t("apartment.select")}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleSelection(apartment.id);
                          }}
                        >
                          <Star size={16} fill={isSelected ? "currentColor" : "none"} />
                        </button>
                      )}
                    </td>
                    <td className="lux-table__strong">{apartment.number || "—"}</td>
                    <td>{apartment.floor}</td>
                    <td>{formatNumber(apartment.rooms)}</td>
                    <td>{formatNumber(apartment.apartmentArea, t("unit.sqm"))}</td>
                    <td>{formatNumber(apartment.balconyArea, t("unit.sqm"))}</td>
                    {showPrices && <td>{isSold ? "—" : formatPrice(apartment.price)}</td>}
                    <td>
                      <StatusBadge status={apartment.status} />
                    </td>
                    {hasPlans && <td>{apartment.planUrl && <FileSearch size={17} aria-label={t("field.plan")} />}</td>}
                    <td className="lux-table__icon-cell">
                      <button
                        type="button"
                        className={isCompared ? "row-icon active" : "row-icon"}
                        aria-pressed={isCompared}
                        disabled={compareFull}
                        aria-label={t("apartment.compare")}
                        title={compareFull ? t("compare.limit") : t("apartment.compare")}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleCompare(apartment.id);
                        }}
                      >
                        <Columns3 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state compact-empty-state">
          <h3>{empty}</h3>
        </div>
      )}
    </section>
  );
}
