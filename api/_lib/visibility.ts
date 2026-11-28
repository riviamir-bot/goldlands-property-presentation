import type { Project, ProjectTranslation } from "../../src/types";

/**
 * Topics a manager can hide from the client view, per project, in the marketing system
 * (projects.presentation_hidden_topics). Hidden data is removed here, on the server, and never reaches the browser.
 */
export const VISIBILITY_TOPICS = [
  "address",
  "developer",
  "construction_stage",
  "completion_date",
  "units",
  "description",
  "apartments",
  "renders",
  "model_3d",
] as const;
export type VisibilityTopic = (typeof VISIBILITY_TOPICS)[number];

/** Reads the stored list; anything that is not a known topic is ignored. */
export function hiddenTopics(value: unknown): Set<VisibilityTopic> {
  const hidden = new Set<VisibilityTopic>();
  if (!Array.isArray(value)) return hidden;
  for (const item of value) {
    const topic = VISIBILITY_TOPICS.find((known) => known === item);
    if (topic) hidden.add(topic);
  }
  return hidden;
}

const COMPLETION_FACT = /סיום|אכלוס|מסירה/;
const UNITS_FACT = /יח"ד|יח״ד|יחידות|דירות/;
const STAGE_FACT = /שלב/;
const DEVELOPER_FACT = /יזם|חברה/;

/** Removes the hidden topics from a mapped project. Apartments are dropped by the caller. */
export function applyVisibility(project: Project, hidden: ReadonlySet<VisibilityTopic>): Project {
  if (hidden.size === 0) return project;
  const next: Project = { ...project };
  const details = project.details ? { ...project.details } : undefined;
  const dropFacts = (pattern: RegExp) => {
    next.facts = next.facts?.filter((fact) => !pattern.test(fact.label));
  };
  const translations: NonNullable<Project["translations"]> = {};
  for (const language of ["en", "fr"] as const) {
    const translation = project.translations?.[language];
    if (translation) translations[language] = { ...translation };
  }
  const eachTranslation = (edit: (translation: ProjectTranslation) => void) => {
    for (const translation of Object.values(translations)) edit(translation);
  };

  if (hidden.has("address")) {
    next.address = "";
    next.location = project.city;
    next.googleMapsUrl = "";
    next.googleMapsEmbedUrl = "";
    eachTranslation((translation) => {
      translation.address = "";
    });
  }
  if (hidden.has("developer")) {
    if (details) details.developerCompany = "";
    next.developerAbout = "";
    next.developerWebsite = "";
    dropFacts(DEVELOPER_FACT);
    eachTranslation((translation) => {
      translation.developerAbout = "";
    });
  }
  if (hidden.has("construction_stage")) {
    if (details) details.constructionStage = "";
    dropFacts(STAGE_FACT);
  }
  if (hidden.has("completion_date")) {
    if (details) details.constructionCompletionDate = "";
    dropFacts(COMPLETION_FACT);
  }
  if (hidden.has("construction_stage") || hidden.has("units")) {
    const stage = project.details?.constructionStage ?? "";
    next.keyFacts = project.keyFacts.filter((fact) =>
      fact === stage ? !hidden.has("construction_stage") : !hidden.has("units"),
    );
  }
  if (hidden.has("units")) {
    next.stats = { ...project.stats, units: "", newApartments: "", existingApartments: "" };
    dropFacts(UNITS_FACT);
  }
  if (hidden.has("description")) {
    next.description = "";
    eachTranslation((translation) => {
      translation.description = "";
    });
  }
  if (hidden.has("apartments")) {
    next.apartmentMix = { threeRooms: "", fourRooms: "", fiveRooms: "", gardenApartments: "", penthouses: "" };
  }
  if (hidden.has("renders")) {
    // The hero image stays: it is the backdrop of every screen.
    next.gallery = { exterior: [], interior: [], lobby: [], surroundings: [] };
    next.galleryCaptions = {};
    next.renderGroups = [];
  }
  if (hidden.has("model_3d")) next.model3dUrl = "";

  next.details = details;
  if (project.translations) next.translations = translations;
  return next;
}
