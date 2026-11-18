// Shell, navigation, shared controls. Keys are "area.thing"; `he` must have exactly the keys of `en`.
const en = {
  "nav.home": "Home",
  "nav.explore": "Explore",
  "nav.community": "Community",
  "nav.learn": "Learn",
  "nav.calculator": "Calculator",
  "nav.studio": "My Studio",
  "nav.studioShort": "Studio",
  "nav.main": "Main",
  "shell.skip": "Skip to content",
  "shell.search": "Search projects",
  "shell.searchTitle": "Search ( / )",
  "units.label": "Units",
  "lang.label": "Language",
} as const;

const he: { [K in keyof typeof en]: string } = {
  "nav.home": "בית",
  "nav.explore": "גלו",
  "nav.community": "קהילה",
  "nav.learn": "למדו",
  "nav.calculator": "מחשבון",
  "nav.studio": "הסטודיו שלי",
  "nav.studioShort": "סטודיו",
  "nav.main": "ראשי",
  "shell.skip": "דלגו לתוכן",
  "shell.search": "חיפוש פרויקטים",
  "shell.searchTitle": "חיפוש ( / )",
  "units.label": "יחידות מידה",
  "lang.label": "שפה",
};

const messages = { en, he };
export default messages;
