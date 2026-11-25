import { Building2, MapPin } from "lucide-react";
import { SideNavigation } from "../components/SideNavigation";
import { useI18n } from "../i18n/LanguageContext";
import type { Project } from "../types";

interface AllProjectsScreenProps {
  projects: Project[];
  userName?: string;
  notice?: React.ReactNode;
  onSelect: (projectId: string) => void;
  onSignOut?: () => void;
}

export function AllProjectsScreen({ projects, userName, notice, onSelect, onSignOut }: AllProjectsScreenProps) {
  const { t } = useI18n();
  return (
    <div className="management-layout">
      <SideNavigation userName={userName} onProjects={() => undefined} onSignOut={onSignOut} />

      <main className="management-main">
        {notice}
        <section className="screen-heading screen-heading--wide management-heading">
          <span className="eyebrow">GOLDLANDS</span>
          <h1>{t("projects.title")}</h1>
        </section>

        {projects.length > 0 ? (
          <section className="projects-grid" aria-label={t("nav.allProjects")}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onSelect={onSelect} />
            ))}
          </section>
        ) : (
          <div className="empty-state compact-empty-state">
            <h2>{t("projects.none")}</h2>
            <p>{t("projects.noneHint")}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project, onSelect }: { project: Project; onSelect: (projectId: string) => void }) {
  const image = project.heroImage;

  return (
    <button
      className={image ? "project-card" : "project-card project-card--placeholder"}
      type="button"
      onClick={() => onSelect(project.id)}
    >
      <div className="project-card__image" style={image ? { backgroundImage: `url("${image}")` } : undefined}>
        {!image && (
          <div className="project-card__placeholder" aria-hidden="true">
            <Building2 size={26} />
            <strong>{project.logoMark}</strong>
          </div>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__meta-row">
          <span className="project-card__meta">
            <MapPin size={16} />
            {project.location}
          </span>
          <span className="project-card__type">{project.projectType}</span>
        </div>
        <h2 dir="auto">{project.name}</h2>
        {project.tagline && <p>{project.tagline}</p>}
        <div className="project-card__facts">
          {project.keyFacts.slice(0, 3).map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
