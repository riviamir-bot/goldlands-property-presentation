import type { Apartment, Project, Screen } from "../types";

/** The project sections that have something to show. A section with no content is not offered to the presenter. */
export function visibleSections(project: Project, apartments: Apartment[]): Screen[] {
  const sections: Screen[] = ["opening"];
  const hasImages = Object.values(project.gallery).some((images) => images.length > 0);

  if (apartments.length > 0) sections.push("apartments", "prices");
  if (hasImages) sections.push("gallery");
  if (apartments.some((apartment) => apartment.planAttached)) sections.push("plans");
  if ((project.technicalSpecSections ?? []).length > 0) sections.push("technical");
  if (project.googleMapsUrl.trim() || project.googleMapsEmbedUrl.trim()) sections.push("location");

  return sections;
}
