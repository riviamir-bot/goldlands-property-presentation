import type { Project, ProjectTranslation, SharedProjectDetails } from "../../src/types";
import { pickCurrentDocuments } from "./mapping.js";
import type { MarketingDocumentRow, MarketingProjectRow, SignedUrlLookup } from "./types";

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
  // Not shown unless a manager ticks them (projects.presentation_shown_topics).
  "project_type",
  "company_number",
  "financing_bank",
  "block",
  "parcel",
  "building_count",
  "existing_units",
  "new_units",
  "construction_start_date",
  "price_list",
  "presentation_link",
  "registration_form",
  "website",
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

function text(value: string | null | undefined) {
  return (value ?? "").trim();
}

function count(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? String(value) : "";
}

function httpsLink(value: string | null | undefined) {
  try {
    const url = new URL(text(value));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const DOCUMENT_TOPICS = { price_list: "price_list", presentation_link: "presentation", registration_form: "registration_form" } as const;

/** Signed link of the newest stored file of each link topic. */
export function documentLinks(documents: MarketingDocumentRow[], urlFor: SignedUrlLookup) {
  const links: Partial<Record<keyof typeof DOCUMENT_TOPICS, string>> = {};
  const current = pickCurrentDocuments(documents);
  for (const [topic, documentType] of Object.entries(DOCUMENT_TOPICS) as Array<[keyof typeof DOCUMENT_TOPICS, string]>) {
    const document = current.find((item) => item.document_type === documentType);
    const url = document ? urlFor(document.storage_bucket, document.storage_path) : undefined;
    if (url) links[topic] = url;
  }
  return links;
}

/** True when a link topic is ticked: the file is needed to build its link. */
export function needsDocuments(shown: ReadonlySet<VisibilityTopic>) {
  return shown.has("price_list") || shown.has("presentation_link") || shown.has("registration_form");
}

/**
 * The details a manager ticked "shown to the client" for. Nothing is read for a topic that is not ticked, and a
 * ticked topic without a value is left out. A stored file wins over the pasted link of the same topic.
 */
export function buildSharedDetails(
  row: MarketingProjectRow,
  shown: ReadonlySet<VisibilityTopic>,
  stored: ReturnType<typeof documentLinks> = {},
): SharedProjectDetails | undefined {
  if (shown.size === 0) return undefined;
  const details: SharedProjectDetails = {};
  const set = <K extends keyof SharedProjectDetails>(topic: VisibilityTopic, key: K, value: SharedProjectDetails[K]) => {
    if (shown.has(topic) && value) details[key] = value;
  };
  set("project_type", "projectType", text(row.project_type));
  set("company_number", "companyNumber", text(row.company_number));
  set("financing_bank", "financingBank", text(row.financing_bank));
  set("block", "block", text(row.block));
  set("parcel", "parcel", text(row.parcel));
  set("building_count", "buildingCount", count(row.building_count));
  set("existing_units", "existingUnits", count(row.existing_units));
  set("new_units", "newUnits", count(row.new_units));
  set("construction_start_date", "constructionStartDate", /^(\d{4}-\d{2}-\d{2})/.exec(row.construction_start_date ?? "")?.[1] ?? "");

  const links: NonNullable<SharedProjectDetails["links"]> = {};
  const priceList = shown.has("price_list") ? stored.price_list || httpsLink(row.price_list_url) : "";
  const presentation = shown.has("presentation_link") ? stored.presentation_link || httpsLink(row.presentation_url) : "";
  const registrationForm = shown.has("registration_form") ? stored.registration_form || httpsLink(row.registration_form_url) : "";
  const website = shown.has("website") ? httpsLink(row.project_website_url) : "";
  if (priceList) links.priceList = priceList;
  if (presentation) links.presentation = presentation;
  if (registrationForm) links.registrationForm = registrationForm;
  if (website) links.website = website;
  if (Object.keys(links).length > 0) details.links = links;

  return Object.keys(details).length > 0 ? details : undefined;
}
