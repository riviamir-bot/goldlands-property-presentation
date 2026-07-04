import {
  TechnicalSpecAccordion,
  defaultOverviewSpecIds,
} from "../components/TechnicalSpecAccordion";

export function TechnicalSpecScreen() {
  return (
    <section className="panel technical-spec-panel">
      <header className="technical-spec-panel__header">
        <div>
          <span className="eyebrow">מפרט טכני</span>
          <h2>כל סעיפי המפרט במקום אחד</h2>
        </div>
        <p>תצוגת מפרט נקייה לפגישת לקוח, באותו מבנה אקורדיון שמופיע בסקירת הפרויקט.</p>
      </header>
      <TechnicalSpecAccordion defaultOpenIds={defaultOverviewSpecIds} variant="screen" />
    </section>
  );
}
