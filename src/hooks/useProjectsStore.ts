import { useEffect, useMemo, useState } from "react";
import {
  apartments as mockApartments,
  readinessChecklist as mockReadinessChecklist,
  projectReadiness as mockReadiness,
  projects as mockProjects,
} from "../data/mockData";
import type { Apartment, Project, ProjectReadiness } from "../types";

const STORAGE_KEY = "goldlands.presentation.demo.v1";

interface ProjectsStoreState {
  projects: Project[];
  apartments: Apartment[];
  readinessItems: ProjectReadiness[];
}

export interface AddProjectInput {
  name: string;
  city: string;
  address: string;
  neighborhood: string;
  marketingStatus: string;
  projectType: Project["projectType"];
  tagline: string;
}

function cloneInitialState(): ProjectsStoreState {
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
    projectLogo: project.projectLogo ?? "",
    heroImage: project.heroImage || mainImage,
    mainImage,
    googleMapsUrl: project.googleMapsUrl || makeMapsUrl(project.address, project.city),
    googleMapsEmbedUrl: makeMapsEmbedUrl(project.address, project.city),
  };
}

function normalizeState(state: ProjectsStoreState): ProjectsStoreState {
  const projectIds = new Set(state.projects.map((project) => project.id));

  return {
    projects: state.projects.map(normalizeProject),
    apartments: state.apartments.filter((apartment) => projectIds.has(apartment.projectId)),
    readinessItems: state.readinessItems.filter((readiness) => projectIds.has(readiness.projectId)),
  };
}

function readInitialState(): ProjectsStoreState {
  if (typeof window === "undefined") return cloneInitialState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneInitialState();

    const parsed = JSON.parse(raw) as Partial<ProjectsStoreState>;
    if (
      !Array.isArray(parsed.projects) ||
      parsed.projects.length === 0 ||
      !Array.isArray(parsed.apartments)
    ) {
      return cloneInitialState();
    }

    return normalizeState({
      projects: parsed.projects as Project[],
      apartments: parsed.apartments,
      readinessItems: Array.isArray(parsed.readinessItems)
        ? parsed.readinessItems
        : structuredClone(mockReadiness),
    });
  } catch {
    return cloneInitialState();
  }
}

function persistState(state: ProjectsStoreState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useProjectsStore() {
  const [state, setState] = useState<ProjectsStoreState>(() => readInitialState());

  useEffect(() => {
    persistState(state);
  }, [state]);

  const actions = useMemo(
    () => ({
      addProject(input: AddProjectInput) {
        const idBase = makeSlug(input.name);

        setState((current) => {
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
          persistState(nextState);

          return nextState;
        });
      },

      updateProject(
        projectId: string,
        patch: Partial<Project>,
        readinessPatch?: Partial<ProjectReadiness>,
      ) {
        setState((current) => {
          const nextState = {
            ...current,
            projects: current.projects.map((project) =>
              project.id === projectId ? { ...project, ...patch } : project,
            ),
            readinessItems: current.readinessItems.map((readiness) =>
              readiness.projectId === projectId ? { ...readiness, ...readinessPatch } : readiness,
            ),
          };
          persistState(nextState);

          return nextState;
        });
      },

      deleteProject(projectId: string) {
        setState((current) => {
          const nextState = {
            projects: current.projects.filter((project) => project.id !== projectId),
            apartments: current.apartments.filter((apartment) => apartment.projectId !== projectId),
            readinessItems: current.readinessItems.filter(
              (readiness) => readiness.projectId !== projectId,
            ),
          };
          persistState(nextState);

          return nextState;
        });
      },

      updateApartment(projectId: string, apartmentId: string, patch: Partial<Apartment>) {
        setState((current) => {
          const nextState = {
            ...current,
            apartments: current.apartments.map((apartment) =>
              apartment.projectId === projectId && apartment.id === apartmentId
                ? { ...apartment, ...patch, id: apartment.id, projectId: apartment.projectId }
                : apartment,
            ),
          };
          persistState(nextState);

          return nextState;
        });
      },

      resetDemoData() {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(cloneInitialState());
      },
    }),
    [],
  );

  return {
    ...state,
    readinessChecklistCount: mockReadinessChecklist.length,
    ...actions,
  };
}
