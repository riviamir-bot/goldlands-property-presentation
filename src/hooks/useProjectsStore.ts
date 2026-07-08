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
import type { Apartment, Project, ProjectReadiness } from "../types";

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
    projectLogo: localProject.projectLogo || remoteProject.projectLogo,
    heroImage: localProject.heroImage || remoteProject.heroImage,
    mainImage: localProject.mainImage || remoteProject.mainImage,
    gallery: localProject.gallery ?? remoteProject.gallery,
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

export function useProjectsStore({
  canUseSupabase = isSupabaseConfigured,
  supabaseRetryKey = "initial",
}: UseProjectsStoreOptions = {}) {
  const [state, setState] = useState<ProjectsRepositoryState>(() => readLocalProjectsState());
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
            applyRemoteState(remoteState);
          }
        })
        .catch((error) => {
          supabaseWritesEnabledRef.current = false;
          warnAndContinue(`Supabase ${label} failed`, error);
        });
    },
    [applyRemoteState],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !canUseSupabase) {
      supabaseWritesEnabledRef.current = false;
      return undefined;
    }

    let isCancelled = false;

    void Promise.resolve(supabaseProjectsRepository.getState())
      .then((remoteState: ProjectsRepositoryState) => {
        if (isCancelled) return;

        if (!hasUsableRemoteState(remoteState)) {
          supabaseWritesEnabledRef.current = false;
          console.warn("[GOLDLANDS] Supabase returned no active project data. Continuing with localStorage fallback.");
          return;
        }

        supabaseWritesEnabledRef.current = true;
        applyRemoteState(remoteState);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;

        supabaseWritesEnabledRef.current = false;
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

      resetDemoData() {
        const nextState = localProjectsRepository.resetDemoData() as ProjectsRepositoryState;

        supabaseWritesEnabledRef.current = false;
        commitState(nextState);
      },
    }),
    [commitState, runSupabaseWrite],
  );

  return {
    ...state,
    readinessChecklistCount: mockReadinessChecklist.length,
    ...actions,
  };
}
