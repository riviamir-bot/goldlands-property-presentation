import { ArrowLeft, ArrowRight, Building2, ClipboardList, LayoutDashboard, LogOut, Send } from "lucide-react";
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
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  onClientShare?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  hideHeading?: boolean;
  hideFooter?: boolean;
  authModeLabel?: string;
  onSignOut?: () => void;
}

export function AppShell({
  children,
  project,
  title,
  eyebrow,
  onProjects,
  onReadiness,
  onAdmin,
  canViewReadiness = true,
  canManageProjects = true,
  onClientShare,
  onBack,
  onNext,
  nextLabel = "המשך",
  hideHeading = false,
  hideFooter = false,
  authModeLabel,
  onSignOut,
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
          {onSignOut && (
            <div className="auth-status-chip">
              {authModeLabel && <span>{authModeLabel}</span>}
              <button className="ghost-button ghost-button--compact" onClick={onSignOut} type="button">
                <LogOut size={16} />
                התנתקות
              </button>
            </div>
          )}
          <button className="ghost-button header-back-button" onClick={onBack} disabled={!onBack}>
            <ArrowRight size={18} />
            חזרה
          </button>
          {onClientShare && (
            <button className="gold-button gold-button--compact client-share-button" onClick={onClientShare}>
              <Send size={16} />
              שליחה ללקוח
            </button>
          )}
          <button className="icon-button" onClick={onProjects} aria-label="כל הפרויקטים">
            <Building2 size={20} />
          </button>
          {canViewReadiness && (
            <button className="icon-button" onClick={onReadiness} aria-label="חוסרים / מוכנות פרויקטים">
              <ClipboardList size={20} />
            </button>
          )}
          {canManageProjects && (
            <button className="icon-button" onClick={onAdmin} aria-label="ניהול פרויקטים">
              <LayoutDashboard size={20} />
            </button>
          )}
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
