import { ArrowLeft, ArrowRight, Building2, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { ProjectLogoSlot } from "./ProjectLogoSlot";
import type { Project } from "../types";

interface AppShellProps {
  children: React.ReactNode;
  project?: Project;
  title: string;
  eyebrow?: string;
  notice?: React.ReactNode;
  onProjects: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  onSignOut?: () => void;
}

export function AppShell({
  children,
  project,
  title,
  eyebrow,
  notice,
  onProjects,
  onBack,
  onNext,
  nextLabel = "המשך",
  onSignOut,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar presentation-header">
        <div className="presentation-header__project">{project && <ProjectLogoSlot project={project} />}</div>
        <div className="presentation-header__brand">
          <BrandLogo compact onClick={onProjects} />
        </div>
        <nav className="topbar__actions presentation-header__actions" aria-label="ניווט ראשי">
          {onSignOut && (
            <button className="ghost-button ghost-button--compact" onClick={onSignOut} type="button">
              <LogOut size={16} />
              התנתקות
            </button>
          )}
          <button className="ghost-button header-back-button" onClick={onBack} disabled={!onBack}>
            <ArrowRight size={18} />
            חזרה
          </button>
          <button className="icon-button" onClick={onProjects} aria-label="כל הפרויקטים">
            <Building2 size={20} />
          </button>
        </nav>
      </header>

      <main className="presentation-screen">
        {notice}
        <section className="screen-heading">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
        </section>
        {children}
      </main>

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
    </div>
  );
}
