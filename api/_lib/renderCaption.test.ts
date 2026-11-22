import { describe, expect, it } from "vitest";
import { renderCaption } from "./renderCaption.js";

describe("renderCaption", () => {
  const cases: Array<[string, string, string]> = [
    ["בן יהודה 59 -דירה 26- חדר שינה.jpg", "בן יהודה 59 תל אביב", "דירה 26 · חדר שינה"],
    ["בן יהודה 59 -דירה 26- מטבח.jpg", "בן יהודה 59 תל אביב", "דירה 26 · מטבח"],
    ["בן יהודה 59 - -דירה 26 מרפסת.jpg", "בן יהודה 59 תל אביב", "דירה 26 · מרפסת"],
    ["בן יהודה 59 - דירה 25 - קומה 7 ללא ים עם דק - טקסטורות מתוקנות.png", "בן יהודה 59 תל אביב", "דירה 25 · קומה 7"],
    ["בן יהודה 59 - דירה 25 - 03.jpg", "בן יהודה 59 תל אביב", "דירה 25"],
    ["בן יהודה 59 - בניין 03.jpg", "בן יהודה 59 תל אביב", "הבניין"],
    ["בר יהודה 3 - דירה 40 - 03.png", "בר יהודה 3", "דירה 40"],
    ["התבור 33-פנטהאוז 01.png", "התבור 33", "פנטהאוז"],
    ["ערבי נחל - פנטהואז 04.png", "ערבי נחל", "פנטהאוז"],
    ["ערבי נחל_3 חדרים 01.png", "ערבי נחל", "דירת 3 חדרים"],
    ["ערבי נחל 28 - 4 חדרים 02.png", "ערבי נחל", "דירת 4 חדרים"],
    ["ערבי נחל__דירת גן_05.jpg", "ערבי נחל", "דירת גן"],
    ["השקמה 49-פנים 07.jpg", "השקמה 49 בת ים", "הדמיית פנים"],
    ["השקמה 49-חוץ 02.jpg", "השקמה 49 בת ים", "הדמיית חוץ"],
    ["קרל נטר - מרפסת 03 - Copy.jpg", "קרל נטר 24", "מרפסת"],
    ["קרל נטר - פנים01 - Copy.jpg", "קרל נטר 24", "הדמיית פנים"],
    ["קרל נטר- מטבח 01 - Copy.jpg", "קרל נטר 24", "מטבח"],
    ["הערבה 11 חולון - דירה 27 - פנים 01.jpg", "הערבה 11", "דירה 27 · הדמיית פנים"],
    ["Bograshov 13 - Living Room.png", "בוגרשוב 13", "סלון"],
  ];

  it.each(cases)("%s", (filename, project, expected) => {
    expect(renderCaption(filename, project)).toBe(expected);
  });

  it("returns an empty caption when the name says nothing beyond the project and a number", () => {
    expect(renderCaption("בוגרשוב 30 08.jpg", "בוגרשוב 30")).toBe("");
    expect(renderCaption("בוגרשוב 13 תל אביב - 01.jpeg", "בוגרשוב 13")).toBe("");
    expect(renderCaption("e52d1bab-4e22-41f2-8a8a-c879e79b439c.jpg", "הערבה 11")).toBe("");
    expect(renderCaption("בר יהודה 3-3.png", "בר יהודה 3")).toBe("");
  });

  it("does not read the project's own number as an apartment or room count", () => {
    expect(renderCaption("ערבי נחל 28-בניין 01.jpg", "ערבי נחל")).toBe("הבניין");
    expect(renderCaption("קפלינסקי 12 - 5 חדרים.png", "קפלינסקי 12")).toBe("דירת 5 חדרים");
  });

  it("drops an apartment number that is not in the project's inventory", () => {
    const known = new Set(["25", "40"]);
    expect(renderCaption("בר יהודה 3 - דירה 4- - 01.jpg", "בר יהודה 3", known)).toBe("");
    expect(renderCaption("בר יהודה 3 - דירה 40 - 03.png", "בר יהודה 3", known)).toBe("דירה 40");
  });
});
