import { supabase } from "../lib/supabaseClient";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const DOCUMENT_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"] as const;
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
    mime_type?: string;
    size_bytes?: number;
  } | null;
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
        : "סוג קובץ לא נתמך. ניתן להעלות pdf, ppt, pptx, doc, docx, xls או xlsx.",
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
    throw new Error("סוג מסמך לא נתמך. ניתן להעלות pdf, ppt, pptx, doc, docx, xls או xlsx.");
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

  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user.id ?? null;
  let profileRole: string | null = null;
  let profileIsActive: boolean | null = null;
  let projectExists = false;
  let projectIsActive: boolean | null = null;

  if (userId) {
    const { data: profileRow, error: profileError } = await client
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    profileRole = (profileRow as { role?: string | null } | null)?.role ?? null;
    profileIsActive = (profileRow as { is_active?: boolean | null } | null)?.is_active ?? null;
  }

  if (projectIdLooksLikeUuid) {
    const { data: projectRow, error: projectError } = await client
      .from("projects")
      .select("id, is_active")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) throw projectError;

    projectExists = Boolean(projectRow);
    projectIsActive = (projectRow as { is_active?: boolean | null } | null)?.is_active ?? null;
  }

  console.info("[GOLDLANDS] Storage upload preflight", {
    storageBucket,
    storagePath,
    category,
    projectId,
    pathFolder1: folderSegments[0] ?? null,
    pathFolder2: folderProjectId || null,
    pathStartsWithProjects: folderSegments[0] === "projects",
    pathProjectIdMatches: folderProjectId === projectId,
    projectIdLooksLikeUuid,
    projectExists,
    projectIsActive,
    profileRole,
    profileIsActive,
    hasSupabaseSession: Boolean(sessionData.session),
  });

  if (!sessionData.session) {
    throw new Error("Upload requires real Supabase admin login.");
  }

  if (profileRole !== "admin" || profileIsActive === false) {
    throw new Error("Upload requires real Supabase admin login.");
  }

  if (folderSegments[0] !== "projects" || folderProjectId !== projectId) {
    throw new Error("Storage path does not match the required projects/{project_id}/... format.");
  }

  if (!projectExists || projectIsActive !== true) {
    throw new Error("יש לשמור את הפרויקט בענן לפני העלאת קבצים.");
  }

  return userId;
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
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    kind: "image",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.metadata?.file_name ?? row.storage_path.split("/").pop() ?? "",
    mimeType: row.metadata?.mime_type ?? "",
    sizeBytes: row.metadata?.size_bytes ?? 0,
    isPrimary: row.is_primary,
    displayOrder: row.display_order,
    title: row.caption || row.alt_text,
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
  const { error: uploadError } = await client.storage
    .from(config.bucket)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  try {
    if (config.kind === "image") {
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
          display_order: config.isPrimary ? 0 : Date.now(),
          metadata: {
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          },
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
    await client.storage.from(config.bucket).remove([storagePath]);
    throw error;
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
