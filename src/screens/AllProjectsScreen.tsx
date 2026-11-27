import { useState } from "react";
import { LogOut, MapPin } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { GlassBackdrop } from "../components/GoldViewParts";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/LanguageContext";
import type { Project } from "../types";
import "../gold-view.css";

interface AllProjectsScreenProps {
  projects: Project[];
  userName?: string;
  notice?: React.ReactNode;
  onSelect: (projectId: string) => void;
  onSignOut?: () => void;
}

/** Building cut out of its render (transparent PNG in public/project-cutouts); falls back to the regular render if the file is missing. */
function ProjectThumb({ projectId, fallback }: { projectId: string; fallback: string }) {
  const [cutoutFailed, setCutoutFailed] = useState(false);
  if (!cutoutFailed) {
    return (
      <span className="gv-project-card__thumb gv-project-card__thumb--cutout" aria-hidden="true">
        <img src={`/project-cutouts/${projectId}.png`} alt="" loading="lazy" onError={() => setCutoutFailed(true)} />
      </span>
    );
  }
  return (
    <span className="gv-project-card__thumb" aria-hidden="true">
      {fallback && <img src={fallback} alt="" loading="lazy" />}
    </span>
  );
}

/** The marketer's project picker, in the Gold View look: one card per project over its render. */
export function AllProjectsScreen({ projects, userName, notice, onSelect, onSignOut }: AllProjectsScreenProps) {
  const { t, dir } = useI18n();
  const byCity = new Map<string, Project[]>();
  for (const project of projects) {
    const city = project.city.trim();
    byCity.set(city, [...(byCity.get(city) ?? []), project]);
  }

  return (
    <div className="gv gv-projects" dir={dir}>
      <GlassBackdrop image={projects.find((project) => project.heroImage)?.heroImage} />
      <header className="gv-projects__bar">
        <BrandLogo compact surface="gold" />
        <div className="gv-projects__tools">
          {userName && <span className="gv-projects__user">{userName}</span>}
          <LanguageSwitcher />
          {onSignOut && (
            <button type="button" className="gv-meeting-bar__button gv-meeting-bar__button--icon" onClick={onSignOut} aria-label={t("nav.signOut")} title={t("nav.signOut")}>
              <LogOut size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <main className="gv-projects__main">
        {notice}
        <h1>{t("projects.title")}</h1>
        {projects.length === 0 ? (
          <div className="gv-panel">
            <h2>{t("projects.none")}</h2>
            <p>{t("projects.noneHint")}</p>
          </div>
        ) : (
          [...byCity.entries()].map(([city, items]) => (
            <section key={city || "-"} className="gv-projects__city" aria-label={city || t("nav.allProjects")}>
              {city && <h2>{city}</h2>}
              <div className="gv-projects__grid">
                {items.map((project) => (
                  <button key={project.id} type="button" className="gv-project-card" onClick={() => onSelect(project.id)}>
                    <ProjectThumb projectId={project.id} fallback={project.heroImage} />
                    <span className="gv-project-card__label">
                      <strong dir="auto">{project.name}</strong>
                      <span>
                        <MapPin size={14} aria-hidden="true" />
                        <span dir="auto">{project.location}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
