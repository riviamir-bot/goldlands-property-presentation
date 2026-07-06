import { useState, type FormEvent } from "react";
import { ArrowLeft, FilePenLine, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { SideNavigation } from "../components/SideNavigation";
import type { AddProjectInput } from "../hooks/useProjectsStore";
import type { Project, ProjectReadiness } from "../types";

interface ProjectManagementScreenProps {
  projects: Project[];
  readinessItems: ProjectReadiness[];
  onProjects: () => void;
  onReadiness: () => void;
  onOpenProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onAddProject: (project: AddProjectInput) => void;
  onDeleteProject: (projectId: string) => void;
  onResetDemoData: () => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
}

function getReadiness(readinessItems: ProjectReadiness[], projectId: string) {
  return readinessItems.find((item) => item.projectId === projectId);
}

function countMissing(readiness?: ProjectReadiness) {
  if (!readiness) return 0;
  return Object.values(readiness.missing).reduce((total, items) => total + items.length, 0);
}

export function ProjectManagementScreen({
  projects,
  readinessItems,
  onProjects,
  onReadiness,
  onOpenProject,
  onEditProject,
  onAddProject,
  onDeleteProject,
  onResetDemoData,
  canViewReadiness = true,
  canManageProjects = true,
}: ProjectManagementScreenProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const projectToDelete = projects.find((project) => project.id === deleteProjectId);

  const handleAddProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onAddProject({
      name: String(formData.get("name") ?? ""),
      city: String(formData.get("city") ?? ""),
      address: String(formData.get("address") ?? ""),
      neighborhood: String(formData.get("neighborhood") ?? ""),
      marketingStatus: String(formData.get("marketingStatus") ?? "טיוטה"),
      projectType: String(formData.get("projectType") ?? "פרויקט חדש") as AddProjectInput["projectType"],
      tagline: String(formData.get("tagline") ?? ""),
    });
    setIsAddOpen(false);
    setSuccessMessage("הפרויקט נוסף ונשמר מקומית");
  };

  return (
    <div className="management-layout">
      <SideNavigation
        active="admin"
        onProjects={onProjects}
        onReadiness={onReadiness}
        onAdmin={() => undefined}
        canViewReadiness={canViewReadiness}
        canManageProjects={canManageProjects}
      />

      <main className="management-main project-management-screen">
        <section className="management-title-row">
          <div>
            <span className="eyebrow">חומרי פרויקט</span>
            <h1>ניהול פרויקטים</h1>
          </div>
          {canManageProjects && (
            <div className="management-title-actions">
              {successMessage && <span className="save-success">{successMessage}</span>}
              <button className="ghost-button ghost-button--compact" onClick={onResetDemoData} type="button">
                <RotateCcw size={16} />
                איפוס נתוני דמו
              </button>
              <button className="gold-button gold-button--compact" onClick={() => setIsAddOpen(true)} type="button">
                <Plus size={16} />
                הוספת פרויקט
              </button>
            </div>
          )}
        </section>

        <section className="management-list" aria-label="רשימת ניהול פרויקטים">
          {projects.map((project) => {
            const readiness = getReadiness(readinessItems, project.id);
            const missingCount = countMissing(readiness);

            return (
              <article className="management-row" key={project.id}>
                <button
                  className="management-row__project"
                  onClick={() => (canManageProjects ? onEditProject(project.id) : onOpenProject(project.id))}
                >
                  <strong>{project.name}</strong>
                  <span>{readiness?.city ?? project.location}</span>
                </button>
                <div className="management-row__actions">
                  {canManageProjects && (
                    <button className="gold-button" onClick={() => onEditProject(project.id)}>
                      עריכה
                      <FilePenLine size={16} />
                    </button>
                  )}
                  <button className="mini-button" onClick={() => onOpenProject(project.id)}>
                    <Play size={15} />
                    פתיחה
                  </button>
                  {canManageProjects && (
                    <button
                      className="mini-button mini-button--danger"
                      disabled={projects.length <= 1}
                      onClick={() => setDeleteProjectId(project.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                      מחיקה
                    </button>
                  )}
                </div>
                <span className="management-row__status">{readiness?.marketingStatus ?? "טיוטה"}</span>
                <div className="management-row__readiness">
                  <span>{readiness?.readinessPercentage ?? 0}%</span>
                  <small>{missingCount} חוסרים</small>
                </div>
                <ArrowLeft className="management-row__arrow" size={18} />
              </article>
            );
          })}
        </section>

        {isAddOpen && (
          <div className="material-modal-backdrop" onClick={() => setIsAddOpen(false)}>
            <section
              className="material-modal project-crud-modal"
              role="dialog"
              aria-modal="true"
              aria-label="הוספת פרויקט"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="material-modal__header">
                <div>
                  <span className="eyebrow">ניהול פרויקטים</span>
                  <h2>הוספת פרויקט</h2>
                </div>
                <button className="ghost-button ghost-button--compact" onClick={() => setIsAddOpen(false)} type="button">
                  ביטול
                </button>
              </header>
              <form className="mock-field-grid" id="add-project-form" onSubmit={handleAddProject}>
                <label className="mock-field">
                  <span>שם פרויקט</span>
                  <input name="name" required defaultValue="NEW PROJECT" />
                </label>
                <label className="mock-field">
                  <span>עיר</span>
                  <input name="city" required defaultValue="תל אביב" />
                </label>
                <label className="mock-field">
                  <span>כתובת</span>
                  <input name="address" required defaultValue="רחוב הדמו 1" />
                </label>
                <label className="mock-field">
                  <span>שכונה</span>
                  <input name="neighborhood" required defaultValue="מרכז העיר" />
                </label>
                <label className="mock-field">
                  <span>סטטוס שיווקי</span>
                  <input name="marketingStatus" defaultValue="טיוטה ראשונית" />
                </label>
                <label className="mock-field">
                  <span>סוג פרויקט</span>
                  <select name="projectType" defaultValue="פרויקט חדש">
                    <option>פרויקט חדש</option>
                    <option>תמ״א 38/1</option>
                    <option>תמ״א 38/2 / פינוי בינוי</option>
                  </select>
                </label>
                <label className="mock-field mock-field--wide">
                  <span>משפט שיווקי קצר</span>
                  <textarea name="tagline" rows={3} defaultValue="משפט שיווקי קצר לפרויקט החדש." />
                </label>
              </form>
              <footer className="material-modal__footer">
                <button className="ghost-button ghost-button--compact" onClick={() => setIsAddOpen(false)} type="button">
                  ביטול
                </button>
                <button className="gold-button gold-button--compact" form="add-project-form" type="submit">
                  שמירה
                </button>
              </footer>
            </section>
          </div>
        )}

        {projectToDelete && (
          <div className="material-modal-backdrop" onClick={() => setDeleteProjectId(null)}>
            <section
              className="material-modal project-crud-modal"
              role="dialog"
              aria-modal="true"
              aria-label="מחיקת פרויקט"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="material-modal__header">
                <div>
                  <span className="eyebrow">מחיקה מקומית</span>
                  <h2>האם למחוק את הפרויקט?</h2>
                </div>
              </header>
              <p className="modal-copy">
                המחיקה היא מחיקת דמו מקומית בלבד ותסיר את {projectToDelete.name} מרשימת הפרויקטים, מהמצגות
                ומהניהול במחשב הזה.
              </p>
              <footer className="material-modal__footer">
                <button className="ghost-button ghost-button--compact" onClick={() => setDeleteProjectId(null)} type="button">
                  ביטול
                </button>
                <button
                  className="gold-button gold-button--compact"
                  onClick={() => {
                    onDeleteProject(projectToDelete.id);
                    setDeleteProjectId(null);
                    setSuccessMessage("הפרויקט נמחק מנתוני הדמו המקומיים");
                  }}
                  type="button"
                >
                  מחיקה
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
