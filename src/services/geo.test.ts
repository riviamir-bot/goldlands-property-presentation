import { describe, expect, it } from "vitest";
import { buildOverpassQuery, classifyPlace, geocodeQuery, haversineMeters, parseOverpass, walkingMinutes } from "./geo";

const origin = { lat: 32.0853, lon: 34.7818 };

describe("geo", () => {
  it("measures distance in meters", () => {
    expect(haversineMeters(origin, origin)).toBe(0);
    // About 111 m per 0.001 degree of latitude.
    expect(haversineMeters(origin, { lat: origin.lat + 0.001, lon: origin.lon })).toBeGreaterThan(105);
    expect(haversineMeters(origin, { lat: origin.lat + 0.001, lon: origin.lon })).toBeLessThan(117);
  });

  it("converts distance to whole walking minutes, at least one", () => {
    expect(walkingMinutes(20)).toBe(1);
    expect(walkingMinutes(800)).toBe(10);
  });

  it("classifies places by their tags", () => {
    expect(classifyPlace({ amenity: "school" })).toBe("education");
    expect(classifyPlace({ amenity: "kindergarten" })).toBe("education");
    expect(classifyPlace({ amenity: "place_of_worship", religion: "jewish" })).toBe("synagogues");
    expect(classifyPlace({ amenity: "place_of_worship", religion: "christian" })).toBeNull();
    expect(classifyPlace({ leisure: "park" })).toBe("parks");
    expect(classifyPlace({ highway: "bus_stop" })).toBe("transit");
    expect(classifyPlace({ railway: "station" })).toBe("transit");
    expect(classifyPlace({ shop: "supermarket" })).toBe("shopping");
    expect(classifyPlace({ amenity: "pharmacy" })).toBe("health");
    expect(classifyPlace({ amenity: "bench" })).toBeNull();
  });

  it("parses, names, dedupes, sorts and caps the nearby places", () => {
    const near = { lat: origin.lat + 0.001, lon: origin.lon };
    const far = { lat: origin.lat + 0.005, lon: origin.lon };
    const places = parseOverpass(
      {
        elements: [
          { type: "node", id: 1, ...far, tags: { amenity: "school", name: "אורט", "name:he": "תיכון אורט" } },
          { type: "way", id: 2, center: near, tags: { amenity: "school", name: "יסודי הדר" } },
          { type: "node", id: 3, ...near, tags: { amenity: "school", name: "יסודי הדר" } },
          { type: "node", id: 4, ...near, tags: { highway: "bus_stop" } },
          { type: "node", id: 5, ...near, tags: { amenity: "bench", name: "ספסל" } },
          { type: "node", id: 6, tags: { leisure: "park", name: "בלי מיקום" } },
        ],
      },
      origin,
      { maxPerCategory: 6 },
    );
    expect(places.map((place) => place.name)).toEqual(["יסודי הדר", "תיכון אורט"]);
    expect(places[0]).toMatchObject({ category: "education", walkMinutes: 1 });
    expect(places[0].distance).toBeLessThan(places[1].distance);
  });

  it("caps each category", () => {
    const elements = Array.from({ length: 10 }, (_, i) => ({
      type: "node", id: i, lat: origin.lat + i * 0.0005, lon: origin.lon, tags: { leisure: "park", name: `פארק ${i}` },
    }));
    expect(parseOverpass({ elements }, origin, { maxPerCategory: 4 })).toHaveLength(4);
  });

  it("tolerates a malformed response", () => {
    expect(parseOverpass(null, origin)).toEqual([]);
    expect(parseOverpass({ elements: "x" }, origin)).toEqual([]);
  });

  it("builds a bounded overpass query around the point", () => {
    const query = buildOverpassQuery(origin, 1000);
    expect(query).toContain("around:1000,32.0853,34.7818");
    expect(query).toContain("[out:json]");
    expect(query).toContain('religion"="jewish');
  });

  it("adds the city and country to the geocoding query only when missing", () => {
    expect(geocodeQuery("ערבי נחל 28, תל אביב", "תל אביב")).toBe("ערבי נחל 28, תל אביב, ישראל");
    expect(geocodeQuery("ערבי נחל 28", "תל אביב")).toBe("ערבי נחל 28, תל אביב, ישראל");
  });
});
