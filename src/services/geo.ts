export interface LatLon {
  lat: number;
  lon: number;
}

export type PlaceCategory = "education" | "synagogues" | "parks" | "transit" | "shopping" | "health";

export const PLACE_CATEGORIES: PlaceCategory[] = ["education", "synagogues", "parks", "transit", "shopping", "health"];

export interface NearbyPlace extends LatLon {
  id: string;
  name: string;
  category: PlaceCategory;
  distance: number;
  walkMinutes: number;
}

type Tags = Record<string, string>;

const EARTH_RADIUS_M = 6_371_000;
const WALKING_METERS_PER_MINUTE = 80;
export const NEARBY_RADIUS_M = 1000;

export function haversineMeters(a: LatLon, b: LatLon) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(meters: number) {
  return Math.max(1, Math.round(meters / WALKING_METERS_PER_MINUTE));
}

export function classifyPlace(tags: Tags): PlaceCategory | null {
  const { amenity, leisure, highway, railway, shop } = tags;
  if (amenity === "school" || amenity === "kindergarten" || amenity === "college" || amenity === "university") return "education";
  if (amenity === "place_of_worship") return tags.religion === "jewish" ? "synagogues" : null;
  if (leisure === "park" || leisure === "playground" || leisure === "garden") return "parks";
  if (highway === "bus_stop" || railway === "station" || railway === "tram_stop" || railway === "halt") return "transit";
  if (shop === "supermarket" || shop === "mall") return "shopping";
  if (amenity === "pharmacy" || amenity === "clinic" || amenity === "hospital" || amenity === "doctors") return "health";
  return null;
}

export function buildOverpassQuery(center: LatLon, radius = NEARBY_RADIUS_M) {
  const around = `around:${radius},${center.lat},${center.lon}`;
  return `[out:json][timeout:20];
(
  nwr["amenity"~"^(school|kindergarten|college|university)$"](${around});
  nwr["amenity"="place_of_worship"]["religion"="jewish"](${around});
  nwr["leisure"~"^(park|playground|garden)$"](${around});
  node["highway"="bus_stop"](${around});
  node["railway"~"^(station|tram_stop|halt)$"](${around});
  nwr["shop"~"^(supermarket|mall)$"](${around});
  nwr["amenity"~"^(pharmacy|clinic|hospital|doctors)$"](${around});
);
out center tags 300;`;
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: LatLon;
  tags?: Tags;
}

export function parseOverpass(json: unknown, origin: LatLon, options: { maxPerCategory?: number } = {}): NearbyPlace[] {
  const maxPerCategory = options.maxPerCategory ?? 6;
  const elements = (json as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(elements)) return [];

  const nearestByKey = new Map<string, NearbyPlace>();
  for (const element of elements as OverpassElement[]) {
    const tags = element.tags ?? {};
    const category = classifyPlace(tags);
    const name = (tags["name:he"] || tags.name || "").trim();
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!category || !name || typeof lat !== "number" || typeof lon !== "number") continue;

    const distance = Math.round(haversineMeters(origin, { lat, lon }));
    const place: NearbyPlace = {
      id: `${element.type ?? "node"}/${element.id ?? `${lat},${lon}`}`,
      name,
      category,
      lat,
      lon,
      distance,
      walkMinutes: walkingMinutes(distance),
    };
    const key = `${category}:${name}`;
    const existing = nearestByKey.get(key);
    if (!existing || existing.distance > distance) nearestByKey.set(key, place);
  }

  const sorted = Array.from(nearestByKey.values()).sort((a, b) => a.distance - b.distance);
  const perCategory = new Map<PlaceCategory, number>();
  return sorted.filter((place) => {
    const count = perCategory.get(place.category) ?? 0;
    if (count >= maxPerCategory) return false;
    perCategory.set(place.category, count + 1);
    return true;
  });
}

export function geocodeQuery(address: string, city: string) {
  const base = city && !address.includes(city) ? `${address}, ${city}` : address;
  return `${base}, ישראל`;
}

function readCache<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

const safeStorage = (kind: "local" | "session") => {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
};

/** OpenStreetMap Nominatim lookup. Results are cached on the device: addresses do not move. */
export async function geocodeAddress(address: string, city: string, signal?: AbortSignal): Promise<LatLon | null> {
  const query = geocodeQuery(address, city);
  const key = `geo:v1:${query}`;
  const cached = readCache<LatLon>(safeStorage("local"), key);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=il&accept-language=he&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = results[0];
  const point = first ? { lat: Number(first.lat), lon: Number(first.lon) } : null;
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  writeCache(safeStorage("local"), key, point);
  return point;
}

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

/** Nearby places from OpenStreetMap (Overpass), cached for the browser session. */
export async function fetchNearbyPlaces(center: LatLon, signal?: AbortSignal): Promise<NearbyPlace[]> {
  const key = `poi:v1:${center.lat.toFixed(4)},${center.lon.toFixed(4)}`;
  const cached = readCache<NearbyPlace[]>(safeStorage("session"), key);
  if (cached) return cached;

  const body = new URLSearchParams({ data: buildOverpassQuery(center) });
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { method: "POST", body, signal });
      if (!response.ok) throw new Error(`overpass ${response.status}`);
      const places = parseOverpass(await response.json(), center);
      writeCache(safeStorage("session"), key, places);
      return places;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("overpass unavailable");
}
