import { Building2, ClipboardList, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface SideNavigationProps {
  active: "projects" | "readiness" | "admin";
  onProjects: () => void;
  onReadiness: () => void;
  onAdmin: () => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
}

export function SideNavigation({
  active,
  onProjects,
  onReadiness,
  onAdmin,
  canViewReadiness = true,
  canManageProjects = true,
}: SideNavigationProps) {
  return (
    <aside className="side-navigation" aria-label="תפריט פנימי">
      <BrandLogo onClick={onProjects} />
      <nav className="side-navigation__menu">
        <button className={active === "projects" ? "active" : ""} onClick={onProjects}>
          <Building2 size={24} strokeWidth={1.5} />
          כל הפרויקטים
        </button>
        {canViewReadiness && (
          <button className={active === "readiness" ? "active" : ""} onClick={onReadiness}>
            <ClipboardList size={24} strokeWidth={1.5} />
            חוסרים / מוכנות פרויקטים
          </button>
        )}
        {canManageProjects && (
          <button className={active === "admin" ? "active" : ""} onClick={onAdmin}>
            <LayoutDashboard size={24} strokeWidth={1.5} />
            ניהול פרויקטים
          </button>
        )}
      </nav>
      <div className="side-navigation__support">
        <strong>צוות מכירות</strong>
        <span>תצוגת חומרים פנימית</span>
      </div>
    </aside>
  );
}
