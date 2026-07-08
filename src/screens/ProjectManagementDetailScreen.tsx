import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BadgeHelp,
  Building2,
  FileImage,
  FileText,
  Images,
  LayoutList,
  MapPinned,
  PencilLine,
  Presentation,
  Ruler,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { SideNavigation } from "../components/SideNavigation";
import { StatusBadge } from "../components/StatusBadge";
import {
  uploadProjectFile,
  type ProjectFileCategory,
  type ProjectFileRecord,
} from "../services/storageService";
import { formatPrice } from "../utils/format";
import type { Apartment, ApartmentStatus, GalleryCategory, Project, ProjectReadiness } from "../types";

interface ProjectManagementDetailScreenProps {
  project: Project;
  apartments: Apartment[];
  readiness?: ProjectReadiness;
  onProjects: () => void;
  onReadiness: () => void;
  onAdmin: () => void;
  onOpenProject: (projectId: string) => void;
  onUpdateProject: (
    projectId: string,
    patch: Partial<Project>,
    readinessPatch?: Partial<ProjectReadiness>,
  ) => void;
  onUpdateApartment: (
    projectId: string,
    apartmentId: string,
    patch: Partial<Apartment>,
  ) => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
}

type SectionStatus = "missing" | "partial" | "complete";
type SectionKind = "data" | "file" | "mixed";
type PanelMode = "manual" | "upload" | "preview";

interface ManualField {
  label: string;
  value: string;
  name?: string;
  multiline?: boolean;
  options?: Array<{ label: string; value: string }>;
}

interface MaterialSection {
  id: string;
  title: string;
  icon: LucideIcon;
  kind: SectionKind;
  status: SectionStatus;
  summary: string;
  lastUpdated?: string;
  fields: ManualField[];
}

interface ProjectDetailsFormState {
  name: string;
  city: string;
  address: string;
  neighborhood: string;
  marketingStatus: string;
  projectType: string;
  projectLogo: string;
  mainImage: string;
  tagline: string;
  description: string;
  existingApartments: string;
  newApartments: string;
  buildings: string;
  floors: string;
  threeRooms: string;
  fourRooms: string;
  fiveRooms: string;
  gardenApartments: string;
  penthouses: string;
  parking: string;
  storage: string;
  occupancy: string;
  googleMapsUrl: string;
}

type ProjectDetailsFieldName = keyof ProjectDetailsFormState;

interface ProjectDetailField {
  label: string;
  name: ProjectDetailsFieldName;
  value: string;
  multiline?: boolean;
  options?: Array<{ label: string; value: string }>;
  wide?: boolean;
  dir?: "rtl" | "ltr";
  placeholder?: string;
}

interface ApartmentInventoryFormState {
  number: string;
  floor: string;
  rooms: string;
  apartmentArea: string;
  balconyArea: string;
  gardenArea: string;
  parking: string;
  storage: string;
  direction: string;
  price: string;
  specialPrice: string;
  status: ApartmentStatus;
  planAttached: "yes" | "no";
  notes: string;
}

type ApartmentInventoryFieldName = keyof ApartmentInventoryFormState;

const statusLabels: Record<SectionStatus, string> = {
  missing: "חסר",
  partial: "חלקי",
  complete: "הושלם",
};

const apartmentStatusOptions: Array<{ label: string; value: ApartmentStatus }> = [
  { label: "פנויה", value: "available" },
  { label: "באופציה", value: "option" },
  { label: "שמורה", value: "reserved" },
  { label: "נמכרה", value: "sold" },
  { label: "לא לשיווק", value: "notMarketing" },
];

const projectTypeOptions: Project["projectType"][] = [
  "פרויקט חדש",
  "תמ״א 38/1",
  "תמ״א 38/2 / פינוי בינוי",
];

const imageUploadAccept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const documentUploadAccept = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx";

interface UploadSectionConfig {
  category: ProjectFileCategory;
  accept: string;
  multiple: boolean;
  needsApartment?: boolean;
}

const uploadSectionConfigs: Partial<Record<string, UploadSectionConfig>> = {
  logo: {
    category: "logo",
    accept: imageUploadAccept,
    multiple: false,
  },
  "main-image": {
    category: "main",
    accept: imageUploadAccept,
    multiple: false,
  },
  exterior: {
    category: "exterior",
    accept: imageUploadAccept,
    multiple: true,
  },
  interior: {
    category: "interior",
    accept: imageUploadAccept,
    multiple: true,
  },
  plans: {
    category: "apartment_plan",
    accept: documentUploadAccept,
    multiple: true,
    needsApartment: true,
  },
  "floor-plans": {
    category: "floor_plan",
    accept: documentUploadAccept,
    multiple: true,
  },
  prices: {
    category: "price_list",
    accept: documentUploadAccept,
    multiple: true,
  },
  technical: {
    category: "technical_spec",
    accept: documentUploadAccept,
    multiple: true,
  },
  documents: {
    category: "brochure",
    accept: documentUploadAccept,
    multiple: true,
  },
};

function isGalleryCategory(category: ProjectFileCategory): category is GalleryCategory {
  return (
    category === "exterior" ||
    category === "interior" ||
    category === "lobby" ||
    category === "surroundings"
  );
}

function makeLogoMark(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function makeMapsUrl(address: string, city: string) {
  const query = address.includes(city) ? address : `${address} ${city}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  ).replace(/%20/g, "+")}`;
}

function makeMapsEmbedUrl(address: string, city: string) {
  const query = address.includes(city) ? address : `${address} ${city}`;

  return `https://www.google.com/maps?q=${encodeURIComponent(query).replace(/%20/g, "+")}&output=embed`;
}

function getFormValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNumberFromString(value: string) {
  const raw = value.replace(/[^\d.-]/g, "");

  return Number(raw) || 0;
}

function makeProjectDetailsFormState(
  project: Project,
  readiness?: ProjectReadiness,
): ProjectDetailsFormState {
  return {
    name: project.name,
    city: readiness?.city ?? project.city,
    address: project.address,
    neighborhood: project.neighborhood,
    marketingStatus: readiness?.marketingStatus ?? "טיוטה",
    projectType: project.projectType,
    projectLogo: project.projectLogo ?? "",
    mainImage: project.mainImage ?? project.heroImage,
    tagline: project.tagline,
    description: project.description,
    existingApartments: project.stats.existingApartments,
    newApartments: project.stats.newApartments,
    buildings: project.stats.buildings,
    floors: project.stats.floors,
    threeRooms: project.apartmentMix.threeRooms,
    fourRooms: project.apartmentMix.fourRooms,
    fiveRooms: project.apartmentMix.fiveRooms,
    gardenApartments: project.apartmentMix.gardenApartments,
    penthouses: project.apartmentMix.penthouses,
    parking: project.stats.parking,
    storage: project.stats.storage,
    occupancy: project.stats.occupancy,
    googleMapsUrl: project.googleMapsUrl,
  };
}

function makeApartmentInventoryFormState(apartment?: Apartment): ApartmentInventoryFormState {
  return {
    number: apartment?.number ?? "",
    floor: apartment ? String(apartment.floor) : "",
    rooms: apartment ? String(apartment.rooms) : "",
    apartmentArea: apartment ? String(apartment.apartmentArea) : "",
    balconyArea: apartment ? String(apartment.balconyArea) : "",
    gardenArea: apartment ? String(apartment.gardenArea) : "0",
    parking: apartment?.parking ?? "",
    storage: apartment?.storage ?? "",
    direction: apartment?.direction ?? "",
    price: apartment ? String(apartment.price) : "",
    specialPrice: apartment ? String(apartment.specialPrice) : "",
    status: apartment?.status ?? "available",
    planAttached: apartment?.planAttached ? "yes" : "no",
    notes: apartment?.notes ?? "",
  };
}

const materialBlueprints = [
  {
    id: "details",
    title: "פרטי פרויקט",
    icon: Building2,
    kind: "data",
    status: "complete",
    summary: "שם, עיר, סטטוס ושורת שיווק מוכנים לעריכה.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "logo",
    title: "לוגו פרויקט",
    icon: Presentation,
    kind: "file",
    status: "missing",
    summary: "מקום שמור ללוגו הפרויקט, ללא קובץ אמיתי כרגע.",
    lastUpdated: "לא עודכן",
  },
  {
    id: "main-image",
    title: "תמונה ראשית",
    icon: FileImage,
    kind: "file",
    status: "complete",
    summary: "הדמיה ראשית לדמו קיימת במערכת.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "exterior",
    title: "הדמיות חוץ",
    icon: Images,
    kind: "file",
    status: "partial",
    summary: "3 הדמיות חוץ לדמו, נדרש סט סופי.",
    lastUpdated: "02/07/2026",
  },
  {
    id: "interior",
    title: "הדמיות פנים",
    icon: Images,
    kind: "file",
    status: "partial",
    summary: "2 הדמיות פנים לדמו, חסרות הדמיות חדרים.",
    lastUpdated: "01/07/2026",
  },
  {
    id: "inventory",
    title: "דירות ומלאי",
    icon: LayoutList,
    kind: "data",
    status: "complete",
    summary: "מקור הנתונים לדירות פנויות, מחירון ותוכניות דירה.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "plans",
    title: "תוכניות דירה",
    icon: Ruler,
    kind: "file",
    status: "partial",
    summary: "קבצי תוכנית לפי מספר דירה, כולל שיוך מתוך ניהול דירות.",
    lastUpdated: "02/07/2026",
  },
  {
    id: "floor-plans",
    title: "תוכניות קומה",
    icon: LayoutList,
    kind: "file",
    status: "missing",
    summary: "תוכניות הקומה יתווספו בהמשך.",
    lastUpdated: "לא עודכן",
  },
  {
    id: "prices",
    title: "מחירון",
    icon: FileText,
    kind: "data",
    status: "partial",
    summary: "מחירי דמו קיימים, תאריך עדכון ומחירים לעריכה.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "technical",
    title: "מפרט טכני",
    icon: PencilLine,
    kind: "data",
    status: "partial",
    summary: "סעיפי מפרט מרכזיים מוכנים כטקסט דמו.",
    lastUpdated: "01/07/2026",
  },
  {
    id: "location",
    title: "מיקום וסביבה",
    icon: MapPinned,
    kind: "data",
    status: "partial",
    summary: "סביבת הפרויקט ויתרונות מיקום לעריכה ידנית.",
    lastUpdated: "30/06/2026",
  },
  {
    id: "faq",
    title: "שאלות נפוצות",
    icon: BadgeHelp,
    kind: "data",
    status: "missing",
    summary: "רשימת שאלות ותשובות תוזן ידנית.",
    lastUpdated: "לא עודכן",
  },
  {
    id: "documents",
    title: "מסמכים וברושורים",
    icon: FileText,
    kind: "file",
    status: "missing",
    summary: "ברושור, מצגת מכירה וחומרי עזר יתווספו בהמשך.",
    lastUpdated: "לא עודכן",
  },
] satisfies Array<Omit<MaterialSection, "fields">>;

const fileMetadataFields: ManualField[] = [
  { label: "שם תצוגה", value: "חומר פרויקט" },
  { label: "תיאור קצר", value: "תיאור שיופיע לצד החומר במצגת", multiline: true },
  { label: "הערות פנימיות", value: "הערות לצוות המכירות", multiline: true },
];

export function ProjectManagementDetailScreen({
  project,
  apartments,
  readiness,
  onProjects,
  onReadiness,
  onAdmin,
  onOpenProject,
  onUpdateProject,
  onUpdateApartment,
  canViewReadiness = true,
  canManageProjects = true,
}: ProjectManagementDetailScreenProps) {
  const [activePanel, setActivePanel] = useState<{ id: string; mode: PanelMode } | null>(null);
  const [selectedInventoryApartmentId, setSelectedInventoryApartmentId] = useState<string | null>(
    null,
  );
  const [projectDetailsForm, setProjectDetailsForm] = useState<ProjectDetailsFormState>(() =>
    makeProjectDetailsFormState(project, readiness),
  );
  const [apartmentInventoryForm, setApartmentInventoryForm] =
    useState<ApartmentInventoryFormState>(() => makeApartmentInventoryFormState(apartments[0]));
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadApartmentId, setUploadApartmentId] = useState(apartments[0]?.id ?? "");
  const [uploadedSectionCounts, setUploadedSectionCounts] = useState<Record<string, number>>({});

  const materialSections = useMemo<MaterialSection[]>(() => {
    const city = readiness?.city ?? project.city;
    const apartment = apartments[0];

    const manualFields: Record<string, ManualField[]> = {
      details: [
        { label: "שם פרויקט", value: project.name },
        { label: "עיר", value: city },
        { label: "כתובת", value: project.address },
        { label: "שכונה", value: project.neighborhood },
        { label: "סוג פרויקט", value: project.projectType },
        { label: "לוגו פרויקט", value: project.projectLogo || "טרם הוגדר" },
        { label: "תמונה ראשית", value: project.mainImage || project.heroImage || "טרם הוגדרה" },
        { label: "סטטוס שיווקי", value: readiness?.marketingStatus ?? "פעיל" },
        { label: "משפט שיווקי קצר", value: project.tagline },
        {
          label: "תיאור פרויקט",
          value: "חווית מגורים יוקרתית עם תכנון מוקפד, חללים פתוחים ומפרט פרימיום.",
          multiline: true,
        },
        { label: "מספר בניינים", value: project.stats.buildings },
        { label: "מספר קומות", value: project.stats.floors },
        { label: "דירות קיימות", value: project.stats.existingApartments },
        { label: "דירות חדשות", value: project.stats.newApartments },
        { label: "צפי אכלוס", value: project.stats.occupancy },
      ],
      logo: [
        { label: "projectLogo URL / path", value: project.projectLogo },
        {
          label: "הערת דמו",
          value: "בהמשך כאן יועלה לוגו הפרויקט שיופיע בכרטיס הפרויקט ובכל מסכי התצוגה.",
          multiline: true,
        },
      ],
      "main-image": [
        {
          label: "mainImage URL / path",
          value: project.mainImage ?? project.heroImage,
          name: "mainImage",
        },
        {
          label: "הערת דמו",
          value: "שדה מקומי לתמונה הראשית שמופיעה בכרטיס הפרויקט, בפתיחת הפרויקט ובתצוגת הלקוח.",
          multiline: true,
        },
      ],
      inventory: [
        { label: "מספר דירה", value: apartment?.number ?? "401" },
        { label: "קומה", value: String(apartment?.floor ?? 4) },
        { label: "חדרים", value: String(apartment?.rooms ?? 4) },
        { label: "שטח דירה", value: `${apartment?.apartmentArea ?? 102} מ״ר` },
        { label: "שטח מרפסת", value: `${apartment?.balconyArea ?? 12} מ״ר` },
        { label: "שטח גינה", value: apartment?.gardenArea ? `${apartment.gardenArea} מ״ר` : "לא רלוונטי" },
        { label: "חניה", value: apartment?.parking ?? "חניה אחת" },
        { label: "מחסן", value: apartment?.storage ?? "מחסן 4 מ״ר" },
        { label: "כיוון", value: apartment?.direction ?? "צפון מערב" },
        { label: "מחיר", value: apartment ? formatPrice(apartment.price) : "₪ 3,450,000" },
        { label: "מחיר מיוחד", value: apartment ? formatPrice(apartment.specialPrice) : "₪ 3,250,000" },
        { label: "סטטוס", value: "פנויה / באופציה / שמורה / נמכרה / לא לשיווק" },
        { label: "קובץ תוכנית מצורף", value: apartment?.planAttached ? "כן" : "לא" },
        { label: "הערות", value: apartment?.notes ?? "תוכנית דירה זמינה לדמו", multiline: true },
      ],
      prices: [
        { label: "שורת מחיר ידנית", value: "דירה 12 | 4 חדרים | 102 מ״ר" },
        { label: "מחיר ללקוח", value: "₪ 3,450,000" },
        { label: "מחיר מיוחד", value: "₪ 3,190,000" },
        { label: "הערות", value: "מחיר השקה מוגבל בזמן", multiline: true },
        { label: "תאריך עדכון אחרון", value: readiness?.lastUpdated ?? "06/06/2024" },
      ],
      technical: [
        { label: "מטבח", value: "מטבח מעוצב כולל משטחי עבודה איכותיים", multiline: true },
        { label: "ריצוף", value: "ריצוף גרניט פורצלן 80/80 בחללים המרכזיים", multiline: true },
        { label: "מיזוג", value: "הכנה למיזוג מיני מרכזי", multiline: true },
        { label: "אלומיניום", value: "פרופילי אלומיניום בגוון כהה וזכוכית בידודית", multiline: true },
        { label: "דלתות", value: "דלת כניסה מעוצבת ודלתות פנים איכותיות", multiline: true },
        { label: "חשמל", value: "נקודות חשמל ותקשורת לפי מפרט מכר", multiline: true },
        { label: "אינסטלציה", value: "כלים סניטריים וברזים מסדרות מובילות", multiline: true },
        { label: "חניה", value: "חניה פרטית בהתאם לדירה", multiline: true },
        { label: "מחסן", value: "מחסן צמוד לחלק מהדירות", multiline: true },
        { label: "שטחים משותפים", value: "לובי מעוצב, פיתוח סביבתי ותאורה אדריכלית", multiline: true },
      ],
      location: [
        { label: "כתובת", value: project.address },
        { label: "תיאור שכונה", value: "שכונה מתפתחת עם נגישות גבוהה למרכזי תעסוקה ופנאי.", multiline: true },
        { label: "בתי ספר קרובים", value: "בית ספר יסודי, חטיבה ותיכון במרחק הליכה", multiline: true },
        { label: "תחבורה", value: "גישה לצירי תנועה ראשיים וקווי תחבורה ציבורית", multiline: true },
        { label: "פארקים", value: "פארק שכונתי וגינות ציבוריות סמוכות", multiline: true },
        { label: "מרכזים מסחריים", value: "מרכז קניות, בתי קפה ושירותים יומיומיים", multiline: true },
        { label: "יתרונות מיקום", value: "שקט מגורים לצד קרבה למרכז העיר", multiline: true },
      ],
      faq: [
        { label: "שאלה", value: "מהו מועד האכלוס המשוער?" },
        { label: "תשובה", value: `האכלוס המשוער הוא ${project.stats.occupancy}.`, multiline: true },
      ],
    };

    return materialBlueprints.map((section) => {
      const uploadedCount = Math.max(
        uploadedSectionCounts[section.id] ?? 0,
        project.materialFileCounts?.[section.id] ?? 0,
      );

      if (section.id === "logo") {
        return {
          ...section,
          status: project.projectLogo ? "complete" : "missing",
          summary: project.projectLogo
            ? "לוגו פרויקט הוגדר ונשמר מקומית."
            : "מקום שמור ללוגו הפרויקט, ללא קובץ אמיתי כרגע.",
          lastUpdated: project.projectLogo ? readiness?.lastUpdated ?? "עודכן מקומית" : "לא עודכן",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      if (section.id === "main-image") {
        return {
          ...section,
          status: project.mainImage ? "complete" : "missing",
          summary: project.mainImage
            ? "תמונה ראשית הוגדרה ונשמרת מקומית."
            : "מקום שמור לתמונה הראשית של הפרויקט.",
          lastUpdated: project.mainImage ? readiness?.lastUpdated ?? "עודכן מקומית" : "לא עודכן",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      if (uploadedCount > 0) {
        return {
          ...section,
          status: "complete",
          summary: `${uploadedCount} קבצים הועלו בהצלחה.`,
          lastUpdated: "עודכן כעת",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      return {
        ...section,
        lastUpdated: section.lastUpdated ?? readiness?.lastUpdated ?? "לא עודכן",
        fields: manualFields[section.id] ?? fileMetadataFields,
      };
    });
  }, [apartments, project, readiness, uploadedSectionCounts]);

  const panelSection = activePanel
    ? materialSections.find((section) => section.id === activePanel.id)
    : undefined;
  const activeSaveFormId =
    activePanel?.mode === "manual" && panelSection?.id === "details"
      ? "project-details-form"
      : activePanel?.mode === "manual" && panelSection?.id === "inventory"
        ? "inventory-detail-form"
        : activePanel?.mode === "manual" && panelSection?.id === "logo"
          ? "project-logo-form"
          : activePanel?.mode === "manual" && panelSection?.id === "main-image"
            ? "project-main-image-form"
            : undefined;
  const activeUploadConfig = activePanel ? uploadSectionConfigs[activePanel.id] : undefined;
  const isUploadPanel = activePanel?.mode === "upload";
  const projectDetailFields: ProjectDetailField[] = [
    { label: "שם פרויקט", name: "name", value: projectDetailsForm.name },
    { label: "עיר", name: "city", value: projectDetailsForm.city },
    { label: "כתובת", name: "address", value: projectDetailsForm.address },
    { label: "שכונה", name: "neighborhood", value: projectDetailsForm.neighborhood },
    {
      label: "סטטוס שיווקי",
      name: "marketingStatus",
      value: projectDetailsForm.marketingStatus,
    },
    {
      label: "סוג פרויקט",
      name: "projectType",
      value: projectDetailsForm.projectType,
      options: projectTypeOptions.map((value) => ({ label: value, value })),
    },
    {
      label: "projectLogo URL / path",
      name: "projectLogo",
      value: projectDetailsForm.projectLogo,
      wide: true,
      dir: "ltr",
      placeholder: "לדוגמה: /assets/project-logo.png או URL דמו",
    },
    {
      label: "mainImage URL / path",
      name: "mainImage",
      value: projectDetailsForm.mainImage,
      wide: true,
      dir: "ltr",
      placeholder: "לדוגמה: /assets/main-rendering.png או URL דמו",
    },
    { label: "משפט שיווקי קצר", name: "tagline", value: projectDetailsForm.tagline, multiline: true },
    { label: "תיאור פרויקט", name: "description", value: projectDetailsForm.description, multiline: true },
    { label: "דירות קיימות", name: "existingApartments", value: projectDetailsForm.existingApartments },
    { label: "דירות חדשות", name: "newApartments", value: projectDetailsForm.newApartments },
    { label: "מספר בניינים", name: "buildings", value: projectDetailsForm.buildings },
    { label: "מספר קומות", name: "floors", value: projectDetailsForm.floors },
    { label: "3 חדרים", name: "threeRooms", value: projectDetailsForm.threeRooms },
    { label: "4 חדרים", name: "fourRooms", value: projectDetailsForm.fourRooms },
    { label: "5 חדרים", name: "fiveRooms", value: projectDetailsForm.fiveRooms },
    { label: "דירות גן", name: "gardenApartments", value: projectDetailsForm.gardenApartments },
    { label: "פנטהאוזים", name: "penthouses", value: projectDetailsForm.penthouses },
    { label: "חניה", name: "parking", value: projectDetailsForm.parking },
    { label: "מחסן", name: "storage", value: projectDetailsForm.storage },
    { label: "צפי אכלוס", name: "occupancy", value: projectDetailsForm.occupancy },
    {
      label: "Google Maps URL",
      name: "googleMapsUrl",
      value: projectDetailsForm.googleMapsUrl,
      wide: true,
      dir: "ltr",
    },
  ];
  const selectedInventoryApartment =
    apartments.find((apartment) => apartment.id === selectedInventoryApartmentId) ?? apartments[0];
  const selectedInventoryFields: ManualField[] = selectedInventoryApartment
    ? [
        { label: "מספר דירה", name: "number", value: apartmentInventoryForm.number },
        { label: "קומה", name: "floor", value: apartmentInventoryForm.floor },
        { label: "חדרים", name: "rooms", value: apartmentInventoryForm.rooms },
        { label: "שטח דירה", name: "apartmentArea", value: apartmentInventoryForm.apartmentArea },
        { label: "שטח מרפסת", name: "balconyArea", value: apartmentInventoryForm.balconyArea },
        { label: "שטח גינה", name: "gardenArea", value: apartmentInventoryForm.gardenArea },
        { label: "חניה", name: "parking", value: apartmentInventoryForm.parking },
        { label: "מחסן", name: "storage", value: apartmentInventoryForm.storage },
        { label: "כיוון", name: "direction", value: apartmentInventoryForm.direction },
        { label: "מחיר", name: "price", value: apartmentInventoryForm.price },
        { label: "מחיר מיוחד", name: "specialPrice", value: apartmentInventoryForm.specialPrice },
        {
          label: "סטטוס",
          name: "status",
          value: apartmentInventoryForm.status,
          options: apartmentStatusOptions,
        },
        {
          label: "קובץ תוכנית מצורף",
          name: "planAttached",
          value: apartmentInventoryForm.planAttached,
          options: [
            { label: "כן", value: "yes" },
            { label: "לא", value: "no" },
          ],
        },
        { label: "הערות", name: "notes", value: apartmentInventoryForm.notes, multiline: true },
      ]
    : [];

  useEffect(() => {
    setApartmentInventoryForm(makeApartmentInventoryFormState(selectedInventoryApartment));
  }, [selectedInventoryApartment]);

  useEffect(() => {
    if (!apartments.length) {
      setUploadApartmentId("");
      return;
    }

    if (!apartments.some((apartment) => apartment.id === uploadApartmentId)) {
      setUploadApartmentId(apartments[0].id);
    }
  }, [apartments, uploadApartmentId]);

  const handleProjectDetailsFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const fieldName = event.currentTarget.name as ProjectDetailsFieldName;
    const { value } = event.currentTarget;

    setProjectDetailsForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const handleApartmentFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const fieldName = event.currentTarget.name as ApartmentInventoryFieldName;
    const { value } = event.currentTarget;

    setApartmentInventoryForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const openPanel = (id: string, mode: PanelMode) => {
    if ((id === "details" || id === "logo" || id === "main-image") && mode === "manual") {
      setProjectDetailsForm(makeProjectDetailsFormState(project, readiness));
    }
    if (id === "inventory" && !selectedInventoryApartmentId) {
      setSelectedInventoryApartmentId(apartments[0]?.id ?? null);
    }
    if (mode === "upload") {
      setSelectedUploadFiles([]);
      setUploadError("");
      setIsUploading(false);

      if (uploadSectionConfigs[id]?.needsApartment) {
        setUploadApartmentId(selectedInventoryApartmentId ?? apartments[0]?.id ?? "");
      }
    }
    setSuccessMessage("");
    setActivePanel({ id, mode });
  };

  const handleProjectDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values: ProjectDetailsFormState = {
      name: projectDetailsForm.name.trim(),
      city: projectDetailsForm.city.trim(),
      address: projectDetailsForm.address.trim(),
      neighborhood: projectDetailsForm.neighborhood.trim(),
      marketingStatus: projectDetailsForm.marketingStatus.trim(),
      projectType: projectDetailsForm.projectType.trim(),
      projectLogo: projectDetailsForm.projectLogo.trim(),
      mainImage: projectDetailsForm.mainImage.trim(),
      tagline: projectDetailsForm.tagline.trim(),
      description: projectDetailsForm.description.trim(),
      existingApartments: projectDetailsForm.existingApartments.trim(),
      newApartments: projectDetailsForm.newApartments.trim(),
      buildings: projectDetailsForm.buildings.trim(),
      floors: projectDetailsForm.floors.trim(),
      threeRooms: projectDetailsForm.threeRooms.trim(),
      fourRooms: projectDetailsForm.fourRooms.trim(),
      fiveRooms: projectDetailsForm.fiveRooms.trim(),
      gardenApartments: projectDetailsForm.gardenApartments.trim(),
      penthouses: projectDetailsForm.penthouses.trim(),
      parking: projectDetailsForm.parking.trim(),
      storage: projectDetailsForm.storage.trim(),
      occupancy: projectDetailsForm.occupancy.trim(),
      googleMapsUrl: projectDetailsForm.googleMapsUrl.trim(),
    };
    const googleMapsUrl = values.googleMapsUrl || makeMapsUrl(values.address, values.city);
    const googleMapsEmbedUrl = makeMapsEmbedUrl(values.address, values.city);
    const projectType = projectTypeOptions.includes(values.projectType as Project["projectType"])
      ? (values.projectType as Project["projectType"])
      : project.projectType;
    const nextKeyFacts = [
      values.floors ? `${values.floors} קומות` : project.keyFacts[0],
      values.newApartments ? `${values.newApartments} דירות` : project.keyFacts[1],
      ...project.keyFacts.slice(2),
    ].filter(Boolean);

    onUpdateProject(
      project.id,
      {
        name: values.name,
        city: values.city,
        address: values.address,
        neighborhood: values.neighborhood,
        googleMapsUrl,
        googleMapsEmbedUrl,
        projectType,
        projectLogo: values.projectLogo,
        mainImage: values.mainImage,
        tagline: values.tagline,
        description: values.description,
        logoMark: makeLogoMark(values.name),
        location: `${values.neighborhood}, ${values.city}`,
        keyFacts: nextKeyFacts,
        stats: {
          ...project.stats,
          existingApartments: values.existingApartments,
          newApartments: values.newApartments,
          units: values.newApartments,
          buildings: values.buildings,
          floors: values.floors,
          parking: values.parking,
          storage: values.storage,
          occupancy: values.occupancy,
        },
        apartmentMix: {
          threeRooms: values.threeRooms,
          fourRooms: values.fourRooms,
          fiveRooms: values.fiveRooms,
          gardenApartments: values.gardenApartments,
          penthouses: values.penthouses,
        },
      },
      {
        city: values.city,
        marketingStatus: values.marketingStatus,
        lastUpdated: "04/07/2026",
      },
    );
    setProjectDetailsForm({ ...values, projectType, googleMapsUrl });
    setSuccessMessage("נשמר בהצלחה");
    setActivePanel(null);
  };

  const handleProjectLogoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectLogo = getFormValue(formData, "projectLogo");

    onUpdateProject(project.id, { projectLogo });
    setProjectDetailsForm((current) => ({ ...current, projectLogo }));
    setSuccessMessage("לוגו הפרויקט נשמר מקומית");
    setActivePanel(null);
  };

  const handleProjectMainImageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mainImage = getFormValue(formData, "mainImage");

    onUpdateProject(project.id, { mainImage });
    setProjectDetailsForm((current) => ({ ...current, mainImage }));
    setSuccessMessage("התמונה הראשית נשמרה מקומית");
    setActivePanel(null);
  };

  const handleApartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInventoryApartment) return;

    onUpdateApartment(project.id, selectedInventoryApartment.id, {
      number: apartmentInventoryForm.number.trim(),
      floor: getNumberFromString(apartmentInventoryForm.floor),
      rooms: getNumberFromString(apartmentInventoryForm.rooms),
      apartmentArea: getNumberFromString(apartmentInventoryForm.apartmentArea),
      balconyArea: getNumberFromString(apartmentInventoryForm.balconyArea),
      gardenArea: getNumberFromString(apartmentInventoryForm.gardenArea),
      parking: apartmentInventoryForm.parking.trim(),
      storage: apartmentInventoryForm.storage.trim(),
      direction: apartmentInventoryForm.direction.trim(),
      price: getNumberFromString(apartmentInventoryForm.price),
      specialPrice: getNumberFromString(apartmentInventoryForm.specialPrice),
      status: apartmentInventoryForm.status,
      planAttached: apartmentInventoryForm.planAttached === "yes",
      notes: apartmentInventoryForm.notes.trim(),
    });
    setSuccessMessage("נשמר בהצלחה");
    setActivePanel(null);
  };

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedUploadFiles(Array.from(event.currentTarget.files ?? []));
    setUploadError("");
    setSuccessMessage("");
  };

  const applyUploadedFilesToLocalState = (
    category: ProjectFileCategory,
    uploadedFiles: ProjectFileRecord[],
  ) => {
    const uploadedUrls = uploadedFiles
      .map((file) => file.publicUrl)
      .filter((url): url is string => Boolean(url));

    if (category === "logo" && uploadedFiles[0]) {
      const projectLogo = uploadedUrls[0] ?? project.projectLogo;

      onUpdateProject(project.id, {
        projectLogo,
        projectLogoPath: uploadedFiles[0].storagePath,
      });
      setProjectDetailsForm((current) => ({ ...current, projectLogo }));
      return;
    }

    if (category === "main" && uploadedFiles[0]) {
      const mainImage = uploadedUrls[0] ?? project.mainImage ?? project.heroImage;

      onUpdateProject(project.id, {
        heroImage: mainImage,
        mainImage,
        mainImagePath: uploadedFiles[0].storagePath,
      });
      setProjectDetailsForm((current) => ({ ...current, mainImage }));
      return;
    }

    if (isGalleryCategory(category) && uploadedUrls.length > 0) {
      onUpdateProject(project.id, {
        gallery: {
          ...project.gallery,
          [category]: [...(project.gallery[category] ?? []), ...uploadedUrls],
        },
      });
      return;
    }

    if (category === "apartment_plan" && uploadApartmentId) {
      const planFile = uploadedFiles[0];

      onUpdateApartment(project.id, uploadApartmentId, {
        planAttached: true,
        planUrl: planFile?.publicUrl,
        planFileName: planFile?.fileName,
      });
    }
  };

  const handleUploadSubmit = async () => {
    if (!activePanel) return;

    const uploadConfig = uploadSectionConfigs[activePanel.id];

    if (!canManageProjects) {
      setUploadError("אין הרשאת ניהול להעלאת קבצים.");
      return;
    }

    if (!uploadConfig) {
      setUploadError("העלאה עדיין לא זמינה עבור שורה זו.");
      return;
    }

    if (uploadConfig.needsApartment && !uploadApartmentId) {
      setUploadError("יש לבחור דירה לפני העלאת תוכנית.");
      return;
    }

    if (selectedUploadFiles.length === 0) {
      setUploadError("יש לבחור לפחות קובץ אחד להעלאה.");
      return;
    }

    const filesToUpload = uploadConfig.multiple ? selectedUploadFiles : selectedUploadFiles.slice(0, 1);

    setIsUploading(true);
    setUploadError("");
    setSuccessMessage("");

    try {
      const uploadedFiles = await Promise.all(
        filesToUpload.map((file) =>
          uploadProjectFile(
            project.id,
            file,
            uploadConfig.category,
            uploadConfig.needsApartment ? uploadApartmentId : undefined,
          ),
        ),
      );

      applyUploadedFilesToLocalState(uploadConfig.category, uploadedFiles);
      onUpdateProject(project.id, {
        materialFileCounts: {
          ...project.materialFileCounts,
          [activePanel.id]: (project.materialFileCounts?.[activePanel.id] ?? 0) + uploadedFiles.length,
        },
      });
      setUploadedSectionCounts((current) => ({
        ...current,
        [activePanel.id]: (current[activePanel.id] ?? 0) + uploadedFiles.length,
      }));
      setSelectedUploadFiles([]);
      setSuccessMessage(`${uploadedFiles.length} קבצים הועלו בהצלחה`);
    } catch (error) {
      console.warn("[GOLDLANDS] Supabase Storage upload failed. Keeping the app on localStorage fallback.", error);
      setUploadError(
        error instanceof Error
          ? `העלאה ל-Supabase Storage נכשלה: ${error.message}`
          : "העלאה ל-Supabase Storage נכשלה. הנתונים המקומיים נשארו זמינים.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const activePanelModeLabel =
    activePanel?.mode === "manual"
      ? "עריכה ידנית"
      : activePanel?.mode === "preview"
        ? "תצוגה מקדימה"
        : "ייבוא / העלאה";
  const activePanelTitle =
    activePanel?.mode === "manual"
      ? `עריכת ${panelSection?.title}`
      : activePanel?.mode === "preview"
        ? `תצוגה מקדימה: ${panelSection?.title}`
        : `ייבוא ${panelSection?.title}`;

  return (
    <div className="management-layout">
      <SideNavigation
        active="admin"
        onProjects={onProjects}
        onReadiness={onReadiness}
        onAdmin={onAdmin}
        canViewReadiness={canViewReadiness}
        canManageProjects={canManageProjects}
      />

      <main className="management-main project-detail-screen">
        <section className="project-detail-hero">
          <ProjectLogoSlot project={project} />
          <div>
            <span className="eyebrow">ניהול חומרי פרויקט</span>
            <h1>{project.name}</h1>
            <p>{readiness?.city ?? project.location}</p>
          </div>
          <div className="project-detail-hero__actions">
            <button className="ghost-button" onClick={onAdmin}>
              חזרה לרשימה
            </button>
            <button className="gold-button" onClick={() => onOpenProject(project.id)}>
              פתיחת מצגת
            </button>
          </div>
        </section>

        {panelSection && activePanel && (
          <div className="material-modal-backdrop" onClick={() => setActivePanel(null)}>
            <section
              className="material-modal"
              role="dialog"
              aria-modal="true"
              aria-label={activePanelTitle}
              onClick={(event) => event.stopPropagation()}
            >
              <header className="material-modal__header">
                <div>
                  <span className="eyebrow">{activePanelModeLabel}</span>
                  <h2>{activePanelTitle}</h2>
                </div>
                <button className="ghost-button ghost-button--compact" onClick={() => setActivePanel(null)} type="button">
                  ביטול
                </button>
              </header>
              {successMessage && <span className="save-success">{successMessage}</span>}

              {activePanel.mode === "manual" ? (
                <>
                  {panelSection.id === "details" ? (
                    <form className="mock-field-grid" id="project-details-form" onSubmit={handleProjectDetailsSubmit}>
                      {projectDetailFields.map((field) => (
                        <label
                          className={[
                            "mock-field",
                            field.multiline || field.wide ? "mock-field--wide" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={field.name}
                        >
                          <span>{field.label}</span>
                          {field.options ? (
                            <select
                              name={field.name}
                              onChange={handleProjectDetailsFieldChange}
                              value={field.value}
                            >
                              {field.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : field.multiline ? (
                            <textarea
                              dir={field.dir}
                              name={field.name}
                              onChange={handleProjectDetailsFieldChange}
                              rows={3}
                              value={field.value}
                            />
                          ) : (
                            <input
                              dir={field.dir}
                              name={field.name}
                              onChange={handleProjectDetailsFieldChange}
                              placeholder={field.placeholder}
                              value={field.value}
                            />
                          )}
                        </label>
                      ))}
                    </form>
                  ) : panelSection.id === "logo" ? (
                    <div className="project-logo-editor">
                      <ProjectLogoSlot project={{ ...project, projectLogo: projectDetailsForm.projectLogo }} />
                      <form className="mock-field-grid" id="project-logo-form" onSubmit={handleProjectLogoSubmit}>
                        <label className="mock-field mock-field--wide">
                          <span>projectLogo URL / path</span>
                          <input
                            dir="ltr"
                            name="projectLogo"
                            onChange={handleProjectDetailsFieldChange}
                            placeholder="לדוגמה: /assets/project-logo.png או URL דמו"
                            value={projectDetailsForm.projectLogo}
                          />
                        </label>
                      </form>
                    </div>
                  ) : panelSection.id === "main-image" ? (
                    <form
                      className="mock-field-grid"
                      id="project-main-image-form"
                      onSubmit={handleProjectMainImageSubmit}
                    >
                      <label className="mock-field mock-field--wide">
                        <span>mainImage URL / path</span>
                        <input
                          dir="ltr"
                          name="mainImage"
                          onChange={handleProjectDetailsFieldChange}
                          placeholder="לדוגמה: /assets/main-rendering.png או URL דמו"
                          value={projectDetailsForm.mainImage}
                        />
                      </label>
                    </form>
                  ) : panelSection.id === "inventory" ? (
                    <div className="inventory-editor">
                      <div className="inventory-editor__note">
                        <strong>מקור נתוני הדירות</strong>
                        <span>הטבלה הזו מזינה בעתיד את דירות פנויות, מחירון ותוכנית דירה.</span>
                      </div>
                      <div className="table-wrap">
                        <table className="lux-table inventory-table">
                          <thead>
                            <tr>
                              <th>דירה</th>
                              <th>קומה</th>
                              <th>חדרים</th>
                              <th>שטח</th>
                              <th>מרפסת</th>
                              <th>גינה</th>
                              <th>חניה</th>
                              <th>מחסן</th>
                              <th>כיוון</th>
                              <th>מחיר</th>
                              <th>מיוחד</th>
                              <th>סטטוס</th>
                              <th>תוכנית</th>
                              <th>פעולה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apartments.map((apartment) => (
                              <tr
                                className={
                                  selectedInventoryApartment?.id === apartment.id ? "inventory-row--active" : ""
                                }
                                key={apartment.id}
                                onClick={() => setSelectedInventoryApartmentId(apartment.id)}
                              >
                                <td>{apartment.number}</td>
                                <td>{apartment.floor}</td>
                                <td>{apartment.rooms}</td>
                                <td>{apartment.apartmentArea} מ&quot;ר</td>
                                <td>{apartment.balconyArea} מ&quot;ר</td>
                                <td>{apartment.gardenArea ? `${apartment.gardenArea} מ"ר` : "-"}</td>
                                <td>{apartment.parking}</td>
                                <td>{apartment.storage}</td>
                                <td>{apartment.direction}</td>
                                <td>{formatPrice(apartment.price)}</td>
                                <td className="gold-cell">{formatPrice(apartment.specialPrice)}</td>
                                <td>
                                  <StatusBadge status={apartment.status} />
                                </td>
                                <td>{apartment.planAttached ? "מצורפת" : "חסר"}</td>
                                <td>
                                  <button
                                    className="mini-button mini-button--gold"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedInventoryApartmentId(apartment.id);
                                    }}
                                    type="button"
                                  >
                                    עריכה
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selectedInventoryApartment && (
                        <section className="inventory-detail-panel">
                          <header>
                            <h3>עריכת דירה {selectedInventoryApartment.number}</h3>
                          </header>
                          <form className="mock-field-grid" id="inventory-detail-form" onSubmit={handleApartmentSubmit}>
                            {selectedInventoryFields.map((field) => (
                              <label
                                className={field.multiline ? "mock-field mock-field--wide" : "mock-field"}
                                key={`${selectedInventoryApartment.id}-${field.label}`}
                              >
                                <span>{field.label}</span>
                                {field.options ? (
                                  <select
                                    name={field.name}
                                    onChange={handleApartmentFieldChange}
                                    value={field.value}
                                  >
                                    {field.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.multiline ? (
                                  <textarea
                                    name={field.name}
                                    onChange={handleApartmentFieldChange}
                                    rows={3}
                                    value={field.value}
                                  />
                                ) : (
                                  <input
                                    name={field.name}
                                    onChange={handleApartmentFieldChange}
                                    value={field.value}
                                  />
                                )}
                              </label>
                            ))}
                          </form>
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="mock-field-grid">
                      {panelSection.fields.map((field) => (
                        <label
                          className={field.multiline ? "mock-field mock-field--wide" : "mock-field"}
                          key={field.label}
                        >
                          <span>{field.label}</span>
                          {field.multiline ? (
                            <textarea defaultValue={field.value} rows={3} />
                          ) : (
                            <input defaultValue={field.value} />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="material-modal__note">
                    {panelSection.id === "logo"
                      ? "בהמשך כאן יועלה לוגו הפרויקט שיופיע בכרטיס הפרויקט ובכל מסכי התצוגה."
                      : "בשלב זה מדובר בהדמיה בלבד"}
                  </p>
                </>
              ) : activePanel.mode === "preview" ? (
                <div className="project-logo-editor project-logo-editor--preview">
                  {panelSection.id === "logo" ? (
                    <>
                      <ProjectLogoSlot project={project} />
                      <p className="material-modal__note">
                        כך לוגו הפרויקט יוצג בכרטיס הפרויקט, במסכי התצוגה ובתצוגת הלקוח.
                      </p>
                    </>
                  ) : (
                    <p className="material-modal__note">תצוגה מקדימה מקומית עבור {panelSection.title}.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mock-upload-panel">
                    <UploadCloud size={34} strokeWidth={1.5} />
                    <div>
                      <strong>בחירת קבצים</strong>
                      <p>
                        {panelSection.id === "logo"
                          ? "לוגו הפרויקט יופיע בכרטיסים ובמסכי התצוגה."
                          : `${panelSection.title} עבור חומרי הפרויקט.`}
                      </p>
                      {selectedUploadFiles.length > 0 && (
                        <ul className="upload-file-list" aria-label="קבצים שנבחרו">
                          {selectedUploadFiles.map((file) => (
                            <li key={`${file.name}-${file.lastModified}`}>
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <label className="gold-button gold-button--compact">
                      בחירת קבצים
                      <input
                        accept={activeUploadConfig?.accept}
                        hidden
                        multiple={activeUploadConfig?.multiple}
                        onChange={handleUploadFileChange}
                        type="file"
                      />
                    </label>
                  </div>
                  {activeUploadConfig?.needsApartment && (
                    <label className="mock-field mock-field--wide upload-apartment-field">
                      <span>שיוך לדירה</span>
                      <select
                        onChange={(event) => setUploadApartmentId(event.currentTarget.value)}
                        value={uploadApartmentId}
                      >
                        {apartments.map((apartment) => (
                          <option key={apartment.id} value={apartment.id}>
                            דירה {apartment.number}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {uploadError && (
                    <p className="material-modal__note material-modal__note--error" role="alert">
                      {uploadError}
                    </p>
                  )}
                  <p className="material-modal__note">
                    {activeUploadConfig &&
                    ["logo", "main", "exterior", "interior", "lobby", "surroundings"].includes(activeUploadConfig.category)
                      ? "קבצי תמונה נתמכים: jpg, jpeg, png, webp. עד 25MB."
                      : "קבצים נתמכים: pdf, ppt, pptx, doc, docx, xls, xlsx. עד 25MB."}
                  </p>
                </>
              )}

              <footer className="material-modal__footer">
                <button className="ghost-button ghost-button--compact" onClick={() => setActivePanel(null)} type="button">
                  ביטול
                </button>
                <button
                  className="gold-button gold-button--compact"
                  disabled={isUploadPanel && (isUploading || selectedUploadFiles.length === 0)}
                  form={activeSaveFormId}
                  onClick={
                    isUploadPanel
                      ? () => void handleUploadSubmit()
                      : activeSaveFormId
                        ? undefined
                        : () => setActivePanel(null)
                  }
                  type={activeSaveFormId ? "submit" : "button"}
                >
                  {isUploadPanel ? (isUploading ? "מעלה..." : "העלאה") : "שמירה"}
                </button>
              </footer>
            </section>
          </div>
        )}

        <section className="project-material-list-card" aria-label="חומרי פרויקט">
          <div className="table-wrap">
            <table className="lux-table project-material-table">
              <thead>
                <tr>
                  <th>תחום</th>
                  <th>תיאור קצר</th>
                  <th>סטטוס</th>
                  <th>עודכן לאחרונה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {materialSections.map((section) => {
                  const Icon = section.icon;
                  const isFileFirst = section.kind === "file";

                  return (
                    <tr key={section.id}>
                      <td>
                        <span className="material-row-title">
                          <span className="project-material-card__icon">
                            <Icon size={18} strokeWidth={1.6} />
                          </span>
                          <strong>{section.title}</strong>
                        </span>
                      </td>
                      <td className="material-row-summary">{section.summary}</td>
                      <td>
                        <span className={`material-status material-status--${section.status}`}>
                          {statusLabels[section.status]}
                        </span>
                      </td>
                      <td>{section.lastUpdated}</td>
                      <td>
                        <div className="material-row-actions">
                          <button
                            className={isFileFirst ? "mini-button mini-button--ghost" : "mini-button mini-button--gold"}
                            onClick={() => openPanel(section.id, "manual")}
                            type="button"
                          >
                            <PencilLine size={14} />
                            עריכה ידנית
                          </button>
                          <button
                            className={isFileFirst ? "mini-button mini-button--gold" : "mini-button mini-button--ghost"}
                            onClick={() => openPanel(section.id, "upload")}
                            type="button"
                          >
                            <UploadCloud size={14} />
                            ייבוא / העלאה
                          </button>
                          <button
                            className="mini-button mini-button--ghost"
                            onClick={() => openPanel(section.id, "preview")}
                            type="button"
                          >
                            <FileText size={14} />
                            תצוגה מקדימה
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
