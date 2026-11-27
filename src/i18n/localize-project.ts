import type { Project } from "../types";
import type { Language } from "./strings";

/**
 * The project as shown in one language. Hebrew is the source text; for English and French each reviewed
 * translation field replaces the Hebrew one, and anything not translated stays in Hebrew.
 */
export function localizeProject(project: Project, language: Language): Project {
  if (language === "he") return project;
  const tr = project.translations?.[language];
  if (!tr) return project;
  const text = (value: string | undefined, fallback: string) => (value?.trim() ? value : fallback);
  return {
    ...project,
    name: text(tr.name, project.name),
    city: text(tr.city, project.city),
    address: text(tr.address, project.address),
    neighborhood: text(tr.neighborhood, project.neighborhood),
    tagline: text(tr.tagline, project.tagline),
    description: text(tr.description, project.description),
    locationDescription: text(tr.locationDescription, project.locationDescription ?? "") || project.locationDescription,
    developerAbout: text(tr.developerAbout, project.developerAbout ?? "") || project.developerAbout,
    technicalSpecSections: tr.technicalSpecSections?.length ? tr.technicalSpecSections : project.technicalSpecSections,
    featureBlocks: tr.featureBlocks?.length ? tr.featureBlocks : project.featureBlocks,
  };
}

/** Hebrew name used for matching and ordering, whatever language is shown. */
export function localizeProjects(projects: Project[], language: Language): Project[] {
  return language === "he" ? projects : projects.map((project) => localizeProject(project, language));
}
