import { useMemo, useRef, useState, type ChangeEvent } from "react";

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const DOCUMENT_EXTENSIONS = ["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "csv"];

export type UploadFileValidationKind = "image" | "document";

interface UseFileUploadInputOptions {
  kind?: UploadFileValidationKind;
  multiple?: boolean;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function formatUploadFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
  if (sizeBytes >= 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${sizeBytes} B`;
}

function validateUploadFile(file: File, kind: UploadFileValidationKind) {
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return "הקובץ גדול מדי. ניתן להעלות קבצים עד 25MB.";
  }

  const extension = getFileExtension(file.name);
  const allowedExtensions = kind === "image" ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;

  if (!allowedExtensions.includes(extension)) {
    return kind === "image"
      ? "סוג קובץ לא תקין. ניתן להעלות תמונות jpg, jpeg, png או webp."
      : "סוג קובץ לא תקין. ניתן להעלות מסמכים pdf, ppt, pptx, doc, docx, xls, xlsx או csv.";
  }

  return "";
}

export function useFileUploadInput({
  kind = "document",
  multiple = false,
}: UseFileUploadInputOptions = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState("");
  const [selectionNotice, setSelectionNotice] = useState("");

  const selectedFile = selectedFiles[0] ?? null;
  const selectedFileSummaries = useMemo(
    () =>
      selectedFiles.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        sizeLabel: formatUploadFileSize(file.size),
      })),
    [selectedFiles],
  );
  const isFileValid = selectedFiles.length > 0 && !validationError;

  const selectFiles = (incomingFiles: File[] | FileList) => {
    const files = Array.from(incomingFiles);
    const noticeParts: string[] = [];

    if (!multiple && files.length > 1) {
      noticeParts.push("נבחרו כמה קבצים. נשתמש בקובץ הראשון בלבד.");
    }

    const nextFiles = (multiple ? files : files.slice(0, 1)).filter((file, index, list) => {
      const key = `${file.name}-${file.size}`;
      const firstIndex = list.findIndex((candidate) => `${candidate.name}-${candidate.size}` === key);
      return firstIndex === index;
    });
    if (multiple && nextFiles.length < files.length) {
      noticeParts.push("קובץ בשם וגודל זה כבר קיים ברשימה ולא נוסף שוב.");
    }
    const error = nextFiles.map((file) => validateUploadFile(file, kind)).find(Boolean) ?? "";

    setSelectedFiles(nextFiles);
    setValidationError(error);
    setSelectionNotice(error ? "" : noticeParts.join(" "));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFiles(event.currentTarget.files ?? []);
  };

  const resetFileInput = () => {
    setSelectedFiles([]);
    setValidationError("");
    setSelectionNotice("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return {
    inputRef,
    selectedFile,
    selectedFiles,
    selectedFileSummaries,
    isFileValid,
    validationError,
    selectionNotice,
    selectFiles,
    handleFileChange,
    resetFileInput,
  };
}
