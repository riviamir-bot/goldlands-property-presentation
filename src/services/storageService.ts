import { supabase } from "../lib/supabaseClient";
import type { ProjectFileAssociation } from "../types";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const DOCUMENT_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "csv"] as const;
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const DOCUMENT_MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "application/csv": "csv",
};

type StorageBucket = "project-media" | "project-documents";
type ProjectFileKind = "image" | "document";

export type ProjectFileCategory =
  | "logo"
  | "main"
  | "exterior"
  | "interior"
  | "lobby"
  | "surroundings"
  | "apartment_plan"
  | "floor_plan"
  | "price_list"
  | "brochure"
  | "technical_spec"
  | "sales_deck"
  | "other";

export interface ProjectFileRecord {
  id: string;
  projectId: string;
  apartmentId?: string | null;
  category: ProjectFileCategory;
  kind: ProjectFileKind;
  storageBucket: StorageBucket;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  displayOrder: number;
  title?: string;
  association?: ProjectFileAssociation;
  target?: string;
  uploadedAt?: string;
  publicUrl?: string;
}

interface ProjectImageRow {
  id: string;
  project_id: string;
  category: Extract<
    ProjectFileCategory,
    "logo" | "main" | "exterior" | "interior" | "lobby" | "surroundings" | "other"
  >;
  storage_bucket: StorageBucket;
  storage_path: string;
  alt_text: string;
  caption: string;
  is_primary: boolean;
  display_order: number;
  metadata: {
    file_name?: string;
    original_name?: string;
    mime_type?: string;
    size_bytes?: number;
  } | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  association?: string | null;
  target?: string | null;
  created_at?: string;
}

interface ProjectDocumentRow {
  id: string;
  project_id: string;
  apartment_id: string | null;
  document_type: Extract<
    ProjectFileCategory,
    "apartment_plan" | "floor_plan" | "price_list" | "brochure" | "technical_spec" | "sales_deck" | "other"
  >;
  title: string;
  file_name: string;
  storage_bucket: StorageBucket;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  status: "draft" | "active" | "archived";
  association?: ProjectFileAssociation | null;
  target?: string | null;
  created_at?: string;
}

interface CategoryConfig {
  kind: ProjectFileKind;
  bucket: StorageBucket;
  buildPath: (projectId: string, filename: string, apartmentId?: string) => string;
  isPrimary?: boolean;
  projectPathField?: "project_logo_path" | "main_image_path";
  requiresApartment?: boolean;
}

const imageCategorySet = new Set<ProjectFileCategory>([
  "logo",
  "main",
  "exterior",
  "interior",
  "lobby",
  "surroundings",
]);

const documentCategorySet = new Set<ProjectFileCategory>([
  "apartment_plan",
  "floor_plan",
  "price_list",
  "brochure",
  "technical_spec",
  "sales_deck",
  "other",
]);

const categoryConfigs: Record<ProjectFileCategory, CategoryConfig> = {
  logo: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) => `projects/${projectId}/logo/${filename}`,
    isPrimary: true,
    projectPathField: "project_logo_path",
  },
  main: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) => `projects/${projectId}/images/main/${filename}`,
    isPrimary: true,
    projectPathField: "main_image_path",
  },
  exterior: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) =>
      `projects/${projectId}/images/renderings/exterior/${filename}`,
  },
  interior: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) =>
      `projects/${projectId}/images/renderings/interior/${filename}`,
  },
  lobby: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) =>
      `projects/${projectId}/images/renderings/lobby/${filename}`,
  },
  surroundings: {
    kind: "image",
    bucket: "project-media",
    buildPath: (projectId, filename) =>
      `projects/${projectId}/images/renderings/surroundings/${filename}`,
  },
  apartment_plan: {
    kind: "document",
    bucket: "project-documents",
    requiresApartment: true,
    buildPath: (projectId, filename, apartmentId) =>
      `projects/${projectId}/apartments/${apartmentId ?? "unassigned"}/plans/${filename}`,
  },
  floor_plan: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) => `projects/${projectId}/floor-plans/${filename}`,
  },
  price_list: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) =>
      `projects/${projectId}/price-lists/${new Date().toISOString().slice(0, 10)}/${filename}`,
  },
  brochure: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) => `projects/${projectId}/brochures/${filename}`,
  },
  technical_spec: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) => `projects/${projectId}/technical/${filename}`,
  },
  sales_deck: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) => `projects/${projectId}/sales/${filename}`,
  },
  other: {
    kind: "document",
    bucket: "project-documents",
    buildPath: (projectId, filename) => `projects/${projectId}/sales/${filename}`,
  },
};

const categoryAssociations: Record<ProjectFileCategory, ProjectFileAssociation> = {
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

type SupabaseErrorLike = {
  message?: unknown;
  statusCode?: unknown;
  status?: unknown;
  name?: unknown;
  code?: unknown;
};

export function formatSupabaseErrorDetails(error: unknown) {
  const details = (typeof error === "object" && error !== null ? error : {}) as SupabaseErrorLike;
  const message = typeof details.message === "string"
    ? details.message
    : error instanceof Error
      ? error.message
      : String(error || "Unknown Supabase error");
  const statusCode = details.statusCode ?? details.status;
  const name = typeof details.name === "string"
    ? details.name
    : error instanceof Error
      ? error.name
      : undefined;
  const code = details.code;

  return [
    `message: ${message}`,
    statusCode === undefined || statusCode === null ? "" : `statusCode: ${String(statusCode)}`,
    name ? `name: ${name}` : "",
    code === undefined || code === null ? "" : `code: ${String(code)}`,
  ].filter(Boolean).join(" | ");
}

function makeUploadStageError(
  stage: "session" | "preflight" | "storage.upload" | "metadata",
  error: unknown,
) {
  const stageLabels = {
    session: "בדיקת Supabase Auth session נכשלה",
    preflight: "בדיקת הרשאות ההעלאה נכשלה",
    "storage.upload": "העלאת הקובץ ל-Supabase Storage נכשלה",
    metadata: "הקובץ הועלה, אך שמירת metadata נכשלה",
  };
  const result = new Error(`${stageLabels[stage]}: ${formatSupabaseErrorDetails(error)}`);

  result.name = "SupabaseStoragePipelineError";
  return result;
}

function assertStorageClient() {
  if (!supabase) {
    throw new Error("Supabase Storage is unavailable because Supabase env vars are not configured.");
  }

  return supabase;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getStorageFolderSegments(storagePath: string) {
  return storagePath.split("/").filter(Boolean);
}

function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function extensionsMatch(extension: string, expectedExtension: string) {
  if (expectedExtension === "jpg") return extension === "jpg" || extension === "jpeg";

  return extension === expectedExtension;
}

function resolveStorageExtension(file: File, kind: ProjectFileKind) {
  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();
  const allowedExtensions: readonly string[] =
    kind === "image" ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;
  const mimeExtension =
    kind === "image"
      ? IMAGE_MIME_EXTENSIONS[mimeType]
      : DOCUMENT_MIME_EXTENSIONS[mimeType];

  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      kind === "image"
        ? "סוג קובץ לא נתמך. ניתן להעלות תמונות jpg, jpeg, png או webp."
        : "סוג קובץ לא נתמך. ניתן להעלות pdf, ppt, pptx, doc, docx, xls, xlsx או csv.",
    );
  }

  if (kind === "image" && !mimeExtension) {
    throw new Error("סוג תמונה לא נתמך. ניתן להעלות jpg, jpeg, png או webp.");
  }

  if (mimeExtension && !extensionsMatch(extension, mimeExtension)) {
    throw new Error("סיומת הקובץ אינה תואמת לסוג הקובץ שנבחר.");
  }

  if (
    kind === "document" &&
    mimeType &&
    mimeType !== "application/octet-stream" &&
    !mimeExtension
  ) {
    throw new Error("סוג מסמך לא נתמך. ניתן להעלות pdf, ppt, pptx, doc, docx, xls, xlsx או csv.");
  }

  return mimeExtension ?? extension;
}

function makeUniqueStorageFilename(file: File, kind: ProjectFileKind) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(2, 10);
  const extension = resolveStorageExtension(file, kind);

  return `${Date.now()}-${randomId}.${extension}`;
}

function validateProjectFile(file: File, category: ProjectFileCategory) {
  const config = categoryConfigs[category];

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("הקובץ גדול מדי. כרגע ניתן להעלות קבצים עד 25MB.");
  }

  resolveStorageExtension(file, config.kind);
}

function makeDocumentTitle(category: ProjectFileCategory, file: File) {
  const titles: Record<string, string> = {
    apartment_plan: "תוכנית דירה",
    floor_plan: "תוכנית קומה",
    price_list: "מחירון",
    brochure: "ברושור",
    technical_spec: "מפרט טכני",
    sales_deck: "מצגת מכירה",
    other: "מסמך פרויקט",
  };

  return `${titles[category] ?? "מסמך פרויקט"} - ${file.name}`;
}

async function runStorageUploadPreflight(
  client: NonNullable<typeof supabase>,
  projectId: string,
  storageBucket: StorageBucket,
  storagePath: string,
  category: ProjectFileCategory,
) {
  const folderSegments = getStorageFolderSegments(storagePath);
  const folderProjectId = folderSegments[1] ?? "";
  const projectIdLooksLikeUuid = isUuid(projectId);
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError) throw makeUploadStageError("session", sessionError);

  const userId = sessionData.session?.user.id ?? null;
  let profileId: string | null = null;
  let profileRole: string | null = null;
  let profileIsActive: boolean | null = null;
  let projectExists = false;
  let projectIsActive: boolean | null = null;

  if (userId) {
    const { data: profileRow, error: profileError } = await client
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw makeUploadStageError("preflight", profileError);

    profileId = (profileRow as { id?: string | null } | null)?.id ?? null;
    profileRole = (profileRow as { role?: string | null } | null)?.role ?? null;
    profileIsActive = (profileRow as { is_active?: boolean | null } | null)?.is_active ?? null;
  }

  if (projectIdLooksLikeUuid) {
    const { data: projectRow, error: projectError } = await client
      .from("projects")
      .select("id, is_active")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) throw makeUploadStageError("preflight", projectError);

    projectExists = Boolean(projectRow);
    projectIsActive = (projectRow as { is_active?: boolean | null } | null)?.is_active ?? null;
  }

  if (!sessionData.session) {
    throw new Error("אין חיבור פעיל ל-Supabase. יש להתחבר מחדש.");
  }

  if (profileId !== userId || profileRole !== "admin" || profileIsActive !== true) {
    throw new Error("Upload requires real Supabase admin login.");
  }

  if (folderSegments[0] !== "projects" || folderProjectId !== projectId) {
    throw new Error("Storage path does not match the required projects/{project_id}/... format.");
  }

  if (!projectExists || projectIsActive !== true) {
    throw new Error("יש לשמור את הפרויקט בענן לפני העלאת קבצים.");
  }

  return sessionData.session.user.id;
}

async function safelyCreateSignedUrl(record: Omit<ProjectFileRecord, "publicUrl">) {
  try {
    return await getPublicOrSignedUrl(record);
  } catch (error) {
    console.warn("[GOLDLANDS] Supabase Storage signed URL failed. Continuing without preview URL.", error);
    return undefined;
  }
}

function mapImageRow(row: ProjectImageRow): Omit<ProjectFileRecord, "publicUrl"> {
  const mappedAssociation = (Object.values(categoryAssociations) as string[]).includes(row.association ?? "")
    ? row.association as ProjectFileAssociation
    : categoryAssociations[row.category];

  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    kind: "image",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.original_name ?? row.metadata?.original_name ?? row.metadata?.file_name ?? row.storage_path.split("/").pop() ?? "",
    mimeType: row.mime_type ?? row.metadata?.mime_type ?? "",
    sizeBytes: Number(row.size_bytes ?? row.metadata?.size_bytes) || 0,
    isPrimary: row.is_primary,
    displayOrder: row.display_order,
    title: row.caption || row.alt_text,
    association: mappedAssociation,
    target: row.target ?? (row.category === "main" ? "תמונה ראשית" : "גלריית הפרויקט"),
    uploadedAt: row.created_at,
  };
}

function mapDocumentRow(row: ProjectDocumentRow): Omit<ProjectFileRecord, "publicUrl"> {
  return {
    id: row.id,
    projectId: row.project_id,
    apartmentId: row.apartment_id,
    category: row.document_type,
    kind: "document",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes) || 0,
    isPrimary: false,
    displayOrder: row.version,
    title: row.title,
    association: row.association ?? categoryAssociations[row.document_type],
    target: row.target ?? row.title,
    uploadedAt: row.created_at,
  };
}

async function attachSignedUrls(records: Array<Omit<ProjectFileRecord, "publicUrl">>) {
  return Promise.all(
    records.map(async (record) => ({
      ...record,
      publicUrl: await safelyCreateSignedUrl(record),
    })),
  );
}

export function isImageFileCategory(category: ProjectFileCategory) {
  return imageCategorySet.has(category);
}

export function isDocumentFileCategory(category: ProjectFileCategory) {
  return documentCategorySet.has(category);
}

export function getProjectFileCategoryKind(category: ProjectFileCategory): ProjectFileKind {
  return categoryConfigs[category].kind;
}

export function getProjectFileAssociation(category: ProjectFileCategory) {
  return categoryAssociations[category];
}

export async function getPublicOrSignedUrl(fileRecord: Omit<ProjectFileRecord, "publicUrl">) {
  const client = assertStorageClient();
  const { data, error } = await client.storage
    .from(fileRecord.storageBucket)
    .createSignedUrl(fileRecord.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Supabase did not return a signed URL for the file.");

  return data.signedUrl;
}

export async function listProjectFiles(
  projectId: string,
  category?: ProjectFileCategory,
): Promise<ProjectFileRecord[]> {
  const client = assertStorageClient();
  const shouldListImages = !category || isImageFileCategory(category);
  const shouldListDocuments = !category || isDocumentFileCategory(category);
  const records: Array<Omit<ProjectFileRecord, "publicUrl">> = [];

  if (shouldListImages) {
    let imageQuery = client
      .from("project_images")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (category && isImageFileCategory(category)) {
      imageQuery = imageQuery.eq("category", category);
    }

    const { data, error } = await imageQuery;

    if (error) throw error;
    records.push(...((data as ProjectImageRow[] | null) ?? []).map(mapImageRow));
  }

  if (shouldListDocuments) {
    let documentQuery = client
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (category && isDocumentFileCategory(category)) {
      documentQuery = documentQuery.eq("document_type", category);
    }

    const { data, error } = await documentQuery;

    if (error) throw error;
    records.push(...((data as ProjectDocumentRow[] | null) ?? []).map(mapDocumentRow));
  }

  return attachSignedUrls(records);
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  category: ProjectFileCategory,
  apartmentId?: string,
  target?: string,
) {
  const client = assertStorageClient();
  const config = categoryConfigs[category];

  if (config.requiresApartment && !apartmentId) {
    throw new Error("יש לבחור דירה לפני העלאת תוכנית דירה.");
  }

  validateProjectFile(file, category);

  const filename = makeUniqueStorageFilename(file, config.kind);
  const storagePath = config.buildPath(projectId, filename, apartmentId);
  const uploadedBy = await runStorageUploadPreflight(
    client,
    projectId,
    config.bucket,
    storagePath,
    category,
  );

  const { data: { session }, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    throw makeUploadStageError("session", sessionError);
  }

  if (!session) {
    throw new Error("אין חיבור פעיל ל-Supabase. יש להתחבר מחדש.");
  }

  if (session.user.id !== uploadedBy) {
    throw new Error("חיבור ה-Supabase השתנה בזמן ההעלאה. יש להתחבר מחדש.");
  }

  const { error: uploadError } = await client.storage
    .from(config.bucket)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw makeUploadStageError("storage.upload", uploadError);

  try {
    if (config.kind === "image") {
      let displayOrder = 0;

      if (!config.isPrimary) {
        const { data: lastImage, error: displayOrderError } = await client
          .from("project_images")
          .select("display_order")
          .eq("project_id", projectId)
          .eq("category", category)
          .order("display_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (displayOrderError) throw displayOrderError;
        displayOrder = Math.max(0, Number(lastImage?.display_order) || 0) + 1;
      }

      if (config.isPrimary) {
        const { error: primaryResetError } = await client
          .from("project_images")
          .update({ is_primary: false })
          .eq("project_id", projectId)
          .eq("category", category);

        if (primaryResetError) throw primaryResetError;
      }

      const { data, error } = await client
        .from("project_images")
        .insert({
          project_id: projectId,
          category,
          storage_bucket: config.bucket,
          storage_path: storagePath,
          alt_text: file.name,
          caption: file.name,
          is_primary: Boolean(config.isPrimary),
          display_order: displayOrder,
          metadata: {
            file_name: file.name,
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          },
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          association: category,
          target: target ?? (category === "main" ? "תמונה ראשית" : "גלריית הפרויקט"),
          uploaded_by: uploadedBy,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (config.projectPathField) {
        const { error: projectUpdateError } = await client
          .from("projects")
          .update({ [config.projectPathField]: storagePath })
          .eq("id", projectId);

        if (projectUpdateError) {
          console.warn("[GOLDLANDS] Supabase project primary file path update failed.", projectUpdateError);
        }
      }

      const record = mapImageRow(data as ProjectImageRow);

      return {
        ...record,
        publicUrl: await safelyCreateSignedUrl(record),
      };
    }

    const { data, error } = await client
      .from("project_documents")
      .insert({
        project_id: projectId,
        apartment_id: apartmentId ?? null,
        document_type: category,
        title: makeDocumentTitle(category, file),
        file_name: file.name,
        storage_bucket: config.bucket,
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        version: 1,
        status: "active",
        association: categoryAssociations[category],
        target: target ?? makeDocumentTitle(category, file),
        uploaded_by: uploadedBy,
      })
      .select("*")
      .single();

    if (error) throw error;

    if (category === "apartment_plan" && apartmentId) {
      const { error: apartmentUpdateError } = await client
        .from("apartments")
        .update({ plan_file_status: "attached" })
        .eq("project_id", projectId)
        .eq("id", apartmentId);

      if (apartmentUpdateError) {
        console.warn("[GOLDLANDS] Supabase apartment plan status update failed.", apartmentUpdateError);
      }
    }

    const record = mapDocumentRow(data as ProjectDocumentRow);

    return {
      ...record,
      publicUrl: await safelyCreateSignedUrl(record),
    };
  } catch (error) {
    const { error: cleanupError } = await client.storage.from(config.bucket).remove([storagePath]);

    if (cleanupError) {
      console.warn(
        "[GOLDLANDS] Storage cleanup after metadata failure failed",
        formatSupabaseErrorDetails(cleanupError),
      );
    }

    throw makeUploadStageError("metadata", error);
  }
}

export async function deleteProjectFile(fileRecord: ProjectFileRecord) {
  const client = assertStorageClient();
  const { error: storageError } = await client.storage
    .from(fileRecord.storageBucket)
    .remove([fileRecord.storagePath]);

  if (storageError) throw storageError;

  if (fileRecord.kind === "image") {
    const { error } = await client.from("project_images").delete().eq("id", fileRecord.id);
    if (error) throw error;

    if (fileRecord.category === "logo" || fileRecord.category === "main") {
      const pathField = fileRecord.category === "logo" ? "project_logo_path" : "main_image_path";
      const { error: projectUpdateError } = await client
        .from("projects")
        .update({ [pathField]: null })
        .eq("id", fileRecord.projectId)
        .eq(pathField, fileRecord.storagePath);

      if (projectUpdateError) {
        console.warn("[GOLDLANDS] Supabase project primary file path clear failed.", projectUpdateError);
      }
    }

    return;
  }

  const { error } = await client.from("project_documents").delete().eq("id", fileRecord.id);
  if (error) throw error;
}

export async function updateStoredProjectFileAssociation(
  projectId: string,
  fileId: string,
  association: ProjectFileAssociation,
) {
  const client = assertStorageClient();
  const imageUpdate = await client
    .from("project_images")
    .update({ association })
    .eq("project_id", projectId)
    .eq("id", fileId)
    .select("id");

  if (imageUpdate.error) throw imageUpdate.error;
  if ((imageUpdate.data ?? []).length > 0) return;

  const documentUpdate = await client
    .from("project_documents")
    .update({ association })
    .eq("project_id", projectId)
    .eq("id", fileId)
    .select("id");

  if (documentUpdate.error) throw documentUpdate.error;
}

export async function updateStoredProjectFileTarget(
  projectId: string,
  fileId: string,
  target: string,
) {
  const client = assertStorageClient();
  const imageUpdate = await client
    .from("project_images")
    .update({ target })
    .eq("project_id", projectId)
    .eq("id", fileId)
    .select("id");

  if (imageUpdate.error) throw imageUpdate.error;
  if ((imageUpdate.data ?? []).length > 0) return;

  const documentUpdate = await client
    .from("project_documents")
    .update({ target })
    .eq("project_id", projectId)
    .eq("id", fileId)
    .select("id");

  if (documentUpdate.error) throw documentUpdate.error;
}

export async function deleteStoredProjectFile(projectId: string, fileId: string) {
  const client = assertStorageClient();
  const { data: imageRow, error: imageError } = await client
    .from("project_images")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", fileId)
    .maybeSingle();

  if (imageError) throw imageError;

  if (imageRow) {
    await deleteProjectFile(mapImageRow(imageRow as ProjectImageRow));
    return;
  }

  const { data: documentRow, error: documentError } = await client
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", fileId)
    .maybeSingle();

  if (documentError) throw documentError;

  if (documentRow) {
    await deleteProjectFile(mapDocumentRow(documentRow as ProjectDocumentRow));
  }
}
