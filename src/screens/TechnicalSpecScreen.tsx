import {
  TechnicalSpecAccordion,
  defaultOverviewSpecIds,
} from "../components/TechnicalSpecAccordion";
import type { Project } from "../types";

interface TechnicalSpecScreenProps {
  project?: Project;
}

export function TechnicalSpecScreen({ project }: TechnicalSpecScreenProps) {
  const importedSpecItems = project?.technicalSpecNotes ?? [];

  return (
    <section className="panel technical-spec-panel">
      <header className="technical-spec-panel__header">
        <div>
          <span className="eyebrow">מפרט טכני</span>
          <h2>כל סעיפי המפרט במקום אחד</h2>
        </div>
        <p>תצוגת מפרט נקייה לפגישת לקוח, באותו מבנה אקורדיון שמופיע בסקירת הפרויקט.</p>
      </header>
      {importedSpecItems.length > 0 && (
        <section className="technical-imported-spec" aria-label="מפרט שחולץ ממצגת">
          <h3>מפרט שחולץ מהמצגת</h3>
          <ul>
            {importedSpecItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <TechnicalSpecAccordion defaultOpenIds={defaultOverviewSpecIds} variant="screen" />
    </section>
  );
}
