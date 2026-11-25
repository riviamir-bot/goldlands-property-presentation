export interface GalleryGroup {
  /** Stable id used for selection. Empty for renderings that name no apartment or building. */
  key: string;
  /** Text shown on the filter button: "הבניין", "דירה 26", "דירת גן", "פנטהאוז". */
  label: string;
  images: string[];
}

/** Text before the first " · " of a caption, when it names the building, a numbered apartment, or an apartment type. */
const GROUP_CAPTION = /^(הבניין|דירה\s+\d+|דירת\s+.+|פנטהאוז|דופלקס)$/;
const APARTMENT_NUMBER = /^דירה\s+(\d+)/;
const BUILDING = "הבניין";

function groupLabel(caption: string | undefined) {
  const first = caption?.split("·")[0]?.trim() ?? "";
  return GROUP_CAPTION.test(first) ? first : null;
}

/**
 * Splits gallery images by what their caption names: the building first, then numbered apartments,
 * then apartment types (garden, 4 rooms, penthouse...). Renderings that name none of these come last,
 * in one general group. Empty groups are never returned.
 */
export function groupGalleryByApartment(
  images: string[],
  captions: Record<string, string> | undefined,
): GalleryGroup[] {
  const groups = new Map<string, GalleryGroup>();
  const general: string[] = [];

  for (const image of images) {
    const label = groupLabel(captions?.[image]);
    if (!label) {
      general.push(image);
      continue;
    }
    const group = groups.get(label) ?? { key: label, label, images: [] };
    group.images.push(image);
    groups.set(label, group);
  }

  const rank = (group: GalleryGroup) => {
    if (group.label === BUILDING) return [0, 0] as const;
    const number = group.label.match(APARTMENT_NUMBER)?.[1];
    return number ? ([1, Number(number)] as const) : ([2, 0] as const);
  };
  const sorted = [...groups.values()].sort((a, b) => {
    const [aRank, aNumber] = rank(a);
    const [bRank, bNumber] = rank(b);
    if (aRank !== bRank) return aRank - bRank;
    if (aNumber !== bNumber) return aNumber - bNumber;
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
