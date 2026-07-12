import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { formatPrice } from "../utils/format";
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
          <h2>מחירון לקוח</h2>
        </div>
      </div>

      <div className="pricing-layout">
        {apartments.length > 0 ? <div className="table-wrap">
          <table className="lux-table">
            <thead>
              <tr>
                <th>דירה</th>
                <th>חדרים</th>
                <th>קומה</th>
                <th>שטח כולל</th>
                <th>מרפסת</th>
                <th>גינה</th>
                <th>חניה</th>
                <th>מחסן</th>
                <th>כיוון</th>
                <th>מחיר</th>
                <th>מחיר מיוחד</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((apartment) => (
                <tr key={apartment.id}>
                  <td>{apartment.number}</td>
                  <td>{apartment.rooms}</td>
                  <td>{apartment.floor}</td>
                  <td>{apartment.apartmentArea + apartment.balconyArea} מ&quot;ר</td>
                  <td>{apartment.balconyArea} מ&quot;ר</td>
                  <td>{apartment.gardenArea ? `${apartment.gardenArea} מ"ר` : "-"}</td>
                  <td>{apartment.parking || "-"}</td>
                  <td>{apartment.storage || "-"}</td>
                  <td>{apartment.direction || "-"}</td>
                  <td>{formatPrice(apartment.price)}</td>
                  <td className="gold-cell">{formatPrice(apartment.specialPrice)}</td>
                  <td>
                    <StatusBadge status={apartment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : (
          <div className="empty-state compact-empty-state">
            <h3>אין עדיין דירות במחירון</h3>
            <p>דירות שיוזנו או ייובאו בפרויקט יופיעו כאן.</p>
          </div>
        )}

        <aside className="gold-note">
          <ShieldCheck size={26} />
          <strong>מחירון נקי להצגה</strong>
          <span>מציג מחיר רשמי ומחיר מיוחד בלבד, בתצוגה ברורה לפגישת לקוח.</span>
        </aside>
      </div>
    </section>
  );
}
