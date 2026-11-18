// UI strings for the "learn" area (techniques pages). `he` must have exactly the keys of `en` (checked by TypeScript).
const en = {
  "learn.title": "Techniques library",
  "learn.intro": "Short, visual explanations of the skills used in every SewCraft project. Steps link here whenever a technique comes up.",
  "learn.usedOne": "Used in 1 project",
  "learn.usedMany": "Used in {n} projects",
  "learn.back": "← All techniques",
  "learn.video": "Video demonstration: not yet available.",
  "learn.how": "How to do it",
  "learn.need": "You'll need",
  "learn.mistakes": "Common mistakes",
  "learn.practise": "Practise it in",
} as const;

const he: { [K in keyof typeof en]: string } = {
  "learn.title": "ספריית טכניקות",
  "learn.intro": "הסברים קצרים וחזותיים לכישורים שבהם משתמשים בכל פרויקט ב-SewCraft. השלבים מפנים לכאן בכל פעם שעולה טכניקה.",
  "learn.usedOne": "משמשת בפרויקט אחד",
  "learn.usedMany": "משמשת ב-{n} פרויקטים",
  "learn.back": "→ כל הטכניקות",
  "learn.video": "סרטון הדגמה: עדיין לא זמין.",
  "learn.how": "איך עושים את זה",
  "learn.need": "מה צריך",
  "learn.mistakes": "טעויות נפוצות",
  "learn.practise": "תרגלו בפרויקטים האלה",
};

const messages = { en, he };
export default messages;
