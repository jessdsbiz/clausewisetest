// Brand and official names that stay exactly as written in every language (also in public/js/ui-text.js).
export const KEEP_NAMES = ["ClauseWise SG","ClauseWise","ScamShield","1799","ACRA","BizFile","MOM","TADM","Pro Bono SG","CASE","UEN","NRIC","SDG"];

export const KEEP_NAMES_RULE = `Keep these names exactly as written, in English, and never translate, transliterate or change them: ${KEEP_NAMES.join(', ')}.`;

// Adds the rule to the system prompt once (the same prompt can pass through more than one call).
export function withKeepNames(messages) {
  if (!Array.isArray(messages) || messages.some((m) => String(m.content).includes(KEEP_NAMES_RULE))) return messages;
  const i = messages.findIndex((m) => m.role === 'system');
  if (i < 0) return [{ role: 'system', content: KEEP_NAMES_RULE }, ...messages];
  return messages.map((m, j) => (j === i ? { ...m, content: `${m.content}\n\n${KEEP_NAMES_RULE}` } : m));
}
