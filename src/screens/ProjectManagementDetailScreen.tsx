import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BadgeHelp,
  Building2,
  ExternalLink,
  FileImage,
  FileText,
  Images,
  LayoutList,
  MapPinned,
  PencilLine,
  Presentation,
  Ruler,
  Plus,
  ArrowDown,
  ArrowUp,
  Trash2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { FileDropZone } from "../components/FileDropZone";
import { ProjectLogoSlot } from "../components/ProjectLogoSlot";
import { SideNavigation } from "../components/SideNavigation";
import { StatusBadge } from "../components/StatusBadge";
import { useFileUploadInput, type UploadFileValidationKind } from "../hooks/useFileUploadInput";
import {
  formatSupabaseErrorDetails,
  listProjectFiles,
  uploadProjectFile,
  type ProjectFileCategory,
  type ProjectFileRecord,
} from "../services/storageService";
import { formatPrice } from "../utils/format";
import {
  parseSpreadsheetImport,
  type SpreadsheetImportKind,
  type SpreadsheetPreview,
} from "../utils/excelImport";
import {
  canUseFileAsProjectMainImage,
  getValidProjectMainImage,
  isProjectFileMainImage,
} from "../utils/projectImages";
import type {
  Apartment,
  ApartmentStatus,
  GalleryCategory,
  Project,
  ProjectFile,
  ProjectFileAssociation,
  ProjectReadiness,
  TechnicalSpecSectionData,
} from "../types";

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
  ) => Promise<unknown> | void;
  onAddApartment: (projectId: string, apartment: Apartment) => Promise<unknown> | void;
  onDeleteApartment: (projectId: string, apartmentId: string) => Promise<unknown> | void;
  onImportProjectData: (
    projectId: string,
    projectPatch: Partial<Project>,
    apartments: Apartment[],
  ) => Promise<unknown> | void;
  onUpdateTechnicalSpecifications: (
    projectId: string,
    sections: TechnicalSpecSectionData[],
  ) => Promise<unknown> | void;
  onUpdateProjectFileType?: (
    projectId: string,
    fileId: string,
    type: ProjectFileAssociation,
    patch: Partial<Project>,
  ) => Promise<void> | void;
  onUpdateProjectFileTarget?: (
    projectId: string,
    fileId: string,
    target: string,
    patch: Partial<Project>,
  ) => Promise<void> | void;
  onDeleteProjectFile?: (
    projectId: string,
    file: ProjectFile,
    patch: Partial<Project>,
  ) => Promise<void> | void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  canUploadProjectFiles?: boolean;
  uploadUnavailableMessage?: string;
  authModeLabel?: string;
  onSignOut?: () => void;
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

const technicalSpecCategoryOptions = [
  { id: "structure", title: "שלד ובנייה" },
  { id: "lobby", title: "לובי וכניסה" },
  { id: "apartment", title: "דירה" },
  { id: "kitchen", title: "מטבח" },
  { id: "climate", title: "מיזוג" },
  { id: "electric", title: "חשמל ומים" },
  { id: "bathrooms", title: "חדרי רחצה" },
  { id: "balcony", title: "מרפסת" },
  { id: "other", title: "אחר" },
] as const;

const floorPlanTargets = [
  "קומת קרקע",
  "קומות 1-4",
  "קומות 5-6",
  "קומה 7",
  "גג וגג עליון",
  "תכנית מגרש",
];

const projectTypeOptions: Project["projectType"][] = [
  "פרויקט חדש",
  "תמ״א 38/1",
  "תמ״א 38/2 / פינוי בינוי",
];

const imageUploadAccept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const documentUploadAccept = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,text/csv";

interface UploadSectionConfig {
  category?: ProjectFileCategory;
  accept: string;
  multiple: boolean;
  needsApartment?: boolean;
  importKind?: SpreadsheetImportKind;
}

interface UploadResultItem {
  fileName: string;
  status: "success" | "error";
  message: string;
}

const uploadSectionConfigs: Partial<Record<string, UploadSectionConfig>> = {
  details: {
    accept: ".xlsx,.xls,.csv,text/csv",
    multiple: false,
    importKind: "projectDetails",
  },
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
  inventory: {
    accept: ".xlsx,.xls,.csv,text/csv",
    multiple: false,
    importKind: "apartments",
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
    multiple: false,
    importKind: "priceList",
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

const projectFileAssociationOptions: ProjectFileAssociation[] = [
  "מחירון",
  "תכנית דירה",
  "תכנית קומה",
  "מצגת",
  "הדמיה",
  "תמונת פרויקט",
  "מפרט",
  "משפטי",
  "אחר",
];

const uploadCategoryFileTypes: Record<ProjectFileCategory, ProjectFileAssociation> = {
  logo: "אחר",
  main: "תמונת פרויקט",
  exterior: "הדמיה",
  interior: "הדמיה",
  lobby: "הדמיה",
  surroundings: "הדמיה",
  apartment_plan: "תכנית דירה",
  floor_plan: "תכנית קומה",
  price_list: "מחירון",
  brochure: "מצגת",
  technical_spec: "מפרט",
  sales_deck: "מצגת",
  other: "אחר",
};

function formatProjectFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
  if (sizeBytes >= 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${sizeBytes} B`;
}

function formatProjectFileDate(uploadedAt: string) {
  const date = new Date(uploadedAt);

  if (Number.isNaN(date.getTime())) return uploadedAt || "-";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

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
  const mainImage = getValidProjectMainImage(project);

  return {
    name: project.name,
    city: readiness?.city ?? project.city,
    address: project.address,
    neighborhood: project.neighborhood,
    marketingStatus: readiness?.marketingStatus ?? "טיוטה",
    projectType: project.projectType,
    projectLogo: project.projectLogo ?? "",
    mainImage,
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
    summary: "לוגו הפרויקט שמופיע בכרטיסים ובתצוגות.",
    lastUpdated: "לא עודכן",
  },
  {
    id: "main-image",
    title: "תמונה ראשית",
    icon: FileImage,
    kind: "file",
    status: "complete",
    summary: "התמונה הראשית של הפרויקט.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "exterior",
    title: "הדמיות חוץ",
    icon: Images,
    kind: "file",
    status: "partial",
    summary: "גלריית הדמיות החוץ של הפרויקט.",
    lastUpdated: "02/07/2026",
  },
  {
    id: "interior",
    title: "הדמיות פנים",
    icon: Images,
    kind: "file",
    status: "partial",
    summary: "גלריית הדמיות הפנים של הפרויקט.",
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
    summary: "מחירים, מחירים מיוחדים וסטטוס לכל דירה.",
    lastUpdated: "03/07/2026",
  },
  {
    id: "technical",
    title: "מפרט טכני",
    icon: PencilLine,
    kind: "data",
    status: "partial",
    summary: "קטגוריות וסעיפי המפרט הטכני של הפרויקט.",
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
  onAddApartment,
  onDeleteApartment,
  onImportProjectData,
  onUpdateTechnicalSpecifications,
  onUpdateProjectFileType,
  onUpdateProjectFileTarget,
  onDeleteProjectFile,
  canViewReadiness = true,
  canManageProjects = true,
  canUploadProjectFiles = false,
  uploadUnavailableMessage = "Upload requires real Supabase admin login.",
  authModeLabel,
  onSignOut,
}: ProjectManagementDetailScreenProps) {
  const [activeProjectTab, setActiveProjectTab] = useState<"materials" | "files">("materials");
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
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);
  const [fileSaveError, setFileSaveError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadApartmentId, setUploadApartmentId] = useState(apartments[0]?.id ?? "");
  const [uploadTarget, setUploadTarget] = useState(floorPlanTargets[0]);
  const [uploadResults, setUploadResults] = useState<UploadResultItem[]>([]);
  const [spreadsheetPreview, setSpreadsheetPreview] = useState<SpreadsheetPreview | null>(null);
  const [isParsingSpreadsheet, setIsParsingSpreadsheet] = useState(false);
  const [isCreatingApartment, setIsCreatingApartment] = useState(false);
  const [pendingApartmentDelete, setPendingApartmentDelete] = useState<Apartment | null>(null);
  const [technicalSpecDraft, setTechnicalSpecDraft] = useState<TechnicalSpecSectionData[]>(
    () => project.technicalSpecSections ?? [],
  );
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
        { label: "תמונה ראשית", value: getValidProjectMainImage(project) || "טרם הוגדרה" },
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
          value: getValidProjectMainImage(project),
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
          status: getValidProjectMainImage(project) ? "complete" : "missing",
          summary: getValidProjectMainImage(project)
            ? "תמונה ראשית הוגדרה ונשמרת מקומית."
            : "מקום שמור לתמונה הראשית של הפרויקט.",
          lastUpdated: getValidProjectMainImage(project) ? readiness?.lastUpdated ?? "עודכן מקומית" : "לא עודכן",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      if (section.id === "inventory") {
        return {
          ...section,
          status: apartments.length > 0 ? "complete" : "missing",
          summary: apartments.length > 0
            ? `${apartments.length} דירות משויכות לפרויקט.`
            : "אין עדיין דירות בפרויקט.",
          lastUpdated: readiness?.lastUpdated ?? "לא עודכן",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      if (section.id === "prices") {
        const pricedApartments = apartments.filter((apartment) => apartment.price > 0).length;
        return {
          ...section,
          status: pricedApartments > 0 ? "complete" : "missing",
          summary: pricedApartments > 0
            ? `${pricedApartments} דירות עם מחיר מעודכן.`
            : "אין עדיין נתוני מחיר בפרויקט.",
          lastUpdated: readiness?.lastUpdated ?? "לא עודכן",
          fields: manualFields[section.id] ?? fileMetadataFields,
        };
      }

      if (section.id === "technical") {
        const specCount = project.technicalSpecSections?.length ?? project.technicalSpecNotes?.length ?? 0;
        return {
          ...section,
          status: specCount > 0 ? "complete" : "missing",
          summary: specCount > 0 ? `${specCount} קטגוריות או סעיפים נשמרו.` : "אין עדיין מפרט טכני בפרויקט.",
          lastUpdated: readiness?.lastUpdated ?? "לא עודכן",
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
        : activePanel?.mode === "manual" && panelSection?.id === "prices"
          ? "inventory-detail-form"
        : activePanel?.mode === "manual" && panelSection?.id === "logo"
          ? "project-logo-form"
          : activePanel?.mode === "manual" && panelSection?.id === "main-image"
            ? "project-main-image-form"
            : undefined;
  const activeUploadConfig = activePanel ? uploadSectionConfigs[activePanel.id] : undefined;
  const isUploadPanel = activePanel?.mode === "upload";
  const activeUploadKind: UploadFileValidationKind =
    activeUploadConfig?.category &&
    ["logo", "main", "exterior", "interior", "lobby", "surroundings"].includes(
      activeUploadConfig.category,
    )
      ? "image"
      : "document";
  const {
    selectedFile: selectedUploadFile,
    selectedFiles: selectedUploadFiles,
    isFileValid: isUploadFileValid,
    validationError: uploadValidationError,
    selectionNotice: uploadSelectionNotice,
    selectFiles: selectUploadFiles,
    resetFileInput: resetUploadFileInput,
  } = useFileUploadInput({
    kind: activeUploadKind,
    multiple: activeUploadConfig?.multiple ?? false,
  });
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
  const selectedInventoryApartment = isCreatingApartment
    ? undefined
    : apartments.find((apartment) => apartment.id === selectedInventoryApartmentId) ?? apartments[0];
  const selectedInventoryFields: ManualField[] = [
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
      ];
  const validMainImage = getValidProjectMainImage(project);
  const eligibleMainImageFiles = (project.projectFiles ?? []).filter(canUseFileAsProjectMainImage);

  useEffect(() => {
    setApartmentInventoryForm(makeApartmentInventoryFormState(selectedInventoryApartment));
  }, [selectedInventoryApartment]);

  useEffect(() => {
    setTechnicalSpecDraft(project.technicalSpecSections ?? []);
  }, [project.id, project.technicalSpecSections]);

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
      setIsCreatingApartment(apartments.length === 0);
    }
    if (id === "prices" && mode === "manual" && !selectedInventoryApartmentId) {
      setSelectedInventoryApartmentId(apartments[0]?.id ?? null);
      setIsCreatingApartment(apartments.length === 0);
    }
    if (id === "technical" && mode === "manual") {
      setTechnicalSpecDraft(project.technicalSpecSections ?? []);
    }
    if (mode === "upload") {
      resetUploadFileInput();
      setUploadError("");
      setUploadResults([]);
      setSpreadsheetPreview(null);
      setIsParsingSpreadsheet(false);
      setIsUploading(false);

      if (uploadSectionConfigs[id]?.needsApartment) {
        setUploadApartmentId(selectedInventoryApartmentId ?? apartments[0]?.id ?? "");
      }
    }
    setSuccessMessage("");
    setSaveError("");
    setActivePanel({ id, mode });
  };

  const closeActivePanel = () => {
    if (isSaving || isUploading || isParsingSpreadsheet) return;

    resetUploadFileInput();
    setUploadError("");
    setUploadResults([]);
    setSpreadsheetPreview(null);
    setPendingApartmentDelete(null);
    setSaveError("");
    setActivePanel(null);
  };

  const runPanelSave = async (
    saveAction: () => Promise<unknown> | void,
    successText: string,
    options: { closePanel?: boolean } = {},
  ) => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      await saveAction();
      setSuccessMessage(successText);

      if (options.closePanel !== false) {
        setActivePanel(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "השמירה נכשלה. נסי שוב.";

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
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

    runPanelSave(() => {
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
    }, "נשמר בהצלחה");
  };

  const handleProjectLogoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectLogo = getFormValue(formData, "projectLogo");

    runPanelSave(() => {
      onUpdateProject(project.id, { projectLogo });
      setProjectDetailsForm((current) => ({ ...current, projectLogo }));
    }, "לוגו הפרויקט נשמר מקומית");
  };

  const handleProjectMainImageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedFileId = getFormValue(formData, "mainImageFileId");
    const selectedFile = eligibleMainImageFiles.find((file) => file.id === selectedFileId);
    const mainImage = selectedFile?.url ?? "";

    if (!selectedFile || !mainImage) {
      setSaveError("יש לבחור קובץ מסוג הדמיה או תמונת פרויקט.");
      return;
    }

    runPanelSave(() => {
      onUpdateProject(project.id, { mainImage });
      setProjectDetailsForm((current) => ({ ...current, mainImage }));
    }, "התמונה הראשית נשמרה מקומית");
  };

  const clearProjectMainImage = () => {
    runPanelSave(() => {
      onUpdateProject(project.id, {
        mainImage: "",
        mainImagePath: undefined,
      });
      setProjectDetailsForm((current) => ({ ...current, mainImage: "" }));
    }, "התמונה הראשית הוסרה");
  };

  const setProjectMainImageFromFile = (file: ProjectFile) => {
    if (!canUseFileAsProjectMainImage(file) || !file.url) return;

    if (savingFileId) return;

    setSavingFileId(file.id);
    setFileSaveError("");
    setSuccessMessage("");

    try {
      onUpdateProject(project.id, {
        mainImage: file.url,
      });
      setProjectDetailsForm((current) => ({ ...current, mainImage: file.url }));
      setSuccessMessage("התמונה הראשית עודכנה");
    } catch (error) {
      setFileSaveError(error instanceof Error ? error.message : "שמירת התמונה הראשית נכשלה.");
    } finally {
      setSavingFileId(null);
    }
  };

  const handleApartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInventoryApartment && !isCreatingApartment) return;

    const apartmentPatch: Partial<Apartment> = {
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
      };

    if (!apartmentPatch.number) {
      setSaveError("יש להזין מספר דירה.");
      return;
    }

    void runPanelSave(async () => {
      if (isCreatingApartment) {
        const apartment: Apartment = {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `apartment-${Date.now()}`,
          projectId: project.id,
          number: apartmentPatch.number ?? "",
          floor: apartmentPatch.floor ?? 0,
          rooms: apartmentPatch.rooms ?? 0,
          apartmentArea: apartmentPatch.apartmentArea ?? 0,
          balconyArea: apartmentPatch.balconyArea ?? 0,
          gardenArea: apartmentPatch.gardenArea ?? 0,
          parking: apartmentPatch.parking ?? "",
          storage: apartmentPatch.storage ?? "",
          direction: apartmentPatch.direction ?? "",
          price: apartmentPatch.price ?? 0,
          specialPrice: apartmentPatch.specialPrice ?? 0,
          status: apartmentPatch.status ?? "available",
          planAttached: apartmentPatch.planAttached ?? false,
          notes: apartmentPatch.notes ?? "",
        };

        await onAddApartment(project.id, apartment);
        setSelectedInventoryApartmentId(apartment.id);
        setIsCreatingApartment(false);
        return;
      }

      await onUpdateApartment(project.id, selectedInventoryApartment!.id, apartmentPatch);
    }, isCreatingApartment ? "הדירה נוספה בהצלחה" : "נשמר בהצלחה");
  };

  const startAddingApartment = () => {
    setSelectedInventoryApartmentId(null);
    setIsCreatingApartment(true);
    setApartmentInventoryForm(makeApartmentInventoryFormState());
    setSaveError("");
  };

  const confirmApartmentDelete = async () => {
    if (!pendingApartmentDelete) return;

    await runPanelSave(async () => {
      await onDeleteApartment(project.id, pendingApartmentDelete.id);
      const nextApartment = apartments.find((item) => item.id !== pendingApartmentDelete.id);
      setSelectedInventoryApartmentId(nextApartment?.id ?? null);
      setPendingApartmentDelete(null);
    }, "הדירה נמחקה", { closePanel: false });
  };

  const handleUploadFilesSelected = async (files: File[]) => {
    selectUploadFiles(files);
    setUploadError("");
    setSuccessMessage("");
    setUploadResults([]);
    setSpreadsheetPreview(null);

    const file = files[0];
    const importKind = activeUploadConfig?.importKind;
    const extension = file?.name.split(".").pop()?.toLowerCase();
    const isSpreadsheet = extension === "xlsx" || extension === "xls" || extension === "csv";

    if (!file || !importKind || !isSpreadsheet) return;

    setIsParsingSpreadsheet(true);

    try {
      const preview = await parseSpreadsheetImport(file, importKind, project, apartments);
      setSpreadsheetPreview(preview);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "קריאת קובץ ה-Excel נכשלה.");
    } finally {
      setIsParsingSpreadsheet(false);
    }
  };

  const makeProjectFilesFromUploads = (
    category: ProjectFileCategory,
    uploadedFiles: ProjectFileRecord[],
  ): ProjectFile[] =>
    uploadedFiles.map((file) => ({
      id: file.id,
      name: file.fileName,
      type: uploadCategoryFileTypes[category],
      target: category === "apartment_plan" && uploadApartmentId
        ? `דירה ${apartments.find((apartment) => apartment.id === uploadApartmentId)?.number ?? ""}`.trim()
        : category === "floor_plan"
          ? uploadTarget
          : file.target ?? file.category,
      url: file.publicUrl ?? "",
      sizeBytes: file.sizeBytes ?? 0,
      uploadedAt: file.uploadedAt ?? new Date().toISOString(),
      mimeType: file.mimeType,
      storageBucket: file.storageBucket,
      storagePath: file.storagePath,
    }));

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

  const handleProjectFileTypeChange = async (fileId: string, type: ProjectFileAssociation) => {
    if (savingFileId) return;

    const currentFiles = project.projectFiles ?? [];
    const nextFiles = currentFiles.map((file) =>
      file.id === fileId ? { ...file, type } : file,
    );
    const previousFile = currentFiles.find((file) => file.id === fileId);
    const changedFile = nextFiles.find((file) => file.id === fileId);
    const patch: Partial<Project> = { projectFiles: nextFiles };

    if (
      previousFile &&
      changedFile &&
      isProjectFileMainImage(project, previousFile) &&
      !canUseFileAsProjectMainImage(changedFile)
    ) {
      patch.mainImage = "";
      patch.mainImagePath = undefined;
    }

    setSavingFileId(fileId);
    setFileSaveError("");
    setSuccessMessage("");

    try {
      if (onUpdateProjectFileType) {
        await onUpdateProjectFileType(project.id, fileId, type, patch);
      } else {
        onUpdateProject(project.id, patch);
      }
      setSuccessMessage("שיוך הקובץ נשמר");
    } catch (error) {
      setFileSaveError(error instanceof Error ? error.message : "שמירת שיוך הקובץ נכשלה.");
    } finally {
      setSavingFileId(null);
    }
  };

  const handleProjectFileTargetChange = async (fileId: string, target: string) => {
    if (savingFileId) return;

    const nextFiles = (project.projectFiles ?? []).map((file) =>
      file.id === fileId ? { ...file, target } : file,
    );
    const patch: Partial<Project> = { projectFiles: nextFiles };

    setSavingFileId(fileId);
    setFileSaveError("");

    try {
      if (onUpdateProjectFileTarget) {
        await onUpdateProjectFileTarget(project.id, fileId, target, patch);
      } else {
        onUpdateProject(project.id, patch);
      }
      setSuccessMessage("שיוך הקומה נשמר");
    } catch (error) {
      setFileSaveError(error instanceof Error ? error.message : "שמירת שיוך הקומה נכשלה.");
    } finally {
      setSavingFileId(null);
    }
  };

  const handleProjectFileDelete = async (fileId: string) => {
    if (savingFileId) return;

    const removedFile = project.projectFiles?.find((file) => file.id === fileId);
    const nextFiles = (project.projectFiles ?? []).filter((file) => file.id !== fileId);
    const patch: Partial<Project> = { projectFiles: nextFiles };

    if (removedFile && isProjectFileMainImage(project, removedFile)) {
      patch.mainImage = "";
      patch.mainImagePath = undefined;
    }

    if (!removedFile) return;

    setSavingFileId(fileId);
    setFileSaveError("");
    setSuccessMessage("");

    try {
      if (onDeleteProjectFile) {
        await onDeleteProjectFile(project.id, removedFile, patch);
      } else {
        onUpdateProject(project.id, patch);
      }
      setSuccessMessage("הקובץ נמחק מהרשימה");
    } catch (error) {
      setFileSaveError(error instanceof Error ? error.message : "מחיקת הקובץ נכשלה.");
    } finally {
      setSavingFileId(null);
    }
  };

  const addTechnicalSpecSection = () => {
    const nextOption = technicalSpecCategoryOptions.find(
      (option) => !technicalSpecDraft.some((section) => section.id === option.id),
    );
    const id = nextOption?.id ?? `other-${Date.now()}`;

    setTechnicalSpecDraft((current) => [
      ...current,
      {
        id,
        title: nextOption?.title ?? "אחר",
        items: [""],
        displayOrder: current.length,
      },
    ]);
  };

  const updateTechnicalSpecSection = (
    sectionId: string,
    patch: Partial<TechnicalSpecSectionData>,
  ) => {
    setTechnicalSpecDraft((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    );
  };

  const moveTechnicalSpecSection = (sectionId: string, direction: -1 | 1) => {
    setTechnicalSpecDraft((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((section, displayOrder) => ({ ...section, displayOrder }));
    });
  };

  const handleGenericPanelSave = () => {
    if (panelSection?.id === "technical") {
      const normalizedSections = technicalSpecDraft
        .map((section, displayOrder) => ({
          ...section,
          title: section.title.trim(),
          items: section.items.map((item) => item.trim()).filter(Boolean),
          displayOrder,
        }))
        .filter((section) => section.title && section.items.length > 0);

      void runPanelSave(
        () => onUpdateTechnicalSpecifications(project.id, normalizedSections),
        "המפרט נשמר בהצלחה",
      );
      return;
    }

    void runPanelSave(() => undefined, "נשמר בהצלחה");
  };

  const handleUploadSubmit = async () => {
    if (!activePanel) return;
    if (isUploading) return;

    const uploadConfig = uploadSectionConfigs[activePanel.id];

    if (!uploadConfig) {
      setUploadError("העלאה עדיין לא זמינה עבור שורה זו.");
      return;
    }

    if (!selectedUploadFile) {
      setUploadError("יש לבחור לפחות קובץ אחד להעלאה.");
      return;
    }

    if (!isUploadFileValid) {
      setUploadError(uploadValidationError || "הקובץ שנבחר אינו תקין.");
      return;
    }

    if (uploadConfig.needsApartment && !uploadApartmentId) {
      setUploadError("יש לבחור דירה לפני העלאת תוכנית.");
      return;
    }

    const selectedExtension = selectedUploadFile.name.split(".").pop()?.toLowerCase();
    const isSpreadsheetImport = Boolean(
      uploadConfig.importKind &&
      (selectedExtension === "xlsx" || selectedExtension === "xls" || selectedExtension === "csv"),
    );

    if (isSpreadsheetImport) {
      if (!spreadsheetPreview) {
        setUploadError("יש להמתין לסיום ניתוח הקובץ ולבדוק את התצוגה המקדימה לפני השמירה.");
        return;
      }

      setIsUploading(true);
      setUploadError("");
      setSuccessMessage("");

      try {
        await onImportProjectData(
          project.id,
          spreadsheetPreview.projectPatch ?? {},
          spreadsheetPreview.apartments,
        );
        resetUploadFileInput();
        setSpreadsheetPreview(null);
        setSuccessMessage("הייבוא נשמר בהצלחה");
        setActivePanel(null);
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? `שמירת הייבוא נכשלה: ${error.message}`
            : "שמירת הייבוא נכשלה. הנתונים הקודמים נשארו ללא שינוי.",
        );
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!uploadConfig.category) {
      setUploadError("לשורה זו ניתן לייבא קובץ XLSX או CSV בלבד.");
      return;
    }

    if (!canUploadProjectFiles) {
      setUploadError(uploadUnavailableMessage);
      return;
    }

    const filesToUpload = uploadConfig.multiple ? selectedUploadFiles : [selectedUploadFile];

    setIsUploading(true);
    setUploadError("");
    setSuccessMessage("");

    try {
      const uploadSettledResults = await Promise.allSettled(
        filesToUpload.map((file) =>
          uploadProjectFile(
            project.id,
            file,
            uploadConfig.category!,
            uploadConfig.needsApartment ? uploadApartmentId : undefined,
            uploadConfig.category === "floor_plan" ? uploadTarget : undefined,
          ),
        ),
      );
      const uploadedFiles = uploadSettledResults.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const results: UploadResultItem[] = uploadSettledResults.map((result, index) => ({
        fileName: filesToUpload[index].name,
        status: result.status === "fulfilled" ? "success" : "error",
        message: result.status === "fulfilled"
          ? "הועלה בהצלחה"
          : result.reason instanceof Error
            ? result.reason.message
            : "ההעלאה נכשלה",
      }));
      const failedResults = results.filter((result) => result.status === "error");
      setUploadResults(results);

      if (uploadedFiles.length === 0) {
        throw new Error(failedResults.map((result) => `${result.fileName}: ${result.message}`).join(" | "));
      }

      let refreshedFileRecords: ProjectFileRecord[];

      try {
        refreshedFileRecords = await listProjectFiles(project.id, uploadConfig.category);
      } catch (refreshError) {
        throw new Error(
          `רענון קבצי הפרויקט נכשל לאחר ההעלאה: ${formatSupabaseErrorDetails(refreshError)}`,
        );
      }

      const projectFileRecords = makeProjectFilesFromUploads(
        uploadConfig.category,
        refreshedFileRecords,
      );
      const projectFilesById = new Map(
        (project.projectFiles ?? []).map((file) => [file.id, file]),
      );
      projectFileRecords.forEach((file) => projectFilesById.set(file.id, file));

      applyUploadedFilesToLocalState(uploadConfig.category, uploadedFiles);
      onUpdateProject(project.id, {
        materialFileCounts: {
          ...project.materialFileCounts,
          [activePanel.id]: (project.materialFileCounts?.[activePanel.id] ?? 0) + uploadedFiles.length,
        },
        projectFiles: Array.from(projectFilesById.values()),
      });
      setUploadedSectionCounts((current) => ({
        ...current,
        [activePanel.id]: (current[activePanel.id] ?? 0) + uploadedFiles.length,
      }));
      resetUploadFileInput();
      setSuccessMessage(`${uploadedFiles.length} קבצים הועלו בהצלחה`);

      if (failedResults.length > 0) {
        setUploadError(
          `${uploadedFiles.length} קבצים הועלו, ${failedResults.length} נכשלו. ` +
          failedResults.map((result) => `${result.fileName}: ${result.message}`).join(" | "),
        );
      } else {
        setActivePanel(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : formatSupabaseErrorDetails(error);

      console.warn("[GOLDLANDS] Supabase upload pipeline failed", errorMessage);
      setUploadError(errorMessage || "העלאת הקובץ נכשלה.");
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
        authModeLabel={authModeLabel}
        onSignOut={onSignOut}
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

        {!activePanel && successMessage && (
          <div className="save-success project-detail-toast" role="status">
            {successMessage}
          </div>
        )}

        {panelSection && activePanel && (
          <div
            className="material-modal-backdrop"
            onClick={closeActivePanel}
          >
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
                <button className="ghost-button ghost-button--compact" onClick={closeActivePanel} type="button">
                  ביטול
                </button>
              </header>
              {successMessage && <span className="save-success">{successMessage}</span>}
              {saveError && (
                <p className="material-modal__note material-modal__note--error" role="alert">
                  {saveError}
                </p>
              )}

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
                    <div className="project-main-image-editor">
                      <div
                        className={validMainImage ? "project-main-image-preview" : "project-main-image-preview project-main-image-preview--empty"}
                        style={validMainImage ? { backgroundImage: `url(${validMainImage})` } : undefined}
                      >
                        {!validMainImage && <strong>לא הוגדרה תמונה ראשית</strong>}
                      </div>
                      {validMainImage && (
                        <button className="ghost-button ghost-button--compact" type="button" onClick={clearProjectMainImage}>
                          הסר תמונה ראשית
                        </button>
                      )}
                      <form
                        className="mock-field-grid"
                        id="project-main-image-form"
                        onSubmit={handleProjectMainImageSubmit}
                      >
                        <label className="mock-field mock-field--wide">
                          <span>בחירת תמונה ראשית מתוך הדמיות / תמונת פרויקט</span>
                          <select name="mainImageFileId" defaultValue="">
                            <option value="" disabled>
                              בחירת קובץ
                            </option>
                            {eligibleMainImageFiles.map((file) => (
                              <option key={file.id} value={file.id}>
                                {file.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </form>
                      {eligibleMainImageFiles.length === 0 && (
                        <p className="material-modal__note">
                          אין כרגע קבצים מסוג הדמיה או תמונת פרויקט לבחירה כתמונה ראשית.
                        </p>
                      )}
                    </div>
                  ) : panelSection.id === "inventory" || panelSection.id === "prices" ? (
                    <div className="inventory-editor">
                      <div className="inventory-editor__note">
                        <div>
                          <strong>מקור נתוני הדירות</strong>
                          <span>אותם נתונים מזינים את המלאי, המחירון ותצוגת הלקוח.</span>
                        </div>
                        <button className="mini-button mini-button--gold" onClick={startAddingApartment} type="button">
                          <Plus size={15} />
                          הוספת דירה
                        </button>
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
                                onClick={() => {
                                  setIsCreatingApartment(false);
                                  setSelectedInventoryApartmentId(apartment.id);
                                }}
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
                                      setIsCreatingApartment(false);
                                      setSelectedInventoryApartmentId(apartment.id);
                                    }}
                                    type="button"
                                  >
                                    עריכה
                                  </button>
                                  <button
                                    className="mini-button mini-button--danger"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setPendingApartmentDelete(apartment);
                                    }}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                    מחיקה
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pendingApartmentDelete && (
                        <div className="inventory-delete-confirmation" role="alertdialog" aria-label={`אישור מחיקת דירה ${pendingApartmentDelete.number}`}>
                          <div>
                            <strong>למחוק את דירה {pendingApartmentDelete.number}?</strong>
                            <span>הדירה תוסר מיד מהמלאי ומהמחירון.</span>
                          </div>
                          <div className="inventory-delete-confirmation__actions">
                            <button className="ghost-button ghost-button--compact" onClick={() => setPendingApartmentDelete(null)} type="button">ביטול</button>
                            <button className="mini-button mini-button--danger" onClick={() => void confirmApartmentDelete()} type="button"><Trash2 size={14} />אישור מחיקה</button>
                          </div>
                        </div>
                      )}
                      {(selectedInventoryApartment || isCreatingApartment) && (
                        <section className="inventory-detail-panel">
                          <header>
                            <h3>
                              {isCreatingApartment
                                ? "הוספת דירה"
                                : `עריכת דירה ${selectedInventoryApartment?.number}`}
                            </h3>
                          </header>
                          <form className="mock-field-grid" id="inventory-detail-form" onSubmit={handleApartmentSubmit}>
                            {selectedInventoryFields.map((field) => (
                              <label
                                className={field.multiline ? "mock-field mock-field--wide" : "mock-field"}
                                key={`${selectedInventoryApartment?.id ?? "new"}-${field.label}`}
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
                  ) : panelSection.id === "technical" ? (
                    <div className="technical-spec-editor">
                      <div className="technical-spec-editor__toolbar">
                        <p>הסעיפים נשמרים בפרויקט ומוצגים בתצוגת הלקוח לפי הסדר הבא.</p>
                        <button className="mini-button mini-button--gold" onClick={addTechnicalSpecSection} type="button">
                          <Plus size={15} />
                          הוספת קטגוריה
                        </button>
                      </div>
                      {technicalSpecDraft.length > 0 ? technicalSpecDraft.map((section, index) => (
                        <section className="technical-spec-editor__section" key={section.id}>
                          <header>
                            <select
                              value={technicalSpecCategoryOptions.some((option) => option.title === section.title) ? section.title : "אחר"}
                              onChange={(event) => updateTechnicalSpecSection(section.id, { title: event.currentTarget.value })}
                            >
                              {technicalSpecCategoryOptions.map((option) => (
                                <option key={option.id} value={option.title}>{option.title}</option>
                              ))}
                            </select>
                            <div className="technical-spec-editor__actions">
                              <button disabled={index === 0} onClick={() => moveTechnicalSpecSection(section.id, -1)} title="העברה למעלה" type="button"><ArrowUp size={16} /></button>
                              <button disabled={index === technicalSpecDraft.length - 1} onClick={() => moveTechnicalSpecSection(section.id, 1)} title="העברה למטה" type="button"><ArrowDown size={16} /></button>
                              <button className="danger-icon-button" onClick={() => setTechnicalSpecDraft((current) => current.filter((item) => item.id !== section.id))} title="מחיקת קטגוריה" type="button"><Trash2 size={16} /></button>
                            </div>
                          </header>
                          <textarea
                            onChange={(event) => updateTechnicalSpecSection(section.id, { items: event.currentTarget.value.split("\n") })}
                            placeholder="סעיף אחד בכל שורה"
                            rows={5}
                            value={section.items.join("\n")}
                          />
                        </section>
                      )) : (
                        <div className="empty-state compact-empty-state">
                          <h3>אין עדיין מפרט לפרויקט</h3>
                          <p>הוסיפי קטגוריה וסעיפים כדי להציג מפרט אמיתי.</p>
                        </div>
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
                  {panelSection.id === "logo" && (
                    <p className="material-modal__note">
                      הלוגו יופיע בכרטיס הפרויקט ובכל מסכי התצוגה.
                    </p>
                  )}
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
                  <FileDropZone
                    accept={activeUploadConfig?.accept ?? ""}
                    ariaLabel={`העלאת ${panelSection.title}`}
                    description={
                      activeUploadConfig?.importKind && !activeUploadConfig.category
                        ? "קובצי XLSX או CSV. מספר הדירה נדרש בייבוא מלאי ומחירון."
                        : activeUploadKind === "image"
                        ? "קבצי תמונה נתמכים: jpg, jpeg, png, webp. עד 25MB."
                        : "קבצים נתמכים: pdf, ppt, pptx, doc, docx, xls, xlsx, csv. עד 25MB."
                    }
                    disabled={isUploading || isParsingSpreadsheet}
                    error={uploadValidationError || uploadError}
                    files={selectedUploadFiles}
                    multiple={activeUploadConfig?.multiple}
                    notice={uploadSelectionNotice}
                    onFilesSelected={(files) => void handleUploadFilesSelected(files)}
                  />
                  {isParsingSpreadsheet && <p className="material-modal__note">קוראת את הקובץ ומכינה תצוגה מקדימה...</p>}
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
                  {activeUploadConfig?.category === "floor_plan" && (
                    <label className="mock-field mock-field--wide upload-apartment-field">
                      <span>שיוך תכנית הקומה</span>
                      <select onChange={(event) => setUploadTarget(event.currentTarget.value)} value={uploadTarget}>
                        {floorPlanTargets.map((target) => <option key={target} value={target}>{target}</option>)}
                      </select>
                    </label>
                  )}
                  {spreadsheetPreview && (
                    <section className="spreadsheet-preview" aria-label="תצוגה מקדימה לייבוא">
                      <header>
                        <div><strong>{spreadsheetPreview.fileName}</strong><span>{spreadsheetPreview.rowCount} שורות זוהו</span></div>
                        <small>לא ייכתב דבר לפני לחיצה על אישור הייבוא.</small>
                      </header>
                      <div className="spreadsheet-preview__meta">
                        <span>שדות: {spreadsheetPreview.recognizedFields.join(", ")}</span>
                        <span>שורות שלא נקלטו: {spreadsheetPreview.skippedRows.length}</span>
                        <span>סתירות: {spreadsheetPreview.conflicts.length}</span>
                      </div>
                      {spreadsheetPreview.conflicts.length > 0 && (
                        <ul className="spreadsheet-preview__warnings">
                          {spreadsheetPreview.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}
                        </ul>
                      )}
                      {spreadsheetPreview.skippedRows.length > 0 && (
                        <ul className="spreadsheet-preview__warnings">
                          {spreadsheetPreview.skippedRows.map((row) => <li key={`${row.rowNumber}-${row.reason}`}>שורה {row.rowNumber}: {row.reason}</li>)}
                        </ul>
                      )}
                      <div className="table-wrap">
                        <table className="lux-table spreadsheet-preview__table">
                          <thead><tr>{Object.keys(spreadsheetPreview.previewRows[0] ?? {}).map((header) => <th key={header}>{header}</th>)}</tr></thead>
                          <tbody>{spreadsheetPreview.previewRows.slice(0, 12).map((row, index) => (
                            <tr key={index}>{Object.keys(spreadsheetPreview.previewRows[0] ?? {}).map((header) => <td key={header}>{row[header] ?? "-"}</td>)}</tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </section>
                  )}
                  {uploadResults.length > 0 && (
                    <ul className="upload-result-list" aria-label="תוצאות העלאה">
                      {uploadResults.map((result) => (
                        <li className={`upload-result-list__item upload-result-list__item--${result.status}`} key={result.fileName}>
                          <strong>{result.fileName}</strong><span>{result.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <footer className="material-modal__footer">
                <button className="ghost-button ghost-button--compact" onClick={closeActivePanel} type="button">
                  ביטול
                </button>
                <button
                  className="gold-button gold-button--compact"
                  disabled={
                    isSaving ||
                    isParsingSpreadsheet ||
                    (isUploadPanel &&
                      (!selectedUploadFile || !isUploadFileValid || isUploading))
                  }
                  form={activeSaveFormId}
                  onClick={
                    isUploadPanel
                      ? () => void handleUploadSubmit()
                      : activeSaveFormId
                        ? undefined
                        : handleGenericPanelSave
                  }
                  type={activeSaveFormId ? "submit" : "button"}
                >
                  {isUploading ? "מעלה..." : isSaving ? "שומר..." : isUploadPanel && spreadsheetPreview ? "אישור וייבוא" : isUploadPanel ? "העלאה" : "שמירה"}
                </button>
              </footer>
            </section>
          </div>
        )}

        <nav className="project-detail-tabs" aria-label="לשוניות ניהול פרויקט">
          <button
            className={activeProjectTab === "materials" ? "project-detail-tab project-detail-tab--active" : "project-detail-tab"}
            type="button"
            onClick={() => setActiveProjectTab("materials")}
          >
            חומרים
          </button>
          <button
            className={activeProjectTab === "files" ? "project-detail-tab project-detail-tab--active" : "project-detail-tab"}
            type="button"
            onClick={() => setActiveProjectTab("files")}
          >
            קבצים
          </button>
        </nav>

        {activeProjectTab === "materials" ? (
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
                            {uploadSectionConfigs[section.id] && (
                              <button
                                className={isFileFirst ? "mini-button mini-button--gold" : "mini-button mini-button--ghost"}
                                onClick={() => openPanel(section.id, "upload")}
                                type="button"
                              >
                                <UploadCloud size={14} />
                                ייבוא / העלאה
                              </button>
                            )}
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
        ) : (
          <section className="project-material-list-card project-files-card" aria-label="קבצי פרויקט">
            {fileSaveError && (
              <p className="material-modal__note material-modal__note--error" role="alert">
                {fileSaveError}
              </p>
            )}
            {(project.projectFiles ?? []).length > 0 ? (
              <div className="table-wrap">
                <table className="lux-table project-files-table">
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>סוג</th>
                      <th>גודל</th>
                      <th>תאריך</th>
                      <th>פתיחה</th>
                      <th>יעד</th>
                      <th>שינוי שיוך</th>
                      <th>תמונה ראשית</th>
                      <th>מחיקה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.projectFiles ?? []).map((file) => (
                      <tr key={file.id}>
                        <td>
                          <strong className="project-file-name">{file.name}</strong>
                        </td>
                        <td>{file.type}</td>
                        <td>{formatProjectFileSize(file.sizeBytes)}</td>
                        <td>{formatProjectFileDate(file.uploadedAt)}</td>
                        <td>
                          {file.url ? (
                            <a className="mini-button mini-button--ghost" href={file.url} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} />
                              פתיחה
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {file.type === "תכנית קומה" ? (
                            <select
                              className="project-file-type-select"
                              disabled={savingFileId === file.id}
                              onChange={(event) => void handleProjectFileTargetChange(file.id, event.currentTarget.value)}
                              value={file.target}
                            >
                              {floorPlanTargets.map((target) => <option key={target} value={target}>{target}</option>)}
                            </select>
                          ) : (
                            file.target || "-"
                          )}
                        </td>
                        <td>
                          <select
                            className="project-file-type-select"
                            disabled={savingFileId === file.id}
                            value={file.type}
                            onChange={(event) =>
                              handleProjectFileTypeChange(
                                file.id,
                                event.currentTarget.value as ProjectFileAssociation,
                              )
                            }
                          >
                            {projectFileAssociationOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {canUseFileAsProjectMainImage(file) ? (
                            isProjectFileMainImage(project, file) ? (
                              <span className="status-pill">תמונה ראשית</span>
                            ) : (
                              <button
                                className="mini-button mini-button--ghost"
                                disabled={savingFileId === file.id}
                                type="button"
                                onClick={() => setProjectMainImageFromFile(file)}
                              >
                                {savingFileId === file.id ? "שומר..." : "בחרי"}
                              </button>
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <button
                            className="mini-button mini-button--danger"
                            disabled={savingFileId === file.id}
                            type="button"
                            onClick={() => handleProjectFileDelete(file.id)}
                          >
                            <Trash2 size={14} />
                            {savingFileId === file.id ? "שומר..." : "מחיקה"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="project-files-empty">לא הועלו קבצים לפרויקט הזה עדיין.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
