import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import type { Project } from "../types";

interface ProjectOpeningScreenProps {
  project: Project;
}

export function ProjectOpeningScreen({ project }: ProjectOpeningScreenProps) {
  const mainImage = project.mainImage || project.heroImage;
  const overviewGroups = [
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

  return (
    <section className="panel project-overview-panel">
      <div className="project-overview-layout">
        <section className="project-overview-visual" aria-label="הדמיית הפרויקט">
          <div className="project-overview-image" style={{ backgroundImage: `url(${mainImage})` }} />
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
            <p>{project.tagline}</p>
            <p className="project-overview-description">{project.description}</p>
          </div>

          <div className="overview-stat-grid" aria-label="נתוני פרויקט מרכזיים">
            <article>
              <span>קומות</span>
              <strong>{project.stats.floors}</strong>
            </article>
            <article>
              <span>דירות</span>
              <strong>{project.stats.units}</strong>
            </article>
            <article>
              <span>אכלוס</span>
              <strong>{project.stats.occupancy}</strong>
            </article>
          </div>

          <div className="overview-facts" aria-label="דגשי פרויקט">
            {project.keyFacts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>

          <div className="overview-fact-groups" aria-label="סקירת פרויקט">
            {overviewGroups.map((group, index) => (
              <details className="overview-fact-group" key={group.title} open={index < 3}>
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
