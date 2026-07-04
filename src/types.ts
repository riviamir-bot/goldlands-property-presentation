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
  | "readiness"
  | "admin"
  | "projectManagement";

export type ApartmentStatus = "available" | "option" | "reserved" | "sold" | "notMarketing";

export type GalleryCategory = "exterior" | "interior" | "lobby" | "surroundings";

export type ReadinessPriority = "critical" | "important" | "optional";

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
  heroImage: string;
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
