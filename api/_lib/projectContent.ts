import type {
  Project,
  ProjectFact,
  ProjectFeatureBlock,
  ProjectFeatureFaq,
  TechnicalSpecSectionData,
} from "../../src/types";
import type { MarketingProjectContentRow } from "./types";

const MAX_ITEMS = 60;
const MAX_TEXT = 5000;

function str(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list<T>(value: unknown, map: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const mapped = map(item as Record<string, unknown>);
    if (mapped) out.push(mapped);
  }
  return out;
}

function strings(value: unknown, max = 500): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ITEMS).map((item) => str(item, max)).filter(Boolean);
}

function httpsUrl(value: unknown): string {
  try {
    const url = new URL(str(value, 500));
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts youtube.com/watch?v=, youtu.be/ and /shorts/ links; returns a privacy-enhanced embed URL or "". */
export function youtubeEmbedUrl(value: unknown): string {
  const raw = httpsUrl(value);
  if (!raw) return "";
  const url = new URL(raw);
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.replace(/^\/(shorts|embed)\//, "");
  }
  return YOUTUBE_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
}

export function mapFacts(value: unknown): ProjectFact[] {
  return list(value, (item) => {
    const label = str(item.label, 80);
    const factValue = str(item.value, 300);
    return label && factValue ? { label, value: factValue } : null;
  });
}

export function mapSpecSections(value: unknown): TechnicalSpecSectionData[] {
  return list(value, (item) => {
    const title = str(item.title, 120);
    const items = strings(item.items);
    return title && items.length ? { title, items } : null;
  }).map((section, index) => ({ id: `content-${index}`, title: section.title, items: section.items, displayOrder: index }));
}

export function mapFeatureBlocks(value: unknown): ProjectFeatureBlock[] {
  return list(value, (item) => {
    const title = str(item.title, 120);
    if (!title) return null;
    const faqs = list<ProjectFeatureFaq>(item.faqs, (faq) => {
      const q = str(faq.q, 300);
      const a = str(faq.a, 2000);
      return q && a ? { q, a } : null;
    });
    return {
      key: str(item.key, 60) || title,
      title,
      intro: str(item.intro, 2000),
      bullets: strings(item.bullets, 300),
      videoEmbedUrl: youtubeEmbedUrl(item.video_url),
      videoCaption: str(item.video_caption, 300),
      faqs,
    };
  });
}

/**
 * Applies published Gold View content on top of a project mapped from the marketing data.
 * Values from the content row win; empty content values keep what the marketing data already gave.
 */
export function applyProjectContent(project: Project, content: MarketingProjectContentRow | undefined): Project {
  if (!content || content.status !== "published") return project;
  const specSections = mapSpecSections(content.spec_sections);
  const developerName = str(content.developer_name, 200);
  return {
    ...project,
    tagline: str(content.tagline, 200) || project.tagline,
    description: str(content.description) || project.description,
    neighborhood: str(content.neighborhood, 120) || project.neighborhood,
    locationDescription: str(content.location_description),
    developerAbout: str(content.developer_about),
    developerWebsite: httpsUrl(content.developer_website),
    architect: str(content.architect, 200),
    facts: mapFacts(content.facts),
    featureBlocks: mapFeatureBlocks(content.feature_blocks),
    legalDisclaimer: str(content.legal_disclaimer),
    technicalSpecSections: specSections.length ? specSections : project.technicalSpecSections,
    details: project.details
      ? { ...project.details, developerCompany: project.details.developerCompany || developerName }
      : project.details,
  };
}
