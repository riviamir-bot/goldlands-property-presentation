import type {
  Apartment,
  Project,
  ProjectFile,
  ProjectFileAssociation,
  ProjectReadiness,
  TechnicalSpecSectionData,
} from "../types";

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

export interface ProjectSortOrderUpdate {
  projectId: string;
  sortOrder: number;
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
  addApartment(
    projectId: string,
    apartment: Apartment,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  deleteApartment(
    projectId: string,
    apartmentId: string,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  upsertApartments(
    projectId: string,
    apartments: Apartment[],
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  importProjectData(
    projectId: string,
    projectPatch: Partial<Project>,
    apartments: Apartment[],
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  updateTechnicalSpecifications(
    projectId: string,
    sections: TechnicalSpecSectionData[],
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  reorderProjects(
    updates: ProjectSortOrderUpdate[],
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  importProjectBundle?(state: ProjectsRepositoryState): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  updateProjectFileType?(
    projectId: string,
    fileId: string,
    type: ProjectFileAssociation,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  updateProjectFileTarget?(
    projectId: string,
    fileId: string,
    target: string,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  deleteProjectFile?(
    projectId: string,
    file: ProjectFile,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  migrateLocalState?(
    state: ProjectsRepositoryState,
  ): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
  resetDemoData(): Promise<ProjectsRepositoryState> | ProjectsRepositoryState;
}
