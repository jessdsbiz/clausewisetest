// Checks that a translated string is written in the right script and nothing else.
// The AI sometimes slips in a letter from another language (Malayalam and Arabic both turned up
// in Tamil), so only the target script plus Latin letters, digits and punctuation are allowed.
// (Names, amounts like S$350 and "Clause 5.3" stay in Latin letters.)

const COMMON = '\\u0000-\\u024f\\u2000-\\u206f\\u20a0-\\u20cf';

const RULES = {
  zh: { needs: /[一-鿿]/, only: new RegExp(`^[${COMMON}\\u3000-\\u303f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef]*$`) },
  ms: { needs: /[a-z]/i, only: new RegExp(`^[${COMMON}]*$`) },
  ta: { needs: /[஀-௿]/, only: new RegExp(`^[${COMMON}\\u0b80-\\u0bff]*$`) },
};

export function inScript(lang, text) {
  const rule = RULES[lang];
  return !rule || (rule.needs.test(text) && rule.only.test(text));
}
