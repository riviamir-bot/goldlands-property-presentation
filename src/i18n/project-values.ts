import type { Language } from "./strings";

// Known project values stored in Hebrew in the marketing database.
// Anything not listed (names, addresses) is shown exactly as entered.
const PROJECT_TYPES: Record<string, Record<Language, string>> = {
  "פרויקט חדש": { he: "פרויקט חדש", en: "New project", fr: "Projet neuf" },
  "תמ״א 38/1": { he: "תמ״א 38/1", en: "TAMA 38/1", fr: "TAMA 38/1" },
  "תמ״א 38/2 / פינוי בינוי": {
    he: "תמ״א 38/2 / פינוי בינוי",
    en: "TAMA 38/2 / Demolition and rebuild",
    fr: "TAMA 38/2 / Démolition et reconstruction",
  },
};

const CONSTRUCTION_STAGES: Record<string, Record<Language, string>> = {
  "בבניה": { he: "בבניה", en: "Under construction", fr: "En construction" },
  "בביצוע": { he: "בביצוע", en: "Under construction", fr: "En construction" },
  "היתר בתנאים": { he: "היתר בתנאים", en: "Conditional permit", fr: "Permis sous conditions" },
  "התקבל היתר בניה": { he: "התקבל היתר בניה", en: "Building permit received", fr: "Permis de construire obtenu" },
};

function lookup(table: Record<string, Record<Language, string>>, value: string, language: Language): string {
  const key = value.trim();
  return table[key]?.[language] ?? value;
}

export function translateProjectType(value: string, language: Language): string {
  return lookup(PROJECT_TYPES, value, language);
}

export function translateConstructionStage(value: string, language: Language): string {
  return lookup(CONSTRUCTION_STAGES, value, language);
}
