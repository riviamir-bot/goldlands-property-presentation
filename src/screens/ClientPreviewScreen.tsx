import { ArrowRight, Building2, CalendarClock, FileText, Home, Images, LogOut, MapPin, Ruler } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { StatusBadge } from "../components/StatusBadge";
import { TechnicalSpecAccordion } from "../components/TechnicalSpecAccordion";
import { formatPrice } from "../utils/format";
import type { Apartment, ClientShareConfig, ClientShareExpiry, Project } from "../types";

interface ClientPreviewScreenProps {
  project: Project;
  apartments: Apartment[];
  shareConfig: ClientShareConfig;
  onBack: () => void;
  authModeLabel?: string;
  onSignOut?: () => void;
}

const expiryLabels: Record<ClientShareExpiry, string> = {
  "24h": "24 שעות",
  "7d": "7 ימים",
  "30d": "30 ימים",
};

const galleryLabels = {
  exterior: "חוץ",
  interior: "פנים",
  lobby: "לובי",
  surroundings: "סביבה",
};

export function ClientPreviewScreen({
  project,
  apartments,
  shareConfig,
  onBack,
  authModeLabel,
  onSignOut,
}: ClientPreviewScreenProps) {
  const selectedApartments = shareConfig.selectedApartments
    .map((selection) => ({
      selection,
      apartment: apartments.find((apartment) => apartment.id === selection.apartmentId),
    }))
    .filter((item): item is { selection: { apartmentId: string; includePlan: boolean }; apartment: Apartment } =>
      Boolean(item.apartment),
    );
  const selectedApartmentsWithPlans = selectedApartments.filter(({ selection }) => selection.includePlan);
  const galleryImages = Object.entries(project.gallery).flatMap(([category, images]) =>
    images.slice(0, 1).map((image) => ({
      category: galleryLabels[category as keyof typeof galleryLabels],
      image,
    })),
  );
  const heroImage = project.mainImage || project.heroImage;

  return (
    <main className="client-preview-screen">
      <header className="client-preview-header">
        <div className="client-preview-header__identity">
          <BrandLogo compact />
          <ProjectLogoSlot project={project} compact />
        </div>
        <div className="client-preview-header__actions">
          {onSignOut && (
            <div className="auth-status-chip">
              {authModeLabel && <span>{authModeLabel}</span>}
              <button className="ghost-button ghost-button--compact" onClick={onSignOut} type="button">
                <LogOut size={16} />
                התנתקות
              </button>
            </div>
          )}
          <button className="ghost-button ghost-button--compact" onClick={onBack} type="button">
            <ArrowRight size={17} />
            חזרה למצגת
          </button>
        </div>
      </header>

      <section className="client-preview-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div>
          <span className="eyebrow">תצוגת לקוח</span>
          <h1>{project.name}</h1>
          <p>{project.tagline}</p>
          <div className="client-preview-hero__meta">
            <span>
              <MapPin size={17} />
              {project.location}
            </span>
            <span>
              <CalendarClock size={17} />
              תוקף קישור: {expiryLabels[shareConfig.expiresIn]}
            </span>
          </div>
        </div>
      </section>

      <div className="client-preview-content">
        {shareConfig.sections.overview && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <Building2 size={24} />
              <div>
                <span className="eyebrow">סקירת פרויקט</span>
                <h2>הפרויקט בקצרה</h2>
              </div>
            </div>
            <p>{project.description}</p>
            <div className="client-preview-stat-grid">
              <article>
                <span>קומות</span>
                <strong>{project.stats.floors}</strong>
              </article>
              <article>
                <span>דירות</span>
                <strong>{project.stats.units}</strong>
              </article>
              <article>
                <span>אכלוס</span>
                <strong>{project.stats.occupancy}</strong>
              </article>
            </div>
            <div className="project-card__facts">
              {project.keyFacts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </div>
          </section>
        )}

        {shareConfig.sections.gallery && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <Images size={24} />
              <div>
                <span className="eyebrow">הדמיות</span>
                <h2>מבט על הפרויקט</h2>
              </div>
            </div>
            <div className="client-preview-gallery">
              {galleryImages.map((item) => (
                <figure key={`${item.category}-${item.image}`}>
                  <img src={item.image} alt={`${project.name} ${item.category}`} />
                  <figcaption>{item.category}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {shareConfig.sections.apartments && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <Home size={24} />
              <div>
                <span className="eyebrow">דירות ספציפיות</span>
                <h2>דירות שנבחרו עבורך</h2>
              </div>
            </div>
            {selectedApartments.length > 0 ? (
              <div className="table-wrap">
                <table className="lux-table client-preview-table">
                  <thead>
                    <tr>
                      <th>דירה</th>
                      <th>קומה</th>
                      <th>חדרים</th>
                      <th>שטח דירה</th>
                      <th>מרפסת</th>
                      <th>כיוון</th>
                      {shareConfig.showPrice && <th>מחיר</th>}
                      <th>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedApartments.map(({ apartment }) => (
                      <tr key={apartment.id}>
                        <td>{apartment.number}</td>
                        <td>{apartment.floor}</td>
                        <td>{apartment.rooms}</td>
                        <td>{apartment.apartmentArea} מ&quot;ר</td>
                        <td>{apartment.balconyArea} מ&quot;ר</td>
                        <td>{apartment.direction}</td>
                        {shareConfig.showPrice && <td>{formatPrice(apartment.specialPrice)}</td>}
                        <td>
                          <StatusBadge status={apartment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>לא נבחרו דירות להצגה בקישור זה.</p>
            )}
          </section>
        )}

        {shareConfig.sections.prices && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <FileText size={24} />
              <div>
                <span className="eyebrow">מחירון</span>
                <h2>{shareConfig.showPrice ? "מחירון להצגה" : "מחירון ללא הצגת מחיר"}</h2>
              </div>
            </div>
            {shareConfig.showPrice ? (
              selectedApartments.length > 0 ? (
                <div className="client-preview-price-grid">
                  {selectedApartments.map(({ apartment }) => (
                    <article key={apartment.id}>
                      <span>דירה {apartment.number}</span>
                      <strong>{formatPrice(apartment.specialPrice)}</strong>
                      <small>
                        {apartment.rooms} חדרים · {apartment.apartmentArea + apartment.balconyArea} מ&quot;ר
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <p>לא נבחרו דירות להצגת מחירון בקישור זה.</p>
              )
            ) : (
              <p>המחירים יוצגו על ידי צוות המכירות בפגישה או בשיחה אישית.</p>
            )}
          </section>
        )}

        {shareConfig.sections.plans && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <Ruler size={24} />
              <div>
                <span className="eyebrow">תוכניות דירה</span>
                <h2>תוכניות שנבחרו לשיתוף</h2>
              </div>
            </div>
            {selectedApartmentsWithPlans.length > 0 ? (
              <div className="client-preview-plan-grid">
                {selectedApartmentsWithPlans.map(({ apartment }) => (
                  <article className="client-preview-plan-card" key={apartment.id}>
                    <div className="client-preview-plan-card__canvas">
                      <span>תוכנית דירה {apartment.number}</span>
                    </div>
                    <div>
                      <strong>דירה {apartment.number}</strong>
                      <span>
                        {apartment.rooms} חדרים · קומה {apartment.floor} · {apartment.apartmentArea} מ&quot;ר
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>לא נבחרו תוכניות דירה לשיתוף בקישור זה.</p>
            )}
          </section>
        )}

        {shareConfig.sections.technical && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <FileText size={24} />
              <div>
                <span className="eyebrow">מפרט טכני</span>
                <h2>עיקרי המפרט</h2>
              </div>
            </div>
            <TechnicalSpecAccordion variant="screen" />
          </section>
        )}

        {shareConfig.sections.location && (
          <section className="client-preview-section">
            <div className="client-preview-section__header">
              <MapPin size={24} />
              <div>
                <span className="eyebrow">מיקום וסביבה</span>
                <h2>{project.address}</h2>
              </div>
            </div>
            <div className="client-preview-location">
              <article>
                <span>עיר</span>
                <strong>{project.city}</strong>
              </article>
              <article>
                <span>שכונה</span>
                <strong>{project.neighborhood}</strong>
              </article>
              <article>
                <span>אזור</span>
                <strong>{project.location}</strong>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
