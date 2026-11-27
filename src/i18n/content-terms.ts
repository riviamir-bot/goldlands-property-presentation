import type { Language } from "./strings";

type Terms = Record<"en" | "fr", string>;

/** Hebrew words used in generated render captions, gallery groups and technical-spec section titles. Anything not listed (names, free text) is shown as entered. */
const TERMS: Record<string, Terms> = {
  "הבניין": { en: "The building", fr: "Le bâtiment" },
  "בניין": { en: "Building", fr: "Bâtiment" },
  "פנטהאוז": { en: "Penthouse", fr: "Penthouse" },
  "דירת גן": { en: "Garden apartment", fr: "Appartement avec jardin" },
  "דופלקס": { en: "Duplex", fr: "Duplex" },
  "דירת גג": { en: "Rooftop apartment", fr: "Appartement sur le toit" },
  "חדר שינה הורים": { en: "Master bedroom", fr: "Chambre parentale" },
  "חדר שינה": { en: "Bedroom", fr: "Chambre" },
  "חדרי שינה": { en: "Bedrooms", fr: "Chambres" },
  "חדר רחצה": { en: "Bathroom", fr: "Salle de bains" },
  "חדרי רחצה": { en: "Bathrooms", fr: "Salles de bains" },
  "החדרי רחצה": { en: "Bathrooms", fr: "Salles de bains" },
  "ח. רחצה": { en: "Bathrooms", fr: "Salles de bains" },
  "חדרי הרחצה": { en: "Bathrooms", fr: "Salles de bains" },
  "מטבח": { en: "Kitchen", fr: "Cuisine" },
  "המטבח": { en: "Kitchen", fr: "Cuisine" },
  "סלון": { en: "Living room", fr: "Salon" },
  "פינת אוכל": { en: "Dining area", fr: "Coin repas" },
  "מרפסת גג": { en: "Roof terrace", fr: "Toit-terrasse" },
  "מרפסת": { en: "Balcony", fr: "Balcon" },
  "מרפסת שמש": { en: "Sun balcony", fr: "Balcon ensoleillé" },
  "לובי": { en: "Lobby", fr: "Hall d'entrée" },
  "גינה": { en: "Garden", fr: "Jardin" },
  "בריכה": { en: "Pool", fr: "Piscine" },
  "הדמיית פנים": { en: "Interior render", fr: "Rendu intérieur" },
  "הדמיית חוץ": { en: "Exterior render", fr: "Rendu extérieur" },
  "דירה": { en: "Apartment", fr: "Appartement" },
  "מפרט הדירה - כללי": { en: "Apartment specification - general", fr: "Descriptif de l'appartement - général" },
  "ריצופים וחיפויים": { en: "Flooring and cladding", fr: "Sols et revêtements" },
  "שלד ובנייה": { en: "Structure and construction", fr: "Structure et construction" },
  "לובי וכניסה": { en: "Lobby and entrance", fr: "Hall et entrée" },
  "מיזוג": { en: "Air conditioning", fr: "Climatisation" },
  "חשמל וחכם": { en: "Electrical and smart home", fr: "Électricité et domotique" },
  "ריצוף": { en: "Flooring", fr: "Sols" },
  "אלומיניום": { en: "Aluminium", fr: "Aluminium" },
  "חניה ומחסן": { en: "Parking and storage", fr: "Parking et cave" },
  "שטחים משותפים": { en: "Common areas", fr: "Parties communes" },
  "חניון רובוטי מתקדם": { en: "Advanced robotic parking", fr: "Parking robotisé avancé" },
};

function term(value: string, language: Language): string | null {
  if (language === "he") return null;
  return TERMS[value.trim()]?.[language] ?? null;
}

/** One caption part: a known word, "דירה 26", "קומה 3" or "דירת 4 חדרים". */
function part(value: string, language: Language): string {
  const text = value.trim();
  const known = term(text, language);
  if (known) return known;
  if (language === "he") return text;
  const apartment = text.match(/^דירה\s+(\d+)$/);
  if (apartment) return `${language === "en" ? "Apartment" : "Appartement"} ${apartment[1]}`;
  const floor = text.match(/^קומה\s+(\d+)$/);
  if (floor) return `${language === "en" ? "Floor" : "Étage"} ${floor[1]}`;
  const rooms = text.match(/^דירת\s+(\d(?:\.5)?)\s+חדרים$/);
  if (rooms) return language === "en" ? `${rooms[1]}-room apartment` : `Appartement ${rooms[1]} pièces`;
  return text;
}

/** A gallery caption like "דירה 26 · מטבח", shown in the visitor's language. */
export function translateCaption(caption: string, language: Language): string {
  if (language === "he" || !caption) return caption;
  return caption.split("·").map((item) => part(item, language)).join(" · ");
}

/** A technical-spec section or feature title. */
export function translateTitle(title: string, language: Language): string {
  return term(title, language) ?? title;
}
