import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { UploadCloud } from "lucide-react";
import { formatUploadFileSize, MAX_UPLOAD_FILE_SIZE_BYTES } from "../hooks/useFileUploadInput";

interface FileDropZoneProps {
  accept: string;
  multiple?: boolean;
  maxSize?: number;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  error?: string;
  notice?: string;
  disabled?: boolean;
  description?: string;
  ariaLabel?: string;
}

function formatAcceptLabel(accept: string) {
  return accept
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.startsWith("."))
    .map((value) => value.replace(".", "").toUpperCase())
    .join(", ");
}

export function FileDropZone({
  accept,
  multiple = false,
  maxSize = MAX_UPLOAD_FILE_SIZE_BYTES,
  files,
  onFilesSelected,
  error,
  notice,
  disabled = false,
  description,
  ariaLabel = "בחירת קובץ להעלאה",
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const allowedTypesLabel = description || `${formatAcceptLabel(accept)}. עד ${formatUploadFileSize(maxSize)}.`;

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDragEvent = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    handleDragEvent(event);
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    handleDragEvent(event);
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    handleDragEvent(event);
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openFilePicker();
  };

  return (
    <div
      aria-disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "file-drop-zone",
        isDragging ? "file-drop-zone--dragging" : "",
        disabled ? "file-drop-zone--disabled" : "",
      ].filter(Boolean).join(" ")}
      onClick={openFilePicker}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragEvent}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <input
        accept={accept}
        className="file-drop-zone__input"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          onFilesSelected(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <UploadCloud size={38} strokeWidth={1.5} />
      <div className="file-drop-zone__body">
        <strong>{isDragging ? "שחררי להעלאה" : "גררי קובץ לכאן או לחצי לבחירה"}</strong>
        <p>{allowedTypesLabel}</p>
        {files.length > 0 && (
          <ul className="upload-file-list file-drop-zone__files" aria-label="קבצים שנבחרו">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span>{file.name}</span>
                <small>{formatUploadFileSize(file.size)}</small>
              </li>
            ))}
          </ul>
        )}
        {notice && !error && (
          <p className="file-drop-zone__notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="file-drop-zone__error" role="alert">
            {error}
          </p>
        )}
      </div>
      <span className="gold-button gold-button--compact file-drop-zone__button">בחירת קובץ</span>
    </div>
  );
}
