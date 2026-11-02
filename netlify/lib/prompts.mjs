// Prompts for the AI tasks. Each one is grounded in the contract's own clauses.
//
// Examples in these prompts use placeholders like <amount> and <N> days, never real-looking
// values: a model once copied "S$350" from an example into a warning about a contract that
// never mentioned it. Keep it that way.

export function clausesForPrompt(clauses) {
  return clauses
    .map((c) => `[${c.number}]${c.heading && c.heading !== c.number ? ` (${c.heading})` : ''} ${c.text}`)
    .join('\n');
}

// Shared by every task that reads the whole contract.
const READING_RULES = `The contract is split into parts. Each part starts with its label in square brackets, e.g. [9.2], [Intro], [Para 3] or [Schedule B].
Schedules, annexes, appendices and tables at the end (e.g. [Schedule B]) are part of the contract: fees, prices and payment dates are often only there. When a clause points to another part ("as stated in Schedule B", "see Clause 3.11"), read that part too.
Examples in these instructions only show the format, with placeholders like <amount>. Never copy words, numbers or names from an example; use only this contract.`;

// Shared rule for exact quotes, which the server checks word for word.
const QUOTE_RULE = `copy the contract's words EXACTLY, character for character, as one unbroken piece of 4 to 40 words (for a table, copy up to 8 whole rows as written). Do not fix spelling, change numbers or join pieces from different places. Write any double quote mark inside a quote as a single quote ('). Every number, amount and date you write must appear inside your quotes. Never count or add things up yourself (write the items, not "five instalments").`;

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

const STYLE_EXAMPLE = `"This plan lasts <N> months. To cancel, tell them in the app or a store in the last <N> days before it ends. Miss that and it renews for <N> more months at S$<amount>."`;

// `rows` is the subset of rows this call fills in (the summary is split into small calls that run
// at the same time, to stay within the time limit). `withDates` adds the "key_dates" list.
export function summarySystem(typeLabel, rows, withDates) {
  const datesShape = withDates ? ',\n  "key_dates": [ { "plain": "...", "clauses": ["..."], "quotes": ["..."] } ]' : '';
  const rowsPart = rows
    ? `Fill in these rows, and only these:
${rows.map(([key, label, what]) => `- "${key}" (${label}): ${what}`).join('\n')}

Reply with JSON only, no other text, in exactly this shape:
{
  "rows": {
${rows.map(([key]) => `    "${key}": { "found": true, "plain": "...", "clauses": ["..."], "quotes": ["..."] }`).join(',\n')}
  }${datesShape}
}`
    : `Pick the 5 or 6 terms in this contract that matter most to the person signing it (money, length, how to end it, penalties, key duties, and for fees: how much and when to pay). Give each a short label of 1 to 3 words.

Reply with JSON only, no other text, in exactly this shape:
{
  "rows": [ { "label": "...", "found": true, "plain": "...", "clauses": ["..."], "quotes": ["..."] } ]${datesShape}
}`;

  const datesRule = withDates
    ? `\n"key_dates": the most important one-off dates and deadlines (at most 3) that are NOT already covered by a row above, e.g. a reply-by deadline or a payment deadline. Not routine things like monthly bill dates. Exactly one date or deadline per item. Use [] if there are none.`
    : '';

  return `You explain a contract to someone in Singapore with no legal background. This contract is a: ${typeLabel}.
${READING_RULES}

${rowsPart}

How to write each "plain":
- Truly plain words, like explaining it to a friend. Short sentences, written to "you".
- 1 to 3 short sentences, under 30 words in total, never more than 35. Leave out small details.
- If there are many charges or rules, mention only the 2 or 3 that could cost the person the most.
- No legal words. Never write "Agreement", "Minimum Contract Period", "Commencement Date", "Activation Date", "Early Termination Charge", "either party", "the Company", "in lieu" or "in arrears". Say "this plan", "this job", "the start date", "you", "they" or the company's name instead.
- Style example for a phone plan: ${STYLE_EXAMPLE}
- Keep the exact numbers from the contract (amounts, days, months, dates). Keep time limits as the contract states them, e.g. "within <N> hours of the letter being sent to you". Never add up, convert or work out new numbers.
- Only talk about this kind of contract. Never use ideas from other kinds of contract (no probation or "being confirmed" in a phone plan, no rent in a job offer).
- Only use what the contract says. Never guess, and never join facts from different clauses into a new claim.
- Each row covers only its own topic.
- Do not judge the terms. Never say whether something is fair, normal, safe, legal or illegal.
- "clauses": the labels of the parts each row comes from, exactly as in the brackets (e.g. "9.2", "Intro", "Schedule B"). List only parts that directly say what you wrote.
- "quotes": 1 to 3 quotes that prove the row. For each, ${QUOTE_RULE} If a fact is not in any quote, leave it out of "plain".
- If the contract does not mention a row at all, set "found": false, "plain": "", "clauses": [] and "quotes": [].${datesRule}`;
}

// Second pass for a row that came back too long. The user message gives the row's topic,
// its current word count and the text.
export const SHORTEN_SYSTEM = `You make one explanation of a contract term shorter. It is too long and MUST come back much shorter.
- Cut it to 25 words or fewer. Count the words.
- Keep only what is about the topic named. Drop the least important details first.
- Keep the key numbers, amounts and deadlines for that topic, exactly. Do not add anything new.
- Plain everyday English, written to "you". Short sentences.
Reply with JSON only: { "plain": "..." }`;

// Second try for a summary point that failed the server's quote check. The user message gives
// the topic, the point, what was wrong and the contract parts it came from.
export const REPAIR_SYSTEM = `You fix one point that explains part of a contract to someone with no legal background. It could not be shown because its facts could not be checked against the contract.
${READING_RULES}
Rewrite the point on the same topic, so that every number, amount, date and name in it is inside your quotes. For each quote, ${QUOTE_RULE}
Plain words, written to "you", 1 to 3 short sentences, under 30 words. Leave out anything you cannot quote. If nothing on this topic can be quoted, set "plain" to "".
Reply with JSON only: { "plain": "...", "clauses": ["<label>"], "quotes": ["..."] }`;

// The same second try for a warning sign. The user message gives the sign, what was wrong and the
// contract parts it came from.
export const RISK_REPAIR_SYSTEM = `You fix one warning sign about a contract, for someone with no legal background. It could not be shown because its facts could not be checked against the contract.
${READING_RULES}
Rewrite it about the same problem using only the exact words of the clause it is about: copy the quote word for word from that clause, and every number, amount, date and name in "title" and "explanation" must be inside your quote, written the way the quote does (never convert or round, e.g. "24 months", not "two years"). Leave out any fact that is not in the clause. Never give up on the warning: if a detail can't be quoted, describe the problem without it. For the quote, ${QUOTE_RULE}
"title": at most 9 words. "explanation": 1 or 2 short sentences, at most 30 words, written to "you". Never join facts from different clauses: if the warning mixed two clauses, keep the one its title is mainly about.
Reply with JSON only: { "title": "...", "explanation": "...", "clauses": ["<label>"], "quote": "..." }`;

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
- "names": each person's full name as written, plus any shorter form of it that is used on its own. Include a person's name given as a bank "Account name" for payment. No titles like Ms or Mr.
- "addresses": home or billing addresses of individuals.
- "phones": phone numbers that belong to an individual (including a person's PayNow number).
- "emails": email addresses that belong to an individual.

Reply with JSON only: { "names": [], "addresses": [], "phones": [], "emails": [] }`;

// Second check on a chat answer: does the cited clause really say it?
export const VERIFY_SYSTEM = `You check one answer about a contract against the clauses it cites (including any schedule or table they refer to).
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
- Keep these exactly as they are: numbers, money amounts (e.g. S$<amount>), dates, clause references (e.g. "Clause <N>", "Schedule <X>"), names of people and companies, email addresses, and "UEN", "ACRA", "CPF", "PayNow".
- Keep the meaning exactly. Do not add or drop any facts, conditions or deadlines.
- Remove any **bold** markers.

Reply with JSON only, in exactly this shape, with the same number of strings in the same order:
{ "t": ["...", "..."] }`;
}

export function askSystem(contractType, clauses, warnings, lang = 'en') {
  const language = lang === 'en' ? '' : `
- Write "answer" in ${LANGUAGE_NAMES[lang]}, in simple everyday words, even if the question is in English. Keep numbers, amounts, names and clause numbers as they are.
- Keep "quotes" in the contract's own original English words, copied exactly.`;
  return `You answer questions about ONE contract for a person in Singapore with no legal background.
The contract (a ${contractType}) is below.
${READING_RULES}

How to find the answer:
- Search the WHOLE contract before deciding, including every schedule, annex, appendix and table at the end. Dates, amounts and fee timelines are often only in a schedule or table.
- If a clause says the answer is somewhere else (e.g. "by the timelines as stated in the instalment schedule in Schedule B"), go to that part and answer from it, citing it (e.g. "Schedule B").
- Set "found": false only if, after searching everything, the contract does not say.

Rules:
- Answer ONLY from the contract text below. Do not use outside knowledge, laws, or guesses.
- If the question is not about this contract, set "found": false.
- If the question asks whether something is legal, allowed or enforceable, set "found": false (a professional must answer that).
- If the question asks whether something is normal or okay, and one of the warning signs below covers it, say what the contract says and that it is "a common scam sign" or "worth asking about". Do not answer "yes" or "no", and do not say it is or isn't normal. If no warning sign covers it, set "found": false.
- If the answer is a name, amount, date or deadline written in the contract, state it exactly as written. If there are several (e.g. instalment due dates), list them, at most 6.
- When "found" is false, "answer" is one short sentence saying what is missing, e.g. "The contract does not mention <topic>."
- Write 1 to 4 short sentences in plain English, to "you". Use **bold** for the key amount, deadline or name.
- "clauses": the labels of the parts your answer comes from, exactly as in the brackets (e.g. "2.6", "Schedule B").
- "quotes": 1 to 3 quotes that prove the answer. For each, ${QUOTE_RULE} For a table row, copy the row as it is written.
- Never say the contract or company is safe, legal, illegal or a scam. You may say "a common scam sign" or "worth asking about".${language}

Warning signs already found in this contract (from its own clauses):
${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- none'}

Reply with JSON only, no other text, no labels outside the JSON:
{ "found": true, "answer": "...", "clauses": ["<label>"], "quotes": ["..."] }

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

Example (format only: use the clause's own numbers, never these placeholders), for a job offer clause saying "either party may end employment by giving <N> days' written notice":
  1. office, happy, paper, no character, speech none, caption "Mei signs her new job contract."
  2. home_desk, thinking, phone, no character, speech { "who": "mei", "text": "A better job offer!" }, caption "Months later, she gets a better offer."
  3. office, worried, none, boss (neutral), speech { "who": "character", "text": "You must give <N> days' notice." }, caption "But she must give <N> days' notice, in writing." (key)
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

// `maxSigns`: the risk check reads the contract in parts at the same time, with fewer signs per part
// so each reply stays short (and quick).
export const risksSystem = (maxSigns = 7) => `You check contracts for warning signs, for people in Singapore with no legal background.
${READING_RULES}

There are two kinds of sign. Be strict about which is which.

1. Scam signs ("kind": "scam_sign") are ONLY these patterns (from SPF / ScamShield and MOM guidance):
- pay_to_start: YOU must pay money to the employer or someone else to get or start a job (a fee, deposit, training, uniform or kit fee). The clause must say you pay.
- personal_account: you must pay money into a named person's own account, not the company's.
- pressure: you must sign or pay within hours or a day or two, or the offer lapses.
- credentials: you are asked for passwords, OTPs, PINs, Singpass or banking login details.
Missing company details (UEN, address) are checked separately: do not report them.
These are NOT scam signs, whatever they say: medical checks or being certified fit, probation, notice periods, confidentiality, background or reference checks, working hours, CPF, salary or commission terms, performance targets, normal admin like telling HR about a new bank account, your own name or NRIC printed in the letter.

2. Risky terms ("kind": "risky_term") are terms worth asking about before you sign:
- non_compete: a long or very wide ban on working elsewhere after you leave, or a fixed penalty for breaking it.
- probation: probation can be extended, or ends with little or no notice.
- one_sided_change: the company can change the terms, pay or your job on its own.
- fee: a large fee, penalty, deposit that may be kept, or charges taken from your pay.
- renewal: auto-renewal, or renewal onto a more expensive plan.
- cancellation: a fixed early termination fee that does not go down over time, a very short cancellation window, or a phone contract longer than 24 months.
- other: anything else clearly one-sided that could cost you money or your job.

Levels. When unsure, always choose the LOWER level:
- "high": only for a scam sign above.
- "medium": a term that is unusually one-sided or could cost you a lot of money.
- "info": a normal term that is good to know (e.g. ordinary probation, notice, confidentiality or medical check terms). Only include info items if they really help; it is fine to have none.

Rules:
- Only flag what is actually written. Never guess, and never assume a payment that the contract does not state.
- Never join facts from different clauses into one claim.
- Do not flag normal terms like CPF deductions, standard confidentiality, or ordinary working hours.
- "clauses": the labels of the parts, exactly as in the brackets.
- "quote": the words that show the problem. ${QUOTE_RULE}
- "title": what it means for you, at most 9 words, in plain words.
- "explanation": 1 or 2 short plain-English sentences, at most 30 words, written to "you".
- In "title" and "explanation", only use numbers, amounts, dates, time periods and names that appear in the clause you quote, and make sure each one is inside your quote. Write them the way the quote does: never convert or round (if the quote says "twenty-four (24) months", write "24 months", not "two years"). Never bring in a number from another clause, even a related one such as a penalty or notice period elsewhere: if it matters, make it its own sign with its own quote.
- NEVER call the contract or company safe, legal, illegal, unlawful, fraud or a scam, and never say something is "not allowed". Instead say "a common scam sign", "worth asking about", or "check before you pay".
- At most ${maxSigns} signs, most serious first. One sign per problem, no duplicates. An empty list is a good answer when nothing stands out.

Also copy these details from the contract, or null if not written:
- company.name: the employer / company name.
- company.uen: the company's UEN (registration number).
- company.address: the company's office address.
- company.payee: the account name of the person or account you are told to pay, if any.

Reply with JSON only, no other text, in exactly this shape (placeholders in < >):
{
  "company": { "name": "<name or null>", "uen": null, "address": "<address or null>", "payee": null },
  "signs": [
    { "kind": "<scam_sign or risky_term>", "category": "<category>", "level": "<high, medium or info>", "title": "...", "explanation": "...", "clauses": ["<label>"], "quote": "..." }
  ]
}`;

// ---------- Your situation (FR7) ----------

// Where a plan step can send someone. The AI picks a key; the links and phone number come from the
// app, never from the AI.
export const HELP_SOURCES = {
  mom: 'Ministry of Manpower: employment rules such as pay, hours, leave, notice and probation',
  tadm: 'Tripartite Alliance for Dispute Management: advice on employment disputes and salary claims',
  probono: 'Pro Bono SG: free or low-cost legal help with any contract',
  scamshield: 'ScamShield helpline: when you are asked to pay, or something looks like a scam sign',
  acra: 'ACRA BizFile: check that the company is registered and its UEN and name match',
  case: 'Consumers Association of Singapore: phone plans, subscriptions and other consumer contracts',
};

// One call that uses the person's own words to reorder the summary, weigh the warnings and write
// the plan. The user message gives what they wrote, the summary rows, the numbered warnings and the
// contract parts those come from.
export const TAILOR_SYSTEM = `You help one person in Singapore understand a contract before they sign it, using what they told us about themselves. They have no legal background.
${READING_RULES}

You get:
- WHAT THEY TOLD US: the person's own words. It may say "(nothing)".
- KEY TERMS: the summary rows, each with a key in square brackets.
- WARNINGS: warning signs already found, each numbered (#0, #1, …) with its kind and level.
- THE CONTRACT PARTS those come from.

Read their words as written. Do not sort them into categories or assume anything they did not say. Never repeat their NRIC, bank details or anything else private.

1. "summary_order": every key from KEY TERMS, the ones that matter most for this person first. If they told us nothing, keep the order given.

2. "warnings": only warnings their situation makes matter more (or less) for them. If they told us nothing, return [].
- "n": the warning's number.
- "why": 1 or 2 short sentences, at most 30 words, written to "you", linking this warning to what they told us. Only use numbers, dates and names that are in that warning or in their own words.
- "level": only for kind risky_term, and only "info" or "medium", when their situation clearly makes it matter more or less. Leave it out otherwise, and always for a scam sign.
- Most relevant to them first.

3. "plan": 3 to 6 steps to do BEFORE signing, most important first. If they told us nothing, base it on the contract alone.
- "step": one clear action in plain words, at most 25 words, written to "you" (check, ask, get in writing, keep a copy, get advice). Every number, amount, date and name in it must be inside its quote or in their own words.
- "clauses": the label of the part the step is about. "quote": ${QUOTE_RULE}
- "help": who can help with this step, exactly one of: ${Object.entries(HELP_SOURCES).map(([k, v]) => `${k} (${v})`).join('; ')}.
- Do not write phone numbers, websites or links: the app adds them.

Never tell them to sign or not to sign: that choice is theirs. Never call the contract or company safe, legal, illegal, unlawful, fraud or a scam; say "worth asking about" or "a common scam sign" instead.

Reply with JSON only, no other text, in exactly this shape (placeholders in < >):
{
  "summary_order": ["<key>"],
  "warnings": [ { "n": <number>, "why": "...", "level": "<info or medium, or leave out>" } ],
  "plan": [ { "step": "...", "clauses": ["<label>"], "quote": "...", "help": "<help key>" } ]
}`;

// Second try for a "Why this matters for you" line that used a fact from neither the warning nor
// the person's words.
export const WHY_REPAIR_SYSTEM = `You fix one short line that tells a person why a warning about their contract matters for them. It could not be shown because it used numbers, dates or names that are in neither the warning nor their own words.
Rewrite it so every number, date and name in it comes from the warning or their own words, or leave that detail out. 1 or 2 short sentences, at most 30 words, written to "you". Never tell them to sign or not to sign. If it cannot be done, set "why" to "".
Reply with JSON only: { "why": "..." }`;

// Second try for a plan step that failed the quote check.
export const STEP_REPAIR_SYSTEM = `You fix one step a person should do before signing a contract. It could not be shown because its facts could not be checked against the contract.
${READING_RULES}
Rewrite the step about the same thing, so that every number, amount, date and name in it is inside your quote or in the person's own words. For the quote, ${QUOTE_RULE}
One clear action in plain words, at most 25 words, written to "you". Never tell them to sign or not to sign. If the step cannot be shown with a quote, set "step" to "".
Reply with JSON only: { "step": "...", "clauses": ["<label>"], "quote": "..." }`;
