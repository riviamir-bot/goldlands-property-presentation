export interface GalleryGroup {
  /** Stable id used for selection; "" for renders with no apartment in their caption. */
  key: string;
  /** Text shown on the filter button: "דירה 26", "דירת גן", "דירת 4 חדרים". */
  label: string;
  images: string[];
}

/** Apartment number ("דירה 26") or apartment type ("דירת גן", "דירת 4 חדרים") at the start of a caption. */
const APARTMENT_CAPTION = /^(דירה\s+\d+|דירת\s+[^·]+?)\s*(?:·|$)/;
const APARTMENT_NUMBER = /^דירה\s+(\d+)/;

/**
 * Splits gallery images by the apartment named in their caption ("דירה 26 · מטבח", "דירת גן").
 * Numbered apartments come first in numeric order, then apartment types in Hebrew order.
 * Renders that name no apartment come last, in one general group. Empty groups are never returned.
 */
export function groupGalleryByApartment(
  images: string[],
  captions: Record<string, string> | undefined,
): GalleryGroup[] {
  const groups = new Map<string, GalleryGroup>();
  const general: string[] = [];

  for (const image of images) {
    const label = captions?.[image]?.match(APARTMENT_CAPTION)?.[1]?.trim();
    if (!label) {
      general.push(image);
      continue;
    }
    const group = groups.get(label) ?? { key: label, label, images: [] };
    group.images.push(image);
    groups.set(label, group);
  }

  const numbered = (group: GalleryGroup) => Number(group.label.match(APARTMENT_NUMBER)?.[1] ?? NaN);
  const sorted = [...groups.values()].sort((a, b) => {
    const aNumber = numbered(a);
    const bNumber = numbered(b);
    if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return aNumber - bNumber;
    if (Number.isNaN(aNumber) !== Number.isNaN(bNumber)) return Number.isNaN(aNumber) ? 1 : -1;
    return a.label.localeCompare(b.label, "he");
  });

  if (general.length > 0) sorted.push({ key: "", label: "", images: general });
  return sorted;
}

export interface ManualGalleryGroup {
  id: string;
  name: string;
  images: string[];
}

/**
 * Groups for the gallery: the manual groups set in the dashboard first (building first, as sent),
 * then the automatic grouping for the renderings that are not in any manual group.
 */
export function buildGalleryGroups(
  images: string[],
  captions: Record<string, string> | undefined,
  manualGroups: ManualGalleryGroup[] | undefined,
): GalleryGroup[] {
  if (!manualGroups?.length) return groupGalleryByApartment(images, captions);

  const available = new Set(images);
  const assigned = new Set<string>();
  const manual: GalleryGroup[] = [];
  for (const group of manualGroups) {
    const groupImages = [...new Set(group.images)].filter((image) => available.has(image) && !assigned.has(image));
    groupImages.forEach((image) => assigned.add(image));
    if (groupImages.length > 0) manual.push({ key: group.id, label: group.name, images: groupImages });
  }

  const rest = images.filter((image) => !assigned.has(image));
  return [...manual, ...groupGalleryByApartment(rest, captions)];
}
