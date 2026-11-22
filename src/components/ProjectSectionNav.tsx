import { Box, FileText, Home, Images, Landmark, ListChecks, MapPinned, Ruler } from "lucide-react";
import { useI18n } from "../i18n/LanguageContext";
import type { Screen } from "../types";

const sections = [
  { screen: "opening", icon: Landmark },
  { screen: "apartments", icon: Home },
  { screen: "prices", icon: FileText },
  { screen: "gallery", icon: Images },
  { screen: "plans", icon: Ruler },
  { screen: "technical", icon: ListChecks },
  { screen: "model3d", icon: Box },
  { screen: "location", icon: MapPinned },
] as const satisfies ReadonlyArray<{ screen: Screen; icon: unknown }>;

interface ProjectSectionNavProps {
  active: Screen;
  /** Sections that have content for this project, in display order. */
  visible: Screen[];
  onNavigate: (screen: Screen) => void;
}

export function ProjectSectionNav({ active, visible, onNavigate }: ProjectSectionNavProps) {
  const { t } = useI18n();
  return (
    <nav className="project-section-nav project-section-nav--tabs" aria-label={t("section.opening")}>
      {sections
        .filter((section) => visible.includes(section.screen))
        .map(({ screen, icon: Icon }) => (
          <button className={active === screen ? "active" : ""} key={screen} onClick={() => onNavigate(screen)} aria-current={active === screen}>
            <Icon size={17} strokeWidth={1.6} />
            {t(`section.${screen}`)}
          </button>
        ))}
    </nav>
  );
}
