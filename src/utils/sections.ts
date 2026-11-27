import type { Apartment, Project, Screen } from "../types";

export interface SectionOptions {
  showPrices?: boolean;
}

/** The project sections that have something to show. A section with no content is not offered to the presenter. */
export function visibleSections(project: Project, apartments: Apartment[], options: SectionOptions = {}): Screen[] {
  const showPrices = options.showPrices ?? true;
  const sections: Screen[] = ["opening"];
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);

  if (apartments.length > 0) sections.push("apartments");
  if (apartments.length > 0 && showPrices) sections.push("prices");
  if (hasImages) sections.push("gallery");
  if (apartments.some((apartment) => apartment.planAttached && apartment.planUrl)) sections.push("plans");
  if ((project.technicalSpecSections ?? []).length > 0 || (project.featureBlocks ?? []).length > 0) sections.push("technical");
  if (project.model3dUrl) sections.push("model3d");
  if (project.address.trim() || project.city.trim()) sections.push("location");

  return sections;
}
