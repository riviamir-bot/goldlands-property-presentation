import { ArrowLeft, ArrowRight, Building2, ClipboardList, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { ProjectLogoSlot } from "./ProjectLogoSlot";
import type { Project } from "../types";

interface AppShellProps {
  children: React.ReactNode;
  project?: Project;
  title: string;
  eyebrow?: string;
  onProjects: () => void;
  onReadiness: () => void;
  onAdmin: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  hideHeading?: boolean;
  hideFooter?: boolean;
}

export function AppShell({
  children,
  project,
  title,
  eyebrow,
  onProjects,
  onReadiness,
  onAdmin,
  onBack,
  onNext,
  nextLabel = "המשך",
  hideHeading = false,
  hideFooter = false,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar presentation-header">
        <div className="presentation-header__project">
          {project && <ProjectLogoSlot project={project} />}
        </div>
        <div className="presentation-header__brand">
          <BrandLogo compact onClick={onProjects} />
        </div>
        <nav className="topbar__actions presentation-header__actions" aria-label="ניווט ראשי">
          <button className="ghost-button header-back-button" onClick={onBack} disabled={!onBack}>
            <ArrowRight size={18} />
            חזרה
          </button>
          <button className="icon-button" onClick={onProjects} aria-label="כל הפרויקטים">
            <Building2 size={20} />
          </button>
          <button className="icon-button" onClick={onReadiness} aria-label="מוכנות פרויקטים">
            <ClipboardList size={20} />
          </button>
          <button className="icon-button" onClick={onAdmin} aria-label="ניהול">
            <LayoutDashboard size={20} />
          </button>
        </nav>
      </header>

      <main className="presentation-screen">
        {!hideHeading && (
          <section className="screen-heading">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1>{title}</h1>
          </section>
        )}
        {children}
      </main>

      {!hideFooter && (
        <footer className="screen-controls" aria-label="ניווט מסך">
          <button className="ghost-button" onClick={onBack} disabled={!onBack}>
            <ArrowRight size={18} />
            חזרה
          </button>
          <button className="gold-button" onClick={onNext} disabled={!onNext}>
            {nextLabel}
            <ArrowLeft size={18} />
          </button>
        </footer>
      )}
    </div>
  );
}
