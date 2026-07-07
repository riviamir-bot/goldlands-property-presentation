import { supabase } from "../lib/supabaseClient";
import {
  projectReadiness as mockReadiness,
  projects as mockProjects,
} from "../data/mockData";
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
  floor: number | string;
  rooms: number | string;
  apartment_area: number | string;
  balcony_area: number | string;
  garden_area: number | string;
  parking: string;
  storage: string;
  direction: string;
  price: number | string;
  special_price: number | string;
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

function makeSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0590-\u05ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `project-${Date.now()}`;
}

function makeLogoMark(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function makeMapsUrl(address: string, city: string) {
  const query = address.includes(city) ? address : `${address} ${city}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  ).replace(/%20/g, "+")}`;
}

function makeMapsEmbedUrl(address: string, city: string) {
  const query = address.includes(city) ? address : `${address} ${city}`;

  return `https://www.google.com/maps?q=${encodeURIComponent(query).replace(/%20/g, "+")}&output=embed`;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0;
}

function getMockProject(slug: string) {
  return mockProjects.find((project) => project.id === slug);
}

function getMockReadiness(slug: string) {
  return mockReadiness.find((readiness) => readiness.projectId === slug);
}

function makeApartmentMix(value: Project["apartmentMix"] | null): Project["apartmentMix"] {
  return {
    threeRooms: value?.threeRooms ?? "0",
    fourRooms: value?.fourRooms ?? "0",
    fiveRooms: value?.fiveRooms ?? "0",
    gardenApartments: value?.gardenApartments ?? "0",
    penthouses: value?.penthouses ?? "0",
  };
}

function mapProject(row: ProjectRow): Project {
  const mockProject = getMockProject(row.slug);
  const mainImage = mockProject?.mainImage ?? mockProject?.heroImage ?? "";

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
    projectLogo: mockProject?.projectLogo ?? "",
    heroImage: mockProject?.heroImage ?? mainImage,
    mainImage,
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
    apartmentMix: makeApartmentMix(row.apartment_mix),
    gallery: mockProject?.gallery ?? {
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
    floor: toNumber(row.floor),
    rooms: toNumber(row.rooms),
    apartmentArea: toNumber(row.apartment_area),
    balconyArea: toNumber(row.balcony_area),
    gardenArea: toNumber(row.garden_area),
    parking: row.parking,
    storage: row.storage,
    direction: row.direction,
    price: toNumber(row.price),
    specialPrice: toNumber(row.special_price),
    status: row.status,
    planAttached: row.plan_file_status === "attached",
    notes: row.notes,
  };
}

function makeReadiness(project: ProjectRow): ProjectReadiness {
  const mockItem = getMockReadiness(project.slug);

  return {
    projectId: project.id,
    city: project.city,
    marketingStatus: project.marketing_status ?? "טיוטה",
    readinessPercentage: project.readiness_percentage ?? 0,
    lastUpdated: mockItem?.lastUpdated ?? "",
    missing: mockItem?.missing ?? {
      critical: [],
      important: [],
      optional: [],
    },
  };
}

function makeProjectInsertRow(input: AddProjectInput, slug: string): Record<string, unknown> {
  return {
    slug,
    name: input.name,
    location: `${input.neighborhood}, ${input.city}`,
    city: input.city,
    neighborhood: input.neighborhood,
    address: input.address,
    google_maps_url: makeMapsUrl(input.address, input.city),
    google_maps_embed_url: makeMapsEmbedUrl(input.address, input.city),
    project_type: input.projectType,
    marketing_status: input.marketingStatus || "טיוטה",
    tagline: input.tagline,
    description: input.tagline,
    logo_mark: makeLogoMark(input.name),
    key_facts: ["טיוטת פרויקט", "ממתין לחומרים", "תוכן דמו"],
    floors: "0",
    units: "0",
    occupancy: "טרם נקבע",
    parking_summary: "טרם עודכן",
    buildings: "0",
    existing_apartments: "לא רלוונטי",
    new_apartments: "0",
    storage_summary: "טרם עודכן",
    apartment_mix: {
      threeRooms: "0",
      fourRooms: "0",
      fiveRooms: "0",
      gardenApartments: "0",
      penthouses: "0",
    },
    readiness_percentage: 12,
  };
}

function makeDefaultApartmentInsertRow(projectId: string): Record<string, unknown> {
  return {
    project_id: projectId,
    number: "401",
    floor: 4,
    rooms: 4,
    apartment_area: 102,
    balcony_area: 12,
    garden_area: 0,
    parking: "חניה אחת",
    storage: "מחסן 4 מ\"ר",
    direction: "מערב",
    price: 3450000,
    special_price: 3290000,
    status: "available",
    plan_file_status: "missing",
    notes: "דירת דמו ראשונית לעריכה",
    sort_order: 1,
  };
}

function makeProjectPatchRow(
  patch: Partial<Project>,
  readinessPatch?: Partial<ProjectReadiness>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.neighborhood !== undefined) row.neighborhood = patch.neighborhood;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.googleMapsUrl !== undefined) row.google_maps_url = patch.googleMapsUrl;
  if (patch.googleMapsEmbedUrl !== undefined) row.google_maps_embed_url = patch.googleMapsEmbedUrl;
  if (patch.projectType !== undefined) row.project_type = patch.projectType;
  if (patch.tagline !== undefined) row.tagline = patch.tagline;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.logoMark !== undefined) row.logo_mark = patch.logoMark;
  if (patch.keyFacts !== undefined) row.key_facts = patch.keyFacts;
  if (patch.stats !== undefined) {
    row.floors = patch.stats.floors;
    row.units = patch.stats.units;
    row.occupancy = patch.stats.occupancy;
    row.parking_summary = patch.stats.parking;
    row.buildings = patch.stats.buildings;
    row.existing_apartments = patch.stats.existingApartments;
    row.new_apartments = patch.stats.newApartments;
    row.storage_summary = patch.stats.storage;
  }
  if (patch.apartmentMix !== undefined) row.apartment_mix = patch.apartmentMix;
  if (readinessPatch?.city !== undefined) row.city = readinessPatch.city;
  if (readinessPatch?.marketingStatus !== undefined) {
    row.marketing_status = readinessPatch.marketingStatus;
  }
  if (readinessPatch?.readinessPercentage !== undefined) {
    row.readiness_percentage = readinessPatch.readinessPercentage;
  }

  return row;
}

function makeApartmentPatchRow(patch: Partial<Apartment>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (patch.number !== undefined) row.number = patch.number;
  if (patch.floor !== undefined) row.floor = patch.floor;
  if (patch.rooms !== undefined) row.rooms = patch.rooms;
  if (patch.apartmentArea !== undefined) row.apartment_area = patch.apartmentArea;
  if (patch.balconyArea !== undefined) row.balcony_area = patch.balconyArea;
  if (patch.gardenArea !== undefined) row.garden_area = patch.gardenArea;
  if (patch.parking !== undefined) row.parking = patch.parking;
  if (patch.storage !== undefined) row.storage = patch.storage;
  if (patch.direction !== undefined) row.direction = patch.direction;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.specialPrice !== undefined) row.special_price = patch.specialPrice;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.planAttached !== undefined) {
    row.plan_file_status = patch.planAttached ? "attached" : "missing";
  }
  if (patch.notes !== undefined) row.notes = patch.notes;

  return row;
}

async function readSupabaseProjectsState(): Promise<ProjectsRepositoryState> {
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
}

export const supabaseProjectsRepository: ProjectsRepository = {
  async getState(): Promise<ProjectsRepositoryState> {
    return readSupabaseProjectsState();
  },

  async saveState() {
    throw new Error("Bulk Supabase state saves should use the SQL seed file for this milestone.");
  },

  async addProject(input: AddProjectInput) {
    const client = assertSupabase();
    const baseSlug = makeSlug(input.name);
    const insertProject = (slug: string) =>
      client
        .from("projects")
        .insert(makeProjectInsertRow(input, slug))
        .select("*")
        .single();
    let slug = baseSlug;
    let { data: projectRow, error } = await insertProject(slug);

    if (error && error.code === "23505") {
      slug = `${baseSlug}-${Date.now()}`;
      const retry = await insertProject(slug);
      projectRow = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!projectRow) throw new Error("Supabase did not return the created project.");

    const { error: apartmentError } = await client
      .from("apartments")
      .insert(makeDefaultApartmentInsertRow((projectRow as ProjectRow).id));

    if (apartmentError) throw apartmentError;

    return readSupabaseProjectsState();
  },

  async updateProject(
    projectId: string,
    patch: Partial<Project>,
    readinessPatch?: Partial<ProjectReadiness>,
  ) {
    const client = assertSupabase();
    const row = makeProjectPatchRow(patch, readinessPatch);

    if (Object.keys(row).length > 0) {
      const { error } = await client.from("projects").update(row).eq("id", projectId);
      if (error) throw error;
    }

    return readSupabaseProjectsState();
  },

  async deleteProject(projectId: string) {
    const client = assertSupabase();
    const { error } = await client.from("projects").delete().eq("id", projectId);

    if (error) throw error;

    return readSupabaseProjectsState();
  },

  async updateApartment(projectId: string, apartmentId: string, patch: Partial<Apartment>) {
    const client = assertSupabase();
    const row = makeApartmentPatchRow(patch);

    if (Object.keys(row).length > 0) {
      const { error } = await client
        .from("apartments")
        .update(row)
        .eq("project_id", projectId)
        .eq("id", apartmentId);

      if (error) throw error;
    }

    return readSupabaseProjectsState();
  },

  async resetDemoData() {
    throw new Error("Supabase reset is not wired in this local-first milestone.");
  },
};
