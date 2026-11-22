import { describe, expect, it } from "vitest";
import { dictionaries, he, isLanguage, translate } from "./strings";

describe("strings", () => {
  it("every language defines exactly the Hebrew keys, with no empty values", () => {
    const keys = Object.keys(he).sort();
    for (const dictionary of Object.values(dictionaries)) {
      expect(Object.keys(dictionary).sort()).toEqual(keys);
      expect(Object.values(dictionary).every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it("keeps the same placeholders in every language", () => {
    const placeholders = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const key of Object.keys(he) as Array<keyof typeof he>) {
      for (const dictionary of Object.values(dictionaries)) {
        expect(placeholders(dictionary[key]), key).toBe(placeholders(he[key]));
      }
    }
  });

  it("fills placeholders", () => {
    expect(translate("en", "count.apartments", { count: 4 })).toBe("4 apartments");
    expect(translate("he", "map.walk", { min: 7 })).toBe("7 דק׳ הליכה");
  });

  it("recognises supported languages only", () => {
    expect(isLanguage("fr")).toBe(true);
    expect(isLanguage("de")).toBe(false);
  });
});
