import {
  AirVent,
  Building2,
  ChefHat,
  DoorOpen,
  Layers3,
  Lightbulb,
  Ruler,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { TechnicalSpecSectionData } from "../types";

export interface TechnicalSpecSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: string[];
}

export const defaultOverviewSpecIds = ["structure", "apartment", "kitchen"];

export const technicalSpecSections: TechnicalSpecSection[] = [
  {
    id: "structure",
    title: "שלד ובנייה",
    icon: Layers3,
    items: ["בנייה מתקדמת לפי תקן ישראלי", "בידוד תרמי ואקוסטי משופר", "חזיתות איכותיות בתכנון אדריכלי מוקפד"],
  },
  {
    id: "lobby",
    title: "לובי וכניסה",
    icon: DoorOpen,
    items: ["לובי מעוצב בגובה מרשים", "חיפויי קיר ותאורה אדריכלית", "אזור המתנה יוקרתי לדיירים ולאורחים"],
  },
  {
    id: "apartment",
    title: "דירה",
    icon: Shield,
    items: ["דלת ביטחון איכותית", "תכנון פנים מרווח ובהיר", "חלונות בידוד כפול לשקט ונוחות"],
  },
  {
    id: "kitchen",
    title: "מטבח",
    icon: ChefHat,
    items: ["ארונות מטבח מסדרת פרימיום", "משטח עבודה איכותי", "הכנות מלאות למכשירי חשמל מובנים"],
  },
  {
    id: "climate",
    title: "מיזוג",
    icon: AirVent,
    items: ["הכנה למערכת מיני מרכזית", "תכנון נסתר להנמכות גבס", "אפשרות לשליטה אזורית בהתאם למפרט"],
  },
  {
    id: "electric",
    title: "חשמל וחכם",
    icon: Lightbulb,
    items: ["נקודות חשמל ותקשורת בפריסה רחבה", "הכנה לתשתית בית חכם", "תאורת אווירה באזורים מרכזיים"],
  },
  {
    id: "flooring",
    title: "ריצוף",
    icon: Ruler,
    items: ["ריצוף גרניט פורצלן במידות גדולות", "בחירת גוונים מתוך קולקציה יוקרתית", "ריצוף מותאם במרפסות ובחדרים רטובים"],
  },
  {
    id: "aluminum",
    title: "אלומיניום",
    icon: Building2,
    items: ["פרופילי אלומיניום איכותיים", "זכוכית בידודית במפתחים מרכזיים", "פתחים גדולים לכניסת אור טבעי"],
  },
  {
    id: "parking",
    title: "חניה ומחסן",
    icon: Building2,
    items: ["חניה פרטית בהתאם לדירה", "מחסן לדירות נבחרות", "גישה נוחה ומוארת לחניון"],
  },
  {
    id: "common",
    title: "שטחים משותפים",
    icon: DoorOpen,
    items: ["פיתוח סביבתי מוקפד", "תאורה אדריכלית בשטחים הציבוריים", "תחזוקה ותכנון מותאמים לחוויית מגורים יוקרתית"],
  },
];

interface TechnicalSpecAccordionProps {
  defaultOpenIds?: string[];
  variant?: "overview" | "screen";
  sections?: TechnicalSpecSectionData[];
}

const technicalIconMap: Record<string, LucideIcon> = {
  structure: Layers3,
  lobby: DoorOpen,
  apartment: Shield,
  kitchen: ChefHat,
  climate: AirVent,
  electric: Lightbulb,
  bathrooms: Ruler,
  balcony: Building2,
  other: Building2,
};

export function TechnicalSpecAccordion({
  defaultOpenIds = defaultOverviewSpecIds,
  variant = "overview",
  sections,
}: TechnicalSpecAccordionProps) {
  const visibleSections = sections?.map((section) => ({
    ...section,
    icon: technicalIconMap[section.id] ?? Building2,
  })) ?? technicalSpecSections;

  return (
    <div className={`technical-accordion technical-accordion--${variant}`}>
      {visibleSections.map((section) => {
        const Icon = section.icon;

        return (
          <details
            className="technical-accordion__item"
            key={section.id}
            open={defaultOpenIds.includes(section.id)}
          >
            <summary>
              <span className="technical-accordion__icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <strong>{section.title}</strong>
            </summary>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
