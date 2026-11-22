import { Building2 } from "lucide-react";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import type { Project } from "../types";

interface ProjectOpeningScreenProps {
  project: Project;
}

type Row = [label: string, value: string];

const hasValue = (value: string) => value.trim() !== "" && value.trim() !== "0";

export function ProjectOpeningScreen({ project }: ProjectOpeningScreenProps) {
  const mainImage = project.heroImage;
  const groups: Array<{ title: string; rows: Row[] }> = [
    {
      title: "פרטי מיקום",
      rows: [
        ["עיר", project.city],
        ["שכונה", project.neighborhood],
        ["כתובת", project.address],
        ["סוג פרויקט", project.projectType],
      ],
    },
    {
      title: "היקף הפרויקט",
      rows: [
        ["דירות קיימות", project.stats.existingApartments],
        ["דירות חדשות", project.stats.newApartments],
        ["בניינים", project.stats.buildings],
        ["קומות", project.stats.floors],
      ],
    },
    {
      title: "תמהיל דירות",
      rows: [
        ["3 חדרים", project.apartmentMix.threeRooms],
        ["4 חדרים", project.apartmentMix.fourRooms],
        ["5 חדרים", project.apartmentMix.fiveRooms],
        ["דירות גן", project.apartmentMix.gardenApartments],
        ["פנטהאוזים", project.apartmentMix.penthouses],
      ],
    },
    {
      title: "חניה, מחסן ואכלוס",
      rows: [
        ["חניה", project.stats.parking],
        ["מחסן", project.stats.storage],
        ["צפי אכלוס", project.stats.occupancy],
      ],
    },
  ];
  const visibleGroups = groups
    .map((group) => ({ ...group, rows: group.rows.filter(([, value]) => hasValue(value)) }))
    .filter((group) => group.rows.length > 0);
  const headlineStats: Row[] = (
    [
      ["קומות", project.stats.floors],
      ["דירות", project.stats.units],
      ["אכלוס", project.stats.occupancy],
    ] as Row[]
  ).filter(([, value]) => hasValue(value));
  // The unit count already has its own tile; do not repeat it as a chip.
  const facts = project.keyFacts.filter((fact) => fact !== `${project.stats.units} דירות`);

  return (
    <section className="panel project-overview-panel">
      <div className="project-overview-layout">
        <section className="project-overview-visual" aria-label="הדמיית הפרויקט">
          <div
            className={mainImage ? "project-overview-image" : "project-overview-image project-overview-image--empty"}
            style={mainImage ? { backgroundImage: `url("${mainImage}")` } : undefined}
          >
            {!mainImage && (
              <div className="project-overview-image__placeholder">
                <Building2 size={34} strokeWidth={1.3} />
                <strong>{project.name}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="project-overview-copy">
          <div className="project-overview-title">
            <div className="project-overview-heading">
              <ProjectLogoSlot project={project} compact markOnly />
              <div>
                <span className="eyebrow">{project.location}</span>
                <h2>{project.name}</h2>
              </div>
            </div>
            {project.tagline && <p>{project.tagline}</p>}
            {project.description && <p className="project-overview-description">{project.description}</p>}
          </div>

          {headlineStats.length > 0 && (
            <div className="overview-stat-grid" aria-label="נתוני פרויקט מרכזיים">
              {headlineStats.map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          )}

          {facts.length > 0 && (
            <div className="overview-facts" aria-label="דגשי פרויקט">
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </div>
          )}

          <div className="overview-fact-groups" aria-label="סקירת פרויקט">
            {visibleGroups.map((group) => (
              <details className="overview-fact-group" key={group.title} open>
                <summary>{group.title}</summary>
                <dl>
                  {group.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
