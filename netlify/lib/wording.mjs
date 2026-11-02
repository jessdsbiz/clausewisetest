// ClauseWise SG never says a contract is safe, illegal or a scam (PRD section 11).
// AI text goes through here before it is saved or shown.

// "Is it legal / lawful" is a legal opinion too; "legal advice" or "lawful instructions" are fine.
export const BANNED = /\b(safe|safely|illegal|unlawful|against the law|not allowed|fraud|fraudulent|(?:is|be|looks like|definitely) a scam|a scam\b|(?:is|are|be|was|were|isn'?t|aren'?t) (?:legal|lawful|legally allowed)\b)/i;

// Drops any sentence that uses banned wording (rather than trying to reword it), then trims to max length.
export function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  const kept = s.trim().split(/(?<=[.!?])\s+/).filter((sentence) => !BANNED.test(sentence)).join(' ');
  return kept.slice(0, max).trim();
}

// The choice to sign is the user's (PRD FR8): personal advice never tells them to sign or not.
// "Ask about Clause 5 before you sign" is fine; "Don't sign this" or "Go ahead and sign" is not.
export const DECIDES = /\b(?:you should(?:n'?t| not)?|go ahead and|do not|don'?t|never|it'?s (?:ok|okay|fine) to|you can|better not)\s+(?:sign|accept|reject|decline|walk away)\b|\b(?:sign it|accept (?:the|this) (?:offer|contract)|reject (?:the|this) (?:offer|contract)|turn (?:it|the offer|this offer) down)\b/i;

// cleanText, then also drops sentences that decide for the user.
export function cleanAdvice(s, max) {
  const kept = cleanText(s, 2000).split(/(?<=[.!?])\s+/).filter((sentence) => !DECIDES.test(sentence)).join(' ');
  return kept.slice(0, max).trim();
}
