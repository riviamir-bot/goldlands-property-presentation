import type { Apartment, ApartmentStatus, Project, ProjectFile, ProjectFileAssociation } from "../../src/types";
import type {
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
  if (status === "negotiation") return "reserved";
  if (status === "sold") return "sold";
  return "notMarketing";
}

export function mapProjectType(value: string | null): Project["projectType"] {
  const normalized = (value ?? "").replace(/\\/g, "/");
  if (normalized.includes("38/2")) return "תמ״א 38/2 / פינוי בינוי";
  if (normalized.includes("38/1")) return "תמ״א 38/1";
  return "פרויקט חדש";
}

export function mapApartment(row: MarketingApartmentRow): Apartment {
  const status = mapApartmentStatus(row.status);
  const price = status === "sold" ? 0 : numberOrZero(row.price);

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
    planAttached: false,
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

export function mapProject(
  row: MarketingProjectRow,
  renders: MarketingRenderRow[],
  documents: MarketingDocumentRow[],
  apartments: MarketingApartmentRow[],
  urlFor: SignedUrlLookup,
): Project {
  const name = row.name.trim();
  const city = (row.city ?? "").trim();
  const address = (row.address ?? "").trim();
  const imageUrls = sortRenders(renders)
    .map((render) => urlFor(render.storage_bucket, render.storage_path))
    .filter((url): url is string => Boolean(url));
  const heroImage = imageUrls[0] ?? "";
  const unitCount = numberOrZero(row.new_units) || numberOrZero(row.units);
  const countRooms = (rooms: number) => String(apartments.filter((item) => numberOrZero(item.rooms) === rooms).length);

  return {
    id: row.id,
    name,
    location: [address, city].filter(Boolean).join(", "),
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
    projectFiles: mapDocuments(documents, urlFor),
    technicalSpecNotes: [],
    technicalSpecSections: [],
  };
}
