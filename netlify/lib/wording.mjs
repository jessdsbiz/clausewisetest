// ClauseWise never says a contract is safe, illegal or a scam (PRD section 11).
// AI text goes through here before it is saved or shown.

export const BANNED = /\b(safe|safely|illegal|unlawful|against the law|not allowed|fraud|fraudulent|(?:is|be|looks like|definitely) a scam|a scam\b)/i;

// Drops any sentence that uses banned wording (rather than trying to reword it), then trims to max length.
export function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  const kept = s.trim().split(/(?<=[.!?])\s+/).filter((sentence) => !BANNED.test(sentence)).join(' ');
  return kept.slice(0, max).trim();
}
