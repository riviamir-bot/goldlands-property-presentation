import { Columns3, Eye, EyeOff, FileSearch, Star } from "lucide-react";
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
  /** Marketer meeting only: shows the hide/show prices button in the screen header. */
  onTogglePrices?: () => void;
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
  onTogglePrices,
}: ApartmentsScreenProps) {
  const { t, language } = useI18n();
  const heading = variant === "available" ? t("apartments.heading") : t("prices.heading");
  const eyebrow = variant === "available" ? t("apartments.eyebrow") : t("section.prices");
  const empty = variant === "available" ? t("apartments.none") : t("prices.none");

  return (
    <section className="gv-apt-section">
      <div className="gv-apt-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{heading}</h2>
        </div>
        <div className="gv-apt-head__tools">
          <span className="count-pill">{t("count.apartments", { count: apartments.length })}</span>
          {onTogglePrices && (
            <button type="button" className="gv-meeting-bar__button" onClick={onTogglePrices} aria-pressed={!showPrices}>
              {showPrices ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
              <span>{showPrices ? t("prices.hide") : t("prices.show")}</span>
            </button>
          )}
        </div>
      </div>

      {apartments.length > 0 ? (
        <ul className={`gv-apt-list gv-apt-list--${variant}`}>
          {apartments.map((apartment) => {
            const isSold = apartment.status === "sold";
            const isSelected = selection.has(apartment.id);
            const isCompared = compare.includes(apartment.id);
            const compareFull = !isCompared && compare.length >= MAX_COMPARE;
            const facts: Array<[string, string]> = [
              [t("field.floor"), String(apartment.floor || "—")],
              [t("field.rooms"), formatNumber(apartment.rooms)],
              [t("field.area"), formatNumber(apartment.apartmentArea, t("unit.sqm"))],
              [t("field.balcony"), formatNumber(apartment.balconyArea, t("unit.sqm"))],
            ];
            return (
              <li key={apartment.id} className="gv-apt-item">
                <article
                  className={["gv-apt", isSold ? "gv-apt--sold" : "", isSelected ? "gv-apt--selected" : ""].filter(Boolean).join(" ")}
                  onClick={() => onOpenApartment(apartment.id)}
                >
                  <header className="gv-apt__head">
                    <h3>{t("apartment.title", { n: apartment.number || "—" })}</h3>
                    <StatusBadge status={apartment.status} />
                  </header>
                  {showPrices && <p className="gv-apt__price">{isSold ? "—" : formatPrice(apartment.price, language)}</p>}
                  <dl className="gv-apt__facts">
                    {facts.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <footer className="gv-apt__actions">
                    {apartment.planUrl && (
                      <span className="gv-apt__plan">
                        <FileSearch size={16} aria-hidden="true" /> {t("field.plan")}
                      </span>
                    )}
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
                        <Star size={18} fill={isSelected ? "currentColor" : "none"} />
                      </button>
                    )}
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
                      <Columns3 size={18} />
                    </button>
                  </footer>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state compact-empty-state">
          <h3>{empty}</h3>
        </div>
      )}
    </section>
  );
}
