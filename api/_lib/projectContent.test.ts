import { describe, expect, it } from "vitest";
import type { Project } from "../../src/types";
import { applyProjectContent, mapFeatureBlocks, mapSpecSections, youtubeEmbedUrl } from "./projectContent";
import type { MarketingProjectContentRow } from "./types";

const base = {
  id: "p1",
  name: "ערבי נחל",
  tagline: "",
  description: "מהמערכת",
  neighborhood: "",
  technicalSpecSections: [],
  details: {
    developerCompany: "",
    financingBank: "",
    constructionStage: "",
    constructionStartDate: "",
    constructionCompletionDate: "",
    websiteUrl: "",
  },
} as unknown as Project;

function row(overrides: Partial<MarketingProjectContentRow> = {}): MarketingProjectContentRow {
  return {
    project_id: "p1",
    status: "published",
    tagline: "נחלת יצחק",
    description: "תיאור מהמצגת",
    neighborhood: "נחלת יצחק",
    location_description: "על התפר",
    developer_name: "מרכז העיר",
    developer_about: "אודות",
    developer_website: "https://merkaz-nadlan.co.il",
    architect: "מסטר-גל",
    facts: [{ label: "קומות", value: "8" }],
    spec_sections: [{ title: "הבניין", items: ["מעלית", ""] }],
    feature_blocks: [],
    legal_disclaimer: "להמחשה בלבד",
    ...overrides,
  };
}

describe("youtubeEmbedUrl", () => {
  it("turns watch, short and shorts links into a nocookie embed", () => {
    expect(youtubeEmbedUrl("https://youtube.com/watch?v=U4LESDqqK2Y&si=abc")).toBe(
      "https://www.youtube-nocookie.com/embed/U4LESDqqK2Y",
    );
    expect(youtubeEmbedUrl("https://youtu.be/U4LESDqqK2Y")).toBe("https://www.youtube-nocookie.com/embed/U4LESDqqK2Y");
    expect(youtubeEmbedUrl("https://www.youtube.com/shorts/U4LESDqqK2Y")).toBe(
      "https://www.youtube-nocookie.com/embed/U4LESDqqK2Y",
    );
  });

  it("rejects other hosts, http and malformed ids", () => {
    expect(youtubeEmbedUrl("https://evil.example/watch?v=U4LESDqqK2Y")).toBe("");
    expect(youtubeEmbedUrl("http://youtube.com/watch?v=U4LESDqqK2Y")).toBe("");
    expect(youtubeEmbedUrl("https://youtube.com/watch?v=bad")).toBe("");
    expect(youtubeEmbedUrl("javascript:alert(1)")).toBe("");
  });
});

describe("content mapping", () => {
  it("drops empty spec items and untitled sections", () => {
    expect(mapSpecSections([{ title: "הבניין", items: ["מעלית", " "] }, { title: "", items: ["x"] }, "junk"])).toEqual([
      { id: "content-0", title: "הבניין", items: ["מעלית"], displayOrder: 0 },
    ]);
  });

  it("maps feature blocks with video and only complete FAQs", () => {
    const [block] = mapFeatureBlocks([
      {
        key: "robotic_parking",
        title: "חניון רובוטי",
        intro: "אוטומטי מלא",
        bullets: ["ללא שאטלים"],
        video_url: "https://youtube.com/watch?v=U4LESDqqK2Y",
        faqs: [{ q: "איך מחנים?", a: "בתא הכניסה" }, { q: "ללא תשובה" }],
      },
    ]);
    expect(block.videoEmbedUrl).toContain("/embed/U4LESDqqK2Y");
    expect(block.faqs).toEqual([{ q: "איך מחנים?", a: "בתא הכניסה" }]);
  });
});

describe("applyProjectContent", () => {
  it("applies published content over the marketing data", () => {
    const project = applyProjectContent(base, row());
    expect(project.description).toBe("תיאור מהמצגת");
    expect(project.technicalSpecSections).toHaveLength(1);
    expect(project.details?.developerCompany).toBe("מרכז העיר");
    expect(project.developerWebsite).toBe("https://merkaz-nadlan.co.il/");
  });

  it("ignores drafts and missing rows", () => {
    expect(applyProjectContent(base, row({ status: "draft" }))).toBe(base);
    expect(applyProjectContent(base, undefined)).toBe(base);
  });

  it("keeps marketing values when content fields are empty", () => {
    const project = applyProjectContent(base, row({ description: "  ", developer_website: "http://insecure.example" }));
    expect(project.description).toBe("מהמערכת");
    expect(project.developerWebsite).toBe("");
  });
});
