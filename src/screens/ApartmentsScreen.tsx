import { FileSearch } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { formatPrice } from "../utils/format";
import type { Apartment } from "../types";

interface ApartmentsScreenProps {
  apartments: Apartment[];
  onOpenPlan: (apartmentId: string) => void;
}

export function ApartmentsScreen({ apartments, onOpenPlan }: ApartmentsScreenProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">מלאי מכירה</span>
          <h2>דירות זמינות לפגישה</h2>
        </div>
        <span className="count-pill">{apartments.length} דירות</span>
      </div>

      {apartments.length > 0 ? <div className="table-wrap">
        <table className="lux-table">
          <thead>
            <tr>
              <th>דירה</th>
              <th>קומה</th>
              <th>חדרים</th>
              <th>שטח דירה</th>
              <th>מרפסת</th>
              <th>חניה</th>
              <th>מחסן</th>
              <th>כיוון</th>
              <th>מחיר</th>
              <th>סטטוס</th>
              <th>תוכנית</th>
            </tr>
          </thead>
          <tbody>
            {apartments.map((apartment) => (
              <tr key={apartment.id}>
                <td>{apartment.number}</td>
                <td>{apartment.floor}</td>
                <td>{apartment.rooms}</td>
                <td>{apartment.apartmentArea} מ&quot;ר</td>
                <td>{apartment.balconyArea} מ&quot;ר</td>
                <td>{apartment.parking}</td>
                <td>{apartment.storage}</td>
                <td>{apartment.direction}</td>
                <td>{formatPrice(apartment.price)}</td>
                <td>
                  <StatusBadge status={apartment.status} />
                </td>
                <td>
                  <button className="mini-button" onClick={() => onOpenPlan(apartment.id)}>
                    <FileSearch size={16} />
                    תוכנית {apartment.number}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : (
        <div className="empty-state compact-empty-state">
          <h3>אין כרגע דירות להצגה</h3>
          <p>המלאי יתעדכן לאחר הוספה או ייבוא במסך ניהול הפרויקט.</p>
        </div>
      )}
    </section>
  );
}
