import type { Project } from "../types";

interface ProjectLogoSlotProps {
  project?: Project;
}

export function ProjectLogoSlot({ project }: ProjectLogoSlotProps) {
  return (
    <div className="project-logo-slot" aria-label="לוגו הפרויקט">
      <strong>{project?.logoMark ?? "GL"}</strong>
      <span>
        <b>{project?.name ?? "לוגו פרויקט"}</b>
        {project?.location && <small>{project.location}</small>}
      </span>
    </div>
  );
}
