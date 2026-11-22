import { Building2, LogOut } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../i18n/LanguageContext";

interface SideNavigationProps {
  userName?: string;
  onProjects: () => void;
  onSignOut?: () => void;
}

export function SideNavigation({ userName, onProjects, onSignOut }: SideNavigationProps) {
  const { t } = useI18n();
  return (
    <aside className="side-navigation" aria-label={t("nav.allProjects")}>
      <BrandLogo onClick={onProjects} />
      <nav className="side-navigation__menu">
        <button className="active" onClick={onProjects}>
          <Building2 size={24} strokeWidth={1.5} />
          {t("nav.allProjects")}
        </button>
      </nav>
      <div className="side-navigation__support">
        <LanguageSwitcher />
        {userName && <strong>{userName}</strong>}
        {onSignOut && (
          <button className="mini-button side-navigation__logout" onClick={onSignOut} type="button">
            <LogOut size={15} />
            {t("nav.signOut")}
          </button>
        )}
      </div>
    </aside>
  );
}
