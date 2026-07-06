import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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
import { formatPrice } from "../utils/format";
import type { Apartment, ApartmentStatus, Project, ProjectReadiness } from "../types";

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
  onUpdateApartment: (apartmentId: string, patch: Partial<Apartment>) => void;
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

function getNumberValue(formData: FormData, name: string) {
  const raw = getFormValue(formData, name).replace(/[^\d.-]/g, "");
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
  const [successMessage, setSuccessMessage] = useState("");

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

      return {
        ...section,
        lastUpdated: section.lastUpdated ?? readiness?.lastUpdated ?? "לא עודכן",
        fields: manualFields[section.id] ?? fileMetadataFields,
      };
    });
  }, [apartments, project, readiness]);

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
          : undefined;
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
  const selectedInventoryApartment =
    apartments.find((apartment) => apartment.id === selectedInventoryApartmentId) ?? apartments[0];
  const selectedInventoryFields: ManualField[] = selectedInventoryApartment
    ? [
        { label: "מספר דירה", name: "number", value: selectedInventoryApartment.number },
        { label: "קומה", name: "floor", value: String(selectedInventoryApartment.floor) },
        { label: "חדרים", name: "rooms", value: String(selectedInventoryApartment.rooms) },
        { label: "שטח דירה", name: "apartmentArea", value: String(selectedInventoryApartment.apartmentArea) },
        { label: "שטח מרפסת", name: "balconyArea", value: String(selectedInventoryApartment.balconyArea) },
        {
          label: "שטח גינה",
          name: "gardenArea",
          value: selectedInventoryApartment.gardenArea
            ? String(selectedInventoryApartment.gardenArea)
            : "0",
        },
        { label: "חניה", name: "parking", value: selectedInventoryApartment.parking },
        { label: "מחסן", name: "storage", value: selectedInventoryApartment.storage },
        { label: "כיוון", name: "direction", value: selectedInventoryApartment.direction },
        { label: "מחיר", name: "price", value: String(selectedInventoryApartment.price) },
        { label: "מחיר מיוחד", name: "specialPrice", value: String(selectedInventoryApartment.specialPrice) },
        {
          label: "סטטוס",
          name: "status",
          value: selectedInventoryApartment.status,
          options: apartmentStatusOptions,
        },
        {
          label: "קובץ תוכנית מצורף",
          name: "planAttached",
          value: selectedInventoryApartment.planAttached ? "yes" : "no",
          options: [
            { label: "כן", value: "yes" },
            { label: "לא", value: "no" },
          ],
        },
        { label: "הערות", name: "notes", value: selectedInventoryApartment.notes, multiline: true },
      ]
    : [];

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

  const openPanel = (id: string, mode: PanelMode) => {
    if ((id === "details" || id === "logo") && mode === "manual") {
      setProjectDetailsForm(makeProjectDetailsFormState(project, readiness));
    }
    if (id === "inventory" && !selectedInventoryApartmentId) {
      setSelectedInventoryApartmentId(apartments[0]?.id ?? null);
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
  };

  const handleProjectLogoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const projectLogo = getFormValue(formData, "projectLogo");

    onUpdateProject(project.id, { projectLogo });
    setProjectDetailsForm((current) => ({ ...current, projectLogo }));
    setSuccessMessage("לוגו הפרויקט נשמר מקומית");
  };

  const handleApartmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedInventoryApartment) return;

    const formData = new FormData(event.currentTarget);
    onUpdateApartment(selectedInventoryApartment.id, {
      number: getFormValue(formData, "number"),
      floor: getNumberValue(formData, "floor"),
      rooms: getNumberValue(formData, "rooms"),
      apartmentArea: getNumberValue(formData, "apartmentArea"),
      balconyArea: getNumberValue(formData, "balconyArea"),
      gardenArea: getNumberValue(formData, "gardenArea"),
      parking: getFormValue(formData, "parking"),
      storage: getFormValue(formData, "storage"),
      direction: getFormValue(formData, "direction"),
      price: getNumberValue(formData, "price"),
      specialPrice: getNumberValue(formData, "specialPrice"),
      status: getFormValue(formData, "status") as ApartmentStatus,
      planAttached: getFormValue(formData, "planAttached") === "yes",
      notes: getFormValue(formData, "notes"),
    });
    setSuccessMessage("נשמר בהצלחה");
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
                                  <select name={field.name} defaultValue={field.value}>
                                    {field.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.multiline ? (
                                  <textarea name={field.name} defaultValue={field.value} rows={3} />
                                ) : (
                                  <input name={field.name} defaultValue={field.value} />
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
                      <strong>גרירת קבצים לכאן</strong>
                      <p>
                        {panelSection.id === "logo"
                          ? "בהמשך כאן יועלה לוגו הפרויקט שיופיע בכרטיס הפרויקט ובכל מסכי התצוגה."
                          : `אזור דמו להעלאת קבצים או ייבוא חומרים עבור ${panelSection.title}.`}
                      </p>
                    </div>
                    <button className="gold-button gold-button--compact" type="button">
                      בחירת קבצים
                    </button>
                  </div>
                  <p className="material-modal__note">
                    {panelSection.id === "logo"
                      ? "בהמשך כאן יועלה לוגו הפרויקט שיופיע בכרטיס הפרויקט ובכל מסכי התצוגה."
                      : "בשלב זה מדובר בהדמיה בלבד"}
                  </p>
                </>
              )}

              <footer className="material-modal__footer">
                <button className="ghost-button ghost-button--compact" onClick={() => setActivePanel(null)} type="button">
                  ביטול
                </button>
                <button
                  className="gold-button gold-button--compact"
                  form={activeSaveFormId}
                  onClick={activeSaveFormId ? undefined : () => setActivePanel(null)}
                  type={activeSaveFormId ? "submit" : "button"}
                >
                  שמירה
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
