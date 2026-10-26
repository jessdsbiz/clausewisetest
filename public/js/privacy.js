// Hides personal numbers in contract text. Shared by the browser (which masks the text before it
// leaves the device) and the Netlify functions (which mask again as a backstop), so both agree.
//
//   NRIC/FIN:         S1234567D       -> S****567D
//   Bank/card number: 123-456789-0    -> ****-7890   (only the last 4 digits stay)

// S, T, F, G or M, then 7 digits, then a letter, with or without spaces or dashes.
const NRIC = /\b([STFGM])[ \t-]?((?:\d[ \t-]?){6}\d)[ \t-]?([A-Z])\b/g;

// Bank accounts are only recognised after a label such as "Account number:" or "A/C", so phone
// numbers, amounts and order numbers are left alone. Card numbers by their 13-19 digit shape.
// A number may wrap onto the next line after a dash ("000-000000-" / "0"), as PDFs often do.
const LABELLED_ACCOUNT = /\b((?:bank\s+|card\s+)?(?:account|acct|a\/c|card)\s*(?:number|no\.?|#)?\s*[:.]?\s*)(\d(?:\d|-\r?\n|[ -]){4,26}\d)/gi;
const CARD = /\b(?:\d{4}[ -]){3}\d{1,7}\b|\b\d{13,19}\b/g;

// Already-masked forms, used to list what was hidden.
export const MASKED_NRIC = /\b[STFGM]\*{4}\d{3}[A-Z]\b/g;
export const MASKED_ACCOUNT = /\*{4}-\d{4}\b/g;

const lastFour = (digits) => `****-${digits.replace(/\D/g, '').slice(-4)}`;

export function maskNric(text) {
  let count = 0;
  const masked = String(text ?? '').replace(NRIC, (match, first, digits, last) => {
    count++;
    return `${first}****${digits.replace(/\D/g, '').slice(4)}${last}`;
  });
  return { text: masked, count };
}

export function maskAccounts(text) {
  let count = 0;
  let masked = String(text ?? '').replace(LABELLED_ACCOUNT, (match, label, number) => {
    if (number.replace(/\D/g, '').length < 6) return match; // too short to be an account number
    count++;
    return `${label}${lastFour(number)}`;
  });
  masked = masked.replace(CARD, (match) => {
    count++;
    return lastFour(match);
  });
  return { text: masked, count };
}

// Everything hidden automatically on upload.
export function hidePersonalNumbers(text) {
  const nric = maskNric(text);
  const accounts = maskAccounts(nric.text);
  return { text: accounts.text, nric: nric.count, accounts: accounts.count };
}
