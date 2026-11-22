/**
 * Builds a short client-facing caption for a render from its file name, e.g.
 * "בן יהודה 59 -דירה 26- חדר שינה.jpg" -> "דירה 26 · חדר שינה".
 *
 * Only known terms are picked up (apartment, floor, apartment type, space), so
 * internal notes that end up in file names ("טקסטורות מתוקנות", "Copy", ...)
 * never reach a client. Returns "" when the name says nothing useful.
 */

const CITY_WORDS = ["תל אביב", "תל-אביב", "בת ים", "בת-ים", "חולון", "ראשון לציון", "ראשל\"צ", "רמת גן", "גבעתיים"];

const TYPES: Array<[RegExp, string]> = [
  [/פנטה[וא]{1,2}[זס]|penthouse/i, "פנטהאוז"],
  [/דירת\s*גן|garden\s*apartment/i, "דירת גן"],
  [/דופלקס|duplex/i, "דופלקס"],
  [/דירת\s*גג/i, "דירת גג"],
];

const SPACES: Array<[RegExp, string]> = [
  [/חדר\s*שינה\s*הורים|סוויטת\s*הורים|master\s*bedroom/i, "חדר שינה הורים"],
  [/חדר\s*שינה|bedroom/i, "חדר שינה"],
  [/חדר\s*רחצה|אמבטיה|bathroom|restroom/i, "חדר רחצה"],
  [/מטבח|kitchen/i, "מטבח"],
  [/סלון|חדר\s*מגורים|living\s*room/i, "סלון"],
  [/פינת\s*אוכל|dining/i, "פינת אוכל"],
  [/מרפסת\s*גג|roof\s*terrace/i, "מרפסת גג"],
  [/מרפסת|balcony|terrace/i, "מרפסת"],
  [/לובי|lobby/i, "לובי"],
  [/גינה|חצר|garden/i, "גינה"],
  [/בריכה|pool/i, "בריכה"],
  [/פנים|interior/i, "הדמיית פנים"],
  [/חוץ|exterior/i, "הדמיית חוץ"],
  [/בניין|חזית|building|facade/i, "הבניין"],
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The street part of a project name: "בן יהודה 59 תל אביב" -> "בן יהודה". */
function projectStreet(projectName: string) {
  let street = projectName;
  for (const city of CITY_WORDS) street = street.split(city).join(" ");
  return street.replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
}

/** `knownApartments`: the project's apartment numbers; when given, a number not among them is dropped (usually a typo). */
export function renderCaption(filename: string, projectName: string, knownApartments?: ReadonlySet<string>): string {
  let text = filename
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\bcopy\b/gi, " ")
    .replace(/\(\d+\)/g, " ")
    .replace(/[_–—-]+/g, " ")
    .replace(/([֐-׿a-z])(\d)/gi, "$1 $2")
    .replace(/(\d)([֐-׿a-z])/gi, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  // Drop the project's address (street + building number) and city names.
  const street = projectStreet(projectName);
  if (street) text = text.replace(new RegExp(`${escapeRegExp(street)}(\\s*\\d+(?![\\d.]|\\s*חדרים))?`, "g"), " ");
  for (const city of CITY_WORDS) text = text.split(city).join(" ");

  const parts: string[] = [];
  const apartment = text.match(/דירה\s*(\d+)/);
  if (apartment && (!knownApartments || knownApartments.has(apartment[1]))) parts.push(`דירה ${apartment[1]}`);
  const floor = text.match(/קומה\s*(\d+)/);
  if (floor) parts.push(`קומה ${floor[1]}`);

  const rooms = text.match(/(\d(?:\.5)?)\s*חדרים/);
  const type = TYPES.find(([pattern]) => pattern.test(text));
  if (type) parts.push(type[1]);
  else if (rooms) parts.push(`דירת ${rooms[1]} חדרים`);

  const space = SPACES.find(([pattern]) => pattern.test(text));
  if (space) parts.push(space[1]);

  return parts.join(" · ");
}
