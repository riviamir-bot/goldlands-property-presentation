import { ArrowLeft, ArrowRight, Building2, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ProjectLogoSlot } from "./ProjectLogoSlot";
import { useI18n } from "../i18n/LanguageContext";
import type { Project } from "../types";

interface AppShellProps {
  children: React.ReactNode;
  project?: Project;
  title: string;
  eyebrow?: string;
  notice?: React.ReactNode;
  /** Extra header controls (price toggle, client summary). */
  actions?: React.ReactNode;
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
  actions,
  onProjects,
  onBack,
  onNext,
  nextLabel,
  onSignOut,
}: AppShellProps) {
  const { t, dir } = useI18n();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="app-shell">
      <header className="topbar presentation-header">
        <div className="presentation-header__project">{project && <ProjectLogoSlot project={project} />}</div>
        <div className="presentation-header__brand">
          <BrandLogo compact onClick={onProjects} />
        </div>
        <nav className="topbar__actions presentation-header__actions" aria-label={t("nav.allProjects")}>
          {actions}
          <LanguageSwitcher />
          <button className="icon-button" onClick={onProjects} aria-label={t("nav.allProjects")} title={t("nav.allProjects")}>
            <Building2 size={20} />
          </button>
          {onSignOut && (
            <button className="icon-button" onClick={onSignOut} type="button" aria-label={t("nav.signOut")} title={t("nav.signOut")}>
              <LogOut size={18} />
            </button>
          )}
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

      <footer className="screen-controls" aria-label={t("nav.next")}>
        <button className="ghost-button" onClick={onBack} disabled={!onBack}>
          <BackIcon size={18} />
          {t("nav.back")}
        </button>
        <button className="gold-button" onClick={onNext} disabled={!onNext}>
          {nextLabel ?? t("nav.next")}
          <NextIcon size={18} />
        </button>
      </footer>
    </div>
  );
}
