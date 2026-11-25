import { describe, expect, it } from "vitest";
import { translateConstructionStage, translateProjectType } from "./project-values";

describe("project value translations", () => {
  it("translates the known construction stages", () => {
    expect(translateConstructionStage("היתר בתנאים", "fr")).toBe("Permis sous conditions");
    expect(translateConstructionStage("בבניה", "en")).toBe("Under construction");
    expect(translateConstructionStage("היתר בתנאים", "he")).toBe("היתר בתנאים");
  });

  it("translates the known project types and ignores surrounding spaces", () => {
    expect(translateProjectType("תמ״א 38/1", "en")).toBe("TAMA 38/1");
    expect(translateProjectType("  פרויקט חדש ", "fr")).toBe("Projet neuf");
  });

  it("keeps unknown values such as names exactly as entered", () => {
    expect(translateConstructionStage("אדלר בוגרשוב", "fr")).toBe("אדלר בוגרשוב");
  });
});
