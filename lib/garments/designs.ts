// Garment patterns drafted in the browser by FreeSewing (https://freesewing.eu, MIT licence).
// Metadata only: the design code itself is loaded on demand by lib/garments/draft.ts.

export type DesignId = "sandy" | "penelope" | "tamiko" | "aaron" | "teagan" | "hugo";

export interface GarmentDesign {
  id: DesignId;
  name: { en: string; he: string };
  blurb: { en: string; he: string };
  fabric: { en: string; he: string };
  /** FreeSewing difficulty, 1 (easy) to 5. */
  difficulty: number;
  designer: string;
  /** Body measurements the design needs (FreeSewing names). */
  measurements: string[];
}

export const DESIGNS: GarmentDesign[] = [
  {
    id: "tamiko",
    name: { en: "Tamiko zero-waste top", he: "טופ טמיקו ללא פחת" },
    blurb: { en: "A loose top cut from a single rectangle with no fabric left over.", he: "חולצה רפויה שנגזרת ממלבן אחד בלי שאריות בד." },
    fabric: { en: "Drapey woven or knit fabric", he: "בד ארוג נשפך או בד סריג" },
    difficulty: 1,
    designer: "Joost De Cock",
    measurements: ["shoulderToShoulder", "chest", "hpsToWaistBack", "shoulderSlope", "waistToHips"],
  },
  {
    id: "sandy",
    name: { en: "Sandy circle skirt", he: "חצאית עיגול סנדי" },
    blurb: { en: "A circle skirt with a waistband, drafted to your waist and length.", he: "חצאית עיגול עם חגורה, לפי היקף המותניים והאורך שלכם." },
    fabric: { en: "Drapey woven fabric", he: "בד ארוג נשפך" },
    difficulty: 3,
    designer: "Erica Alcusa Sáez",
    measurements: ["waist", "waistToFloor", "waistToHips", "hips"],
  },
  {
    id: "penelope",
    name: { en: "Penelope pencil skirt", he: "חצאית עיפרון פנלופה" },
    blurb: { en: "A fitted pencil skirt with darts, with or without a back vent.", he: "חצאית עיפרון צמודה עם פנסים, עם או בלי שסע מאחור." },
    fabric: { en: "Medium-weight woven fabric, a little stretch helps", he: "בד ארוג בעובי בינוני, קצת גמישות עוזרת" },
    difficulty: 3,
    designer: "Wouter Van Wageningen",
    measurements: ["waist", "seat", "waistToHips", "waistToSeat", "waistToKnee"],
  },
  {
    id: "aaron",
    name: { en: "Aaron A-shirt", he: "גופייה אהרון" },
    blurb: { en: "A tank top with bound neck and armholes.", he: "גופייה עם סיומת סרט בצוואר ובפתחי הזרועות." },
    fabric: { en: "Stretchy knit fabric", he: "בד סריג נמתח" },
    difficulty: 2,
    designer: "Joost De Cock",
    measurements: ["biceps", "chest", "hpsToBust", "hpsToWaistBack", "neck", "shoulderToShoulder", "shoulderSlope", "waistToArmpit", "waistToHips", "hips"],
  },
  {
    id: "teagan",
    name: { en: "Teagan T-shirt", he: "טי־שירט טיגן" },
    blurb: { en: "A fitted T-shirt with short sleeves.", he: "טי־שירט מותאם עם שרוולים קצרים." },
    fabric: { en: "Stretchy knit fabric", he: "בד סריג נמתח" },
    difficulty: 2,
    designer: "Joost De Cock",
    measurements: ["biceps", "chest", "hpsToBust", "hpsToWaistBack", "neck", "shoulderToShoulder", "shoulderSlope", "waistToArmpit", "waistToHips", "hips", "waist", "shoulderToWrist", "wrist"],
  },
  {
    id: "hugo",
    name: { en: "Hugo hoodie", he: "קפוצ׳ון הוגו" },
    blurb: { en: "A hooded jumper with raglan sleeves and a front pocket.", he: "סווטשירט עם כובע, שרוולי רגלן וכיס קדמי." },
    fabric: { en: "Sweatshirt fleece or heavy knit, plus ribbing", he: "בד פוטר או סריג עבה, ובד ריב לשוליים" },
    difficulty: 3,
    designer: "Joost De Cock",
    measurements: ["biceps", "chest", "hpsToBust", "hpsToWaistBack", "neck", "shoulderToShoulder", "shoulderSlope", "waistToArmpit", "waistToHips", "hips", "shoulderToWrist", "wrist", "head"],
  },
];

export const getDesign = (id: string) => DESIGNS.find((d) => d.id === id);

/** Labels and help for every measurement the designs above use. Lengths are mm in FreeSewing; shoulderSlope is degrees. */
export const MEASUREMENTS: Record<string, { en: string; he: string; helpEn: string; helpHe: string; degrees?: boolean }> = {
  chest: { en: "Chest / bust", he: "היקף חזה", helpEn: "Around the fullest part, tape level under the arms.", helpHe: "סביב החלק הרחב ביותר, סרט המדידה ישר מתחת לזרועות." },
  waist: { en: "Waist", he: "היקף מותניים", helpEn: "Around your natural waist, the narrowest part.", helpHe: "סביב קו המותניים הטבעי, החלק הצר ביותר." },
  hips: { en: "Hips (upper)", he: "היקף ירכיים עליון", helpEn: "Around the top of the hip bones, where trousers usually sit.", helpHe: "סביב עצמות האגן העליונות, איפה שמכנסיים יושבים בדרך כלל." },
  seat: { en: "Seat", he: "היקף ישבן", helpEn: "Around the fullest part of your bottom.", helpHe: "סביב החלק הרחב ביותר של הישבן." },
  neck: { en: "Neck", he: "היקף צוואר", helpEn: "Around the base of the neck.", helpHe: "סביב בסיס הצוואר." },
  biceps: { en: "Biceps", he: "היקף זרוע עליונה", helpEn: "Around the fullest part of the upper arm.", helpHe: "סביב החלק הרחב ביותר של הזרוע העליונה." },
  wrist: { en: "Wrist", he: "היקף שורש כף היד", helpEn: "Around the wrist bone.", helpHe: "סביב עצם שורש כף היד." },
  head: { en: "Head", he: "היקף ראש", helpEn: "Around the head, above the ears and eyebrows.", helpHe: "סביב הראש, מעל האוזניים והגבות." },
  shoulderToShoulder: { en: "Shoulder to shoulder", he: "רוחב כתפיים", helpEn: "Across the back, from one shoulder tip to the other.", helpHe: "לרוחב הגב, מקצה כתף אחת לקצה השנייה." },
  shoulderSlope: { en: "Shoulder slope", he: "שיפוע כתף", helpEn: "Angle of the shoulder line in degrees. 13° is typical.", helpHe: "זווית קו הכתף במעלות. 13° זה ערך נפוץ.", degrees: true },
  hpsToBust: { en: "Shoulder to bust point", he: "מהכתף לנקודת החזה", helpEn: "From the high point of the shoulder (where it meets the neck) down to the bust point.", helpHe: "מהנקודה הגבוהה של הכתף (איפה שהיא פוגשת את הצוואר) עד נקודת החזה." },
  hpsToWaistBack: { en: "Shoulder to waist, back", he: "מהכתף למותניים, בגב", helpEn: "From the high point of the shoulder down the back to the waist.", helpHe: "מהנקודה הגבוהה של הכתף, לאורך הגב, עד המותניים." },
  waistToArmpit: { en: "Waist to armpit", he: "ממותניים לבית השחי", helpEn: "At the side, from the waist up to the armpit.", helpHe: "בצד הגוף, מהמותניים עד בית השחי." },
  waistToHips: { en: "Waist to hips", he: "ממותניים לירכיים", helpEn: "At the side, from the waist down to the hips line.", helpHe: "בצד הגוף, מהמותניים עד קו הירכיים." },
  waistToSeat: { en: "Waist to seat", he: "ממותניים לישבן", helpEn: "At the side, from the waist down to the fullest part of the seat.", helpHe: "בצד הגוף, מהמותניים עד החלק הרחב של הישבן." },
  waistToKnee: { en: "Waist to knee", he: "ממותניים לברך", helpEn: "At the side, from the waist down to the knee.", helpHe: "בצד הגוף, מהמותניים עד הברך." },
  waistToFloor: { en: "Waist to floor", he: "ממותניים לרצפה", helpEn: "At the side, from the waist down to the floor, barefoot.", helpHe: "בצד הגוף, מהמותניים עד הרצפה, ביחפות." },
  shoulderToWrist: { en: "Shoulder to wrist", he: "מהכתף לשורש כף היד", helpEn: "From the shoulder tip along the slightly bent arm to the wrist.", helpHe: "מקצה הכתף, לאורך זרוע מעט כפופה, עד שורש כף היד." },
};

export const ALL_MEASUREMENTS = Object.keys(MEASUREMENTS);
