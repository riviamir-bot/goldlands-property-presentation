import { Building2, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface SideNavigationProps {
  active: "projects" | "readiness" | "admin";
  onProjects: () => void;
  onReadiness: () => void;
  onAdmin: () => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  authModeLabel?: string;
  onSignOut?: () => void;
}

export function SideNavigation({
  active,
  onProjects,
  onReadiness,
  onAdmin,
  canViewReadiness = true,
  canManageProjects = true,
  authModeLabel,
  onSignOut,
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
        <strong>{authModeLabel ?? "צוות מכירות"}</strong>
        <span>תצוגת חומרים פנימית</span>
        {onSignOut && (
          <button className="mini-button side-navigation__logout" onClick={onSignOut} type="button">
            <LogOut size={15} />
            התנתקות
          </button>
        )}
      </div>
    </aside>
  );
}
