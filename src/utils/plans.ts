import type { Apartment } from "../types";

export type PlanKind = "image" | "pdf" | "none";

export function planKind(apartment: Apartment): PlanKind {
  if (!apartment.planAttached || !apartment.planUrl) return "none";
  const type = apartment.planContentType ?? "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  return /\.(jpe?g|png|webp)$/i.test(apartment.planFileName ?? "") ? "image" : "pdf";
}
