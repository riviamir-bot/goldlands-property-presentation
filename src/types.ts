export type Screen =
  | "login"
  | "projects"
  | "opening"
  | "apartments"
  | "prices"
  | "gallery"
  | "plans"
  | "technical"
  | "location"
  | "faq"
  | "summary"
  | "clientPreview"
  | "readiness"
  | "admin"
  | "projectManagement"
  | "importProject";

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
  materialFileCounts?: Partial<Record<string, number>>;
  projectFiles?: ProjectFile[];
  technicalSpecNotes?: string[];
  technicalSpecSections?: TechnicalSpecSectionData[];
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
