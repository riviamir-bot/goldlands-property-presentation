import { readSheet } from "read-excel-file/universal";
import type { Apartment, ApartmentStatus, Project } from "../types";

export type SpreadsheetImportKind = "projectDetails" | "apartments" | "priceList";

export interface SpreadsheetProjectField {
  key: string;
  label: string;
  currentValue: string;
  newValue: string;
  conflict: boolean;
}

export interface SpreadsheetSkippedRow {
  rowNumber: number;
  reason: string;
}

export interface SpreadsheetPreview {
  fileName: string;
  kind: SpreadsheetImportKind;
  rowCount: number;
  headers: string[];
  recognizedFields: string[];
  previewRows: Array<Record<string, string>>;
  projectPatch?: Partial<Project>;
  projectFields: SpreadsheetProjectField[];
  apartments: Apartment[];
  skippedRows: SpreadsheetSkippedRow[];
  conflicts: string[];
}

type Cell = string | number | boolean | Date | null | undefined;

const apartmentColumnLabels = {
  number: "מספר דירה",
  floor: "קומה",
  rooms: "חדרים",
  apartmentArea: "שטח דירה",
  balconyArea: "מרפסת",
  gardenArea: "גינה",
  parking: "חניה",
  storage: "מחסן",
  direction: "כיוון",
  price: "מחיר",
  specialPrice: "מחיר מיוחד",
  status: "סטטוס",
  notes: "הערות",
} as const;

type ApartmentColumn = keyof typeof apartmentColumnLabels;

const apartmentAliases: Record<ApartmentColumn, string[]> = {
  number: ["מספר דירה", "דירה", "מס דירה", "מספר", "apartment", "apartment number", "unit", "unit number"],
  floor: ["קומה", "floor"],
  rooms: ["חדרים", "מספר חדרים", "rooms"],
  apartmentArea: ["שטח דירה", "שטח", "מטר", "מר", "area", "apartment area", "net area"],
  balconyArea: ["מרפסת", "שטח מרפסת", "balcony", "balcony area"],
  gardenArea: ["גינה", "שטח גינה", "garden", "garden area"],
  parking: ["חניה", "חניות", "parking"],
  storage: ["מחסן", "storage"],
  direction: ["כיוון", "כיוונים", "כיווני אוויר", "direction", "orientation"],
  price: ["מחיר", "מחיר מחירון", "price", "list price"],
  specialPrice: ["מחיר מיוחד", "מחיר מבצע", "special price", "sale price"],
  status: ["סטטוס", "מצב", "status"],
  notes: ["הערות", "הערה", "notes", "note"],
};

interface ProjectFieldDefinition {
  key: string;
  label: string;
  aliases: string[];
  current: (project: Project) => string;
}

const projectFieldDefinitions: ProjectFieldDefinition[] = [
  { key: "name", label: "שם פרויקט", aliases: ["שם פרויקט", "פרויקט", "project name", "name"], current: (project) => project.name },
  { key: "city", label: "עיר", aliases: ["עיר", "city"], current: (project) => project.city },
  { key: "neighborhood", label: "שכונה", aliases: ["שכונה", "neighborhood"], current: (project) => project.neighborhood },
  { key: "address", label: "כתובת", aliases: ["כתובת", "address"], current: (project) => project.address },
  { key: "tagline", label: "תיאור שיווקי", aliases: ["תיאור שיווקי", "משפט שיווקי", "תיאור", "tagline", "description"], current: (project) => project.tagline },
  { key: "block", label: "גוש", aliases: ["גוש", "block"], current: (project) => project.block ?? "" },
  { key: "parcel", label: "חלקה", aliases: ["חלקה", "parcel"], current: (project) => project.parcel ?? "" },
  { key: "projectType", label: "סוג פרויקט", aliases: ["סוג פרויקט", "מסלול", "project type"], current: (project) => project.projectType },
  { key: "planningStatus", label: "סטטוס תכנוני", aliases: ["סטטוס תכנוני", "מצב תכנוני", "planning status"], current: (project) => project.planningStatus ?? "" },
  { key: "units", label: "מספר יחידות", aliases: ["מספר יחידות", "יחידות", "units"], current: (project) => project.stats.units },
  { key: "developerUnits", label: "דירות יזם", aliases: ["דירות יזם", "יחידות יזם", "developer units"], current: (project) => project.developerUnits ?? "" },
  { key: "ownerUnits", label: "דירות בעלים", aliases: ["דירות בעלים", "יחידות בעלים", "owner units"], current: (project) => project.ownerUnits ?? "" },
  { key: "occupancy", label: "צפי אכלוס", aliases: ["צפי אכלוס", "אכלוס", "occupancy"], current: (project) => project.stats.occupancy },
  { key: "floors", label: "מספר קומות", aliases: ["מספר קומות", "קומות", "floors"], current: (project) => project.stats.floors },
  { key: "buildings", label: "מספר בניינים", aliases: ["מספר בניינים", "בניינים", "buildings"], current: (project) => project.stats.buildings },
];

function normalizeLabel(value: Cell) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u200e\u200f]/g, "")
    .replace(/["״']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellToString(value: Cell) {
  if (value instanceof Date) return value.toLocaleDateString("he-IL");
  return String(value ?? "").trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && (character === "," || character === ";" || character === "\t")) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

async function readRows(file: File): Promise<Cell[][]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xls") {
    throw new Error("קובצי XLS ישנים אינם נתמכים. יש לשמור את הקובץ כ-XLSX או CSV ולנסות שוב.");
  }

  if (extension === "csv") return parseCsv(await file.text());
  if (extension !== "xlsx") {
    throw new Error("פורמט הקובץ אינו נתמך. ניתן לייבא XLSX או CSV בלבד.");
  }

  return readSheet(file) as Promise<Cell[][]>;
}

function findAlias<T extends string>(value: Cell, aliases: Record<T, string[]>) {
  const normalized = normalizeLabel(value);

  return (Object.keys(aliases) as T[]).find((key) =>
    aliases[key].some((alias) => normalizeLabel(alias) === normalized),
  );
}

function findProjectField(value: Cell) {
  const normalized = normalizeLabel(value);

  return projectFieldDefinitions.find((field) =>
    field.aliases.some((alias) => normalizeLabel(alias) === normalized),
  );
}

function valuesDiffer(currentValue: string, newValue: string) {
  return normalizeLabel(currentValue) !== normalizeLabel(newValue);
}

function makeProjectPatch(project: Project, fields: SpreadsheetProjectField[]): Partial<Project> {
  const values = Object.fromEntries(fields.map((field) => [field.key, field.newValue]));
  const patch: Partial<Project> = {};

  if (values.name) patch.name = values.name;
  if (values.city) patch.city = values.city;
  if (values.neighborhood) patch.neighborhood = values.neighborhood;
  if (values.address) patch.address = values.address;
  if (values.tagline) {
    patch.tagline = values.tagline;
    patch.description = values.tagline;
  }
  if (values.block !== undefined) patch.block = values.block;
  if (values.parcel !== undefined) patch.parcel = values.parcel;
  if (values.planningStatus !== undefined) patch.planningStatus = values.planningStatus;
  if (values.developerUnits !== undefined) patch.developerUnits = values.developerUnits;
  if (values.ownerUnits !== undefined) patch.ownerUnits = values.ownerUnits;
  if (["פרויקט חדש", "תמ״א 38/1", "תמ״א 38/2 / פינוי בינוי"].includes(values.projectType)) {
    patch.projectType = values.projectType as Project["projectType"];
  }

  if (values.city || values.neighborhood) {
    patch.location = `${values.neighborhood ?? project.neighborhood}, ${values.city ?? project.city}`;
  }

  if (values.units || values.occupancy || values.floors || values.buildings) {
    patch.stats = {
      ...project.stats,
      units: values.units ?? project.stats.units,
      occupancy: values.occupancy ?? project.stats.occupancy,
      floors: values.floors ?? project.stats.floors,
      buildings: values.buildings ?? project.stats.buildings,
    };
  }

  return patch;
}

function parseProjectDetails(
  fileName: string,
  rows: Cell[][],
  project: Project,
): SpreadsheetPreview {
  const fieldsByKey = new Map<string, SpreadsheetProjectField>();
  const skippedRows: SpreadsheetSkippedRow[] = [];
  const firstRowLooksLikeKeyValue = Boolean(findProjectField(rows[0]?.[0]));

  if (firstRowLooksLikeKeyValue) {
    rows.forEach((row, index) => {
      const definition = findProjectField(row[0]);
      const newValue = cellToString(row[1]);

      if (!definition || !newValue) {
        skippedRows.push({ rowNumber: index + 1, reason: "השדה או הערך לא זוהו" });
        return;
      }

      const currentValue = definition.current(project);
      fieldsByKey.set(definition.key, {
        key: definition.key,
        label: definition.label,
        currentValue,
        newValue,
        conflict: Boolean(currentValue) && valuesDiffer(currentValue, newValue),
      });
    });
  } else {
    const headers = rows[0] ?? [];
    const valueRow = rows[1] ?? [];

    headers.forEach((header, index) => {
      const definition = findProjectField(header);
      const newValue = cellToString(valueRow[index]);
      if (!definition || !newValue) return;

      const currentValue = definition.current(project);
      fieldsByKey.set(definition.key, {
        key: definition.key,
        label: definition.label,
        currentValue,
        newValue,
        conflict: Boolean(currentValue) && valuesDiffer(currentValue, newValue),
      });
    });
  }

  const projectFields = Array.from(fieldsByKey.values());

  if (projectFields.length === 0) {
    throw new Error(
      "לא זוהו שדות פרויקט. נדרשות עמודות כגון: שם פרויקט, עיר, שכונה, כתובת, תיאור שיווקי, גוש, חלקה, מספר יחידות וצפי אכלוס.",
    );
  }

  return {
    fileName,
    kind: "projectDetails",
    rowCount: rows.length,
    headers: projectFields.map((field) => field.label),
    recognizedFields: projectFields.map((field) => field.label),
    previewRows: projectFields.map((field) => ({
      שדה: field.label,
      "ערך קיים": field.currentValue || "-",
      "ערך חדש": field.newValue,
      מצב: field.conflict ? "סתירה - הערך החדש יחליף את הקיים" : "מוכן",
    })),
    projectPatch: makeProjectPatch(project, projectFields),
    projectFields,
    apartments: [],
    skippedRows,
    conflicts: projectFields
      .filter((field) => field.conflict)
      .map((field) => `${field.label}: "${field.currentValue}" יוחלף ב-"${field.newValue}"`),
  };
}

function toNumber(value: Cell) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = cellToString(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseStatus(value: Cell, fallback: ApartmentStatus): ApartmentStatus {
  const normalized = normalizeLabel(value);
  const mappings: Array<[ApartmentStatus, string[]]> = [
    ["available", ["פנויה", "פנוי", "available", "free"]],
    ["option", ["באופציה", "אופציה", "option"]],
    ["reserved", ["שמורה", "שמור", "reserved"]],
    ["sold", ["נמכרה", "נמכר", "sold"]],
    ["notMarketing", ["לא לשיווק", "לא בשיווק", "not marketing", "off market"]],
  ];

  return mappings.find(([, labels]) => labels.some((label) => normalizeLabel(label) === normalized))?.[0] ?? fallback;
}

function makeApartmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();

  return `apartment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseApartments(
  fileName: string,
  rows: Cell[][],
  project: Project,
  existingApartments: Apartment[],
  kind: "apartments" | "priceList",
): SpreadsheetPreview {
  const headers = rows[0] ?? [];
  const indexes = new Map<ApartmentColumn, number>();

  headers.forEach((header, index) => {
    const key = findAlias(header, apartmentAliases);
    if (key && !indexes.has(key)) indexes.set(key, index);
  });

  if (!indexes.has("number")) {
    throw new Error(
      "לא נמצאה עמודת מספר דירה. העמודות הנתמכות: מספר דירה, קומה, חדרים, שטח דירה, מרפסת, גינה, חניה, מחסן, כיוון, מחיר, מחיר מיוחד, סטטוס והערות.",
    );
  }

  const existingByNumber = new Map(existingApartments.map((apartment) => [normalizeLabel(apartment.number), apartment]));
  const importedByNumber = new Map<string, Apartment>();
  const previewRows: Array<Record<string, string>> = [];
  const skippedRows: SpreadsheetSkippedRow[] = [];
  const conflicts: string[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const get = (key: ApartmentColumn) => {
      const index = indexes.get(key);
      return index === undefined ? undefined : row[index];
    };
    const number = cellToString(get("number"));

    if (!number) {
      skippedRows.push({ rowNumber, reason: "חסר מספר דירה" });
      return;
    }

    const normalizedNumber = normalizeLabel(number);
    const existing = existingByNumber.get(normalizedNumber) ?? importedByNumber.get(normalizedNumber);
    const apartment: Apartment = {
      id: existing?.id ?? makeApartmentId(),
      projectId: project.id,
      number,
      floor: indexes.has("floor") ? toNumber(get("floor")) : existing?.floor ?? 0,
      rooms: indexes.has("rooms") ? toNumber(get("rooms")) : existing?.rooms ?? 0,
      apartmentArea: indexes.has("apartmentArea") ? toNumber(get("apartmentArea")) : existing?.apartmentArea ?? 0,
      balconyArea: indexes.has("balconyArea") ? toNumber(get("balconyArea")) : existing?.balconyArea ?? 0,
      gardenArea: indexes.has("gardenArea") ? toNumber(get("gardenArea")) : existing?.gardenArea ?? 0,
      parking: indexes.has("parking") ? cellToString(get("parking")) : existing?.parking ?? "",
      storage: indexes.has("storage") ? cellToString(get("storage")) : existing?.storage ?? "",
      direction: indexes.has("direction") ? cellToString(get("direction")) : existing?.direction ?? "",
      price: indexes.has("price") ? toNumber(get("price")) : existing?.price ?? 0,
      specialPrice: indexes.has("specialPrice") ? toNumber(get("specialPrice")) : existing?.specialPrice ?? 0,
      status: parseStatus(get("status"), existing?.status ?? "available"),
      planAttached: existing?.planAttached ?? false,
      planUrl: existing?.planUrl,
      planFileName: existing?.planFileName,
      notes: indexes.has("notes") ? cellToString(get("notes")) : existing?.notes ?? "",
    };

    if (importedByNumber.has(normalizedNumber)) {
      skippedRows.push({ rowNumber, reason: `כפילות של דירה ${number}; נשמרה השורה האחרונה` });
    }
    if (existingByNumber.has(normalizedNumber)) {
      conflicts.push(`דירה ${number} קיימת ותעודכן במקום ליצור כפילות.`);
    }

    importedByNumber.set(normalizedNumber, apartment);
  });

  const apartments = Array.from(importedByNumber.values());

  apartments.forEach((apartment) => {
    previewRows.push({
      "מספר דירה": apartment.number,
      קומה: String(apartment.floor),
      חדרים: String(apartment.rooms),
      "שטח דירה": String(apartment.apartmentArea),
      מרפסת: String(apartment.balconyArea),
      גינה: String(apartment.gardenArea),
      חניה: apartment.parking || "-",
      מחסן: apartment.storage || "-",
      כיוון: apartment.direction || "-",
      מחיר: String(apartment.price),
      "מחיר מיוחד": String(apartment.specialPrice),
      סטטוס: apartment.status,
      הערות: apartment.notes || "-",
    });
  });

  if (apartments.length === 0) {
    throw new Error("לא נמצאו שורות דירה תקינות. ודאי שלכל שורה יש מספר דירה.");
  }

  return {
    fileName,
    kind,
    rowCount: Math.max(0, rows.length - 1),
    headers: headers.map(cellToString).filter(Boolean),
    recognizedFields: Array.from(indexes.keys()).map((key) => apartmentColumnLabels[key]),
    previewRows,
    projectFields: [],
    apartments,
    skippedRows,
    conflicts: Array.from(new Set(conflicts)),
  };
}

export async function parseSpreadsheetImport(
  file: File,
  kind: SpreadsheetImportKind,
  project: Project,
  existingApartments: Apartment[],
): Promise<SpreadsheetPreview> {
  const rows = (await readRows(file)).filter((row) => row.some((cell) => cellToString(cell)));

  if (rows.length === 0) throw new Error("הקובץ ריק ולא נמצאו בו שורות לייבוא.");
  if (kind === "projectDetails") return parseProjectDetails(file.name, rows, project);

  return parseApartments(file.name, rows, project, existingApartments, kind);
}
