import { Clipboard, ExternalLink, Mail, MessageCircle, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { formatPrice } from "../utils/format";
import type {
  Apartment,
  ClientShareConfig,
  ClientShareExpiry,
  ClientShareSectionId,
  Project,
} from "../types";

export const MOCK_CLIENT_VIEW_URL = "https://goldlands.co.il/client-view/gold-tower-demo";

const sectionOptions: Array<{ id: ClientShareSectionId; label: string }> = [
  { id: "overview", label: "סקירת פרויקט" },
  { id: "gallery", label: "הדמיות" },
  { id: "plans", label: "תוכניות דירה" },
  { id: "technical", label: "מפרט טכני" },
  { id: "location", label: "מיקום וסביבה" },
  { id: "apartments", label: "דירות ספציפיות" },
  { id: "prices", label: "מחירון" },
];

const expiryOptions: Array<{ value: ClientShareExpiry; label: string }> = [
  { value: "24h", label: "24 שעות" },
  { value: "7d", label: "7 ימים" },
  { value: "30d", label: "30 ימים" },
];

const initialSections = sectionOptions.reduce(
  (sections, option) => ({
    ...sections,
    [option.id]: true,
  }),
  {} as Record<ClientShareSectionId, boolean>,
);

interface ClientShareModalProps {
  project: Project;
  availableApartments: Apartment[];
  onClose: () => void;
  onOpenPreview: (config: ClientShareConfig) => void;
}

function makeInitialApartmentState(apartments: Apartment[]) {
  return apartments.reduce<Record<string, boolean>>((selection, apartment, index) => {
    selection[apartment.id] = index === 0;
    return selection;
  }, {});
}

function makeInitialPlanState(apartments: Apartment[]) {
  return apartments.reduce<Record<string, boolean>>((selection, apartment) => {
    selection[apartment.id] = apartment.planAttached;
    return selection;
  }, {});
}

export function ClientShareModal({
  project,
  availableApartments,
  onClose,
  onOpenPreview,
}: ClientShareModalProps) {
  const [sections, setSections] = useState<Record<ClientShareSectionId, boolean>>(initialSections);
  const [showPrice, setShowPrice] = useState(true);
  const [expiresIn, setExpiresIn] = useState<ClientShareExpiry>("7d");
  const [apartmentSelection, setApartmentSelection] = useState(() =>
    makeInitialApartmentState(availableApartments),
  );
  const [apartmentPlanSelection, setApartmentPlanSelection] = useState(() =>
    makeInitialPlanState(availableApartments),
  );
  const [generatedConfig, setGeneratedConfig] = useState<ClientShareConfig | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const selectedApartments = useMemo(
    () =>
      availableApartments
        .filter((apartment) => apartmentSelection[apartment.id])
        .map((apartment) => ({
          apartmentId: apartment.id,
          includePlan: Boolean(apartmentPlanSelection[apartment.id]),
        })),
    [apartmentPlanSelection, apartmentSelection, availableApartments],
  );

  const shareText = generatedConfig
    ? encodeURIComponent(`מצורף קישור לתצוגת לקוח עבור ${project.name}: ${generatedConfig.url}`)
    : "";
  const mailSubject = encodeURIComponent(`תצוגת לקוח - ${project.name}`);
  const mailBody = generatedConfig
    ? encodeURIComponent(`שלום,\nמצורף קישור לתצוגת לקוח עבור ${project.name}:\n${generatedConfig.url}`)
    : "";

  const toggleSection = (sectionId: ClientShareSectionId) => {
    setSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
    setGeneratedConfig(null);
    setCopyStatus("");
  };

  const toggleApartment = (apartmentId: string) => {
    setApartmentSelection((current) => ({
      ...current,
      [apartmentId]: !current[apartmentId],
    }));
    setGeneratedConfig(null);
    setCopyStatus("");
  };

  const toggleApartmentPlan = (apartmentId: string) => {
    setApartmentPlanSelection((current) => ({
      ...current,
      [apartmentId]: !current[apartmentId],
    }));
    setGeneratedConfig(null);
    setCopyStatus("");
  };

  const createLink = () => {
    setGeneratedConfig({
      sections,
      selectedApartments,
      showPrice,
      expiresIn,
      url: MOCK_CLIENT_VIEW_URL,
    });
    setCopyStatus("");
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(MOCK_CLIENT_VIEW_URL);
    setCopyStatus("הקישור הועתק");
  };

  return (
    <div className="material-modal-backdrop" onClick={onClose}>
      <section
        className="material-modal client-share-modal"
        role="dialog"
        aria-modal="true"
        aria-label="יצירת קישור ללקוח"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="material-modal__header">
          <div>
            <span className="eyebrow">שליחה ללקוח</span>
            <h2>יצירת קישור ללקוח</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="סגירה">
            <X size={18} />
          </button>
        </header>

        <p className="client-share-modal__note">
          בשלב זה מדובר בהדמיה מקומית בלבד. בהמשך הקישור יהיה מאובטח וניתן לשליחה אמיתית.
        </p>

        <div className="client-share-modal__grid">
          <section className="client-share-panel">
            <h3>מה לכלול בתצוגה</h3>
            <div className="client-share-options">
              {sectionOptions.map((option) => (
                <label className="client-share-check" key={option.id}>
                  <input
                    checked={sections[option.id]}
                    onChange={() => toggleSection(option.id)}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              <label className="client-share-check">
                <input
                  checked={showPrice}
                  onChange={() => {
                    setShowPrice((current) => !current);
                    setGeneratedConfig(null);
                    setCopyStatus("");
                  }}
                  type="checkbox"
                />
                <span>הצגת מחיר</span>
              </label>
            </div>

            <fieldset className="client-share-expiry">
              <legend>תוקף הקישור</legend>
              {expiryOptions.map((option) => (
                <label key={option.value}>
                  <input
                    checked={expiresIn === option.value}
                    name="client-link-expiry"
                    onChange={() => {
                      setExpiresIn(option.value);
                      setGeneratedConfig(null);
                      setCopyStatus("");
                    }}
                    type="radio"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          </section>

          <section className="client-share-panel">
            <h3>בחירת דירות פנויות</h3>
            <div className="client-share-apartments">
              {availableApartments.length === 0 ? (
                <p>אין דירות פנויות לבחירה כרגע.</p>
              ) : (
                availableApartments.map((apartment) => {
                  const isSelected = Boolean(apartmentSelection[apartment.id]);

                  return (
                    <article className="client-share-apartment" key={apartment.id}>
                      <label>
                        <input
                          checked={isSelected}
                          onChange={() => toggleApartment(apartment.id)}
                          type="checkbox"
                        />
                        <span>
                          <strong>דירה {apartment.number}</strong>
                          <small>
                            {apartment.rooms} חדרים · קומה {apartment.floor} · {apartment.apartmentArea} מ&quot;ר
                          </small>
                        </span>
                      </label>
                      <div className="client-share-apartment__meta">
                        <StatusBadge status={apartment.status} />
                        {showPrice && <span>{formatPrice(apartment.specialPrice)}</span>}
                      </div>
                      <label className="client-share-plan-toggle">
                        <input
                          checked={Boolean(apartmentPlanSelection[apartment.id])}
                          disabled={!isSelected}
                          onChange={() => toggleApartmentPlan(apartment.id)}
                          type="checkbox"
                        />
                        <span>לצרף תוכנית דירה</span>
                      </label>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {generatedConfig && (
          <section className="client-share-result" aria-label="קישור שנוצר">
            <span>קישור דמו נוצר</span>
            <strong dir="ltr">{generatedConfig.url}</strong>
            {copyStatus && <small>{copyStatus}</small>}
            <div className="client-share-result__actions">
              <button className="ghost-button ghost-button--compact" onClick={copyLink} type="button">
                <Clipboard size={16} />
                העתקת קישור
              </button>
              <button
                className="gold-button gold-button--compact"
                onClick={() => onOpenPreview(generatedConfig)}
                type="button"
              >
                <ExternalLink size={16} />
                פתיחה בתצוגת לקוח
              </button>
              <a
                className="ghost-button ghost-button--compact"
                href={`https://wa.me/?text=${shareText}`}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle size={16} />
                שליחה בוואטסאפ
              </a>
              <a
                className="ghost-button ghost-button--compact"
                href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
              >
                <Mail size={16} />
                שליחה במייל
              </a>
            </div>
          </section>
        )}

        <footer className="material-modal__footer">
          <button className="ghost-button ghost-button--compact" onClick={onClose} type="button">
            ביטול
          </button>
          <button className="gold-button gold-button--compact" onClick={createLink} type="button">
            <Send size={16} />
            יצירת קישור
          </button>
        </footer>
      </section>
    </div>
  );
}
