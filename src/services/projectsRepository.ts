import type { Apartment, Project, ProjectReadiness } from "../types";

export interface ProjectsRepositoryState {
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

export interface ProjectsRepository {
  getState(): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  saveState(state: ProjectsRepositoryState): Promise<void> | void;
  addProject(input: AddProjectInput): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  updateProject(
    projectId: string,
    patch: Partial<Project>,
    readinessPatch?: Partial<ProjectReadiness>,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  deleteProject(projectId: string): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  updateApartment(
    projectId: string,
    apartmentId: string,
    patch: Partial<Apartment>,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  resetDemoData(): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
}
