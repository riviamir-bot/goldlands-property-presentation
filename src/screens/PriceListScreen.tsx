import { StatusBadge } from "../components/StatusBadge";
import { formatNumber, formatPrice } from "../utils/format";
import type { Apartment } from "../types";

interface PriceListScreenProps {
  apartments: Apartment[];
}

export function PriceListScreen({ apartments }: PriceListScreenProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">מחירון</span>
          <h2>מחירון הפרויקט</h2>
        </div>
        <span className="count-pill">{apartments.length} דירות</span>
      </div>

      {apartments.length > 0 ? (
        <div className="table-wrap">
          <table className="lux-table">
            <thead>
              <tr>
                <th>דירה</th>
                <th>חדרים</th>
                <th>קומה</th>
                <th>שטח דירה</th>
                <th>מרפסת</th>
                <th>מחיר</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((apartment) => (
                <tr key={apartment.id} className={apartment.status === "sold" ? "lux-table__row--sold" : undefined}>
                  <td>{apartment.number || "—"}</td>
                  <td>{formatNumber(apartment.rooms)}</td>
                  <td>{apartment.floor}</td>
                  <td>{formatNumber(apartment.apartmentArea, "מ״ר")}</td>
                  <td>{formatNumber(apartment.balconyArea, "מ״ר")}</td>
                  <td>{apartment.status === "sold" ? "—" : formatPrice(apartment.price)}</td>
                  <td>
                    <StatusBadge status={apartment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state compact-empty-state">
          <h3>אין עדיין דירות במחירון</h3>
        </div>
      )}
    </section>
  );
}
