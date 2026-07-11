import type { Project, ProjectFile } from "../types";

export function canUseFileAsProjectMainImage(file: ProjectFile) {
  return file.type === "הדמיה" || file.type === "תמונת פרויקט";
}

export function isProjectFileMainImage(project: Project, file: ProjectFile) {
  const mainImage = project.mainImage?.trim();

  return Boolean(mainImage && (file.url === mainImage || file.id === mainImage));
}

export function getValidProjectMainImage(project: Project) {
  const mainImage = project.mainImage?.trim();

  if (!mainImage) return "";

  const matchingFile = project.projectFiles?.find(
    (file) => file.url === mainImage || file.id === mainImage,
  );

  if (matchingFile) {
    return canUseFileAsProjectMainImage(matchingFile) ? mainImage : "";
  }

  return mainImage;
}
