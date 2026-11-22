import {
  Building2,
  FileText,
  Home,
  Images,
  Landmark,
  ListChecks,
  MapPinned,
  Ruler,
} from "lucide-react";
import { SectionButton } from "./SectionButton";
import type { Screen } from "../types";

const sections = [
  { title: "תצוגת פרויקט", screen: "opening", icon: Landmark },
  { title: "דירות פנויות", screen: "apartments", icon: Home },
  { title: "מחירון", screen: "prices", icon: FileText },
  { title: "הדמיות", screen: "gallery", icon: Images },
  { title: "תוכניות דירה", screen: "plans", icon: Ruler },
  { title: "מפרט טכני", screen: "technical", icon: ListChecks },
  { title: "מיקום וסביבה", screen: "location", icon: MapPinned },
] satisfies Array<{
  title: string;
  screen: Screen;
  icon: typeof Building2;
}>;

interface ProjectSectionNavProps {
  active: Screen;
  /** Sections that have content for this project, in display order. */
  visible: Screen[];
  onNavigate: (screen: Screen) => void;
  variant?: "grid" | "tabs";
}

export function ProjectSectionNav({
  active,
  visible,
  onNavigate,
  variant = "tabs",
}: ProjectSectionNavProps) {
  return (
    <nav
      className={`project-section-nav project-section-nav--${variant}`}
      aria-label="ניווט פרקי פרויקט"
    >
      {sections.filter((section) => visible.includes(section.screen)).map((section) => {
        if (variant === "grid") {
          return (
            <SectionButton
              key={section.screen}
              title={section.title}
              icon={section.icon}
              onClick={() => onNavigate(section.screen)}
            />
          );
        }

        const Icon = section.icon;

        return (
          <button
            className={active === section.screen ? "active" : ""}
            key={section.screen}
            onClick={() => onNavigate(section.screen)}
          >
            <Icon size={17} strokeWidth={1.6} />
            {section.title}
          </button>
        );
      })}
    </nav>
  );
}
