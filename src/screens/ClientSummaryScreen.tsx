import { CheckCircle2, FileText, Send } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { formatPrice } from "../utils/format";
import type { Apartment, Project } from "../types";

interface ClientSummaryScreenProps {
  project: Project;
  apartment: Apartment;
}

export function ClientSummaryScreen({ project, apartment }: ClientSummaryScreenProps) {
  return (
    <section className="summary-layout">
      <article className="summary-main">
        <span className="eyebrow">סיכום פגישה</span>
        <h2>{project.name}</h2>
        <p>{project.location}</p>

        <div className="summary-apartment">
          <div>
            <span>דירה נבחרת</span>
            <strong>{apartment.number}</strong>
          </div>
          <div>
            <span>חדרים</span>
            <strong>{apartment.rooms}</strong>
          </div>
          <div>
            <span>מחיר מיוחד</span>
            <strong>{formatPrice(apartment.specialPrice)}</strong>
          </div>
          <StatusBadge status={apartment.status} />
        </div>

        <div className="summary-actions">
          <button className="gold-button">
            <FileText size={18} />
            הפקת תקציר
          </button>
          <button className="ghost-button">
            <Send size={18} />
            שליחה ללקוח
          </button>
        </div>
      </article>

      <aside className="next-steps">
        <h3>המשך טיפול</h3>
        {["אישור מחיר מיוחד", "בדיקת זמינות דירה", "תיאום פגישת המשך", "שמירת הערות לקוח"].map(
          (step) => (
            <div className="step-item" key={step}>
              <CheckCircle2 size={18} />
              <span>{step}</span>
            </div>
          ),
        )}
      </aside>
    </section>
  );
}
