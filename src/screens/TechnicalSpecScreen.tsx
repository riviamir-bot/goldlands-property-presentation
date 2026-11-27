import {
  TechnicalSpecAccordion,
  defaultOverviewSpecIds,
} from "../components/TechnicalSpecAccordion";
import { FeatureBlocks } from "../components/FeatureBlocks";
import type { Project } from "../types";

interface TechnicalSpecScreenProps {
  project?: Project;
}

export function TechnicalSpecScreen({ project }: TechnicalSpecScreenProps) {
  const importedSpecItems = project?.technicalSpecNotes ?? [];
  const structuredSections = project?.technicalSpecSections ?? [];
  const sections = structuredSections.length > 0
    ? structuredSections
    : importedSpecItems.length > 0
      ? [{ id: "other", title: "מפרט טכני", items: importedSpecItems, displayOrder: 0 }]
      : undefined;
  const featureBlocks = project?.featureBlocks ?? [];
  const shouldShowDemoSpec = !project?.isSupabaseBacked && !sections && featureBlocks.length === 0;

  return (
    <section className="panel technical-spec-panel">
      <header className="technical-spec-panel__header">
        <div>
          <span className="eyebrow">מפרט טכני</span>
          <h2>כל סעיפי המפרט במקום אחד</h2>
        </div>
        <p>תצוגת מפרט נקייה לפגישת לקוח, באותו מבנה אקורדיון שמופיע בסקירת הפרויקט.</p>
      </header>
      <FeatureBlocks blocks={featureBlocks} />
      {sections ? (
        <TechnicalSpecAccordion
          defaultOpenIds={sections.map((section) => section.id)}
          sections={sections}
          variant="screen"
        />
      ) : shouldShowDemoSpec ? (
        <TechnicalSpecAccordion defaultOpenIds={defaultOverviewSpecIds} variant="screen" />
      ) : featureBlocks.length > 0 ? null : (
        <div className="empty-state compact-empty-state">
          <h3>עדיין לא הוזן מפרט טכני</h3>
          <p>ניתן להוסיף ולערוך סעיפים במסך ניהול הפרויקט.</p>
        </div>
      )}
      {project?.legalDisclaimer && (
        <p className="spec-disclaimer" dir="auto">{project.legalDisclaimer}</p>
      )}
    </section>
  );
}
