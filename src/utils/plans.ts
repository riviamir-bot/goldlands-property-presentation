import type { Apartment } from "../types";

export type PlanKind = "image" | "pdf" | "none";

export function planKind(apartment: Apartment): PlanKind {
  if (!apartment.planAttached || !apartment.planUrl) return "none";
  const type = apartment.planContentType ?? "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return /\.(jpe?g|png|webp)$/i.test(apartment.planFileName ?? "") ? "image" : "pdf";
}

/** Target pixel width for a PDF plan drawn as an image: sharp when zoomed, light enough for phones. */
export const PDF_RENDER_WIDTH = 3200;

/** Scale to draw a PDF page of `pageWidth` points so it comes out about PDF_RENDER_WIDTH px wide (1x-4x). */
export function pdfRenderScale(pageWidth: number) {
  if (!(pageWidth > 0)) return 1;
  return Math.min(4, Math.max(1, PDF_RENDER_WIDTH / pageWidth));
}
