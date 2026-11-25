import { renderCaption } from "./renderCaption.js";
import type { Apartment, ApartmentStatus, Project, ProjectFile, ProjectFileAssociation, ProjectRenderGroup } from "../../src/types";
import type {
  MarketingRenderGroupRow,
  MarketingApartmentRow,
  MarketingDocumentRow,
  MarketingProjectRow,
  MarketingRenderRow,
  SignedUrlLookup,
} from "./types";

/** Test projects that exist in the marketing database and must never be presented. */
export const EXCLUDED_PROJECT_IDS: readonly string[] = [
  "1d02af7d-d119-47ac-bec8-2f11149f848e",
  "71e9deae-2d8b-4776-822c-3788e8a38c99",
];

const DOCUMENT_TYPE_LABELS: Record<string, ProjectFileAssociation> = {
  price_list: "מחירון",
  presentation: "מצגת",
};
const DOCUMENT_TYPE_ORDER = ["price_list", "presentation"];

function numberOrZero(value: number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countOrEmpty(value: number | null | undefined) {
  const parsed = numberOrZero(value);
  return parsed > 0 ? String(parsed) : "";
}

export function mapApartmentStatus(status: string | null): ApartmentStatus {
  if (status === "available") return "available";
  if (status === "negotiation" || status === "signing") return "reserved";
  if (status === "sold") return "sold";
  return "notMarketing";
}

function text(value: string | null | undefined) {
  return (value ?? "").trim();
}

function safeUrl(value: unknown, allowHttp = true): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" || (allowHttp && url.protocol === "http:")) return url.toString();
  } catch {
    // not a URL
  }
  return "";
}

const MODEL_3D_LABEL = /תלת[\s-]*מימד|\b3d\b/i;

/** Only the link labelled as a 3D model leaves the server; every other project link may be internal. */
export function pickModel3dUrl(additionalLinks: unknown): string {
  if (!Array.isArray(additionalLinks)) return "";
  for (const link of additionalLinks) {
    if (!link || typeof link !== "object") continue;
    const { label, url } = link as { label?: unknown; url?: unknown };
    if (typeof label === "string" && MODEL_3D_LABEL.test(label)) {
      const safe = safeUrl(url, false);
      if (safe) return safe;
    }
  }
  return "";
}

function isoDate(value: string | null | undefined) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "");
  return match ? match[1] : "";
}

/** The marketing system usually stores the city inside the address; avoid "street, city, city". */
export function formatLocation(address: string, city: string) {
  if (!address) return city;
  if (!city || address.includes(city)) return address;
  return `${address}, ${city}`;
}

export function mapProjectType(value: string | null): Project["projectType"] {
  const normalized = (value ?? "").replace(/\\/g, "/");
  if (normalized.includes("38/2")) return "תמ״א 38/2 / פינוי בינוי";
  if (normalized.includes("38/1")) return "תמ״א 38/1";
  return "פרויקט חדש";
}

/** Bucket that holds apartment plans in the marketing system. */
export const PLAN_BUCKET = "project-materials";

export function mapApartment(row: MarketingApartmentRow, urlFor?: SignedUrlLookup): Apartment {
  const status = mapApartmentStatus(row.status);
  const price = status === "sold" ? 0 : numberOrZero(row.price);

  const planUrl = row.plan_storage_path && urlFor ? urlFor(PLAN_BUCKET, row.plan_storage_path) : undefined;

  return {
    id: row.id,
    projectId: row.project_id,
    number: (row.apartment_number ?? "").trim(),
    floor: numberOrZero(row.floor),
    rooms: numberOrZero(row.rooms),
    apartmentArea: numberOrZero(row.area),
    balconyArea: numberOrZero(row.balcony_area),
    gardenArea: 0,
    parking: "",
    storage: "",
    direction: "",
    price,
    specialPrice: 0,
    status,
    planAttached: Boolean(planUrl),
    ...(planUrl
      ? { planUrl, planFileName: row.plan_filename ?? "", planContentType: row.plan_content_type ?? "" }
      : {}),
    notes: "",
  };
}

export function pickCurrentDocuments(documents: MarketingDocumentRow[]): MarketingDocumentRow[] {
  const newestByType = new Map<string, MarketingDocumentRow>();
  for (const document of documents) {
    const current = newestByType.get(document.document_type);
    if (!current || document.created_at > current.created_at) {
      newestByType.set(document.document_type, document);
    }
  }
  return Array.from(newestByType.values());
}

function sortRenders(renders: MarketingRenderRow[]) {
  return [...renders].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.filename.localeCompare(b.filename, "he");
  });
}

function mapDocuments(documents: MarketingDocumentRow[], urlFor: SignedUrlLookup): ProjectFile[] {
  const files: ProjectFile[] = [];
  const current = pickCurrentDocuments(documents);

  for (const documentType of DOCUMENT_TYPE_ORDER) {
    const document = current.find((item) => item.document_type === documentType);
    if (!document) continue;
    const url = urlFor(document.storage_bucket, document.storage_path);
    if (!url) continue;
    files.push({
      id: document.id,
      name: document.filename,
      type: DOCUMENT_TYPE_LABELS[documentType],
      target: "",
      url,
      sizeBytes: 0,
      uploadedAt: document.created_at,
    });
  }

  return files;
}

/** Manual groups with their renderings, building first, then the dashboard order. Empty groups are dropped. */
function mapRenderGroups(
  renders: MarketingRenderRow[],
  groups: MarketingRenderGroupRow[],
  urlFor: SignedUrlLookup,
): ProjectRenderGroup[] {
  const ordered = [...groups].sort(
    (a, b) =>
      Number(b.is_building) - Number(a.is_building) ||
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "he"),
  );
  const sorted = sortRenders(renders);
  return ordered
    .map((group) => ({
      id: group.id,
      name: group.name,
      isBuilding: group.is_building,
      images: sorted
        .filter((render) => render.group_id === group.id)
        .map((render) => urlFor(render.storage_bucket, render.storage_path))
        .filter((url): url is string => Boolean(url)),
    }))
    .filter((group) => group.images.length > 0);
}

export function mapProject(
  row: MarketingProjectRow,
  renders: MarketingRenderRow[],
  documents: MarketingDocumentRow[],
  apartments: MarketingApartmentRow[],
  urlFor: SignedUrlLookup,
  renderGroups: MarketingRenderGroupRow[] = [],
): Project {
  const name = row.name.trim();
  const city = (row.city ?? "").trim();
  const address = (row.address ?? "").trim();
  const galleryCaptions: Record<string, string> = {};
  const apartmentNumbers = new Set(apartments.map((item) => String(item.apartment_number ?? "").trim()).filter(Boolean));
  const imageUrls: string[] = [];
  for (const render of sortRenders(renders)) {
    const url = urlFor(render.storage_bucket, render.storage_path);
    if (!url) continue;
    imageUrls.push(url);
    galleryCaptions[url] = renderCaption(render.filename, name, apartmentNumbers.size ? apartmentNumbers : undefined);
  }
  // Hero: a render marked featured, else one that shows the building, else an exterior, else the first.
  const featured = renders.some((render) => render.is_featured);
  const captionHas = (term: string) => imageUrls.find((url) => galleryCaptions[url]?.includes(term));
  const heroImage = (featured ? imageUrls[0] : captionHas("הבניין") ?? captionHas("הדמיית חוץ") ?? imageUrls[0]) ?? "";
  const unitCount = numberOrZero(row.new_units) || numberOrZero(row.units);
  const countRooms = (rooms: number) => String(apartments.filter((item) => numberOrZero(item.rooms) === rooms).length);

  return {
    id: row.id,
    name,
    location: formatLocation(address, city),
    city,
    neighborhood: "",
    address,
    googleMapsUrl: "",
    googleMapsEmbedUrl: "",
    projectType: mapProjectType(row.project_type),
    tagline: "",
    description: (row.description ?? "").trim(),
    logoMark: name.replace(/\s+/g, "").slice(0, 2),
    isSupabaseBacked: true,
    sortOrder: row.sort_order ?? undefined,
    projectLogo: "",
    heroImage,
    mainImage: heroImage,
    block: row.block ?? undefined,
    parcel: row.parcel ?? undefined,
    keyFacts: [(row.construction_stage ?? "").trim(), unitCount > 0 ? `${unitCount} דירות` : ""].filter(Boolean),
    stats: {
      floors: "",
      units: unitCount > 0 ? String(unitCount) : "",
      occupancy: "",
      parking: "",
      buildings: countOrEmpty(row.building_count),
      existingApartments: countOrEmpty(row.existing_units),
      newApartments: countOrEmpty(row.new_units),
      storage: "",
    },
    apartmentMix: {
      threeRooms: countRooms(3),
      fourRooms: countRooms(4),
      fiveRooms: countRooms(5),
      gardenApartments: "",
      penthouses: "",
    },
    gallery: { exterior: imageUrls, interior: [], lobby: [], surroundings: [] },
    galleryCaptions,
    renderGroups: mapRenderGroups(renders, renderGroups, urlFor),
    projectFiles: mapDocuments(documents, urlFor),
    technicalSpecNotes: [],
    technicalSpecSections: [],
    details: {
      developerCompany: text(row.developer_company),
      financingBank: text(row.financing_bank),
      constructionStage: text(row.construction_stage),
      constructionStartDate: isoDate(row.construction_start_date),
      constructionCompletionDate: isoDate(row.construction_completion_date),
      websiteUrl: safeUrl(row.project_website_url),
    },
    model3dUrl: pickModel3dUrl(row.additional_links),
  };
}
