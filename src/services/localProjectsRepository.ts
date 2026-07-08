import {
  apartments as mockApartments,
  projectReadiness as mockReadiness,
  projects as mockProjects,
} from "../data/mockData";
import type { Apartment, Project, ProjectReadiness } from "../types";
import type { AddProjectInput, ProjectsRepository, ProjectsRepositoryState } from "./projectsRepository";

export const LOCAL_PROJECTS_STORAGE_KEY = "goldlands.presentation.demo.v1";

export function cloneInitialProjectsState(): ProjectsRepositoryState {
  return {
    projects: structuredClone(mockProjects).map(normalizeProject),
    apartments: structuredClone(mockApartments),
    readinessItems: structuredClone(mockReadiness),
  };
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

function normalizeProject(project: Project): Project {
  const legacyThumbnail = (project as Project & { thumbnailImage?: string }).thumbnailImage;
  const mainImage = project.mainImage ?? legacyThumbnail ?? project.heroImage ?? "";

  return {
    ...project,
    isSupabaseBacked: project.isSupabaseBacked ?? false,
    projectLogo: project.projectLogo ?? "",
    heroImage: project.heroImage || mainImage,
    mainImage,
    googleMapsUrl: project.googleMapsUrl || makeMapsUrl(project.address, project.city),
    googleMapsEmbedUrl: makeMapsEmbedUrl(project.address, project.city),
  };
}

export function normalizeProjectsState(state: ProjectsRepositoryState): ProjectsRepositoryState {
  const projectIds = new Set(state.projects.map((project) => project.id));

  return {
    projects: state.projects.map(normalizeProject),
    apartments: state.apartments.filter((apartment) => projectIds.has(apartment.projectId)),
    readinessItems: state.readinessItems.filter((readiness) => projectIds.has(readiness.projectId)),
  };
}

export function readLocalProjectsState(): ProjectsRepositoryState {
  if (typeof window === "undefined") return cloneInitialProjectsState();

  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECTS_STORAGE_KEY);
    if (!raw) return cloneInitialProjectsState();

    const parsed = JSON.parse(raw) as Partial<ProjectsRepositoryState>;
    if (
      !Array.isArray(parsed.projects) ||
      parsed.projects.length === 0 ||
      !Array.isArray(parsed.apartments)
    ) {
      return cloneInitialProjectsState();
    }

    return normalizeProjectsState({
      projects: parsed.projects as Project[],
      apartments: parsed.apartments,
      readinessItems: Array.isArray(parsed.readinessItems)
        ? parsed.readinessItems
        : structuredClone(mockReadiness),
    });
  } catch {
    return cloneInitialProjectsState();
  }
}

export function persistLocalProjectsState(state: ProjectsRepositoryState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LOCAL_PROJECTS_STORAGE_KEY,
    JSON.stringify(normalizeProjectsState(state)),
  );
}

export const localProjectsRepository: ProjectsRepository = {
  getState() {
    return readLocalProjectsState();
  },

  saveState(state) {
    persistLocalProjectsState(state);
  },

  addProject(input: AddProjectInput) {
    const current = readLocalProjectsState();
    const idBase = makeSlug(input.name);
    const id = current.projects.some((project) => project.id === idBase)
      ? `${idBase}-${Date.now()}`
      : idBase;
    const template = mockProjects[0];
    const project: Project = {
      ...structuredClone(template),
      id,
      name: input.name,
      city: input.city,
      address: input.address,
      neighborhood: input.neighborhood,
      googleMapsUrl: makeMapsUrl(input.address, input.city),
      googleMapsEmbedUrl: makeMapsEmbedUrl(input.address, input.city),
      projectType: input.projectType,
      tagline: input.tagline,
      description: input.tagline,
      logoMark: makeLogoMark(input.name),
      isSupabaseBacked: false,
      projectLogo: "",
      mainImage: "",
      location: `${input.neighborhood}, ${input.city}`,
      keyFacts: ["טיוטת פרויקט", "ממתין לחומרים", "תוכן דמו"],
      stats: {
        floors: "0",
        units: "0",
        occupancy: "טרם נקבע",
        parking: "טרם עודכן",
        buildings: "0",
        existingApartments: "לא רלוונטי",
        newApartments: "0",
        storage: "טרם עודכן",
      },
      apartmentMix: {
        threeRooms: "0",
        fourRooms: "0",
        fiveRooms: "0",
        gardenApartments: "0",
        penthouses: "0",
      },
    };
    const readiness: ProjectReadiness = {
      projectId: id,
      city: input.city,
      marketingStatus: input.marketingStatus || "טיוטה",
      readinessPercentage: 12,
      lastUpdated: "04/07/2026",
      missing: {
        critical: ["מחירון", "דירות זמינות", "הדמיה ראשית", "תוכניות דירה"],
        important: ["הדמיות פנים", "מפרט טכני", "מיקום וסביבה", "שאלות נפוצות"],
        optional: ["ברושור שיווקי", "וידאו"],
      },
    };
    const apartment: Apartment = {
      id: `${id}-apt-1`,
      projectId: id,
      number: "401",
      floor: 4,
      rooms: 4,
      apartmentArea: 102,
      balconyArea: 12,
      gardenArea: 0,
      parking: "חניה אחת",
      storage: "מחסן 4 מ\"ר",
      direction: "מערב",
      price: 3450000,
      specialPrice: 3290000,
      status: "available",
      planAttached: false,
      notes: "דירת דמו ראשונית לעריכה",
    };
    const nextState = {
      ...current,
      projects: [...current.projects, project],
      apartments: [...current.apartments, apartment],
      readinessItems: [...current.readinessItems, readiness],
    };

    persistLocalProjectsState(nextState);

    return nextState;
  },

  updateProject(projectId, patch, readinessPatch) {
    const current = readLocalProjectsState();
    const nextState = {
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
      readinessItems: current.readinessItems.map((readiness) =>
        readiness.projectId === projectId ? { ...readiness, ...readinessPatch } : readiness,
      ),
    };

    persistLocalProjectsState(nextState);

    return nextState;
  },

  deleteProject(projectId) {
    const current = readLocalProjectsState();
    const nextState = {
      projects: current.projects.filter((project) => project.id !== projectId),
      apartments: current.apartments.filter((apartment) => apartment.projectId !== projectId),
      readinessItems: current.readinessItems.filter((readiness) => readiness.projectId !== projectId),
    };

    persistLocalProjectsState(nextState);

    return nextState;
  },

  updateApartment(projectId, apartmentId, patch) {
    const current = readLocalProjectsState();
    const nextState = {
      ...current,
      apartments: current.apartments.map((apartment) =>
        apartment.projectId === projectId && apartment.id === apartmentId
          ? { ...apartment, ...patch, id: apartment.id, projectId: apartment.projectId }
          : apartment,
      ),
    };

    persistLocalProjectsState(nextState);

    return nextState;
  },

  resetDemoData() {
    const initialState = cloneInitialProjectsState();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_PROJECTS_STORAGE_KEY);
    }

    return initialState;
  },
};
