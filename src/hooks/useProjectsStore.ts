import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readinessChecklist as mockReadinessChecklist } from "../data/mockData";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import {
  localProjectsRepository,
  persistLocalProjectsState,
  readLocalProjectsState,
} from "../services/localProjectsRepository";
import type { AddProjectInput, ProjectsRepositoryState } from "../services/projectsRepository";
import { supabaseProjectsRepository } from "../services/supabaseProjectsRepository";
import type { Apartment, Project, ProjectFile, ProjectFileAssociation, ProjectReadiness } from "../types";
import type { ProjectImportBundle } from "../data/karlNetterImport";

export type { AddProjectInput } from "../services/projectsRepository";

interface UseProjectsStoreOptions {
  canUseSupabase?: boolean;
  supabaseRetryKey?: string;
}

function hasUsableRemoteState(state: ProjectsRepositoryState) {
  return Array.isArray(state.projects) && state.projects.length > 0 && Array.isArray(state.apartments);
}

function mergeProjectLocalOnlyFields(remoteProject: Project, localProject?: Project): Project {
  if (!localProject) return remoteProject;

  return {
    ...remoteProject,
    projectLogo: remoteProject.projectLogo || localProject.projectLogo,
    heroImage: remoteProject.heroImage || localProject.heroImage,
    mainImage: remoteProject.mainImage || localProject.mainImage,
    gallery: remoteProject.gallery ?? localProject.gallery,
    materialFileCounts: remoteProject.materialFileCounts ?? localProject.materialFileCounts,
    projectFiles: remoteProject.projectFiles ?? localProject.projectFiles ?? [],
    block: remoteProject.block ?? localProject.block,
    parcel: remoteProject.parcel ?? localProject.parcel,
    licensingRoute: remoteProject.licensingRoute ?? localProject.licensingRoute,
    planningStatus: remoteProject.planningStatus ?? localProject.planningStatus,
    developerUnits: remoteProject.developerUnits ?? localProject.developerUnits,
    ownerUnits: remoteProject.ownerUnits ?? localProject.ownerUnits,
    technicalSpecNotes: remoteProject.technicalSpecNotes ?? localProject.technicalSpecNotes,
  };
}

function mergeRemoteStateWithLocalCache(
  remoteState: ProjectsRepositoryState,
  localState: ProjectsRepositoryState,
): ProjectsRepositoryState {
  const localProjectsById = new Map(localState.projects.map((project) => [project.id, project]));
  const localReadinessByProjectId = new Map(
    localState.readinessItems.map((readiness) => [readiness.projectId, readiness]),
  );

  return {
    projects: remoteState.projects.map((project) =>
      mergeProjectLocalOnlyFields(project, localProjectsById.get(project.id)),
    ),
    apartments: remoteState.apartments,
    readinessItems: remoteState.readinessItems.map((readiness) => {
      const localReadiness = localReadinessByProjectId.get(readiness.projectId);

      if (!localReadiness) return readiness;

      return {
        ...localReadiness,
        ...readiness,
        lastUpdated: readiness.lastUpdated || localReadiness.lastUpdated,
        missing: localReadiness.missing,
      };
    }),
  };
}

function warnAndContinue(message: string, error: unknown) {
  console.warn(`[GOLDLANDS] ${message}. Continuing with localStorage fallback.`, error);
}

function getProjectSortOrder(project: Project) {
  const value = project.sortOrder ?? project.sort_order;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function useProjectsStore({
  canUseSupabase = isSupabaseConfigured,
  supabaseRetryKey = "initial",
}: UseProjectsStoreOptions = {}) {
  const [state, setState] = useState<ProjectsRepositoryState>(() => readLocalProjectsState());
  const [isSupabaseSourceActive, setIsSupabaseSourceActive] = useState(false);
  const supabaseWritesEnabledRef = useRef(false);

  const commitState = useCallback((nextState: ProjectsRepositoryState) => {
    persistLocalProjectsState(nextState);
    setState(nextState);
  }, []);

  const applyRemoteState = useCallback((remoteState: ProjectsRepositoryState) => {
    setState((currentState) => {
      const nextState = mergeRemoteStateWithLocalCache(remoteState, currentState);

      persistLocalProjectsState(nextState);

      return nextState;
    });
  }, []);

  const runSupabaseWrite = useCallback(
    (
      label: string,
      operation: () => Promise<ProjectsRepositoryState>,
      options: { applyReturnedState?: boolean } = {},
    ) => {
      if (!isSupabaseConfigured || !supabaseWritesEnabledRef.current) return;

      void operation()
        .then((remoteState) => {
          if (options.applyReturnedState && hasUsableRemoteState(remoteState)) {
            setIsSupabaseSourceActive(true);
            applyRemoteState(remoteState);
          }
        })
        .catch((error) => {
          supabaseWritesEnabledRef.current = false;
          setIsSupabaseSourceActive(false);
          warnAndContinue(`Supabase ${label} failed`, error);
        });
    },
    [applyRemoteState],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !canUseSupabase) {
      supabaseWritesEnabledRef.current = false;
      setIsSupabaseSourceActive(false);
      return undefined;
    }

    let isCancelled = false;

    void Promise.resolve(supabaseProjectsRepository.getState())
      .then((remoteState: ProjectsRepositoryState) => {
        if (isCancelled) return;

        if (!hasUsableRemoteState(remoteState)) {
          supabaseWritesEnabledRef.current = false;
          setIsSupabaseSourceActive(false);
          console.warn("[GOLDLANDS] Supabase returned no active project data. Continuing with localStorage fallback.");
          return;
        }

        supabaseWritesEnabledRef.current = true;
        setIsSupabaseSourceActive(true);
        console.info("[GOLDLANDS] Supabase projects source activated", {
          projectCount: remoteState.projects.length,
          projectIds: remoteState.projects.map((project) => project.id),
        });
        applyRemoteState(remoteState);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;

        supabaseWritesEnabledRef.current = false;
        setIsSupabaseSourceActive(false);
        warnAndContinue("Supabase read failed", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [applyRemoteState, canUseSupabase, supabaseRetryKey]);

  const actions = useMemo(
    () => ({
      addProject(input: AddProjectInput) {
        const nextState = localProjectsRepository.addProject(input) as ProjectsRepositoryState;

        setState(nextState);
        runSupabaseWrite(
          "addProject",
          () => supabaseProjectsRepository.addProject(input) as Promise<ProjectsRepositoryState>,
          { applyReturnedState: true },
        );
      },

      updateProject(
        projectId: string,
        patch: Partial<Project>,
        readinessPatch?: Partial<ProjectReadiness>,
      ) {
        const nextState = localProjectsRepository.updateProject(
          projectId,
          patch,
          readinessPatch,
        ) as ProjectsRepositoryState;

        setState(nextState);
        runSupabaseWrite("updateProject", () =>
          supabaseProjectsRepository.updateProject(
            projectId,
            patch,
            readinessPatch,
          ) as Promise<ProjectsRepositoryState>,
          { applyReturnedState: true },
        );
      },

      deleteProject(projectId: string) {
        const nextState = localProjectsRepository.deleteProject(projectId) as ProjectsRepositoryState;

        setState(nextState);
        runSupabaseWrite("deleteProject", () =>
          supabaseProjectsRepository.deleteProject(projectId) as Promise<ProjectsRepositoryState>,
          { applyReturnedState: true },
        );
      },

      async reorderProjects(projectIds: string[]) {
        const previousState = readLocalProjectsState();
        const projectsById = new Map(previousState.projects.map((project) => [project.id, project]));
        const updates = projectIds
          .map((projectId, index) => {
            const project = projectsById.get(projectId);
            const sortOrder = index + 1;

            if (!project || getProjectSortOrder(project) === sortOrder) return null;

            return { projectId, sortOrder };
          })
          .filter((update): update is { projectId: string; sortOrder: number } => Boolean(update));

        if (updates.length === 0) return;

        const nextState = localProjectsRepository.reorderProjects(updates) as ProjectsRepositoryState;

        setState(nextState);

        if (!isSupabaseConfigured || !supabaseWritesEnabledRef.current) return;

        try {
          const remoteState = await supabaseProjectsRepository.reorderProjects(updates);

          if (hasUsableRemoteState(remoteState)) {
            setIsSupabaseSourceActive(true);
            applyRemoteState(remoteState);
          }
        } catch (error) {
          supabaseWritesEnabledRef.current = false;
          setIsSupabaseSourceActive(false);
          commitState(previousState);
          warnAndContinue("Supabase reorderProjects failed", error);
          throw error;
        }
      },

      updateApartment(projectId: string, apartmentId: string, patch: Partial<Apartment>) {
        const nextState = localProjectsRepository.updateApartment(
          projectId,
          apartmentId,
          patch,
        ) as ProjectsRepositoryState;

        setState(nextState);
        runSupabaseWrite("updateApartment", () =>
          supabaseProjectsRepository.updateApartment(
            projectId,
            apartmentId,
            patch,
          ) as Promise<ProjectsRepositoryState>,
          { applyReturnedState: true },
        );
      },

      importProjectBundle(bundle: ProjectImportBundle) {
        const current = readLocalProjectsState();
        const nextState: ProjectsRepositoryState = {
          projects: [
            ...current.projects.filter((project) => project.id !== bundle.project.id),
            bundle.project,
          ],
          apartments: [
            ...current.apartments.filter((apartment) => apartment.projectId !== bundle.project.id),
            ...bundle.apartments,
          ],
          readinessItems: [
            ...current.readinessItems.filter((item) => item.projectId !== bundle.project.id),
            bundle.readiness,
          ],
        };

        commitState(nextState);
        runSupabaseWrite(
          "importProjectBundle",
          () => supabaseProjectsRepository.importProjectBundle?.(nextState) as Promise<ProjectsRepositoryState>,
          { applyReturnedState: true },
        );
      },

      async updateProjectFileType(
        projectId: string,
        fileId: string,
        type: ProjectFileAssociation,
        patch: Partial<Project>,
      ) {
        const nextState = localProjectsRepository.updateProject(projectId, patch) as ProjectsRepositoryState;

        setState(nextState);

        if (!isSupabaseConfigured || !supabaseWritesEnabledRef.current) return;

        try {
          const remoteState = await supabaseProjectsRepository.updateProjectFileType?.(
            projectId,
            fileId,
            type,
          );

          if (remoteState && hasUsableRemoteState(remoteState)) {
            setIsSupabaseSourceActive(true);
            applyRemoteState(remoteState);
          }
        } catch (error) {
          supabaseWritesEnabledRef.current = false;
          setIsSupabaseSourceActive(false);
          warnAndContinue("Supabase updateProjectFileType failed", error);
          throw error;
        }
      },

      async deleteProjectFile(projectId: string, file: ProjectFile, patch: Partial<Project>) {
        const nextState = localProjectsRepository.updateProject(projectId, patch) as ProjectsRepositoryState;

        setState(nextState);

        if (!isSupabaseConfigured || !supabaseWritesEnabledRef.current) return;

        try {
          const remoteState = await supabaseProjectsRepository.deleteProjectFile?.(projectId, file);

          if (remoteState && hasUsableRemoteState(remoteState)) {
            setIsSupabaseSourceActive(true);
            applyRemoteState(remoteState);
          }
        } catch (error) {
          supabaseWritesEnabledRef.current = false;
          setIsSupabaseSourceActive(false);
          warnAndContinue("Supabase deleteProjectFile failed", error);
          throw error;
        }
      },

      async migrateLocalStateToSupabase() {
        if (!isSupabaseConfigured) {
          throw new Error("Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
        }

        const localState = readLocalProjectsState();
        const remoteState = await supabaseProjectsRepository.migrateLocalState?.(localState);

        if (remoteState && hasUsableRemoteState(remoteState)) {
          supabaseWritesEnabledRef.current = true;
          setIsSupabaseSourceActive(true);
          applyRemoteState(remoteState);
        }
      },

      resetDemoData() {
        const nextState = localProjectsRepository.resetDemoData() as ProjectsRepositoryState;

        supabaseWritesEnabledRef.current = false;
        setIsSupabaseSourceActive(false);
        commitState(nextState);
      },
    }),
    [applyRemoteState, commitState, runSupabaseWrite],
  );

  return {
    ...state,
    readinessChecklistCount: mockReadinessChecklist.length,
    isSupabaseSourceActive,
    ...actions,
  };
}
