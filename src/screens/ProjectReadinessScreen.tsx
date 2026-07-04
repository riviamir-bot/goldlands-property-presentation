import { ArrowLeft, ClipboardCheck, Layers3, TriangleAlert } from "lucide-react";
import { SideNavigation } from "../components/SideNavigation";
import type { Project, ProjectReadiness } from "../types";

interface ProjectReadinessScreenProps {
  projects: Project[];
  readinessItems: ProjectReadiness[];
  checklistCount: number;
  onProjects: () => void;
  onAdmin: () => void;
  onOpenProject: (projectId: string) => void;
}

function getProject(projects: Project[], projectId: string) {
  return projects.find((project) => project.id === projectId) ?? projects[0];
}

function countMissing(readiness: ProjectReadiness) {
  return Object.values(readiness.missing).reduce((total, items) => total + items.length, 0);
}

export function ProjectReadinessScreen({
  projects,
  readinessItems,
  checklistCount,
  onProjects,
  onAdmin,
  onOpenProject,
}: ProjectReadinessScreenProps) {
  const averageReadiness = Math.round(
    readinessItems.reduce((total, item) => total + item.readinessPercentage, 0) /
      readinessItems.length,
  );
  const criticalMissing = readinessItems.reduce(
    (total, item) => total + item.missing.critical.length,
    0,
  );

  return (
    <div className="management-layout">
      <SideNavigation
        active="readiness"
        onProjects={onProjects}
        onReadiness={() => undefined}
        onAdmin={onAdmin}
      />

      <main className="management-main readiness-screen">
        <section className="readiness-hero">
          <div>
            <span className="eyebrow">בקרת חומרים לפני פגישות מכירה</span>
            <h1>חוסרים לפרויקטים</h1>
            <p>רשימת עבודה פנימית להשלמת חומרי פרויקט לפני הצגה ללקוחות.</p>
          </div>
          <div className="readiness-list-metrics" aria-label="מדדי מוכנות">
            <span>
              <ClipboardCheck size={22} />
              מוכנות ממוצעת {averageReadiness}%
            </span>
            <span>
              <TriangleAlert size={22} />
              {criticalMissing} חוסרים קריטיים
            </span>
            <span>
              <Layers3 size={22} />
              {checklistCount} קטגוריות בדיקה
            </span>
          </div>
        </section>

        <section className="readiness-table-card" aria-label="מוכנות פרויקטים">
          <div className="table-wrap">
            <table className="lux-table readiness-table">
              <thead>
                <tr>
                  <th>פרויקט</th>
                  <th>עיר</th>
                  <th>סטטוס שיווקי</th>
                  <th>מוכנות</th>
                  <th>חוסרים</th>
                  <th>חוסרים קריטיים</th>
                  <th>עודכן לאחרונה</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {readinessItems.map((readiness) => {
                  const project = getProject(projects, readiness.projectId);
                  const missingCount = countMissing(readiness);
                  const criticalCount = readiness.missing.critical.length;

                  return (
                    <tr key={readiness.projectId}>
                      <td>
                        <button
                          className="readiness-project-link"
                          onClick={() => onOpenProject(project.id)}
                          type="button"
                        >
                          {project.name}
                        </button>
                      </td>
                      <td>{readiness.city}</td>
                      <td>{readiness.marketingStatus}</td>
                      <td>
                        <div className="table-progress">
                          <strong>{readiness.readinessPercentage}%</strong>
                          <span aria-hidden="true">
                            <i style={{ width: `${readiness.readinessPercentage}%` }} />
                          </span>
                        </div>
                      </td>
                      <td>{missingCount}</td>
                      <td className={criticalCount > 0 ? "critical-cell" : ""}>{criticalCount}</td>
                      <td>{readiness.lastUpdated}</td>
                      <td>
                        <button className="mini-button mini-button--gold" onClick={() => onOpenProject(project.id)}>
                          פתיחה
                          <ArrowLeft size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
