import { Building2, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface SideNavigationProps {
  userName?: string;
  onProjects: () => void;
  onSignOut?: () => void;
}

export function SideNavigation({ userName, onProjects, onSignOut }: SideNavigationProps) {
  return (
    <aside className="side-navigation" aria-label="תפריט">
      <BrandLogo onClick={onProjects} />
      <nav className="side-navigation__menu">
        <button className="active" onClick={onProjects}>
          <Building2 size={24} strokeWidth={1.5} />
          כל הפרויקטים
        </button>
      </nav>
      <div className="side-navigation__support">
        {userName && <strong>{userName}</strong>}
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
