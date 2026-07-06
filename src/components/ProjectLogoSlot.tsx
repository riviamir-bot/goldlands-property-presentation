import type { Project } from "../types";

interface ProjectLogoSlotProps {
  project?: Project;
  compact?: boolean;
  markOnly?: boolean;
}

export function ProjectLogoSlot({ project, compact = false, markOnly = false }: ProjectLogoSlotProps) {
  const projectLogo = project?.projectLogo?.trim();

  return (
    <div
      className={[
        "project-logo-slot",
        compact ? "project-logo-slot--compact" : "",
        markOnly ? "project-logo-slot--mark-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="לוגו הפרויקט"
    >
      <strong className={projectLogo ? "project-logo-slot__mark project-logo-slot__mark--image" : "project-logo-slot__mark"}>
        {projectLogo ? <img src={projectLogo} alt={`לוגו ${project?.name ?? "פרויקט"}`} /> : project?.logoMark ?? "GL"}
      </strong>
      {!markOnly && (
        <span>
          <b>{project?.name ?? "לוגו פרויקט"}</b>
          {project?.location && <small>{project.location}</small>}
        </span>
      )}
    </div>
  );
}
