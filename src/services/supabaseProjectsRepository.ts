import { supabase } from "../lib/supabaseClient";
import type {
  Apartment,
  Project,
  ProjectReadiness,
  TechnicalSpecSectionData,
} from "../types";
import type {
  AddProjectInput,
  ProjectSortOrderUpdate,
  ProjectsRepository,
  ProjectsRepositoryState,
} from "./projectsRepository";
import {
  deleteStoredProjectFile,
  getProjectFileAssociation,
  listProjectFiles,
  updateStoredProjectFileAssociation,
  updateStoredProjectFileTarget,
  type ProjectFileRecord,
} from "./storageService";

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
  project_logo_path: string | null;
  main_image_path: string | null;
  block: string | null;
  parcel: string | null;
  licensing_route: string | null;
  planning_status: string | null;
  developer_units: string | null;
  owner_units: string | null;
  technical_spec_notes: string[] | null;
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
  sort_order: number | null;
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

interface TechnicalSpecificationRow {
  project_id: string;
  section_key: string;
  title: string;
  items: string[] | null;
  display_order: number;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
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

function getProjectSortOrder(project: Project) {
  const value = project.sortOrder ?? project.sort_order;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareProjectRowsBySortOrder(a: ProjectRow, b: ProjectRow) {
  const aOrder = typeof a.sort_order === "number" && Number.isFinite(a.sort_order) ? a.sort_order : null;
  const bOrder = typeof b.sort_order === "number" && Number.isFinite(b.sort_order) ? b.sort_order : null;

  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  if (aOrder !== null && bOrder === null) return -1;
  if (aOrder === null && bOrder !== null) return 1;

  return a.name.localeCompare(b.name, "he");
}

function getFirstFileUrl(files: ProjectFileRecord[], category: ProjectFileRecord["category"]) {
  return files
    .filter((file) => file.category === category && file.publicUrl)
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    })[0]?.publicUrl;
}

function getGalleryImages(
  files: ProjectFileRecord[],
  category: keyof Project["gallery"],
) {
  const uploadedImages = files
    .filter((file) => file.category === category && file.publicUrl)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((file) => file.publicUrl)
    .filter((url): url is string => Boolean(url));

  return uploadedImages;
}

function countFiles(files: ProjectFileRecord[], categories: ProjectFileRecord["category"][]) {
  return files.filter((file) => categories.includes(file.category)).length;
}

function mapProjectFileRecord(file: ProjectFileRecord) {
  return {
    id: file.id,
    name: file.fileName,
    type: file.association ?? getProjectFileAssociation(file.category),
    target: file.target ?? file.title ?? "",
    url: file.publicUrl ?? "",
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt ?? new Date().toISOString(),
    mimeType: file.mimeType,
    storageBucket: file.storageBucket,
    storagePath: file.storagePath,
  };
}

function mapProject(
  row: ProjectRow,
  files: ProjectFileRecord[] = [],
  technicalSpecSections: TechnicalSpecSectionData[] = [],
): Project {
  const logoUrl = getFirstFileUrl(files, "logo");
  const mainImage = getFirstFileUrl(files, "main") ?? "";

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
    isSupabaseBacked: true,
    sortOrder: row.sort_order ?? undefined,
    sort_order: row.sort_order ?? undefined,
    projectLogo: logoUrl ?? "",
    projectLogoPath: row.project_logo_path ?? undefined,
    heroImage: mainImage,
    mainImage,
    mainImagePath: row.main_image_path ?? undefined,
    block: row.block ?? undefined,
    parcel: row.parcel ?? undefined,
    licensingRoute: row.licensing_route ?? undefined,
    planningStatus: row.planning_status ?? undefined,
    developerUnits: row.developer_units ?? undefined,
    ownerUnits: row.owner_units ?? undefined,
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
    gallery: {
      exterior: getGalleryImages(files, "exterior"),
      interior: getGalleryImages(files, "interior"),
      lobby: getGalleryImages(files, "lobby"),
      surroundings: getGalleryImages(files, "surroundings"),
    },
    materialFileCounts: {
      logo: countFiles(files, ["logo"]),
      "main-image": countFiles(files, ["main"]),
      exterior: countFiles(files, ["exterior"]),
      interior: countFiles(files, ["interior"]),
      plans: countFiles(files, ["apartment_plan"]),
      "floor-plans": countFiles(files, ["floor_plan"]),
      prices: countFiles(files, ["price_list"]),
      technical: countFiles(files, ["technical_spec"]),
      documents: countFiles(files, ["brochure", "sales_deck", "other"]),
    },
    projectFiles: files.map(mapProjectFileRecord),
    technicalSpecNotes: row.technical_spec_notes ?? undefined,
    technicalSpecSections,
  };
}

function mapApartment(row: ApartmentRow, files: ProjectFileRecord[] = []): Apartment {
  const planFile = files.find(
    (file) => file.category === "apartment_plan" && file.apartmentId === row.id,
  );

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
    planAttached: row.plan_file_status === "attached" || Boolean(planFile),
    planUrl: planFile?.publicUrl,
    planFileName: planFile?.fileName,
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
    block: "",
    parcel: "",
    licensing_route: "",
    planning_status: "",
    developer_units: "",
    owner_units: "",
    technical_spec_notes: [],
    apartment_mix: {
      threeRooms: "0",
      fourRooms: "0",
      fiveRooms: "0",
      gardenApartments: "0",
      penthouses: "0",
    },
    readiness_percentage: 12,
    is_active: true,
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
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.sort_order !== undefined) row.sort_order = patch.sort_order;
  if ("projectLogoPath" in patch) row.project_logo_path = patch.projectLogoPath ?? null;
  if ("mainImagePath" in patch) row.main_image_path = patch.mainImagePath ?? null;
  if (patch.block !== undefined) row.block = patch.block;
  if (patch.parcel !== undefined) row.parcel = patch.parcel;
  if (patch.licensingRoute !== undefined) row.licensing_route = patch.licensingRoute;
  if (patch.planningStatus !== undefined) row.planning_status = patch.planningStatus;
  if (patch.developerUnits !== undefined) row.developer_units = patch.developerUnits;
  if (patch.ownerUnits !== undefined) row.owner_units = patch.ownerUnits;
  if (patch.technicalSpecNotes !== undefined) row.technical_spec_notes = patch.technicalSpecNotes;
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

function makeProjectRowFromProject(project: Project, readiness?: ProjectReadiness): Record<string, unknown> {
  const sortOrder = getProjectSortOrder(project);

  return {
    slug: makeSlug(project.name || project.id),
    name: project.name,
    location: project.location,
    city: project.city,
    neighborhood: project.neighborhood,
    address: project.address,
    google_maps_url: project.googleMapsUrl || makeMapsUrl(project.address, project.city),
    google_maps_embed_url: project.googleMapsEmbedUrl || makeMapsEmbedUrl(project.address, project.city),
    project_type: project.projectType,
    marketing_status: readiness?.marketingStatus ?? "טיוטה",
    tagline: project.tagline,
    description: project.description,
    logo_mark: project.logoMark || makeLogoMark(project.name),
    project_logo_path: project.projectLogoPath ?? null,
    main_image_path: project.mainImagePath ?? null,
    block: project.block ?? "",
    parcel: project.parcel ?? "",
    licensing_route: project.licensingRoute ?? "",
    planning_status: project.planningStatus ?? "",
    developer_units: project.developerUnits ?? "",
    owner_units: project.ownerUnits ?? "",
    technical_spec_notes: project.technicalSpecNotes ?? [],
    key_facts: project.keyFacts ?? [],
    floors: project.stats.floors,
    units: project.stats.units,
    occupancy: project.stats.occupancy,
    parking_summary: project.stats.parking,
    buildings: project.stats.buildings,
    existing_apartments: project.stats.existingApartments,
    new_apartments: project.stats.newApartments,
    storage_summary: project.stats.storage,
    apartment_mix: project.apartmentMix,
    readiness_percentage: readiness?.readinessPercentage ?? 0,
    ...(sortOrder === null ? {} : { sort_order: sortOrder }),
    is_active: true,
  };
}

function makeApartmentRowFromApartment(projectId: string, apartment: Apartment, sortOrder: number) {
  return {
    project_id: projectId,
    number: apartment.number,
    floor: apartment.floor,
    rooms: apartment.rooms,
    apartment_area: apartment.apartmentArea,
    balcony_area: apartment.balconyArea,
    garden_area: apartment.gardenArea,
    parking: apartment.parking,
    storage: apartment.storage,
    direction: apartment.direction,
    price: apartment.price,
    special_price: apartment.specialPrice,
    status: apartment.status,
    plan_file_status: apartment.planAttached ? "attached" : "missing",
    notes: apartment.notes,
    sort_order: sortOrder,
  };
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

async function findProjectForMigration(project: Project) {
  const client = assertSupabase();

  if (isUuid(project.id)) {
    const { data, error } = await client
      .from("projects")
      .select("id")
      .eq("id", project.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return (data as { id: string }).id;
  }

  const { data, error } = await client
    .from("projects")
    .select("id")
    .eq("name", project.name)
    .eq("address", project.address)
    .maybeSingle();

  if (error) throw error;

  return (data as { id: string } | null)?.id ?? null;
}

async function upsertMigratedProject(project: Project, readiness?: ProjectReadiness) {
  const client = assertSupabase();
  const existingProjectId = await findProjectForMigration(project);
  const row = makeProjectRowFromProject(project, readiness);

  if (existingProjectId) {
    const { error } = await client.from("projects").update(row).eq("id", existingProjectId);
    if (error) throw error;
    return existingProjectId;
  }

  const insertRow = isUuid(project.id) ? { ...row, id: project.id } : row;
  const { data, error } = await client
    .from("projects")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) throw error;

  return (data as { id: string }).id;
}

async function upsertMigratedApartments(
  remoteProjectId: string,
  localProjectId: string,
  apartments: Apartment[],
) {
  const client = assertSupabase();
  const projectApartments = apartments.filter((apartment) => apartment.projectId === localProjectId);

  for (const [index, apartment] of projectApartments.entries()) {
    const baseRow = makeApartmentRowFromApartment(remoteProjectId, apartment, index + 1);
    let existingApartmentId: string | null = null;

    if (isUuid(apartment.id)) {
      const { data, error } = await client
        .from("apartments")
        .select("id")
        .eq("project_id", remoteProjectId)
        .eq("id", apartment.id)
        .maybeSingle();

      if (error) throw error;
      existingApartmentId = (data as { id: string } | null)?.id ?? null;
    }

    if (!existingApartmentId) {
      const { data, error } = await client
        .from("apartments")
        .select("id")
        .eq("project_id", remoteProjectId)
        .eq("number", apartment.number)
        .maybeSingle();

      if (error) throw error;
      existingApartmentId = (data as { id: string } | null)?.id ?? null;
    }

    if (existingApartmentId) {
      const { error } = await client.from("apartments").update(baseRow).eq("id", existingApartmentId);
      if (error) throw error;
      continue;
    }

    const insertRow = isUuid(apartment.id) ? { ...baseRow, id: apartment.id } : baseRow;
    const { error } = await client.from("apartments").insert(insertRow);
    if (error) throw error;
  }
}

async function upsertProjectApartments(projectId: string, apartments: Apartment[]) {
  await upsertMigratedApartments(projectId, projectId, apartments);

  return readSupabaseProjectsState();
}

async function saveTechnicalSpecifications(
  projectId: string,
  sections: TechnicalSpecSectionData[],
) {
  const client = assertSupabase();
  const { data: existingRows, error: readError } = await client
    .from("technical_specifications")
    .select("section_key")
    .eq("project_id", projectId);

  if (readError) throw readError;

  if (sections.length > 0) {
    const { error: upsertError } = await client
      .from("technical_specifications")
      .upsert(
        sections.map((section, index) => ({
          project_id: projectId,
          section_key: section.id,
          title: section.title,
          icon_key: section.id,
          items: section.items,
          display_order: index,
          default_open: index === 0,
          visible_to_client: true,
        })),
        { onConflict: "project_id,section_key" },
      );

    if (upsertError) throw upsertError;
  }

  const nextKeys = new Set(sections.map((section) => section.id));
  const removedKeys = ((existingRows as Array<{ section_key: string }> | null) ?? [])
    .map((row) => row.section_key)
    .filter((key) => !nextKeys.has(key));

  if (removedKeys.length > 0) {
    const { error: deleteError } = await client
      .from("technical_specifications")
      .delete()
      .eq("project_id", projectId)
      .in("section_key", removedKeys);

    if (deleteError) throw deleteError;
  }

  return readSupabaseProjectsState();
}

async function migrateStateToSupabase(state: ProjectsRepositoryState) {
  for (const project of state.projects) {
    const readiness = state.readinessItems.find((item) => item.projectId === project.id);
    const remoteProjectId = await upsertMigratedProject(project, readiness);
    await upsertMigratedApartments(remoteProjectId, project.id, state.apartments);
  }

  return readSupabaseProjectsState();
}

async function updateProjectSortOrders(updates: ProjectSortOrderUpdate[]) {
  if (updates.length === 0) return readSupabaseProjectsState();

  const client = assertSupabase();

  await Promise.all(
    updates.map(async (update) => {
      const { error } = await client
        .from("projects")
        .update({ sort_order: update.sortOrder })
        .eq("id", update.projectId);

      if (error) throw error;
    }),
  );

  return readSupabaseProjectsState();
}

async function readSupabaseProjectsState(): Promise<ProjectsRepositoryState> {
  const client = assertSupabase();
  const { data: projectRows, error: projectsError } = await client
    .from("projects")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (projectsError) throw projectsError;

  const typedProjectRows = (projectRows as ProjectRow[] | null) ?? [];
  const sortedProjectRows = [...typedProjectRows].sort(compareProjectRowsBySortOrder);
  const projectIds = sortedProjectRows.map((project) => project.id);

  if (projectIds.length === 0) {
    return {
      projects: [],
      apartments: [],
      readinessItems: [],
    };
  }

  const { data: apartmentRows, error: apartmentsError } = await client
    .from("apartments")
    .select("*")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (apartmentsError) throw apartmentsError;

  const { data: technicalRows, error: technicalError } = await client
    .from("technical_specifications")
    .select("project_id, section_key, title, items, display_order")
    .in("project_id", projectIds)
    .eq("visible_to_client", true)
    .order("display_order", { ascending: true });

  if (technicalError) throw technicalError;

  const technicalSectionsByProjectId = new Map<string, TechnicalSpecSectionData[]>();
  ((technicalRows as TechnicalSpecificationRow[] | null) ?? []).forEach((row) => {
    const sections = technicalSectionsByProjectId.get(row.project_id) ?? [];
    sections.push({
      id: row.section_key,
      title: row.title,
      items: Array.isArray(row.items) ? row.items.map(String) : [],
      displayOrder: row.display_order,
    });
    technicalSectionsByProjectId.set(row.project_id, sections);
  });

  const fileEntries = await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        return [projectId, await listProjectFiles(projectId)] as const;
      } catch (error) {
        console.warn(
          `[GOLDLANDS] Supabase Storage metadata read failed for project ${projectId}. Continuing without storage files.`,
          error,
        );
        return [projectId, [] as ProjectFileRecord[]] as const;
      }
    }),
  );
  const filesByProjectId = new Map(fileEntries);

  return {
    projects: sortedProjectRows.map((project) =>
      mapProject(
        project,
        filesByProjectId.get(project.id) ?? [],
        technicalSectionsByProjectId.get(project.id) ?? [],
      ),
    ),
    apartments: ((apartmentRows as ApartmentRow[] | null) ?? []).map((apartment) =>
      mapApartment(apartment, filesByProjectId.get(apartment.project_id) ?? []),
    ),
    readinessItems: typedProjectRows.map(makeReadiness),
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

  async importProjectBundle(state: ProjectsRepositoryState) {
    return migrateStateToSupabase(state);
  },

  async deleteProject(projectId: string) {
    const client = assertSupabase();
    const { error } = await client
      .from("projects")
      .update({ is_active: false })
      .eq("id", projectId);

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

  async addApartment(projectId, apartment) {
    return upsertProjectApartments(projectId, [apartment]);
  },

  async deleteApartment(projectId, apartmentId) {
    const client = assertSupabase();
    const { error } = await client
      .from("apartments")
      .delete()
      .eq("project_id", projectId)
      .eq("id", apartmentId);

    if (error) throw error;

    return readSupabaseProjectsState();
  },

  async upsertApartments(projectId, apartments) {
    return upsertProjectApartments(projectId, apartments);
  },

  async importProjectData(projectId, projectPatch, apartments) {
    const client = assertSupabase();
    const projectRow = makeProjectPatchRow(projectPatch);

    if (Object.keys(projectRow).length > 0) {
      const { error } = await client.from("projects").update(projectRow).eq("id", projectId);
      if (error) throw error;
    }

    if (apartments.length > 0) {
      await upsertMigratedApartments(projectId, projectId, apartments);
    }

    return readSupabaseProjectsState();
  },

  async updateTechnicalSpecifications(projectId, sections) {
    return saveTechnicalSpecifications(projectId, sections);
  },

  async reorderProjects(updates) {
    return updateProjectSortOrders(updates);
  },

  async updateProjectFileType(projectId, fileId, type) {
    await updateStoredProjectFileAssociation(projectId, fileId, type);

    return readSupabaseProjectsState();
  },

  async updateProjectFileTarget(projectId, fileId, target) {
    await updateStoredProjectFileTarget(projectId, fileId, target);

    return readSupabaseProjectsState();
  },

  async deleteProjectFile(projectId, file) {
    await deleteStoredProjectFile(projectId, file.id);

    return readSupabaseProjectsState();
  },

  async migrateLocalState(state) {
    return migrateStateToSupabase(state);
  },

  async resetDemoData() {
    throw new Error("Supabase reset is not wired in this local-first milestone.");
  },
};
