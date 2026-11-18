// UI strings for the "sew" area. `he` must have exactly the keys of `en` (checked by TypeScript).
const en = {
} as const;

const he: { [K in keyof typeof en]: string } = {
};

const messages = { en, he };
export default messages;
