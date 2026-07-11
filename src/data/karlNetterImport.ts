import type { Apartment, Project, ProjectFile, ProjectReadiness } from "../types";

export interface ProjectImportBundle {
  project: Project;
  apartments: Apartment[];
  readiness: ProjectReadiness;
  sourceFiles: ProjectFile[];
  conflicts: Array<{ apartment: string; field: string; priceList: string; plan: string; selected: string }>;
}

const projectId = "karl-netter-24";

export const karlNetterImportBundle: ProjectImportBundle = {
  project: {
    id: projectId,
    name: "קרל נטר 24",
    location: "שכונת אברמוביץ', ראשון לציון",
    city: "ראשון לציון",
    neighborhood: "אברמוביץ'",
    address: "קרל נטר 24",
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=%D7%A7%D7%A8%D7%9C+%D7%A0%D7%98%D7%A8+24+%D7%A8%D7%90%D7%A9%D7%95%D7%9F+%D7%9C%D7%A6%D7%99%D7%95%D7%9F",
    googleMapsEmbedUrl: "https://www.google.com/maps?q=%D7%A7%D7%A8%D7%9C+%D7%A0%D7%98%D7%A8+24+%D7%A8%D7%90%D7%A9%D7%95%D7%9F+%D7%9C%D7%A6%D7%99%D7%95%D7%9F&output=embed",
    projectType: "תמ״א 38/1",
    tagline: "דירות גדולות במיוחד ופנטהאוזים עם מרפסות ענק בלב שכונת אברמוביץ'",
    description:
      "הפרויקט נבנה ברחוב קרל נטר 24 בשכונת אברמוביץ' המבוקשת בראשון לציון, בסטנדרט בנייה גבוה ובמפרט עשיר. הדירות נהנות מכיווני אוויר מרובים וממרפסות המשקיפות לנוף פתוח.",
    logoMark: "KN",
    isSupabaseBacked: false,
    projectLogo: "",
    heroImage: "",
    mainImage: "",
    keyFacts: ["גוש 3928", "חלקה 707", "26 יחידות", "בביצוע", "צפי סיום דצמבר 2028"],
    stats: {
      floors: "7",
      units: "26",
      occupancy: "דצמבר 2028",
      parking: "חניה בהתאם לדירה",
      buildings: "1",
      existingApartments: "16",
      newApartments: "10",
      storage: "בהתאם לדירה",
    },
    apartmentMix: {
      threeRooms: "0",
      fourRooms: "7",
      fiveRooms: "3",
      gardenApartments: "0",
      penthouses: "2",
    },
    gallery: {
      exterior: [],
      interior: [],
      lobby: [],
      surroundings: [],
    },
    materialFileCounts: {
      documents: 0,
      prices: 0,
      plans: 0,
      technical: 0,
    },
    projectFiles: [],
  },
  apartments: [
    { id: `${projectId}-17`, projectId, number: "17", floor: 5, rooms: 5, apartmentArea: 131, balconyArea: 13, gardenArea: 0, parking: "1", storage: "", direction: "צפון מערב", price: 3330000, specialPrice: 3230000, status: "available", planAttached: false, notes: "המחירון מציג 6 חדרים ו-132 מ״ר; נבחרו נתוני התכנית." },
    { id: `${projectId}-18`, projectId, number: "18", floor: 5, rooms: 4, apartmentArea: 113, balconyArea: 13, gardenArea: 0, parking: "1", storage: "", direction: "צפון מזרח", price: 2980000, specialPrice: 2890000, status: "available", planAttached: false, notes: "המחירון מציג 5 חדרים ומרפסת 14 מ״ר; נבחרו נתוני התכנית." },
    { id: `${projectId}-19`, projectId, number: "19", floor: 5, rooms: 4, apartmentArea: 106, balconyArea: 10, gardenArea: 0, parking: "", storage: "", direction: "מזרח דרום", price: 0, specialPrice: 0, status: "notMarketing", planAttached: false, notes: "לא נמצאה שורת מחיר במחירון המצורף." },
    { id: `${projectId}-20`, projectId, number: "20", floor: 5, rooms: 4, apartmentArea: 118, balconyArea: 12, gardenArea: 0, parking: "1", storage: "", direction: "דרום מערב", price: 3050000, specialPrice: 2960000, status: "available", planAttached: false, notes: "בקובץ נפרד מופיעים 117 מ״ר ו-11 מ״ר מרפסת; נבחרו נתוני המצגת/מחירון." },
    { id: `${projectId}-21`, projectId, number: "21", floor: 6, rooms: 5, apartmentArea: 131, balconyArea: 13, gardenArea: 0, parking: "1", storage: "", direction: "צפון מערב", price: 3350000, specialPrice: 3250000, status: "available", planAttached: false, notes: "המחירון מציג 6 חדרים ו-132 מ״ר; נבחרו נתוני התכנית." },
    { id: `${projectId}-22`, projectId, number: "22", floor: 6, rooms: 4, apartmentArea: 113, balconyArea: 13, gardenArea: 0, parking: "1", storage: "", direction: "צפון מזרח", price: 0, specialPrice: 0, status: "notMarketing", planAttached: false, notes: "לא נמצאה שורת מחיר במחירון המצורף." },
    { id: `${projectId}-23`, projectId, number: "23", floor: 6, rooms: 4, apartmentArea: 106, balconyArea: 10, gardenArea: 0, parking: "", storage: "", direction: "מזרח דרום", price: 0, specialPrice: 0, status: "notMarketing", planAttached: false, notes: "לא נמצאה שורת מחיר במחירון המצורף." },
    { id: `${projectId}-24`, projectId, number: "24", floor: 6, rooms: 4, apartmentArea: 118, balconyArea: 12, gardenArea: 0, parking: "1", storage: "", direction: "דרום מערב", price: 3070000, specialPrice: 2980000, status: "available", planAttached: false, notes: "בקובץ נפרד מופיעים 117 מ״ר ו-11 מ״ר מרפסת; נבחרו נתוני המצגת/מחירון." },
    { id: `${projectId}-25`, projectId, number: "25", floor: 7, rooms: 4, apartmentArea: 110, balconyArea: 178, gardenArea: 0, parking: "178", storage: "", direction: "ארבעה כיוונים", price: 4350000, specialPrice: 4220000, status: "available", planAttached: false, notes: "מרפסת דיור 154 מ״ר ומרפסת הורים 24 מ״ר." },
    { id: `${projectId}-26`, projectId, number: "26", floor: 7, rooms: 5, apartmentArea: 118, balconyArea: 119, gardenArea: 0, parking: "119", storage: "", direction: "ארבעה כיוונים", price: 4060000, specialPrice: 3940000, status: "available", planAttached: false, notes: "מרפסת דיור 113 מ״ר ומרפסת רחצה 6 מ״ר." },
  ],
  readiness: {
    projectId,
    city: "ראשון לציון",
    marketingStatus: "בביצוע",
    readinessPercentage: 78,
    lastUpdated: "10/07/2026",
    missing: {
      critical: ["אישור סופי לנתונים הסותרים", "מחירים לדירות 19, 22 ו-23"],
      important: ["לוגו פרויקט בקובץ נפרד", "הדמיות מקור באיכות מלאה"],
      optional: ["שאלות נפוצות", "וידאו"],
    },
  },
  sourceFiles: [],
  conflicts: [
    { apartment: "17, 21", field: "חדרים / שטח / מרפסת", priceList: "6 / 132 / 14", plan: "5 / 131 / 13", selected: "תכנית" },
    { apartment: "18, 22", field: "חדרים / מרפסת", priceList: "5 / 14", plan: "4 / 13", selected: "תכנית" },
    { apartment: "20, 24", field: "שטח / מרפסת", priceList: "118 / 12", plan: "117 / 11", selected: "מחירון" },
    { apartment: "25", field: "שטח דירה", priceList: "109", plan: "110", selected: "תכנית" },
    { apartment: "26", field: "שטח / מרפסות", priceList: "118 / 119", plan: "117 / 118", selected: "מחירון" },
  ],
};
