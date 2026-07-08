import { Building2, MapPin } from "lucide-react";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { SideNavigation } from "../components/SideNavigation";
import type { Project } from "../types";

interface AllProjectsScreenProps {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onReadiness: () => void;
  onAdmin: () => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  authModeLabel?: string;
  onSignOut?: () => void;
}

export function AllProjectsScreen({
  projects,
  onSelect,
  onReadiness,
  onAdmin,
  canViewReadiness = true,
  canManageProjects = true,
  authModeLabel,
  onSignOut,
}: AllProjectsScreenProps) {
  return (
    <div className="management-layout">
      <SideNavigation
        active="projects"
        onProjects={() => undefined}
        onReadiness={onReadiness}
        onAdmin={onAdmin}
        canViewReadiness={canViewReadiness}
        canManageProjects={canManageProjects}
        authModeLabel={authModeLabel}
        onSignOut={onSignOut}
      />

      <main className="management-main">
        <section className="screen-heading screen-heading--wide management-heading">
          <span className="eyebrow">GOLDLANDS</span>
          <h1>בחרו פרויקט להצגה</h1>
        </section>

        <section className="projects-grid" aria-label="פרויקטים">
          {projects.map((project) => {
            const mainImage = project.mainImage?.trim();

            return (
              <button
                className={mainImage ? "project-card" : "project-card project-card--placeholder"}
                key={project.id}
                onClick={() => onSelect(project.id)}
              >
                <div
                  className="project-card__image"
                  style={mainImage ? { backgroundImage: `url(${mainImage})` } : undefined}
                >
                  {!mainImage && (
                    <div className="project-card__placeholder" aria-hidden="true">
                      <Building2 size={26} />
                      <strong>{project.logoMark}</strong>
                    </div>
                  )}
                </div>
                <div className="project-card__body">
                  <ProjectLogoSlot project={project} compact markOnly />
                  <div className="project-card__meta-row">
                    <span className="project-card__meta">
                      <MapPin size={16} />
                      {project.location}
                    </span>
                    <span className="project-card__type">{project.projectType}</span>
                  </div>
                  <h2>{project.name}</h2>
                  <p>{project.tagline}</p>
                  <div className="project-card__facts">
                    {project.keyFacts.slice(0, 3).map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {canManageProjects && (
          <button className="admin-card" onClick={onAdmin}>
            <Building2 size={28} />
            <span>
              <strong>מסך ניהול</strong>
              <small>תשתית עתידית לניהול פרויקטים ותוכן</small>
            </span>
          </button>
        )}
      </main>
    </div>
  );
}
