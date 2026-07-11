import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, GripVertical, MapPin } from "lucide-react";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { SideNavigation } from "../components/SideNavigation";
import type { Project } from "../types";
import { getValidProjectMainImage } from "../utils/projectImages";

interface AllProjectsScreenProps {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onReorderProjects?: (projectIds: string[]) => Promise<void>;
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
  onReorderProjects,
  onReadiness,
  onAdmin,
  canViewReadiness = true,
  canManageProjects = true,
  authModeLabel,
  onSignOut,
}: AllProjectsScreenProps) {
  const sortedProjects = useMemo(() => sortProjectsByOrder(projects), [projects]);
  const [orderedProjects, setOrderedProjects] = useState(sortedProjects);
  const [isSortMode, setIsSortMode] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "saved" | "error"; text: string } | null>(null);
  const orderBeforeDragRef = useRef<Project[] | null>(null);
  const latestOrderedProjectsRef = useRef(orderedProjects);
  const feedbackTimerRef = useRef<number | null>(null);
  const canSortProjects = canManageProjects && Boolean(onReorderProjects) && projects.length > 1;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setOrderedProjects(sortedProjects);
  }, [sortedProjects]);

  useEffect(() => {
    latestOrderedProjectsRef.current = orderedProjects;
  }, [orderedProjects]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showOrderFeedback = (type: "saved" | "error", text: string) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setOrderFeedback({ type, text });

    if (type === "saved") {
      feedbackTimerRef.current = window.setTimeout(() => setOrderFeedback(null), 2200);
    }
  };

  const handleSortModeToggle = () => {
    if (!canSortProjects) return;

    setIsSortMode((current) => !current);
    setDraggedProjectId(null);
    setDragOverProjectId(null);
    setOrderFeedback(null);
  };

  const handleCardClick = (projectId: string) => {
    if (isSortMode) return;

    onSelect(projectId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = String(event.active.id);

    orderBeforeDragRef.current = latestOrderedProjectsRef.current;
    setDraggedProjectId(projectId);
    setDragOverProjectId(projectId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeProjectId = String(event.active.id);
    const targetProjectId = event.over?.id ? String(event.over.id) : null;

    if (!targetProjectId || activeProjectId === targetProjectId) return;

    setDragOverProjectId(targetProjectId);
    setOrderedProjects((currentProjects) => {
      const oldIndex = currentProjects.findIndex((project) => project.id === activeProjectId);
      const newIndex = currentProjects.findIndex((project) => project.id === targetProjectId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return currentProjects;

      const nextProjects = arrayMove(currentProjects, oldIndex, newIndex);

      latestOrderedProjectsRef.current = nextProjects;

      return nextProjects;
    });
  };

  const saveCurrentOrder = async () => {
    const previousProjects = orderBeforeDragRef.current;
    const nextProjects = latestOrderedProjectsRef.current;
    const didOrderChange = Boolean(
      previousProjects && projectIds(previousProjects).join("|") !== projectIds(nextProjects).join("|"),
    );

    if (!didOrderChange || !onReorderProjects) return;

    setIsSavingOrder(true);

    try {
      await onReorderProjects(projectIds(nextProjects));
      showOrderFeedback("saved", "הסדר נשמר");
    } catch {
      if (previousProjects) {
        latestOrderedProjectsRef.current = previousProjects;
        setOrderedProjects(previousProjects);
      }
      showOrderFeedback("error", "שמירת הסדר נכשלה. הסדר הקודם שוחזר.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const targetProjectId = event.over?.id ? String(event.over.id) : null;

    setDragOverProjectId(targetProjectId);

    await saveCurrentOrder();
    clearDragState();
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    if (orderBeforeDragRef.current) {
      latestOrderedProjectsRef.current = orderBeforeDragRef.current;
      setOrderedProjects(orderBeforeDragRef.current);
    }

    clearDragState();
  };

  const clearDragState = () => {
    setDraggedProjectId(null);
    setDragOverProjectId(null);
    orderBeforeDragRef.current = null;
  };

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
          {canSortProjects && (
            <div className="projects-sort-bar">
              <button
                className={isSortMode ? "ghost-button projects-sort-button is-active" : "ghost-button projects-sort-button"}
                type="button"
                aria-pressed={isSortMode}
                onClick={handleSortModeToggle}
                disabled={isSavingOrder}
              >
                <GripVertical size={18} />
                {isSortMode ? "סיום סידור" : "סידור פרויקטים"}
              </button>
              {orderFeedback && (
                <span
                  className={`projects-sort-feedback projects-sort-feedback--${orderFeedback.type}`}
                  role={orderFeedback.type === "error" ? "alert" : "status"}
                >
                  {orderFeedback.text}
                </span>
              )}
            </div>
          )}
        </section>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={projectIds(orderedProjects)} strategy={rectSortingStrategy}>
            <section
              className={isSortMode ? "projects-grid projects-grid--sorting" : "projects-grid"}
              aria-label="פרויקטים"
            >
              {orderedProjects.map((project) => (
                <SortableProjectCard
                  key={project.id}
                  project={project}
                  isSortMode={isSortMode}
                  canSortProjects={canSortProjects}
                  isDragging={draggedProjectId === project.id}
                  isDropTarget={dragOverProjectId === project.id && draggedProjectId !== project.id}
                  onClick={handleCardClick}
                />
              ))}
            </section>
          </SortableContext>
        </DndContext>

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

interface SortableProjectCardProps {
  project: Project;
  isSortMode: boolean;
  canSortProjects: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onClick: (projectId: string) => void;
}

function SortableProjectCard({
  project,
  isSortMode,
  canSortProjects,
  isDragging,
  isDropTarget,
  onClick,
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: project.id,
    disabled: !isSortMode || !canSortProjects,
  });
  const mainImage = getValidProjectMainImage(project);
  const cardClassName = [
    mainImage ? "project-card" : "project-card project-card--placeholder",
    isSortMode ? "project-card--sorting" : "",
    isDragging || isSortableDragging ? "project-card--dragging" : "",
    isDropTarget ? "project-card--drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const sortableProps = isSortMode && canSortProjects ? { ...attributes, ...listeners } : {};
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      className={cardClassName}
      style={style}
      type="button"
      data-project-id={project.id}
      aria-disabled={isSortMode}
      onClick={() => onClick(project.id)}
      {...sortableProps}
    >
      {isSortMode && (
        <span className="project-card__drag-handle" aria-hidden="true">
          <GripVertical size={20} />
        </span>
      )}
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
}

function getProjectSortOrder(project: Project) {
  const value = project.sortOrder ?? project.sort_order;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sortProjectsByOrder(projects: Project[]) {
  return [...projects].sort((a, b) => {
    const aOrder = getProjectSortOrder(a);
    const bOrder = getProjectSortOrder(b);

    if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
    if (aOrder !== null && bOrder === null) return -1;
    if (aOrder === null && bOrder !== null) return 1;

    return a.name.localeCompare(b.name, "he");
  });
}

function projectIds(projects: Project[]) {
  return projects.map((project) => project.id);
}
