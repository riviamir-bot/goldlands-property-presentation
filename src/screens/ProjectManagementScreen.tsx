import { useState, type FormEvent } from "react";
import { ArrowLeft, FilePenLine, FolderUp, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { SideNavigation } from "../components/SideNavigation";
import type { AddProjectInput } from "../hooks/useProjectsStore";
import type { Apartment, Project, ProjectReadiness } from "../types";

interface ProjectManagementScreenProps {
  projects: Project[];
  apartments: Apartment[];
  readinessItems: ProjectReadiness[];
  onProjects: () => void;
  onReadiness: () => void;
  onOpenProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onAddProject: (project: AddProjectInput) => void;
  onDeleteProject: (projectId: string) => void;
  onResetDemoData: () => void;
  onImportProject: () => void;
  onMigrateLocalToSupabase?: () => Promise<void> | void;
  canMigrateLocalToSupabase?: boolean;
  isSupabaseSourceActive?: boolean;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  authModeLabel?: string;
  onSignOut?: () => void;
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
  apartments,
  readinessItems,
  onProjects,
  onReadiness,
  onOpenProject,
  onEditProject,
  onAddProject,
  onDeleteProject,
  onResetDemoData,
  onImportProject,
  onMigrateLocalToSupabase,
  canMigrateLocalToSupabase = false,
  isSupabaseSourceActive = false,
  canViewReadiness = true,
  canManageProjects = true,
  authModeLabel,
  onSignOut,
}: ProjectManagementScreenProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [isModalSaving, setIsModalSaving] = useState(false);
  const projectToDelete = projects.find((project) => project.id === deleteProjectId);
  const localProjects = projects.filter((project) => project.isSupabaseBacked !== true);
  const migrationProjectCount = localProjects.length;
  const migrationApartmentCount = apartments.filter((apartment) =>
    localProjects.some((project) => project.id === apartment.projectId),
  ).length;
  const migrationFileCount = localProjects.reduce(
    (total, project) => total + (project.projectFiles?.length ?? 0),
    0,
  );

  const handleAddProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isModalSaving) return;

    const formData = new FormData(event.currentTarget);

    setIsModalSaving(true);
    setModalError("");
    setSuccessMessage("");

    try {
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
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "שמירת הפרויקט נכשלה.");
    } finally {
      setIsModalSaving(false);
    }
  };

  const handleMigrateLocalToSupabase = async () => {
    if (!onMigrateLocalToSupabase) return;
    if (!canMigrateLocalToSupabase) {
      setModalError("נדרש חיבור Supabase עם משתמש admin כדי להעביר נתונים מקומיים.");
      return;
    }
    if (isMigrating) return;

    setIsMigrating(true);
    setModalError("");
    setSuccessMessage("");

    try {
      await onMigrateLocalToSupabase();
      setIsMigrationOpen(false);
      setSuccessMessage("הנתונים המקומיים הועברו ל-Supabase ללא מחיקת localStorage");
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "העברת הנתונים ל-Supabase נכשלה.");
    } finally {
      setIsMigrating(false);
    }
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
        authModeLabel={authModeLabel}
        onSignOut={onSignOut}
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
              <button className="gold-button gold-button--compact" onClick={onImportProject} type="button">
                <FolderUp size={16} />
                ייבוא מסמכים
              </button>
              <button
                className="ghost-button ghost-button--compact"
                onClick={() => {
                  setModalError(
                    canMigrateLocalToSupabase
                      ? ""
                      : "נדרש חיבור Supabase עם משתמש admin כדי להעביר נתונים מקומיים.",
                  );
                  setIsMigrationOpen(true);
                }}
                type="button"
              >
                <FolderUp size={16} />
                העברה ל-Supabase
              </button>
              <button className="ghost-button ghost-button--compact" onClick={onResetDemoData} type="button">
                <RotateCcw size={16} />
                איפוס נתוני דמו
              </button>
              <button
                className="gold-button gold-button--compact"
                onClick={() => {
                  setModalError("");
                  setIsAddOpen(true);
                }}
                type="button"
              >
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

        {isMigrationOpen && (
          <div
            className="material-modal-backdrop"
            onClick={() => {
              if (!isMigrating) setIsMigrationOpen(false);
            }}
          >
            <section
              className="material-modal project-crud-modal"
              role="dialog"
              aria-modal="true"
              aria-label="העברת נתונים מקומיים ל-Supabase"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="material-modal__header">
                <div>
                  <span className="eyebrow">Supabase</span>
                  <h2>העברת נתונים מקומיים</h2>
                </div>
                <button
                  className="ghost-button ghost-button--compact"
                  disabled={isMigrating}
                  onClick={() => setIsMigrationOpen(false)}
                  type="button"
                >
                  ביטול
                </button>
              </header>
              {modalError && (
                <p className="material-modal__note material-modal__note--error" role="alert">
                  {modalError}
                </p>
              )}
              <div className="mock-field-grid">
                <div className="mock-field">
                  <span>פרויקטים מקומיים</span>
                  <strong>{migrationProjectCount}</strong>
                </div>
                <div className="mock-field">
                  <span>דירות</span>
                  <strong>{migrationApartmentCount}</strong>
                </div>
                <div className="mock-field">
                  <span>קבצים ברשימות</span>
                  <strong>{migrationFileCount}</strong>
                </div>
                <div className="mock-field mock-field--wide">
                  <span>זיהוי כפילויות</span>
                  <strong>לפי id, ואם אין התאמה לפי שם פרויקט + כתובת</strong>
                </div>
              </div>
              <p className="material-modal__note">
                localStorage לא יימחק. קבצים שכבר נמצאים ב-Storage יישארו מקושרים; קבצי blob/data מקומיים לא יועלו כקבצים קבועים.
              </p>
              <p className="material-modal__note">
                מקור Supabase פעיל כרגע: {isSupabaseSourceActive ? "כן" : "לא"}
              </p>
              <footer className="material-modal__footer">
                <button
                  className="ghost-button ghost-button--compact"
                  disabled={isMigrating}
                  onClick={() => setIsMigrationOpen(false)}
                  type="button"
                >
                  ביטול
                </button>
                <button
                  className="gold-button gold-button--compact"
                  disabled={isMigrating || !canMigrateLocalToSupabase}
                  onClick={handleMigrateLocalToSupabase}
                  type="button"
                >
                  {isMigrating ? "מעבירה..." : "אישור העברה"}
                </button>
              </footer>
            </section>
          </div>
        )}

        {isAddOpen && (
          <div
            className="material-modal-backdrop"
            onClick={() => {
              if (!isModalSaving) setIsAddOpen(false);
            }}
          >
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
              {modalError && (
                <p className="material-modal__note material-modal__note--error" role="alert">
                  {modalError}
                </p>
              )}
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
                <button
                  className="gold-button gold-button--compact"
                  disabled={isModalSaving}
                  form="add-project-form"
                  type="submit"
                >
                  {isModalSaving ? "שומר..." : "שמירה"}
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
