export interface GalleryGroup {
  /** Apartment number ("26") or null for renders that are not tied to one apartment. */
  apartmentNumber: string | null;
  images: string[];
}

const APARTMENT_CAPTION = /^דירה\s+(\d+)/;

/**
 * Splits gallery images by the apartment named in their caption ("דירה 26 · מטבח").
 * Apartments come first in numeric order; renders with no apartment come last in one group.
 * Empty groups are never returned.
 */
export function groupGalleryByApartment(
  images: string[],
  captions: Record<string, string> | undefined,
): GalleryGroup[] {
  const byApartment = new Map<string, string[]>();
  const general: string[] = [];

  for (const image of images) {
    const apartment = captions?.[image]?.match(APARTMENT_CAPTION)?.[1];
    if (apartment) {
      const list = byApartment.get(apartment) ?? [];
      list.push(image);
      byApartment.set(apartment, list);
    } else {
      general.push(image);
    }
  }

  const groups: GalleryGroup[] = [...byApartment.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([apartmentNumber, groupImages]) => ({ apartmentNumber, images: groupImages }));

  if (general.length > 0) groups.push({ apartmentNumber: null, images: general });
  return groups;
}
