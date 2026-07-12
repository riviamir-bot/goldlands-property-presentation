import { FileDown, Printer, Share2 } from "lucide-react";
import { formatPrice } from "../utils/format";
import type { Apartment, Project } from "../types";

interface PlanScreenProps {
  apartment?: Apartment;
  project?: Project;
}

const floorTargetOrder = [
  "קומת קרקע",
  "קומות 1-4",
  "קומות 5-6",
  "קומה 7",
  "גג וגג עליון",
  "תכנית מגרש",
];

export function PlanScreen({ apartment, project }: PlanScreenProps) {
  if (!apartment) {
    return (
      <section className="empty-state compact-empty-state">
        <h2>אין דירה להצגת תכנית</h2>
        <p>לאחר הוספת דירה ושיוך תכנית, היא תופיע כאן.</p>
      </section>
    );
  }

  const uploadedPlanUrl = apartment.planUrl?.trim();
  const floorPlans = (project?.projectFiles ?? [])
    .filter((file) => file.type === "תכנית קומה")
    .sort((a, b) => {
      const aIndex = floorTargetOrder.indexOf(a.target);
      const bIndex = floorTargetOrder.indexOf(b.target);

      return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
    });

  return (
    <section className="plan-layout">
      <div className="plan-canvas" aria-label="תוכנית דירה">
        {uploadedPlanUrl ? (
          <iframe
            className="plan-canvas__document"
            src={uploadedPlanUrl}
            title={`תוכנית דירה ${apartment.number}`}
          />
        ) : (
          <>
            <div className="plan-canvas__label">
              <span>תוכנית דירה {apartment.number}</span>
              <strong>{apartment.planAttached ? "קובץ תוכנית משויך לדירה" : "מקום שמור לקובץ תוכנית"}</strong>
            </div>
            <div className="room room--living">סלון</div>
            <div className="room room--kitchen">מטבח</div>
            <div className="room room--master">חדר הורים</div>
            <div className="room room--bedroom">חדר</div>
            <div className="room room--safe">ממ&quot;ד</div>
            <div className="room room--bath">רחצה</div>
            <div className="room room--balcony">מרפסת</div>
          </>
        )}
      </div>

      <aside className="details-card">
        <span className="eyebrow">תוכנית דירה</span>
        <h2>דירה {apartment.number}</h2>
        <p className="plan-source-note">
          התוכנית נפתחת מתוך כפתור &quot;תוכנית&quot; בשורת הדירה, ותעלה בעתיד מניהול דירות ומלאי או מתוכניות דירה.
        </p>
        <dl>
          <div>
            <dt>חדרים</dt>
            <dd>{apartment.rooms}</dd>
          </div>
          <div>
            <dt>קומה</dt>
            <dd>{apartment.floor}</dd>
          </div>
          <div>
            <dt>שטח פנימי</dt>
            <dd>{apartment.apartmentArea} מ&quot;ר</dd>
          </div>
          <div>
            <dt>מרפסת</dt>
            <dd>{apartment.balconyArea} מ&quot;ר</dd>
          </div>
          <div>
            <dt>גינה</dt>
            <dd>{apartment.gardenArea ? `${apartment.gardenArea} מ"ר` : "לא רלוונטי"}</dd>
          </div>
          <div>
            <dt>חניה</dt>
            <dd>{apartment.parking}</dd>
          </div>
          <div>
            <dt>מחסן</dt>
            <dd>{apartment.storage}</dd>
          </div>
          <div>
            <dt>כיוון</dt>
            <dd>{apartment.direction}</dd>
          </div>
          <div>
            <dt>מחיר מיוחד</dt>
            <dd>{formatPrice(apartment.specialPrice)}</dd>
          </div>
          <div>
            <dt>קובץ תוכנית</dt>
            <dd>{apartment.planAttached ? apartment.planFileName ?? `תוכנית דירה ${apartment.number}` : "טרם צורף"}</dd>
          </div>
        </dl>
        <div className="action-row">
          <button
            className="mini-button"
            disabled={!uploadedPlanUrl}
            onClick={() => {
              if (uploadedPlanUrl) window.open(uploadedPlanUrl, "_blank", "noopener,noreferrer");
            }}
            type="button"
          >
            <FileDown size={17} />
            PDF
          </button>
          <button className="mini-button">
            <Printer size={17} />
            הדפסה
          </button>
          <button className="mini-button">
            <Share2 size={17} />
            שיתוף
          </button>
        </div>
        {floorPlans.length > 0 && (
          <section className="floor-plan-list" aria-label="תכניות קומה">
            <h3>תכניות קומה</h3>
            {floorPlans.map((file) => (
              <a href={file.url} key={file.id} rel="noreferrer" target="_blank">
                <span>{file.target || "תכנית קומה"}</span>
                <small>{file.name}</small>
              </a>
            ))}
          </section>
        )}
      </aside>
    </section>
  );
}
