// Prompts for the AI tasks. Each one is grounded in the contract's own clauses.

export function clausesForPrompt(clauses) {
  return clauses
    .map((c) => `[${c.number}]${c.heading && c.heading !== c.number ? ` (${c.heading})` : ''} ${c.text}`)
    .join('\n');
}

// The "In plain words" rows for each contract type: [key, label, what belongs in it, and
// optionally a pattern for sentences that belong to another row and are removed from this one].
// Business and Other have no fixed rows: the AI picks the 5 or 6 most important terms.
export const SUMMARY_ROWS = {
  job_offer: [
    ['pay', 'Pay', 'how much you are paid and when. Not fees or bonuses.', /\b(fee|deposit|bonus)\b/i],
    ['hours', 'Hours', 'which days and hours you work, including weekend or extra work.'],
    ['probation', 'Probation', 'how long probation lasts, whether it can be extended, and how it ends. No notice periods here.', /\bnotice\b/i],
    ['notice', 'Notice to end', 'how much notice you or the employer must give to end the job. If it is different during and after probation, give both, e.g. "During probation: 1 week. After that: 30 days."'],
    ['leave', 'Leave', 'how many days of paid annual leave and sick leave, and when you can start taking them.'],
    ['start_date', 'Start date', 'the day you start, and anything that must happen before you can start.'],
  ],
  phone_subscription: [
    ['monthly_price', 'Monthly price', 'what you pay each month, including any device instalments, and any one-time fee.', /\b(late|roaming|cancel\w*|renew\w*)\b/i],
    ['contract_length', 'Contract length', 'how long you are locked in, and anything that restarts the lock-in. Not how to cancel or renewal.', /\b(cancel\w*|renew\w*)\b/i],
    ['early_termination_fee', 'Early termination fee', 'what it costs to leave before the lock-in ends, and whether that amount goes down over time.', /\brenew\w*\b/i],
    ['how_to_cancel', 'How to cancel', 'exactly how and when you must cancel, and which ways do not count.', /\bS\$\d/],
    ['auto_renewal', 'Auto-renewal', 'what happens if you do not cancel in time: how long it renews for and the new price.'],
    ['extra_charges', 'Extra charges', 'charges on top of the monthly price, such as extra data, roaming and late payment.'],
  ],
  rental: [
    ['monthly_rent', 'Monthly rent', 'how much rent and when it is due.'],
    ['deposit', 'Deposit', 'how much deposit, and when or why it may be kept.'],
    ['lease_length', 'Lease length', 'how long the lease lasts, and any renewal.'],
    ['notice', 'Notice to end', 'how much notice you or the landlord must give to end the lease.'],
    ['repairs', 'Repairs and who pays', 'who pays for repairs, and up to how much.'],
    ['early_termination', 'Early termination', 'what happens, and what it costs, if you leave before the lease ends.'],
  ],
  loan: [
    ['amount', 'Amount', 'how much you borrow, and how much you actually receive.'],
    ['interest_rate', 'Interest rate', 'the interest rate, and the total interest if stated.'],
    ['monthly_repayment', 'Monthly repayment', 'how much you repay each time, and when.'],
    ['loan_length', 'Loan length', 'how long you have to repay the loan.'],
    ['late_fees', 'Late fees', 'what you are charged if you pay late.'],
    ['early_repayment', 'Early repayment', 'whether you can repay early, and what it costs.'],
  ],
};

// Words that only make sense in one kind of contract. A row in another kind must not use them.
export const OTHER_TYPE_WORDS = {
  job_offer: /\b(tenant|landlord|lease|roaming|SIM card|data plan|borrow\w*|interest rate)\b/i,
  phone_subscription: /\b(probation|after (you are |your )?confirm\w*|confirmed in your (job|position)|salary|employer|employment|resign\w*|tenant|landlord|lease)\b/i,
  rental: /\b(probation|confirmed in your|salary|employer|employment|roaming|SIM card)\b/i,
  loan: /\b(probation|confirmed in your|salary|employer|employment|roaming|SIM card|tenant|landlord)\b/i,
};

const STYLE_EXAMPLE = `"This plan lasts 24 months. To cancel, tell them in the app or a store in the last 7 days before it ends. Miss that and it renews for 12 more months at S$65."`;

// `rows` is the subset of rows this call fills in (the summary is split into two calls that run
// at the same time, to stay within the time limit). `withDates` adds the "key_dates" list.
export function summarySystem(typeLabel, rows, withDates) {
  const datesShape = withDates ? ',\n  "key_dates": [ { "plain": "...", "clauses": ["..."] } ]' : '';
  const rowsPart = rows
    ? `Fill in these rows, and only these:
${rows.map(([key, label, what]) => `- "${key}" (${label}): ${what}`).join('\n')}

Reply with JSON only, no other text, in exactly this shape:
{
  "rows": {
${rows.map(([key]) => `    "${key}": { "found": true, "plain": "...", "clauses": ["..."] }`).join(',\n')}
  }${datesShape}
}`
    : `Pick the 5 or 6 terms in this contract that matter most to the person signing it (money, length, how to end it, penalties, key duties). Give each a short label of 1 to 3 words.

Reply with JSON only, no other text, in exactly this shape:
{
  "rows": [ { "label": "...", "found": true, "plain": "...", "clauses": ["..."] } ]${datesShape}
}`;

  const datesRule = withDates
    ? `\n"key_dates": the most important one-off dates and deadlines (at most 3) that are NOT already covered by a row above, e.g. a reply-by deadline or a payment deadline. Not routine things like monthly bill dates. Exactly one date or deadline per item. Use [] if there are none.`
    : '';

  return `You explain a contract to someone in Singapore with no legal background. This contract is a: ${typeLabel}.
You are given the contract split into clauses. Each clause starts with its number in square brackets, e.g. [9.2].

${rowsPart}

How to write each "plain":
- Truly plain words, like explaining it to a friend. Short sentences, written to "you".
- 1 to 3 short sentences, under 30 words in total, never more than 35. Leave out small details.
- If there are many charges or rules, mention only the 2 or 3 that could cost the person the most.
- No legal words. Never write "Agreement", "Minimum Contract Period", "Commencement Date", "Activation Date", "Early Termination Charge", "either party", "the Company", "in lieu" or "in arrears". Say "this plan", "this job", "the start date", "you", "they" or the company's name instead.
- Style example for a phone plan: ${STYLE_EXAMPLE}
- Keep the exact numbers from the contract (amounts, days, months, dates). Keep time limits as the contract states them, e.g. "within 24 hours of the letter being sent to you".
- Only talk about this kind of contract. Never use ideas from other kinds of contract (no probation or "being confirmed" in a phone plan, no rent in a job offer).
- Only use what the clauses say. Never guess, and never join facts from different clauses into a new claim.
- Each row covers only its own topic.
- Do not judge the terms. Never say whether something is fair, normal, safe, legal or illegal.
- "clauses": the clause numbers each row comes from, exactly as in the brackets (e.g. "9.2", "Intro"). List only clauses that directly say what you wrote.
- If the contract does not mention a row at all, set "found": false, "plain": "" and "clauses": [].${datesRule}`;
}

// Second pass for a row that came back too long. The user message gives the row's topic,
// its current word count and the text.
export const SHORTEN_SYSTEM = `You make one explanation of a contract term shorter. It is too long and MUST come back much shorter.
- Cut it to 25 words or fewer. Count the words.
- Keep only what is about the topic named. Drop the least important details first.
- Keep the key numbers, amounts and deadlines for that topic, exactly. Do not add anything new.
- Plain everyday English, written to "you". Short sentences.
Reply with JSON only: { "plain": "..." }`;

// Deterministic clean-up of legal words the AI still lets through.
export const PLAIN_SWAPS = [
  [/\b(this|the) Agreement\b/g, '$1 contract'],
  [/\bAgreement\b/g, 'contract'],
  [/\bMinimum Contract Period\b/gi, 'lock-in period'],
  [/\bCommencement Date\b/gi, 'start date'],
  [/\bActivation Date\b/g, 'activation date'],
  [/\bEarly Termination Charge\b/g, 'early termination fee'],
  [/\beither party\b/gi, 'you or they'],
  [/\bthe Company\b/g, 'the company'],
  [/\bin lieu of\b/gi, 'instead of'],
  [/\bin lieu\b/gi, 'instead'],
  [/\bin arrears\b/gi, 'after the month ends'],
  [/\bor part thereof\b/gi, 'or part of it'],
  [/\bthereof\b/gi, 'of it'],
];

export const PERSONAL_SYSTEM = `You find personal details about individual people in a contract.
Include details of the person signing it and of any other individual named in it (for example a payee or a staff member).
Do NOT include the company's own details: its name, office address, general phone or hotline numbers, or general emails like hr@ or care@.
Ignore anything already hidden with * characters.

Copy each detail EXACTLY as it is written in the contract, character for character:
- "names": each person's name as written (e.g. "Lim Mei Ling"), plus any shorter form used on its own (e.g. "Mei Ling"). Include a person's name given as a bank "Account name" for payment. No titles like Ms or Mr.
- "addresses": home or billing addresses of individuals.
- "phones": phone numbers that belong to an individual (including a person's PayNow number).
- "emails": email addresses that belong to an individual.

Reply with JSON only: { "names": [], "addresses": [], "phones": [], "emails": [] }`;

// Second check on a chat answer: does the cited clause really say it?
export const VERIFY_SYSTEM = `You check one answer about a contract against the clauses it cites.
Answer "supported": true only if every factual claim in the answer is directly stated in these clauses. Claims that are only implied, guessed, or come from outside these clauses do not count.
The answer may also say something is "a common scam sign" or "worth asking about" if it is in the list of warning signs given.
The answer may be in English, Chinese, Malay or Tamil; the clauses are in English.
Reply with JSON only: { "supported": true, "reason": "one short sentence" }`;

export const NOT_SURE = "I'm not sure, ask an expert.";

export const LANGUAGE_NAMES = { en: 'English', zh: 'Simplified Chinese', ms: 'Malay (Bahasa Melayu)', ta: 'Tamil' };

// "I'm not sure, ask an expert." in each language, so the safety reply never depends on the AI.
export const NOT_SURE_BY_LANG = {
  en: NOT_SURE,
  zh: '我不确定，请咨询专家。',
  ms: 'Saya tidak pasti, sila tanya pakar.',
  ta: 'எனக்கு உறுதியாகத் தெரியவில்லை, ஒரு நிபுணரிடம் கேளுங்கள்.',
};

export function translateSystem(lang) {
  return `You translate short explanations of a contract into ${LANGUAGE_NAMES[lang]} for people in Singapore with no legal background.

You get a JSON array of English strings. Translate every string.
- Use simple, everyday words that a worker or tenant would use, not legal language.
- Keep these exactly as they are: numbers, money amounts (e.g. S$350, S$3,200), dates, clause references (e.g. "Clause 5.3", "Acceptance"), names of people and companies (e.g. Tan Wei Ling, BrightPath Solutions Pte. Ltd.), email addresses, and "UEN", "ACRA", "CPF", "PayNow".
- Keep the meaning exactly. Do not add or drop any facts, conditions or deadlines.
- Remove any **bold** markers.

Reply with JSON only, in exactly this shape, with the same number of strings in the same order:
{ "t": ["...", "..."] }`;
}

export function askSystem(contractType, clauses, warnings, lang = 'en') {
  const language = lang === 'en' ? '' : `
- Write "answer" in ${LANGUAGE_NAMES[lang]}, in simple everyday words, even if the question is in English. Keep numbers, amounts, names and clause numbers as they are.
- Keep "quote" in the contract's own original English words, copied exactly.`;
  return `You answer questions about ONE contract for a person in Singapore with no legal background.
The contract (a ${contractType}) is below, split into clauses. Each clause starts with its number in square brackets.

Rules:
- Answer ONLY from the contract text below. Do not use outside knowledge, laws, or guesses.
- If the contract does not clearly answer the question, or the question is not about this contract, set "found": false.
- If the question asks whether something is legal, allowed or enforceable, set "found": false (a professional must answer that).
- If the question asks whether something is normal or okay, and one of the warning signs below covers it, say what the contract says and that it is "a common scam sign" or "worth asking about". Do not answer "yes" or "no", and do not say it is or isn't normal. If no warning sign covers it, set "found": false.
- If the answer is a name, amount, date or deadline written in the contract, state it.
- When "found" is false, "answer" is one short sentence saying what is missing, e.g. "The contract does not mention dental benefits."
- Write 1 to 3 short sentences in plain English, to "you". Keep exact numbers. Use **bold** for the key amount, deadline or name.
- "clauses": the clause numbers your answer comes from, written exactly as in the brackets.
- "quote": copy 5 to 25 words EXACTLY, word for word, from the first clause in "clauses", that show the answer.
- Never say the contract or company is safe, legal, illegal or a scam. You may say "a common scam sign" or "worth asking about".${language}

Warning signs already found in this contract (from its own clauses):
${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- none'}

Reply with JSON only, no other text:
{ "found": true, "answer": "...", "clauses": ["5.3"], "quote": "..." }

THE CONTRACT:
${clauses}`;
}

// The parts the app can build a comic panel from (public/js/comic-kit.js and mei.js).
// Keep these in sync with that file.
export const COMIC_PARTS = {
  backgrounds: {
    office: 'an office',
    hdb_room: 'a room in an HDB flat',
    phone_shop: 'a phone shop',
    bank_counter: 'a bank counter',
    home_desk: "Mei's desk at home",
  },
  expressions: ['happy', 'worried', 'confused', 'shocked', 'thinking', 'relieved'],
  holding: ['none', 'paper', 'phone'],
  characters: {
    none: 'Mei is alone',
    boss: 'the boss / employer',
    landlord: 'the landlord',
    shop_staff: 'phone shop staff',
  },
  moods: ['smile', 'neutral', 'stern'],
};

export const COMIC_SYSTEM = `You turn ONE contract clause into a 4-panel comic storyboard that shows what it could mean in real life, for people in Singapore with no legal background.

The main character is Mei, a made-up example person (the employee, tenant or customer). The other side is the boss, the landlord or the phone shop staff, to match the contract type.

Rules:
- The story must match what the clause says. Never add rights, duties, amounts or deadlines that are not in the clause.
- Keep the exact numbers from the clause (amounts, days, months). Do not invent times, dates or amounts that are not in it.
- If the story needs a fact that is not in the clause (e.g. that Mei has passed probation), list it in "assumptions", each starting with "Assumed:". 0 to 3 assumptions.
- Tell ONE small story about THIS clause only. Every panel must be about the clause; no filler like getting a salary or a start date unless the clause is about that.
  Panel 1: the situation that makes the clause matter (Mei wants to leave, gets a better offer, is asked to pay, wants a new job).
  Panels 2 and 3: what the clause says happens, step by step.
  Panel 4: the result for Mei, especially money she pays or cannot get back, limits on her, or what she must do.
- Keep who-does-what exactly as the clause says (who gives notice, who pays whom). Do not make the ending happier or worse than the clause.
- Show the detail that matters most for Mei: if money cannot be refunded, say so; if she must pay a named person, name them; if there is a deadline, give it exactly.
- Any "For context" clause is background only. Never put its deadlines or amounts into this clause's story.
- Mark exactly one panel, the one showing the clause's main rule, with "key": true.

For each panel, choose its parts:
- "background": one of ${Object.entries(COMIC_PARTS.backgrounds).map(([k, v]) => `${k} (${v})`).join(', ')}. Pick the place where that moment happens.
- "expression": Mei's face, one of ${COMIC_PARTS.expressions.join(', ')}. Match how the moment would feel for her.
- "holding": what Mei holds, one of ${COMIC_PARTS.holding.join(', ')} (paper = a letter or contract, phone = messages, payments, apps).
- "character": who else is there, one of ${Object.entries(COMIC_PARTS.characters).map(([k, v]) => `${k} (${v})`).join(', ')}. Use the one that matches the contract type, or none.
- "character_mood": one of ${COMIC_PARTS.moods.join(', ')} (only if there is a character).
- "speech": a short speech bubble, at most 7 words, said by "mei" or by the "character". Use the clause's real numbers. Use null for no bubble.
- "caption": one short sentence under the panel, at most 14 words, plain English, present tense.

Example, for a job offer clause saying "either party may end employment by giving 30 days' written notice":
  1. office, happy, paper, no character, speech none, caption "Mei signs her new job contract."
  2. home_desk, thinking, phone, no character, speech { "who": "mei", "text": "A better job offer!" }, caption "Months later, she gets a better offer."
  3. office, worried, none, boss (neutral), speech { "who": "character", "text": "You must give 30 days' notice." }, caption "But she must give 30 days' notice, in writing." (key)
  4. home_desk, relieved, paper, no character, speech none, caption "She writes her letter and plans her last day."
  Assumptions: ["Assumed: Mei has passed probation."]

- Never say anything is safe, legal, illegal or a scam.
- "title": 2 to 4 words naming the topic, e.g. "Notice period".

First write "rule": one plain sentence saying exactly what this clause makes happen for Mei (what triggers it, who must do what, and the result). Then make every panel consistent with "rule".

Reply with JSON only, no other text:
{
  "rule": "...",
  "title": "...",
  "assumptions": ["Assumed: ..."],
  "panels": [
    { "background": "office", "expression": "happy", "holding": "paper", "character": "none", "character_mood": null, "speech": null, "caption": "...", "key": false },
    { "background": "home_desk", "expression": "thinking", "holding": "phone", "character": "none", "character_mood": null, "speech": { "who": "mei", "text": "..." }, "caption": "...", "key": false },
    { "background": "office", "expression": "worried", "holding": "none", "character": "boss", "character_mood": "neutral", "speech": { "who": "character", "text": "..." }, "caption": "...", "key": true },
    { "background": "home_desk", "expression": "relieved", "holding": "paper", "character": "none", "character_mood": null, "speech": null, "caption": "...", "key": false }
  ]
}`;

export const RISKS_SYSTEM = `You check contracts for warning signs, for people in Singapore with no legal background.
You are given a contract split into clauses. Each clause starts with its number in square brackets, e.g. [5.3].

Look for these warning signs (based on SPF / ScamShield, MOM and IMDA guidance):
Scam signs ("kind": "scam_sign"):
- pay_to_start: you must pay money to get or start a job (fees, deposits, training, uniform or kit fees).
- personal_account: money must go to a person's name or personal account, not the company.
- pressure: pressure to sign or pay very fast (e.g. within 24 hours, the offer lapses, no extensions). Title example: "Only 24 hours to accept the offer".
- company_details: no company UEN, or no proper office address, in the contract.
Your own name or NRIC printed in the letter, and normal admin like telling HR about a new bank account, are NOT signs.
Risky terms ("kind": "risky_term"):
- non_compete: a long or very wide ban on working elsewhere after you leave, or a fixed penalty for breaking it.
- probation: probation can be extended, or ends with little or no notice.
- one_sided_change: the company can change the terms or your job on its own.
- fee: a large fee, penalty, deposit that may be kept, or charges taken from your pay.
- renewal: auto-renewal, or renewal onto a more expensive plan.
- cancellation: a fixed early termination fee that does not go down over time, a very short cancellation window, or a phone contract longer than 24 months.
- other: anything else clearly one-sided that could cost you money or your job.

Levels:
- "high": a common scam sign, or a term that could cost you a lot of money.
- "medium": an unusual or one-sided term worth asking about before you sign.
- "info": good to know, but not necessarily a problem.

Rules:
- Only flag what is actually written (or clearly missing, like a UEN). Never guess.
- Never join facts from different clauses into one claim. E.g. a 24-hour deadline to accept and a 2-day deadline to pay are different deadlines.
- Do not flag normal terms like CPF deductions, standard confidentiality, or ordinary working hours.
- Each sign cites the clause numbers exactly as in the brackets. For something missing (e.g. no UEN), cite the clause with the company's details, usually "Intro".
- "quote": copy 4 to 15 words EXACTLY, word for word, from the first cited clause, showing the problem. For something missing, use "".
- "title": what it means for you, at most 9 words, e.g. "You must pay S$350 before you start".
- "explanation": 1 or 2 short plain-English sentences, at most 30 words, written to "you".
- NEVER call the contract or company safe, legal, illegal, unlawful, fraud or a scam, and never say something is "not allowed". Instead say "a common scam sign", "worth asking about", or "check before you pay".
- At most 7 signs, most serious first. One sign per problem, no duplicates: do not flag the same clause twice for the same problem.

Also copy these details from the contract, or null if not written:
- company.name: the employer / company name.
- company.uen: the company's UEN (registration number).
- company.address: the company's office address.
- company.payee: the account name of the person or account you are told to pay, if any.

Reply with JSON only, no other text, in exactly this shape:
{
  "company": { "name": "...", "uen": null, "address": "...", "payee": null },
  "signs": [
    { "kind": "scam_sign", "category": "pay_to_start", "level": "high", "title": "...", "explanation": "...", "clauses": ["5.3"], "quote": "..." }
  ]
}`;
