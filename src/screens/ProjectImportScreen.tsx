import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Trash2, WandSparkles, X } from "lucide-react";
import { FileDropZone } from "../components/FileDropZone";
import { SideNavigation } from "../components/SideNavigation";
import { karlNetterImportBundle, type ProjectImportBundle } from "../data/karlNetterImport";
import { formatPrice } from "../utils/format";
import type { Apartment, Project, ProjectFile, ProjectFileAssociation, ProjectReadiness } from "../types";

interface ProjectImportScreenProps {
  projects: Project[];
  apartments: Apartment[];
  readinessItems: ProjectReadiness[];
  onProjects: () => void;
  onReadiness: () => void;
  onAdmin: () => void;
  onImport: (bundle: ProjectImportBundle) => void;
  onOpenProject: (projectId: string) => void;
  canViewReadiness?: boolean;
  canManageProjects?: boolean;
  authModeLabel?: string;
  onSignOut?: () => void;
}

const acceptedExtensions = ["pdf", "jpg", "jpeg", "png", "webp", "xlsx", "xls", "csv", "ppt", "pptx", "doc", "docx"];
const importAccept = ".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.ppt,.pptx,.doc,.docx";
const maxImportFileSizeBytes = 25 * 1024 * 1024;

const fileAssociationOptions: ProjectFileAssociation[] = [
  "מחירון",
  "תכנית דירה",
  "מצגת",
  "הדמיה",
  "תמונת פרויקט",
  "מפרט",
  "משפטי",
  "אחר",
];

interface SelectedImportFile {
  id: string;
  file: File;
  type: ProjectFileAssociation;
  target: string;
  url: string;
}

interface AnalysisResult {
  mode: "identified" | "manual";
  projectId: string;
}

type ImportSectionId = "projectDetails" | "apartments" | "technical" | "images" | "files" | "conflicts";
type ExtractedFieldKey =
  | "name"
  | "city"
  | "neighborhood"
  | "address"
  | "tagline"
  | "block"
  | "parcel"
  | "projectType"
  | "planningStatus"
  | "units"
  | "developerUnits"
  | "ownerUnits"
  | "occupancy";

interface ExtractedField {
  key: ExtractedFieldKey;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
}

interface ImportConflict {
  id: string;
  section: ImportSectionId;
  fieldKey: ExtractedFieldKey;
  label: string;
  existingValue: string;
  presentationValue: string;
}

interface ExtractedApartment {
  number: string;
  floor: number;
  rooms: number;
  apartmentArea: number;
  balconyArea: number;
  direction: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  source: string;
}

interface ExtractedImage {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
}

interface PresentationAnalysis {
  rawText: string;
  fields: ExtractedField[];
  technicalSpec: string[];
  apartments: ExtractedApartment[];
  images: ExtractedImage[];
  conflicts: ImportConflict[];
  reviewNotes: string[];
}

const importSectionLabels: Record<ImportSectionId, string> = {
  projectDetails: "פרטי פרויקט",
  apartments: "דירות",
  technical: "מפרט",
  images: "תמונות",
  files: "קבצים",
  conflicts: "סתירות",
};

const defaultApprovedSections: Record<ImportSectionId, boolean> = {
  projectDetails: true,
  apartments: true,
  technical: true,
  images: false,
  files: true,
  conflicts: true,
};

const extractedFieldLabels: Record<ExtractedFieldKey, string> = {
  name: "שם פרויקט",
  city: "עיר",
  neighborhood: "שכונה",
  address: "כתובת",
  tagline: "תיאור שיווקי",
  block: "גוש",
  parcel: "חלקה",
  projectType: "מסלול רישוי / סוג פרויקט",
  planningStatus: "סטטוס תכנוני",
  units: "מספר יחידות",
  developerUnits: "דירות יזם",
  ownerUnits: "דירות בעלים",
  occupancy: "צפי סיום",
};

function classifyFile(name: string): { type: ProjectFileAssociation; target: string } {
  const normalized = name.toLowerCase();
  if (normalized.includes("מחירון") || normalized.includes("price") || normalized.endsWith(".xlsx") || normalized.endsWith(".xls") || normalized.endsWith(".csv")) {
    return { type: "מחירון", target: "מחירים ונתוני דירות" };
  }
  if (normalized.includes("מצגת") || normalized.includes("presentation") || normalized.endsWith(".pptx") || normalized.endsWith(".ppt")) {
    return { type: "מצגת", target: "פרטי פרויקט, מפרט ותמונות" };
  }
  if (normalized.includes("מפרט") || normalized.includes("spec")) {
    return { type: "מפרט", target: "מפרט טכני" };
  }
  if (normalized.includes("חוזה") || normalized.includes("משפט") || normalized.includes("נסח") || normalized.includes("legal")) {
    return { type: "משפטי", target: "מסמכים משפטיים" };
  }
  if (normalized.includes("דירה") || normalized.includes("תכנית") || normalized.includes("תוכנית") || normalized.includes("apartment") || normalized.includes("plan")) {
    return { type: "תכנית דירה", target: "שיוך לדירות לפי שם הקובץ" };
  }
  return { type: "אחר", target: "מסמכי הפרויקט" };
}

function makeSelectedImportFile(file: File): SelectedImportFile {
  return {
    id: `${file.name}-${file.size}`,
    file,
    ...classifyFile(file.name),
    url: URL.createObjectURL(file),
  };
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
  if (sizeBytes >= 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${sizeBytes} B`;
}

function isImageFile(file: ProjectFile) {
  return /\.(jpe?g|png|webp)$/i.test(file.name) || file.mimeType?.startsWith("image/");
}

function isPresentationFile(file: File | ProjectFile) {
  const mimeType = "mimeType" in file ? file.mimeType : file.type;

  return /\.(pptx?)$/i.test(file.name) || /מצגת|presentation/i.test(file.name) || mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function copyToArrayBuffer(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);

  return copy.buffer;
}

async function inflateRaw(data: Uint8Array) {
  const DecompressionStreamCtor = (globalThis as typeof globalThis & {
    DecompressionStream?: new (format: string) => DecompressionStream;
  }).DecompressionStream;

  if (!DecompressionStreamCtor) return null;

  const stream = new Blob([copyToArrayBuffer(data)]).stream().pipeThrough(new DecompressionStreamCtor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let eocdOffset = -1;

  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 66000); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) return [];

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries: Array<{ name: string; data: Uint8Array }> = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;

    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
    let data: Uint8Array | null = null;

    if (compression === 0) data = compressedData;
    if (compression === 8) data = await inflateRaw(compressedData);
    if (data) entries.push({ name, data });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function extractPptxContent(item: SelectedImportFile) {
  try {
    const entries = await readZipEntries(item.file);
    const decoder = new TextDecoder();
    const textParts: string[] = [];
    const images: ExtractedImage[] = [];

    entries.forEach((entry) => {
      if (/^ppt\/slides\/slide\d+\.xml$/i.test(entry.name)) {
        const xml = decoder.decode(entry.data);
        const text = Array.from(xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g))
          .map((match) => decodeXmlEntities(match[1]))
          .join(" ");

        if (text.trim()) textParts.push(text);
      }

      if (/^ppt\/media\/.+\.(png|jpe?g|webp)$/i.test(entry.name)) {
        const extension = getExtension(entry.name);
        const blob = new Blob(
          [copyToArrayBuffer(entry.data)],
          { type: `image/${extension === "jpg" ? "jpeg" : extension}` },
        );
        const name = entry.name.split("/").pop() ?? entry.name;

        images.push({
          id: `${item.id}-${entry.name}`,
          name,
          url: URL.createObjectURL(blob),
          sizeBytes: entry.data.byteLength,
          confidence: "medium",
          needsReview: true,
        });
      }
    });

    return { text: textParts.join("\n"), images };
  } catch {
    return { text: "", images: [] };
  }
}

async function extractImportContent(items: SelectedImportFile[]) {
  const textParts: string[] = [];
  const images: ExtractedImage[] = [];

  for (const item of items) {
    const extension = getExtension(item.file.name);

    if (extension === "pptx") {
      const extracted = await extractPptxContent(item);
      textParts.push(extracted.text);
      images.push(...extracted.images);
      continue;
    }

    if (item.file.type.startsWith("image/")) {
      images.push({
        id: item.id,
        name: item.file.name,
        url: item.url,
        sizeBytes: item.file.size,
        confidence: item.type === "הדמיה" || item.type === "תמונת פרויקט" ? "high" : "medium",
        needsReview: true,
      });
      continue;
    }

    try {
      textParts.push(await item.file.slice(0, 220_000).text());
    } catch {
      textParts.push("");
    }
  }

  return { text: textParts.join("\n"), images };
}

function projectIdentityTerms(project: Project) {
  return [
    project.name,
    project.address,
    project.location,
    project.neighborhood,
    `${project.address} ${project.city}`,
    `${project.name} ${project.city}`,
  ]
    .map(normalizeSearchText)
    .filter((term) => term.length >= 3);
}

function scoreProjectIdentity(project: Project, searchText: string) {
  const terms = projectIdentityTerms(project);
  let score = 0;

  terms.forEach((term) => {
    if (searchText.includes(term)) score += term.length >= 8 ? 8 : 3;
  });

  normalizeSearchText(project.name)
    .split(" ")
    .filter((word) => word.length >= 3)
    .forEach((word) => {
      if (searchText.includes(word)) score += 2;
    });

  return score;
}

function findIdentifiedProject(projects: Project[], searchText: string) {
  const scoredProjects = projects
    .map((project) => ({ project, score: scoreProjectIdentity(project, searchText) }))
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score);

  return scoredProjects[0]?.project;
}

async function readFileSearchText(item: SelectedImportFile) {
  if (item.file.type.startsWith("image/")) return "";

  try {
    return await item.file.slice(0, 160_000).text();
  } catch {
    return "";
  }
}

function compactLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n| {2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractLabeledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const expression = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n|]{2,80})`, "i");
    const match = text.match(expression);

    if (match?.[1]) {
      return match[1].replace(/[•|]+$/g, "").trim();
    }
  }

  return "";
}

function extractFirstNumber(text: string, labels: string[]) {
  const value = extractLabeledValue(text, labels);
  const labeledNumber = value.match(/\d+/)?.[0];

  if (labeledNumber) return labeledNumber;

  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\D{0,16}(\\d+)`, "i"));
    if (match?.[1]) return match[1];
  }

  return "";
}

function makeExtractedField(
  key: ExtractedFieldKey,
  value: string,
  confidence: ExtractedField["confidence"] = "high",
): ExtractedField | null {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  return {
    key,
    label: extractedFieldLabels[key],
    value: cleanValue,
    confidence,
    needsReview: confidence !== "high",
  };
}

function inferProjectType(text: string) {
  if (/38\/1|תמ[״"]?א\s*38\s*\/\s*1/i.test(text)) return "תמ״א 38/1";
  if (/38\/2|פינוי|בינוי/i.test(text)) return "תמ״א 38/2 / פינוי בינוי";
  if (/חדש|בנייה חדשה/i.test(text)) return "פרויקט חדש";

  return "";
}

function extractProjectFields(text: string, identifiedProject?: Project) {
  const lines = compactLines(text);
  const longMarketingLine = lines.find(
    (line) =>
      line.length > 45 &&
      /מגורים|פרויקט|יוקר|איכות|שכונה|לב|דירות/.test(line) &&
      !/מחיר|קומה|חדרים/.test(line),
  );
  const fields = [
    makeExtractedField("name", extractLabeledValue(text, ["שם פרויקט", "פרויקט"]) || (identifiedProject && text.includes(identifiedProject.name) ? identifiedProject.name : ""), identifiedProject ? "high" : "medium"),
    makeExtractedField("city", extractLabeledValue(text, ["עיר"]) || (identifiedProject && text.includes(identifiedProject.city) ? identifiedProject.city : ""), identifiedProject ? "high" : "medium"),
    makeExtractedField("neighborhood", extractLabeledValue(text, ["שכונה"]) || (identifiedProject && text.includes(identifiedProject.neighborhood) ? identifiedProject.neighborhood : ""), identifiedProject ? "high" : "medium"),
    makeExtractedField("address", extractLabeledValue(text, ["כתובת", "רחוב"]) || (identifiedProject && text.includes(identifiedProject.address) ? identifiedProject.address : ""), identifiedProject ? "high" : "medium"),
    makeExtractedField("tagline", extractLabeledValue(text, ["תיאור שיווקי", "תיאור", "חזון"]) || longMarketingLine || "", longMarketingLine ? "medium" : "low"),
    makeExtractedField("block", extractFirstNumber(text, ["גוש"])),
    makeExtractedField("parcel", extractFirstNumber(text, ["חלקה"])),
    makeExtractedField("projectType", extractLabeledValue(text, ["סוג פרויקט", "מסלול רישוי"]) || inferProjectType(text)),
    makeExtractedField("planningStatus", extractLabeledValue(text, ["סטטוס תכנוני", "מצב תכנוני", "סטטוס"])),
    makeExtractedField("units", extractFirstNumber(text, ["מספר יחידות", "יחידות דיור", "יחידות", "דירות"])),
    makeExtractedField("developerUnits", extractFirstNumber(text, ["דירות יזם", "יזם"])),
    makeExtractedField("ownerUnits", extractFirstNumber(text, ["דירות בעלים", "בעלים"])),
    makeExtractedField("occupancy", extractLabeledValue(text, ["צפי סיום", "צפי אכלוס", "אכלוס"]), "medium"),
  ].filter((field): field is ExtractedField => Boolean(field));

  return fields;
}

function extractTechnicalSpec(text: string) {
  const keywords = ["מטבח", "ריצוף", "מיזוג", "אלומיניום", "דלת", "חשמל", "אינסטלציה", "חניה", "מחסן", "לובי", "חיפוי", "כלים סניטריים"];
  const seen = new Set<string>();

  return compactLines(text)
    .filter((line) => line.length >= 8 && keywords.some((keyword) => line.includes(keyword)))
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => {
      const key = normalizeSearchText(line);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 16);
}

function toNumber(value: string | undefined) {
  return Number(value?.replace(/[^\d.]/g, "")) || 0;
}

function extractApartmentsFromText(text: string, selectedItems: SelectedImportFile[]) {
  const apartmentsByNumber = new Map<string, ExtractedApartment>();
  const apartmentPattern = /(?:דירה|apartment)\s*(\d{1,3})([\s\S]{0,260}?)(?=דירה\s*\d{1,3}|apartment\s*\d{1,3}|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = apartmentPattern.exec(text))) {
    const [, number, chunk] = match;
    const floor = toNumber(chunk.match(/(?:קומה|floor)\D{0,12}(\d{1,2})/i)?.[1]);
    const rooms = toNumber(chunk.match(/(?:חדרים|rooms)\D{0,12}(\d(?:\.\d)?)/i)?.[1]);
    const apartmentArea = toNumber(chunk.match(/(?:שטח|מ["״]?ר|area)\D{0,12}(\d{2,3})/i)?.[1]);
    const balconyArea = toNumber(chunk.match(/(?:מרפסת|balcony)\D{0,12}(\d{1,3})/i)?.[1]);
    const direction = chunk.match(/(?:כיווני אוויר|כיוון|direction)\s*[:\-]?\s*([^\n|]{2,35})/i)?.[1]?.trim() ?? "";
    const confidence: ExtractedApartment["confidence"] =
      floor && rooms && apartmentArea ? "high" : apartmentArea || rooms ? "medium" : "low";

    apartmentsByNumber.set(number, {
      number,
      floor,
      rooms,
      apartmentArea,
      balconyArea,
      direction,
      confidence,
      needsReview: confidence !== "high",
      source: "מצגת",
    });
  }

  selectedItems.forEach((item) => {
    const number = item.file.name.match(/(?:דירה|apartment)[^\d]*(\d{1,3})/i)?.[1];
    if (!number || apartmentsByNumber.has(number)) return;

    apartmentsByNumber.set(number, {
      number,
      floor: 0,
      rooms: 0,
      apartmentArea: 0,
      balconyArea: 0,
      direction: "",
      confidence: "low",
      needsReview: true,
      source: item.file.name,
    });
  });

  return Array.from(apartmentsByNumber.values());
}

function getExistingFieldValue(project: Project, key: ExtractedFieldKey) {
  const values: Record<ExtractedFieldKey, string> = {
    name: project.name,
    city: project.city,
    neighborhood: project.neighborhood,
    address: project.address,
    tagline: project.tagline,
    block: project.block ?? "",
    parcel: project.parcel ?? "",
    projectType: project.projectType,
    planningStatus: project.planningStatus ?? "",
    units: project.stats.units,
    developerUnits: project.developerUnits ?? "",
    ownerUnits: project.ownerUnits ?? "",
    occupancy: project.stats.occupancy,
  };

  return values[key] ?? "";
}

function findConflicts(project: Project, fields: ExtractedField[]) {
  return fields
    .filter((field) => {
      const existingValue = getExistingFieldValue(project, field.key);
      return existingValue && normalizeSearchText(existingValue) !== normalizeSearchText(field.value);
    })
    .map((field) => ({
      id: `project-${field.key}`,
      section: "projectDetails" as ImportSectionId,
      fieldKey: field.key,
      label: field.label,
      existingValue: getExistingFieldValue(project, field.key),
      presentationValue: field.value,
    }));
}

function buildReviewNotes(fields: ExtractedField[], apartments: ExtractedApartment[], technicalSpec: string[]) {
  const notes: string[] = [];

  fields.filter((field) => field.needsReview).forEach((field) => {
    notes.push(`${field.label}: דורש בדיקה`);
  });
  apartments.filter((apartment) => apartment.needsReview).forEach((apartment) => {
    notes.push(`דירה ${apartment.number}: דורשת בדיקה`);
  });
  if (technicalSpec.length === 0) notes.push("מפרט טכני: דורש בדיקה");

  return notes;
}

async function analyzePresentationFiles(
  selectedItems: SelectedImportFile[],
  project: Project,
): Promise<PresentationAnalysis> {
  const content = await extractImportContent(selectedItems);
  const rawText = content.text;
  const fields = extractProjectFields(rawText, project);
  const technicalSpec = extractTechnicalSpec(rawText);
  const extractedApartments = extractApartmentsFromText(rawText, selectedItems);
  const conflicts = findConflicts(project, fields);
  const reviewNotes = buildReviewNotes(fields, extractedApartments, technicalSpec);

  return {
    rawText,
    fields,
    technicalSpec,
    apartments: extractedApartments,
    images: content.images,
    conflicts,
    reviewNotes,
  };
}

export function ProjectImportScreen({
  projects,
  apartments,
  readinessItems,
  onProjects,
  onReadiness,
  onAdmin,
  onImport,
  onOpenProject,
  canViewReadiness = true,
  canManageProjects = true,
  authModeLabel,
  onSignOut,
}: ProjectImportScreenProps) {
  const [stage, setStage] = useState<"ready" | "review" | "done">("ready");
  const [selectedFiles, setSelectedFiles] = useState<SelectedImportFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [presentationAnalysis, setPresentationAnalysis] = useState<PresentationAnalysis | null>(null);
  const [approvedSections, setApprovedSections] =
    useState<Record<ImportSectionId, boolean>>(defaultApprovedSections);
  const [conflictChoices, setConflictChoices] = useState<Record<string, "existing" | "presentation">>({});
  const [approvedMainImageUrl, setApprovedMainImageUrl] = useState("");
  const [manualProjectId, setManualProjectId] = useState(projects[0]?.id ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const bundle = karlNetterImportBundle;
  const projectCandidates = useMemo(() => {
    const byId = new Map<string, Project>();

    projects.forEach((project) => byId.set(project.id, project));
    byId.set(bundle.project.id, bundle.project);

    return Array.from(byId.values());
  }, [bundle.project, projects]);

  const addFiles = (incoming: File[]) => {
    const existingKeys = new Set(selectedFiles.map((item) => `${item.file.name}-${item.file.size}`));
    const nextKeys = new Set<string>();
    let duplicateCount = 0;
    let unsupportedCount = 0;
    let oversizedCount = 0;

    const valid = incoming.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const key = `${file.name}-${file.size}`;

      if (!acceptedExtensions.includes(extension)) {
        unsupportedCount += 1;
        return false;
      }

      if (file.size > maxImportFileSizeBytes) {
        oversizedCount += 1;
        return false;
      }

      if (existingKeys.has(key) || nextKeys.has(key)) {
        duplicateCount += 1;
        return false;
      }

      nextKeys.add(key);
      return true;
    });

    setSelectedFiles((current) => {
      const byKey = new Map(current.map((item) => [`${item.file.name}-${item.file.size}`, item]));
      valid.forEach((file) => {
        const nextFile = makeSelectedImportFile(file);
        byKey.set(`${file.name}-${file.size}`, nextFile);
      });
      return Array.from(byKey.values());
    });

    const messages = [
      unsupportedCount ? "חלק מהקבצים לא נתמכו ולא נוספו." : "",
      oversizedCount ? "חלק מהקבצים גדולים מדי. ניתן להעלות קבצים עד 25MB." : "",
      duplicateCount ? "קובץ בשם וגודל זה כבר קיים ברשימה ולא נוסף שוב." : "",
    ].filter(Boolean);
    setError(messages.join(" "));
  };

  useEffect(() => {
    if (!projects.length) {
      setManualProjectId("");
      return;
    }

    if (!projects.some((project) => project.id === manualProjectId)) {
      setManualProjectId(projects[0].id);
    }
  }, [manualProjectId, projects]);

  const analyzeFiles = async () => {
    if (!selectedFiles.length) {
      setError("יש לבחור או לגרור קבצים לפני הניתוח.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setPresentationAnalysis(null);

    const contentParts = await Promise.all(selectedFiles.map(readFileSearchText));
    const searchText = normalizeSearchText(
      [
        ...selectedFiles.map((item) => `${item.file.name} ${item.target}`),
        ...contentParts,
      ].join(" "),
    );
    const identifiedProject = findIdentifiedProject(projectCandidates, searchText);
    const onlyApartmentPlans = selectedFiles.every((item) => item.type === "תכנית דירה");

    if (identifiedProject) {
      const analysis = await analyzePresentationFiles(selectedFiles, identifiedProject);

      setAnalysisResult({ mode: "identified", projectId: identifiedProject.id });
      setManualProjectId(identifiedProject.id);
      setPresentationAnalysis(analysis);
      setConflictChoices(
        Object.fromEntries(analysis.conflicts.map((conflict) => [conflict.id, "existing"])),
      );
      setApprovedSections(defaultApprovedSections);
      setApprovedMainImageUrl("");
      setIsAnalyzing(false);
      setStage("review");
      return;
    }

    if (onlyApartmentPlans) {
      const manualProject = projects.find((project) => project.id === manualProjectId) ?? projects[0] ?? bundle.project;
      const analysis = await analyzePresentationFiles(selectedFiles, manualProject);

      setAnalysisResult({ mode: "manual", projectId: manualProjectId || projects[0]?.id || "" });
      setPresentationAnalysis(analysis);
      setConflictChoices(
        Object.fromEntries(analysis.conflicts.map((conflict) => [conflict.id, "existing"])),
      );
      setApprovedSections({
        ...defaultApprovedSections,
        projectDetails: false,
        technical: false,
        images: false,
      });
      setApprovedMainImageUrl("");
      setIsAnalyzing(false);
      setStage("review");
      return;
    }

    setAnalysisResult(null);
    setIsAnalyzing(false);
    setError("לא נמצא קובץ שמזהה את הפרויקט. הוסיפי מצגת, מחירון או מסמך עם שם הפרויקט.");
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles((current) => current.filter((item) => item.id !== fileId));
  };

  const updateSelectedFileType = (fileId: string, type: ProjectFileAssociation) => {
    setSelectedFiles((current) =>
      current.map((item) => (item.id === fileId ? { ...item, type } : item)),
    );
  };

  const updateSelectedFileTarget = (
    event: ChangeEvent<HTMLInputElement>,
    fileId: string,
  ) => {
    const { value } = event.currentTarget;

    setSelectedFiles((current) =>
      current.map((item) => (item.id === fileId ? { ...item, target: value } : item)),
    );
  };

  const toggleApprovedSection = (sectionId: ImportSectionId) => {
    setApprovedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const getApprovedPresentationField = (field: ExtractedField) => {
    const conflict = presentationAnalysis?.conflicts.find((item) => item.fieldKey === field.key);
    if (field.needsReview) return false;
    if (!conflict) return true;

    return approvedSections.conflicts && conflictChoices[conflict.id] === "presentation";
  };

  const applyProjectField = (project: Project, field: ExtractedField): Project => {
    if (!getApprovedPresentationField(field)) return project;

    switch (field.key) {
      case "name":
        return { ...project, name: field.value };
      case "city":
        return { ...project, city: field.value, location: `${project.neighborhood}, ${field.value}` };
      case "neighborhood":
        return { ...project, neighborhood: field.value, location: `${field.value}, ${project.city}` };
      case "address":
        return { ...project, address: field.value };
      case "tagline":
        return { ...project, tagline: field.value, description: field.value };
      case "block":
        return { ...project, block: field.value };
      case "parcel":
        return { ...project, parcel: field.value };
      case "projectType":
        return ["פרויקט חדש", "תמ״א 38/1", "תמ״א 38/2 / פינוי בינוי"].includes(field.value)
          ? { ...project, projectType: field.value as Project["projectType"], licensingRoute: field.value }
          : { ...project, licensingRoute: field.value };
      case "planningStatus":
        return { ...project, planningStatus: field.value };
      case "units":
        return { ...project, stats: { ...project.stats, units: field.value } };
      case "developerUnits":
        return { ...project, developerUnits: field.value, stats: { ...project.stats, newApartments: field.value } };
      case "ownerUnits":
        return { ...project, ownerUnits: field.value, stats: { ...project.stats, existingApartments: field.value } };
      case "occupancy":
        return { ...project, stats: { ...project.stats, occupancy: field.value } };
      default:
        return project;
    }
  };

  const mergeExtractedApartments = (
    projectId: string,
    currentApartments: Apartment[],
    extractedApartments: ExtractedApartment[],
  ) => {
    const byNumber = new Map(currentApartments.map((apartment) => [apartment.number, apartment]));

    extractedApartments.forEach((apartment) => {
      if (apartment.needsReview) return;

      const existingApartment = byNumber.get(apartment.number);
      const patch = {
        floor: apartment.floor || existingApartment?.floor || 0,
        rooms: apartment.rooms || existingApartment?.rooms || 0,
        apartmentArea: apartment.apartmentArea || existingApartment?.apartmentArea || 0,
        balconyArea: apartment.balconyArea || existingApartment?.balconyArea || 0,
        direction: apartment.direction || existingApartment?.direction || "",
        notes: existingApartment?.notes || `זוהתה מתוך מצגת (${apartment.source})`,
      };

      byNumber.set(apartment.number, existingApartment
        ? { ...existingApartment, ...patch }
        : {
            id: `${projectId}-apt-${apartment.number}`,
            projectId,
            number: apartment.number,
            gardenArea: 0,
            parking: "",
            storage: "",
            price: 0,
            specialPrice: 0,
            status: "available",
            planAttached: false,
            ...patch,
          });
    });

    return Array.from(byNumber.values());
  };

  const importedBundle = useMemo<ProjectImportBundle>(() => {
    const selectedProjectId =
      analysisResult?.mode === "manual"
        ? manualProjectId
        : analysisResult?.projectId ?? bundle.project.id;
    const existingProject = projects.find((project) => project.id === selectedProjectId);
    const baseProject =
      selectedProjectId === bundle.project.id && !existingProject
        ? bundle.project
        : existingProject ?? bundle.project;
    const sourceFiles: ProjectFile[] = selectedFiles.map((item) => {
      const { file } = item;
      const presentationFile = isPresentationFile(file);

      return {
        id: item.id,
        name: file.name,
        type: presentationFile ? "מצגת" : item.type,
        target: presentationFile ? "מצגת מקור וניתוח פרויקט" : item.target,
        url: item.url,
        sizeBytes: file.size,
        uploadedAt: new Date(file.lastModified || Date.now()).toISOString(),
        mimeType: file.type,
      };
    });
    const filesForImport = sourceFiles;
    const approvedFileItems = approvedSections.files
      ? filesForImport
      : filesForImport.filter((file) => file.type === "מצגת");
    const imageProjectFiles: ProjectFile[] =
      approvedSections.images && presentationAnalysis
        ? presentationAnalysis.images.map((image) => ({
            id: image.id,
            name: image.name,
            type: "הדמיה",
            target: "גלריית הדמיות",
            url: image.url,
            sizeBytes: image.sizeBytes,
            uploadedAt: new Date().toISOString(),
            mimeType: "image/*",
          }))
        : [];
    const incomingFileKeys = new Set(
      [...approvedFileItems, ...imageProjectFiles].map((file) => `${file.name}-${file.sizeBytes}`),
    );
    const projectFiles = [
      ...(baseProject.projectFiles ?? []).filter(
        (file) => !incomingFileKeys.has(`${file.name}-${file.sizeBytes}`),
      ),
      ...approvedFileItems,
      ...imageProjectFiles,
    ];
    const isKarlImport = baseProject.id === bundle.project.id && !existingProject;
    let nextProject: Project = {
      ...baseProject,
      projectFiles,
    };
    const existingProjectApartments = isKarlImport
      ? bundle.apartments
      : apartments.filter((apartment) => apartment.projectId === baseProject.id);
    let nextApartments = existingProjectApartments;

    if (approvedSections.projectDetails && presentationAnalysis) {
      presentationAnalysis.fields.forEach((field) => {
        nextProject = applyProjectField(nextProject, field);
      });
    }

    if (approvedSections.technical && presentationAnalysis?.technicalSpec.length) {
      nextProject = {
        ...nextProject,
        technicalSpecNotes: presentationAnalysis.technicalSpec,
        materialFileCounts: {
          ...nextProject.materialFileCounts,
          technical: Math.max(nextProject.materialFileCounts?.technical ?? 0, 1),
        },
      };
    }

    if (approvedSections.apartments && presentationAnalysis?.apartments.length) {
      nextApartments = mergeExtractedApartments(baseProject.id, existingProjectApartments, presentationAnalysis.apartments);
    }

    if (approvedSections.images && presentationAnalysis?.images.length) {
      const imageUrls = presentationAnalysis.images.map((image) => image.url);

      nextProject = {
        ...nextProject,
        gallery: {
          ...nextProject.gallery,
          exterior: Array.from(new Set([...(nextProject.gallery.exterior ?? []), ...imageUrls])),
        },
        materialFileCounts: {
          ...nextProject.materialFileCounts,
          exterior: (nextProject.materialFileCounts?.exterior ?? 0) + imageUrls.length,
        },
      };
    }

    if (approvedSections.images && approvedMainImageUrl) {
      nextProject = {
        ...nextProject,
        mainImage: approvedMainImageUrl,
        heroImage: approvedMainImageUrl,
      };
    }

    return {
      ...bundle,
      project: nextProject,
      apartments: nextApartments,
      readiness: isKarlImport
        ? bundle.readiness
        : readinessItems.find((item) => item.projectId === baseProject.id) ?? {
            projectId: baseProject.id,
            city: baseProject.city,
            marketingStatus: "פעיל",
            readinessPercentage: 0,
            lastUpdated: new Date().toLocaleDateString("he-IL"),
            missing: {
              critical: [],
              important: [],
              optional: [],
            },
          },
      sourceFiles: filesForImport,
      conflicts: [
        ...(isKarlImport ? bundle.conflicts : []),
        ...(presentationAnalysis?.conflicts.map((conflict) => ({
          apartment: "-",
          field: conflict.label,
          priceList: conflict.existingValue,
          plan: conflict.presentationValue,
          selected: conflictChoices[conflict.id] === "presentation" ? "מצגת" : "קיים",
        })) ?? []),
      ],
    };
  }, [
    analysisResult,
    apartments,
    approvedMainImageUrl,
    approvedSections,
    bundle,
    conflictChoices,
    manualProjectId,
    presentationAnalysis,
    projects,
    readinessItems,
    selectedFiles,
  ]);

  const pricedApartments = useMemo(
    () => importedBundle.apartments.filter((apartment) => apartment.price > 0),
    [importedBundle.apartments],
  );

  const confirmImport = () => {
    if (analysisResult?.mode === "manual" && !manualProjectId) {
      setError("יש לבחור פרויקט לשיוך הקבצים.");
      return;
    }

    onImport(importedBundle);
    setStage("done");
  };

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

      <main className="management-main import-screen">
        <section className="management-title-row">
          <div>
            <span className="eyebrow">ייבוא חכם</span>
            <h1>ייבוא מסמכי פרויקט</h1>
            <p>בחרי קבצים מהמחשב או גררי אותם לאזור ההעלאה. לאחר מכן המערכת תציג את הנתונים לפני שמירה.</p>
          </div>
        </section>

        {stage === "ready" && (
          <>
            <FileDropZone
              accept={importAccept}
              ariaLabel="ייבוא מסמכי פרויקט"
              description="PDF, Excel, CSV, PowerPoint ותמונות. אפשר לבחור כמה קבצים יחד. עד 25MB."
              error={error}
              files={selectedFiles.map((item) => item.file)}
              maxSize={maxImportFileSizeBytes}
              multiple
              onFilesSelected={addFiles}
            />

            {selectedFiles.length > 0 && (
              <section className="import-panel import-selected-panel">
                <div className="import-panel__heading">
                  <h2>{selectedFiles.length} קבצים נבחרו</h2>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setSelectedFiles([]);
                      setError("");
                    }}
                  >
                    <Trash2 size={16} /> ניקוי הרשימה
                  </button>
                </div>
                <div className="import-file-list">
                  {selectedFiles.map((item) => (
                    <div className="import-file-row import-file-row--editable" key={item.id}>
                      <span>{item.file.name}</span>
                      <label>
                        <span>שיוך</span>
                        <select
                          value={item.type}
                          onChange={(event) =>
                            updateSelectedFileType(
                              item.id,
                              event.currentTarget.value as ProjectFileAssociation,
                            )
                          }
                        >
                          {fileAssociationOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <small>{formatFileSize(item.file.size)}</small>
                      <button
                        className="mini-button mini-button--danger"
                        type="button"
                        onClick={() => removeSelectedFile(item.id)}
                        aria-label={`הסרת ${item.file.name}`}
                      >
                        <X size={14} />
                        הסרה
                      </button>
                    </div>
                  ))}
                </div>
                <div className="import-actions">
                  <button className="gold-button" type="button" onClick={analyzeFiles} disabled={isAnalyzing}>
                    <WandSparkles size={18} /> {isAnalyzing ? "מנתחת..." : "נתחי את הקבצים"}
                  </button>
                </div>
              </section>
            )}
            {error && <div className="import-error"><AlertTriangle size={18} />{error}</div>}
          </>
        )}

        {stage === "review" && (
          <>
            <section className="import-summary-grid">
              <article className="import-summary-card"><FileSearch size={22} /><strong>{selectedFiles.length}</strong><span>קבצים זוהו</span></article>
              <article className="import-summary-card"><CheckCircle2 size={22} /><strong>{importedBundle.apartments.length}</strong><span>דירות בפרויקט</span></article>
              <article className="import-summary-card import-summary-card--warning"><AlertTriangle size={22} /><strong>{importedBundle.conflicts.length}</strong><span>סתירות לבדיקה</span></article>
            </section>

            <section className="import-panel">
              <div className="import-panel__heading">
                <div>
                  <span className="eyebrow">
                    {analysisResult?.mode === "manual" ? "שיוך ידני" : "פרויקט שזוהה"}
                  </span>
                  <h2>{importSectionLabels.projectDetails}</h2>
                </div>
                <label className="import-section-toggle">
                  <input
                    type="checkbox"
                    checked={approvedSections.projectDetails}
                    onChange={() => toggleApprovedSection("projectDetails")}
                  />
                  אישור סעיף
                </label>
                <span className="status-pill">{importedBundle.readiness.marketingStatus}</span>
              </div>
              {analysisResult?.mode === "manual" && (
                <label className="import-project-select">
                  <span>בחרי פרויקט לשיוך תכניות הדירה</span>
                  <select
                    value={manualProjectId}
                    onChange={(event) => setManualProjectId(event.currentTarget.value)}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="import-project-facts">
                <span><b>כתובת:</b> {importedBundle.project.address}, {importedBundle.project.city}</span><span><b>סוג:</b> {importedBundle.project.projectType}</span><span><b>יחידות:</b> {importedBundle.project.stats.units}</span><span><b>צפי סיום:</b> {importedBundle.project.stats.occupancy}</span>
              </div>
              <div className="import-table-wrap import-review-subtable">
                <table className="import-table">
                  <thead><tr><th>שדה</th><th>ערך מהמצגת</th><th>סטטוס</th></tr></thead>
                  <tbody>
                    {(presentationAnalysis?.fields ?? []).map((field) => (
                      <tr key={field.key}>
                        <td>{field.label}</td>
                        <td>{field.value}</td>
                        <td>{field.needsReview ? "דורש בדיקה" : "מוכן לשמירה"}</td>
                      </tr>
                    ))}
                    {(presentationAnalysis?.fields.length ?? 0) === 0 && (
                      <tr><td colSpan={3}>לא חולצו פרטי פרויקט בביטחון.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="import-panel">
              <div className="import-panel__heading">
                <h2>{importSectionLabels.files}</h2>
                <label className="import-section-toggle">
                  <input
                    type="checkbox"
                    checked={approvedSections.files}
                    onChange={() => toggleApprovedSection("files")}
                  />
                  אישור סעיף
                </label>
              </div>
              <div className="import-file-list import-review-file-list">
                {importedBundle.sourceFiles.map((file) => (
                  <div className="import-file-row import-file-row--review" key={file.id}>
                    <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                    <select
                      value={file.type}
                      onChange={(event) =>
                        updateSelectedFileType(
                          file.id,
                          event.currentTarget.value as ProjectFileAssociation,
                        )
                      }
                    >
                      {fileAssociationOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <input
                      value={file.target}
                      onChange={(event) => updateSelectedFileTarget(event, file.id)}
                      aria-label={`יעד עבור ${file.name}`}
                    />
                    <small>{formatFileSize(file.sizeBytes)}</small>
                    <button
                      className="mini-button mini-button--danger"
                      type="button"
                      onClick={() => removeSelectedFile(file.id)}
                    >
                      <Trash2 size={14} />
                      הסרה
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="import-panel">
              <div className="import-panel__heading">
                <h2>{importSectionLabels.technical}</h2>
                <label className="import-section-toggle">
                  <input
                    type="checkbox"
                    checked={approvedSections.technical}
                    onChange={() => toggleApprovedSection("technical")}
                  />
                  אישור סעיף
                </label>
              </div>
              {(presentationAnalysis?.technicalSpec.length ?? 0) > 0 ? (
                <ul className="import-review-list">
                  {presentationAnalysis?.technicalSpec.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="import-review-note">מפרט טכני: דורש בדיקה ולא יישמר אוטומטית.</p>
              )}
            </section>

            <section className="import-panel">
              <div className="import-panel__heading">
                <h2>{importSectionLabels.images}</h2>
                <label className="import-section-toggle">
                  <input
                    type="checkbox"
                    checked={approvedSections.images}
                    onChange={() => toggleApprovedSection("images")}
                  />
                  אישור סעיף
                </label>
              </div>
              {(presentationAnalysis?.images.length ?? 0) > 0 ? (
                <div className="import-image-grid">
                  {presentationAnalysis?.images.map((image) => (
                    <label className="import-image-choice" key={image.id}>
                      <img src={image.url} alt={image.name} />
                      <span>{image.name}</span>
                      <small>{image.needsReview ? "דורש אישור" : "זוהה כתמונה"}</small>
                      <span className="import-radio-row">
                        <input
                          type="radio"
                          name="main-import-image"
                          checked={approvedMainImageUrl === image.url}
                          onChange={() => setApprovedMainImageUrl(image.url)}
                        />
                        קבעי כתמונה ראשית
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="import-review-note">לא זוהו הדמיות או תמונות בניין במצגת.</p>
              )}
              <p className="import-review-note">תמונה ראשית תישמר רק אם סעיף התמונות מאושר ונבחרה תמונה במפורש.</p>
            </section>

            <section className="import-panel">
              <div className="import-panel__heading">
                <h2>{importSectionLabels.apartments}</h2>
                <label className="import-section-toggle">
                  <input
                    type="checkbox"
                    checked={approvedSections.apartments}
                    onChange={() => toggleApprovedSection("apartments")}
                  />
                  אישור סעיף
                </label>
                <span>{pricedApartments.length} דירות עם מחיר</span>
              </div>
              <div className="import-table-wrap"><table className="import-table"><thead><tr><th>דירה</th><th>קומה</th><th>חדרים</th><th>שטח</th><th>מרפסת</th><th>מחיר</th><th>מחיר מיוחד</th></tr></thead><tbody>
                {(presentationAnalysis?.apartments.length ? presentationAnalysis.apartments : importedBundle.apartments).map((apartment) => (
                  "source" in apartment
                    ? <tr key={apartment.number}><td>{apartment.number}</td><td>{apartment.floor || "דורש בדיקה"}</td><td>{apartment.rooms || "דורש בדיקה"}</td><td>{apartment.apartmentArea ? `${apartment.apartmentArea} מ״ר` : "דורש בדיקה"}</td><td>{apartment.balconyArea ? `${apartment.balconyArea} מ״ר` : "דורש בדיקה"}</td><td colSpan={2}>{apartment.needsReview ? "דורש בדיקה" : "מוכן לשמירה"}</td></tr>
                    : <tr key={apartment.id}><td>{apartment.number}</td><td>{apartment.floor}</td><td>{apartment.rooms}</td><td>{apartment.apartmentArea} מ״ר</td><td>{apartment.balconyArea} מ״ר</td><td>{apartment.price ? formatPrice(apartment.price) : "חסר"}</td><td>{apartment.specialPrice ? formatPrice(apartment.specialPrice) : "חסר"}</td></tr>
                ))}
              </tbody></table></div>
            </section>

            {importedBundle.conflicts.length > 0 && (
              <section className="import-panel import-panel--warning">
                <div className="import-panel__heading">
                  <h2>{importSectionLabels.conflicts}</h2>
                  <label className="import-section-toggle">
                    <input
                      type="checkbox"
                      checked={approvedSections.conflicts}
                      onChange={() => toggleApprovedSection("conflicts")}
                    />
                    אישור סעיף
                  </label>
                  <span>בחרי איזה ערך לשמור</span>
                </div>
                <div className="import-table-wrap"><table className="import-table"><thead><tr><th>שדה</th><th>ערך קיים</th><th>ערך מהמצגת</th><th>בחירה</th></tr></thead><tbody>
                  {(presentationAnalysis?.conflicts ?? []).map((conflict) => (
                    <tr key={conflict.id}>
                      <td>{conflict.label}</td>
                      <td>{conflict.existingValue}</td>
                      <td>{conflict.presentationValue}</td>
                      <td>
                        <select
                          value={conflictChoices[conflict.id] ?? "existing"}
                          onChange={(event) =>
                            setConflictChoices((current) => ({
                              ...current,
                              [conflict.id]: event.currentTarget.value as "existing" | "presentation",
                            }))
                          }
                        >
                          <option value="existing">לשמור ערך קיים</option>
                          <option value="presentation">לשמור ערך מהמצגת</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {(presentationAnalysis?.conflicts.length ?? 0) === 0 && importedBundle.conflicts.map((conflict) => <tr key={`${conflict.apartment}-${conflict.field}`}><td>{conflict.field}</td><td>{conflict.priceList}</td><td>{conflict.plan}</td><td><b>{conflict.selected}</b></td></tr>)}
                </tbody></table></div>
              </section>
            )}

            {(presentationAnalysis?.reviewNotes.length ?? 0) > 0 && (
              <section className="import-panel import-panel--warning">
                <div className="import-panel__heading"><h2>דורש בדיקה</h2></div>
                <ul className="import-review-list">
                  {presentationAnalysis?.reviewNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            )}

            {error && <div className="import-error"><AlertTriangle size={18} />{error}</div>}
            <div className="import-actions"><button className="ghost-button" type="button" onClick={() => setStage("ready")}>חזרה</button><button className="gold-button" type="button" onClick={confirmImport} disabled={importedBundle.sourceFiles.length === 0 || (analysisResult?.mode === "manual" && !manualProjectId)}><CheckCircle2 size={18} />אישור וייבוא לפרויקט</button></div>
          </>
        )}

        {stage === "done" && (
          <section className="import-complete"><CheckCircle2 size={54} /><h2>הייבוא הושלם</h2><p>{importedBundle.project.name}, הדירות והקבצים נשמרו במערכת.</p><button className="gold-button" type="button" onClick={() => onOpenProject(importedBundle.project.id)}>פתיחת הפרויקט</button></section>
        )}
      </main>
    </div>
  );
}
