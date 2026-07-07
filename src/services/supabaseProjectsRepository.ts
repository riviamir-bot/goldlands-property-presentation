import { supabase } from "../lib/supabaseClient";
import type { Apartment, Project, ProjectReadiness } from "../types";
import type { AddProjectInput, ProjectsRepository, ProjectsRepositoryState } from "./projectsRepository";

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  city: string;
  neighborhood: string;
  address: string;
  google_maps_url: string | null;
  google_maps_embed_url: string | null;
  project_type: Project["projectType"];
  marketing_status: string | null;
  tagline: string;
  description: string;
  logo_mark: string;
  key_facts: string[] | null;
  floors: string | null;
  units: string | null;
  occupancy: string | null;
  parking_summary: string | null;
  buildings: string | null;
  existing_apartments: string | null;
  new_apartments: string | null;
  storage_summary: string | null;
  apartment_mix: Project["apartmentMix"] | null;
  readiness_percentage: number | null;
}

interface ApartmentRow {
  id: string;
  project_id: string;
  number: string;
  floor: number;
  rooms: number;
  apartment_area: number;
  balcony_area: number;
  garden_area: number;
  parking: string;
  storage: string;
  direction: string;
  price: number;
  special_price: number;
  status: Apartment["status"];
  plan_file_status: string | null;
  notes: string;
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? `${row.neighborhood}, ${row.city}`,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    googleMapsUrl: row.google_maps_url ?? "",
    googleMapsEmbedUrl: row.google_maps_embed_url ?? "",
    projectType: row.project_type,
    tagline: row.tagline,
    description: row.description,
    logoMark: row.logo_mark,
    projectLogo: "",
    heroImage: "",
    mainImage: "",
    keyFacts: row.key_facts ?? [],
    stats: {
      floors: row.floors ?? "",
      units: row.units ?? "",
      occupancy: row.occupancy ?? "",
      parking: row.parking_summary ?? "",
      buildings: row.buildings ?? "",
      existingApartments: row.existing_apartments ?? "",
      newApartments: row.new_apartments ?? "",
      storage: row.storage_summary ?? "",
    },
    apartmentMix: row.apartment_mix ?? {
      threeRooms: "0",
      fourRooms: "0",
      fiveRooms: "0",
      gardenApartments: "0",
      penthouses: "0",
    },
    gallery: {
      exterior: [],
      interior: [],
      lobby: [],
      surroundings: [],
    },
  };
}

function mapApartment(row: ApartmentRow): Apartment {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    floor: row.floor,
    rooms: row.rooms,
    apartmentArea: row.apartment_area,
    balconyArea: row.balcony_area,
    gardenArea: row.garden_area,
    parking: row.parking,
    storage: row.storage,
    direction: row.direction,
    price: row.price,
    specialPrice: row.special_price,
    status: row.status,
    planAttached: row.plan_file_status === "attached",
    notes: row.notes,
  };
}

function makeReadiness(project: ProjectRow): ProjectReadiness {
  return {
    projectId: project.id,
    city: project.city,
    marketingStatus: project.marketing_status ?? "טיוטה",
    readinessPercentage: project.readiness_percentage ?? 0,
    lastUpdated: "",
    missing: {
      critical: [],
      important: [],
      optional: [],
    },
  };
}

export const supabaseProjectsRepository: ProjectsRepository = {
  async getState(): Promise<ProjectsRepositoryState> {
    const client = assertSupabase();
    const [{ data: projectRows, error: projectsError }, { data: apartmentRows, error: apartmentsError }] =
      await Promise.all([
        client.from("projects").select("*").order("created_at", { ascending: true }),
        client.from("apartments").select("*").order("sort_order", { ascending: true }),
      ]);

    if (projectsError) throw projectsError;
    if (apartmentsError) throw apartmentsError;

    const projects = (projectRows as ProjectRow[] | null ?? []).map(mapProject);

    return {
      projects,
      apartments: (apartmentRows as ApartmentRow[] | null ?? []).map(mapApartment),
      readinessItems: (projectRows as ProjectRow[] | null ?? []).map(makeReadiness),
    };
  },

  async saveState() {
    throw new Error("Bulk Supabase state saves are intentionally not wired yet.");
  },

  async addProject(_input: AddProjectInput) {
    throw new Error("Supabase addProject is prepared but not wired yet.");
  },

  async updateProject(_projectId: string, _patch: Partial<Project>) {
    throw new Error("Supabase updateProject is prepared but not wired yet.");
  },

  async deleteProject(_projectId: string) {
    throw new Error("Supabase deleteProject is prepared but not wired yet.");
  },

  async updateApartment(_projectId: string, _apartmentId: string, _patch: Partial<Apartment>) {
    throw new Error("Supabase updateApartment is prepared but not wired yet.");
  },

  async resetDemoData() {
    throw new Error("Supabase resetDemoData is prepared but not wired yet.");
  },
};
