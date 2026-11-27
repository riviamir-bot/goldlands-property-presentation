export type Screen =
  | "login"
  | "projects"
  | "opening"
  | "apartments"
  | "prices"
  | "gallery"
  | "plans"
  | "technical"
  | "model3d"
  | "location";

export interface ProjectRenderGroup {
  id: string;
  name: string;
  isBuilding: boolean;
  images: string[];
}

export type UserRole = "admin" | "sales" | "viewer";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}

export type ClientShareSectionId =
  | "overview"
  | "gallery"
  | "plans"
  | "technical"
  | "location"
  | "apartments"
  | "prices";

export type ClientShareExpiry = "24h" | "7d" | "30d";

export interface ClientShareApartmentSelection {
  apartmentId: string;
  includePlan: boolean;
}

export interface ClientShareConfig {
  sections: Record<ClientShareSectionId, boolean>;
  selectedApartments: ClientShareApartmentSelection[];
  showPrice: boolean;
  expiresIn: ClientShareExpiry;
  url: string;
}

export type ApartmentStatus = "available" | "option" | "reserved" | "sold" | "notMarketing";

export type GalleryCategory = "exterior" | "interior" | "lobby" | "surroundings";

export type ReadinessPriority = "critical" | "important" | "optional";

export type ProjectFileAssociation =
  | "מחירון"
  | "תכנית דירה"
  | "תכנית קומה"
  | "מצגת"
  | "הדמיה"
  | "תמונת פרויקט"
  | "מפרט"
  | "משפטי"
  | "אחר";

export interface ProjectFile {
  id: string;
  name: string;
  type: ProjectFileAssociation;
  target: string;
  url: string;
  sizeBytes: number;
  uploadedAt: string;
  mimeType?: string;
  storageBucket?: string;
  storagePath?: string;
}

export interface TechnicalSpecSectionData {
  id: string;
  title: string;
  items: string[];
  displayOrder: number;
}

export interface ProjectFact {
  label: string;
  value: string;
}

export interface ProjectFeatureFaq {
  q: string;
  a: string;
}

/** A highlighted project feature explained to clients, e.g. robotic parking. */
export interface ProjectFeatureBlock {
  key: string;
  title: string;
  intro: string;
  bullets: string[];
  /** Privacy-enhanced YouTube embed URL, or "". */
  videoEmbedUrl: string;
  videoCaption: string;
  faqs: ProjectFeatureFaq[];
}

export interface ProjectDetails {
  developerCompany: string;
  financingBank: string;
  constructionStage: string;
  /** ISO date (YYYY-MM-DD) or empty. */
  constructionStartDate: string;
  /** ISO date (YYYY-MM-DD) or empty. */
  constructionCompletionDate: string;
  websiteUrl: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  city: string;
  neighborhood: string;
  address: string;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
  projectType: "פרויקט חדש" | "תמ״א 38/1" | "תמ״א 38/2 / פינוי בינוי";
  tagline: string;
  description: string;
  logoMark: string;
  isSupabaseBacked?: boolean;
  sortOrder?: number;
  sort_order?: number;
  projectLogo: string;
  projectLogoPath?: string;
  heroImage: string;
  mainImage?: string;
  mainImagePath?: string;
  block?: string;
  parcel?: string;
  licensingRoute?: string;
  planningStatus?: string;
  developerUnits?: string;
  ownerUnits?: string;
  keyFacts: string[];
  stats: {
    floors: string;
    units: string;
    occupancy: string;
    parking: string;
    buildings: string;
    existingApartments: string;
    newApartments: string;
    storage: string;
  };
  apartmentMix: {
    threeRooms: string;
    fourRooms: string;
    fiveRooms: string;
    gardenApartments: string;
    penthouses: string;
  };
  gallery: Record<GalleryCategory, string[]>;
  /** Short caption per gallery image url ("דירה 26 · מטבח"); "" or missing when the file name says nothing. */
  galleryCaptions?: Record<string, string>;
  /** Manual groups set in the dashboard, building first. Renderings outside them keep the automatic grouping. */
  renderGroups?: ProjectRenderGroup[];
  materialFileCounts?: Partial<Record<string, number>>;
  projectFiles?: ProjectFile[];
  technicalSpecNotes?: string[];
  technicalSpecSections?: TechnicalSpecSectionData[];
  details?: ProjectDetails;
  /** Embeddable interactive 3D model, https only; empty when the project has none. */
  model3dUrl?: string;
  /** Gold View content (published rows of presentation_project_content). */
  locationDescription?: string;
  developerAbout?: string;
  developerWebsite?: string;
  architect?: string;
  facts?: ProjectFact[];
  featureBlocks?: ProjectFeatureBlock[];
  legalDisclaimer?: string;
  /** The Hebrew address the map geocodes; set when the shown address is translated, because the map search only knows Hebrew street names. */
  geoQuery?: { address: string; city: string };
  /** Reviewed English/French texts; a missing language or field shows the Hebrew text. */
  translations?: Partial<Record<"en" | "fr", ProjectTranslation>>;
}

/** The project texts that exist in other languages. Empty strings / missing arrays mean "no translation". */
export interface ProjectTranslation {
  name?: string;
  city?: string;
  address?: string;
  neighborhood?: string;
  tagline?: string;
  description?: string;
  locationDescription?: string;
  developerAbout?: string;
  technicalSpecSections?: TechnicalSpecSectionData[];
  featureBlocks?: ProjectFeatureBlock[];
}

export interface Apartment {
  id: string;
  projectId: string;
  number: string;
  floor: number;
  rooms: number;
  apartmentArea: number;
  balconyArea: number;
  gardenArea: number;
  parking: string;
  storage: string;
  direction: string;
  price: number;
  specialPrice: number;
  status: ApartmentStatus;
  planAttached: boolean;
  planUrl?: string;
  planFileName?: string;
  planContentType?: string;
  notes: string;
}

export interface ProjectReadiness {
  projectId: string;
  city: string;
  marketingStatus: string;
  readinessPercentage: number;
  lastUpdated: string;
  missing: Record<ReadinessPriority, string[]>;
}
