# ClauseWise SG: Requirements

Source: [PRD.md](PRD.md). Scope is the PRD's **Must Have** list only. Nice to Have and Future items are out of scope for this build.

> Every screen shows: **"ClauseWise SG explains contracts. It is not legal advice."**

---

## 1. Core features (Must Have)

| # | Feature | PRD ref |
|---|---------|---------|
| F1 | **Upload and delete.** Upload a PDF or take a photo of a contract. Show a "hide your NRIC" reminder before upload. Let the user pick explain mode (Plain words / Comic / Audio), language (English, Chinese, Malay, Tamil) and contract type (Job offer, Rental, Phone / Subscription, Loan, Business, Other). The upload can be deleted at any time. | FR1 |
| F2 | **Summary tab.** Split the contract into numbered clauses. Show pay, hours, probation, notice, contract length, fees and key dates in plain words, each tagged to its clause number. | FR2 |
| F3 | **Risks tab.** List warning signs labelled High, Medium or Info, each with its source clause. Include working ACRA lookup, ScamShield 1799 and CASE buttons. Never say a contract is "safe", "illegal" or "a scam". | FR3 |
| F4 | **Comic tab.** Turn a chosen clause into a 4-panel storyboard with a caption per panel, stated assumptions, the original clause text and the label "AI-generated example scene". | FR4 |
| F5 | **Ask tab.** A chatbot that answers only from the uploaded contract, quotes the clause it used, and says "I'm not sure, ask an expert" when it can't find the answer. | FR5 |
| F6 | **Explain it as.** Switch between plain words, comic and audio (browser read-aloud), in English, Chinese, Malay and Tamil. | FR6 |
| F7 | **Your situation.** An optional "Tell us about you" box on the scan screen. The AI reads the user's own words (no fixed filters or rules) and uses them to reorder the Summary, adjust warning priorities with a "Why this matters for you" line, and make "Your plan before you sign": 3–6 steps, each linked to a clause and a help source (MOM, TADM, Pro Bono SG, ScamShield 1799, ACRA, CASE). | FR7 |
| F9 | **No more typing.** Photograph a contract page by page (up to 20, or pick several from the gallery), with a thumbnail strip to retake, delete or reorder pages. AI reads each page, puts the pages in order and flags pages that are hard to read, missing or repeated. On upload (PDF or photos), AI detects the contract type, language, other party and key dates and pre-fills them for the user to confirm. A mic button lets the user speak in "Tell us about you" and the chatbot. | FR9 |
| F10 | **Make it fail.** Two different AIs work together in the background: Claude writes, an NVIDIA model checks every summary point, warning and plan step against its clause and lists missed risks, and Claude fixes them. Users see only the final answer with a "✓ Checked twice" tick. A judge view (?judge=1) shows the real catches; ?demo=fail&judge=1 plants two mistakes. Claude Haiku is the backup checker. | FR10 |
| F8 | **You decide.** Each warning has "I'll ask about this", "I'm OK with this" and "This looks wrong". A "You decide" screen shows an AI-drafted, editable message in English to the employer or landlord ("AI draft – check and edit before sending"), a plain-words version in the user's language underneath, and four options: Sign / Negotiate first / Get expert help / Walk away. Nothing pre-selected, no recommendation, and the app never sends anything itself. | FR8 |

**App shell:** a mobile-first PWA that can be installed to a phone home screen. Purple branding. Bottom nav: Home / Contracts / Deadlines / Experts. The contract screen has 4 tabs: Summary / Risks / Comic / Ask. Deadlines and Experts are in the nav, but their content is Nice to Have, so they stay placeholders in this build. The "You decide" screen opens from the Overview and the Risks tab (like the Personal details screen) and uses mockup 6 (Before you sign) as a style reference.

**Technical constraints**
- Plain HTML, CSS and JavaScript (no framework).
- AI calls go only through Netlify Functions (`netlify/functions`) using the Claude API: Claude Haiku (`ANTHROPIC_MODEL`), with the risk check on its own setting (`ANTHROPIC_RISK_MODEL`, also Haiku). NVIDIA Build models stay as a backup (`AI_PROVIDER=nvidia`). `ANTHROPIC_API_KEY` and `NVIDIA_API_KEY` live in `.env` and never in browser files.
- pdf.js extracts PDF text in the browser. Claude Haiku reads photos (an NVIDIA Build vision model on the backup).
- Supabase stores uploads. Browser Web Speech API handles read-aloud and voice input (speech recognition).
- Every AI call finishes in under 20 seconds, with a time limit and a Try again button.
- The second check (FR10) uses the NVIDIA model in `NVIDIA_CHECK_MODEL` (default Nemotron Ultra) with a 15-second limit, and Claude Haiku as the backup. `SECOND_CHECKER=claude` switches NVIDIA off. A photo is shrunk in the browser before upload, so each request stays well under Netlify's 6 MB limit.
- Runs locally with `netlify dev`. Tested on the fictional BrightPath job offer.

---

## 2. User stories and acceptance criteria

### US1: Upload a contract safely
*As a job seeker who has just received an offer letter, I want to upload the PDF or snap a photo of it, so that ClauseWise SG can explain it before I sign.*

- [ ] The upload screen accepts a PDF file or a photo (camera or gallery) on a phone.
- [ ] PDFs need no warning: NRIC/FIN numbers (`S****567A`) and bank or card account numbers (`****-0000`, last 4 digits only) are masked automatically in the browser right after the text is read, before it is saved or sent to any AI. The server masks again as a backstop.
- [ ] For photos, one line under the Scan / Photo buttons says: "Cover your NRIC and bank numbers before you snap. Photos are read by AI before we can hide anything."
- [ ] The original PDF or photo is never stored; only the masked text is saved.
- [ ] After scanning, a "Personal details" screen opens before the Overview. It lists what was hidden automatically (in masked form) and other personal details still in the contract (names, home address, phone, email), with a "Hide these too" switch that hides them across the app. It says "Your original file was not saved. Only the hidden version is kept.", shows "No personal details found." when there are none, and has a Continue button.
- [ ] With "Hide these too" on, the payee's name stays visible in the Risks tab so the scam check can still point out payment to a personal name.
- [ ] The Overview has a "Personal details" link to reopen that screen.
- [ ] An NRIC or account number typed into a chat question is masked too.
- [ ] The user must pick explain mode, language and contract type, and all three have sensible defaults (Plain words, English, Job offer).
- [ ] Text is extracted from a PDF in the browser with pdf.js. A photo is read by the vision model through a Netlify Function.
- [ ] The saved contract appears in the Contracts list.
- [ ] A **Delete** button removes the contract and all its saved results from Supabase, asks for confirmation first, and the contract disappears from the list.
- [ ] No request from the browser contains the Claude or NVIDIA API key.

### US8: Use it without typing
*As a worker who isn't comfortable typing on a phone, I want to photograph my contract page by page, have the app work out what it is, and speak my questions, so that I can use ClauseWise SG without typing.*

- [ ] "Scan a contract" opens the camera. After each photo, the screen shows the pages taken so far with "Add another page" and "Done – read my contract". Up to 20 pages.
- [ ] "Photo" lets the user pick several photos from the gallery at once.
- [ ] The pages show as a thumbnail strip with page numbers. Each page can be retaken, deleted or moved up or down.
- [ ] The pages screen reminds the user to cover their NRIC and bank numbers before taking photos.
- [ ] Each photo is shrunk in the browser before upload, so every request stays well under Netlify's 6 MB limit.
- [ ] Each page is read by Claude vision in its own function call, a few at a time, each under 20 seconds. The screen shows "Reading page 2 of 5…".
- [ ] AI puts the pages in order using page numbers, headings and clause numbers, even if the photos were taken out of order, and the screen says "We put your pages in order" when it changed the order. The thumbnail strip shows the new order.
- [ ] AI flags problems instead of guessing, and the user can retake, delete or continue anyway: a page that is blurry or cut off ("Page 3 is hard to read – retake it?"), a page that looks missing ("Clauses jump from 4.2 to 6.1 – is a page missing?"), or the same page twice ("Pages 2 and 4 look the same – delete one?").
- [ ] The pages are combined into one contract with numbered clauses, the same as a PDF upload, so Summary, Risks, Comic and Ask work as normal.
- [ ] NRIC/FIN and bank numbers are masked on every page, the same as for a PDF.
- [ ] Photos stay only in the browser and are dropped once the text is read; only the masked text is saved.
- [ ] On upload (PDF or photos), AI detects the contract type, the document's language, the other party and key dates. The contract type is pre-filled and the screen shows "Detected: Job offer from BrightPath Solutions · Change", so the user only taps to confirm. The other party and dates are only shown if they appear in the contract. The contract is saved with a title made from them (e.g. "Job offer – BrightPath Solutions").
- [ ] "Tell us about you" and the Ask box have a mic button that uses the browser's speech recognition in the chosen language (English, Chinese, Malay, Tamil). The words appear as they are heard, so the user can check and edit them before sending. The mic button is hidden if the browser can't do speech recognition. Spoken words are masked the same way as typed words.
- [ ] Every new label and button is in English, Chinese, Malay and Tamil.
- [ ] Every AI step has a time limit and a clear message with a Try again button.

### US9: Trust the explanations
*As someone relying on an AI to explain a contract, I want what I read to have been checked by a second, different AI, so that I can trust it without having to understand how.*

- [ ] The Summary and Risks tabs show nothing until the final answer is ready. While waiting they show "Reading your contract…", "Finding what matters…" and "Double-checking everything…". The summary and the risk check are made at the same time to keep the wait short.
- [ ] After Claude writes the summary, warnings and plan (and they pass the code checks in verify.mjs), an NVIDIA model checks every item against its clause text in one batch (does it match, is anything invented, changed or missing?) and, in a second batch at the same time, lists risky clauses no warning covers. Each "wrong" must quote the item's wrong words and the contract's words, which code checks; a claim it can't back up is ignored. Each check is its own function call, so none goes over 30 seconds.
- [ ] Claude Haiku rewrites anything marked wrong using only the clause text. The rewrite must pass the code checks, then NVIDIA checks it once more. For each item only the correct version is kept, and the final answer is shown in plain words in the user's chosen language, linked to its clause. The most serious missed risks (at most 2) become warnings.
- [ ] An item that still fails shows its clause with "This part is hard to explain. Read the clause or ask an expert." A scam-sign warning is never removed or weakened: if the second AI disputes one, it keeps its full explanation.
- [ ] If NVIDIA takes more than 15 seconds or fails, Claude Haiku does the check. If the whole double check takes over 20 seconds or fails, the app shows Claude's answer (it already passed the code checks), so the user is never stuck. The check still finishes and is saved, so the contract is checked the next time it opens.
- [ ] Users see only the final answer and a small "✓ Checked twice" tick at the top of the Summary and Risks tabs, left out if the check didn't finish. No badge, no details and no mention of two AIs.
- [ ] Judge view, only with ?judge=1: a "Behind the scenes" panel under the results shows each item that changed on that scan ("AI 1 (Claude) wrote" → "AI 2 (NVIDIA) caught" → "Final answer") and the missed risks AI 2 found, from the real results, never made-up ones.
- [ ] Demo, only with ?demo=fail&judge=1: the notice period is changed from 30 to 3 days and the S$350 fee warnings are left out on purpose, labelled "Planted mistake" in the panel. Neither mode is ever on without its link.
- [ ] Every new label is in English, Chinese, Malay and Tamil.

### US2: Understand the key terms
*As a fresh graduate, I want the important terms pulled out in plain words, so that I don't miss anything about pay, probation or notice.*

- [ ] The contract is split into numbered clauses that match the contract's own numbering where it has one (e.g. 5.3).
- [ ] Schedules, annexes and appendices (often fee tables and payment dates) are kept as whole parts labelled e.g. "Schedule B", with each table row on its own line. They are searched like any clause.
- [ ] Every summary point comes with exact quotes from the contract. Code (not AI) checks that each quote is in the contract word for word, and that every number, amount, date and name in the point is inside its quotes. A point that fails gets one rewrite; if it still fails, it is not shown.
- [ ] The Summary tab shows pay, hours, probation, notice, contract length, fees and key dates.
- [ ] Every summary item shows a clause tag (e.g. "Clause 4.2"). Tapping the tag shows the original clause text.
- [ ] If a term isn't in the contract, the item says "Not stated in this contract" instead of guessing.
- [ ] On the BrightPath offer, the summary shows: S$3,200/month (Clause 5.1); 40 hrs/week plus up to 2 Saturdays a month (3.2, 3.3); 3 months' probation, extendable by 3 more (4.1, 4.2); 1 week's notice during probation (4.4) and 30 days after confirmation (12.1); permanent role (1.4); S$350 fee (5.3); start date 1 December 2026 (1.2) and reply within 24 hours (Acceptance).

### US3: Spot risks and scam signs
*As someone worried about job scams, I want warning signs flagged with how serious they are, so that I know what to check before I pay or sign anything.*

- [ ] Each warning has a label (High / Medium / Info), a plain-words explanation and its source clause with the quoted text.
- [ ] Warnings are listed High first, then Medium, then Info.
- [ ] Every warning passes the same quote check as summary points. One that fails gets one rewrite using only the exact clause text. If that still fails, the warning stays on the list, quoting its clause word for word with a plain title and no facts of its own. A warning is removed only if the clause it is about can't be found in the contract.
- [ ] "Scam sign" is used only for: paying money to get or start a job, payment to a personal account, pressure to sign or pay within hours or days, missing company details, and requests for passwords/OTPs. The quote must show the pattern (e.g. a payment). Only scam signs can be High.
- [ ] Normal terms (medical checks, probation, notice, confidentiality) are Info, or Medium only if unusually one-sided. When unsure, the lower level is used.
- [ ] Examples in AI prompts use placeholders (e.g. S$&lt;amount&gt;), never values from the test contracts, so nothing from an example can appear in a result.
- [ ] On a real employment contract with a medical-check clause, no scam sign is shown for it, and no warning mentions an amount the contract doesn't contain.
- [ ] The tab shows "These are warning signs, not a final verdict."
- [ ] Buttons work: ACRA company lookup opens the ACRA search, **ScamShield 1799** starts a phone call (`tel:1799`), and CASE opens the CASE website.
- [ ] No output, whether AI-generated or fixed text, contains the words "safe", "illegal" or "a scam" when describing the contract. Guideline-based checks say "worth asking about".
- [ ] On the BrightPath offer, these are flagged with their clause: paying S$350 before starting (5.3); paying a personal name, not the company (5.4); 24-hour deadline to accept (Acceptance); 24-month Asia-Pacific non-compete with a S$20,000 payment (13.1, 13.3).

### US4: See a clause as a comic
*As someone who finds legal text hard to read, I want to see a confusing clause as a short comic, so that I can picture what it means for me.*

- [ ] The user picks any clause from a list of the contract's clauses.
- [ ] The Comic tab shows exactly 4 panels, each with a caption.
- [ ] Stated assumptions are shown (e.g. "Assumed: you have passed probation").
- [ ] The original clause text is shown underneath the panels.
- [ ] The label "AI-generated example scene" is visible on the comic.

### US5: Ask questions and listen in my language
*As a worker more comfortable in Tamil, I want to ask questions about my contract and hear the answers in my language, so that I understand it without a lawyer.*

- [ ] The Ask tab answers only from the uploaded contract and quotes the clause used.
- [ ] When the answer isn't in the contract, the reply is "I'm not sure, ask an expert."
- [ ] Before an answer is shown, a second check confirms the cited clause actually says what the answer claims; if not, the reply is "I'm not sure, ask an expert."
- [ ] Answers pass the same code quote check as summary points. Only the parsed answer is shown, never raw AI output such as `clauses: [...]` or `quote: "..."`.
- [ ] Before replying "I'm not sure", the chatbot searches the whole document again, including the schedules and tables a clause points to. On the school fees contract, "When am I supposed to pay my school fees?" lists the instalment dates from Schedule B and tags "Schedule B".
- [ ] Every AI step uses Claude Haiku, so each call finishes in under 15 seconds and every function answers within Netlify's 30-second limit. The risk check's model is its own setting in `.env`.
- [ ] Every AI step has a time limit, on the server and in the browser (35 seconds). If it runs out, the screen shows a clear message and a Try again button; nothing spins forever.
- [ ] Summary, Risks, Comic captions and Ask replies can be shown in English, Chinese, Malay or Tamil, and the language can be changed after upload.
- [ ] A read-aloud button speaks the current content using the Web Speech API in the selected language, and can be stopped.
- [ ] The original clause text always stays in the contract's own language so it can be checked.

### US6: Get help that fits my situation
*As a fresh graduate signing my first job offer, I want to tell ClauseWise SG a little about myself, so that it shows what matters most for me and what to do before I sign.*

- [ ] The scan screen has an optional "Tell us about you" box (up to 500 characters) with an example hint, e.g. "My first full-time job. I want to study part-time next year. I can't afford to lose money upfront." and the note "Optional. Don't include your NRIC or bank details." Scanning works the same with the box empty.
- [ ] The text is masked like the contract (NRIC/FIN, bank and card numbers) in the browser before it is saved or sent to any AI.
- [ ] The AI reads the user's words as written. No keyword lists, fixed categories or rules decide what is relevant.
- [ ] Summary: rows that matter most for the user's situation come first, with a short "Ordered for your situation" note. No row is hidden, and "Not in this contract" rows are still listed. With the box empty, the order is the same as before.
- [ ] Risks: a warning can get a "Why this matters for you" line (1–2 sentences). The situation can reorder warnings within a level and move risky terms between Info and Medium, but never makes a risky term High, never lowers or hides a scam sign, and never removes a warning. The list is still High, then Medium, then Info.
- [ ] Each "Why this matters for you" line passes the code quote check: every number, amount, date and name in it must be in the warning's quote or the user's own words. A line that fails after one rewrite is dropped; the warning stays.
- [ ] "Your plan before you sign" shows 3–6 steps in plain words at the end of the Summary tab. Each step has a clause tag (tapping it shows the original clause text) and one help source from a fixed list: MOM, TADM, Pro Bono SG, ScamShield 1799, ACRA, CASE. The AI picks from the list; the links and phone number come from the app, never the AI.
- [ ] When the user has filled in "Tell us about you", a short "Made for you" banner sits at the top of the Summary tab with a button that jumps to the plan. With the box empty, there is no banner.
- [ ] Plan steps pass the same quote check as summary points. If fewer than 3 pass, the plan is made again once; if still fewer than 3, the steps that passed are shown.
- [ ] With the box empty, the plan is made from the contract alone and says "Based on the contract only. Tell us about you for a plan that fits you."
- [ ] Plan steps and "Why this matters for you" lines never tell the user to sign or not sign, and never say "safe", "illegal" or "a scam".
- [ ] The Overview has a "Your situation" link to add or change the text later. Saving it remakes only the personal parts (order, "Why this matters for you" lines and plan); the summary and warnings themselves are not remade.
- [ ] Translation and read-aloud cover the "Why this matters for you" lines and plan steps.
- [ ] On the BrightPath offer with "This is my first job and I can't afford to lose money upfront", the S$350 fee (5.3) and personal-name payee (5.4) warnings get a "Why this matters for you" line, and the plan includes checking the company on ACRA and not paying the S$350 before checking (Clause 5.3, ScamShield 1799). With "I might move to a competitor in Singapore within two years", the non-compete (13.1) moves up and gets a "Why this matters for you" line.

### US7: Make my own decision
*As a tenant about to sign, I want to note what I'll ask about, get a message I can send, and make the final call myself, so that the decision stays mine.*

- [ ] Every warning on the Risks tab has three buttons: "I'll ask about this", "I'm OK with this" and "This looks wrong". None is selected at first. The user can pick one, change it, or tap it again to clear it. Choices are saved with the contract.
- [ ] "This looks wrong" means the user thinks the warning doesn't fit their contract. The warning stays on the list, marked "You disagreed", and is left out of the draft message.
- [ ] A "You decide" button at the end of the Risks tab, and a link on the Overview, open the "You decide" screen (`#/contract/<id>/decide`). It lists the warnings the user marked "I'll ask about this".
- [ ] The screen shows an AI-drafted, polite, short message to the employer, landlord, telco or lender (named by contract type, using the company name if found) asking about each "I'll ask about this" warning and naming its clause. It is labelled "AI draft – check and edit before sending".
- [ ] The draft is always in English, since it goes to the other party. When the chosen language is Chinese, Malay or Tamil, a plain-words version in that language sits underneath, labelled "What this message says (not for sending)", so the user understands what they're sending. With English chosen, the plain-words version is not shown. After the user edits the draft, the plain-words version shows an "Update" button to remake it from the edited text.
- [ ] The draft is in an editable text box, and edits are saved. There is a "Make a new draft" button and a **Copy** button. There is no Send button: the app never sends an email or message, or contacts anyone, itself.
- [ ] The draft passes the code check: every number, amount, date and name must be in the contract. It never threatens, never says anything is "illegal" or "a scam", and never includes NRIC, bank numbers or other personal details hidden on the Personal details screen.
- [ ] If no warning is marked "I'll ask about this", there is no draft, and the screen says "Mark a warning 'I'll ask about this' on the Risks tab to get a draft message."
- [ ] Four options are shown in a fixed order with the same size and style: **Sign**, **Negotiate first**, **Get expert help**, **Walk away**. None is pre-selected, highlighted or labelled as recommended, and no AI output anywhere in the app says which to choose. Asked "Should I sign?" in the Ask tab, the chatbot says the choice is the user's and points to "You decide".
- [ ] Picking an option saves it and shows fixed (not AI) next-step text: Sign → keep a signed copy and screenshots of your messages; Negotiate first → use the draft message above; Get expert help → MOM, TADM, Pro Bono SG and CASE links; Walk away → you don't have to sign, and if you were asked to pay, call ScamShield 1799. The choice can be changed at any time.
- [ ] The screen shows the "not legal advice" line and "For a big decision, get a qualified professional to review the contract."
- [ ] Delete removes these choices and the draft along with the contract.

---

## 3. Data fields for a saved contract

Stored in Supabase: one `contracts` row per upload. The original file is not stored. No names, NRIC, phone numbers or other personal details are stored as separate fields, and NRIC/FIN numbers in the text are masked.

### `contracts` table

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `device_id` | text | Anonymous ID kept in the browser, so a user only sees and deletes their own uploads (no login) |
| `created_at` | timestamptz | Upload time |
| `title` | text | Display name, defaults to the file name |
| `contract_type` | text | `job_offer` / `rental` / `phone_subscription` / `loan` / `business` / `other` |
| `explain_mode` | text | `plain` / `comic` / `audio` |
| `language` | text | `en` / `zh` / `ms` / `ta` |
| `source_type` | text | `pdf` / `photo` |
| `file_path` | text | Empty: the original file is not stored (older uploads may still have a Storage path, removed on delete) |
| `file_name` | text | Original file name |
| `mime_type` | text | e.g. `application/pdf`, `image/jpeg` |
| `raw_text` | text | Extracted contract text, with NRIC/FIN numbers masked as `S****567A` and bank/card numbers as `****-0000` |
| `personal` | jsonb | `{ hidden: { nric: [{ value, count }], accounts: [...] }, found: { names, addresses, phones, emails }, hide_extra }` for the Personal details screen |
| `clauses` | jsonb | Array of `{ number, heading, text }` |
| `summary` | jsonb | Array of `{ key, label, found, plain_text, clause_numbers[] }`. The rows depend on the contract type (Job offer: pay, hours, probation, notice, leave, start_date; Phone / Subscription: monthly_price, contract_length, early_termination_fee, how_to_cancel, auto_renewal, extra_charges; Rental: monthly_rent, deposit, lease_length, notice, repairs, early_termination; Loan: amount, interest_rate, monthly_repayment, loan_length, late_fees, early_repayment; Business / Other: 5–6 rows chosen by the AI). Rows with `found: false` are listed as "Not in this contract". `key_date` items hold one date each. |
| `risks` | jsonb | `{ company: { name, uen, address, payee }, items: [{ level, kind, category, title, explanation, clause_numbers[], quote }] }`, where `level` is `high` / `medium` / `info` and `kind` is `scam_sign` / `risky_term`. `quote` is checked to be word-for-word from the contract (pieces from two clauses are joined with "…"), and every number, date and name in the title and explanation must be in it. `category` also includes `credentials` (asks for passwords/OTPs). |
| `comics` | jsonb | Array of `{ clause_number, title, assumptions: [text], panels: [{ background, expression, holding, character, character_mood, speech: { who, text } \| null, caption, key }] x4, created_at }`, one per clause. The app builds each panel from these parts with Mei (`mei.js`, outfit set by contract type) and the comic kit; no AI images. The original clause text and the "AI-generated example scene" label come from the app, not the AI. |
| `chat` | jsonb | Array of `{ role, text, clause_numbers[], quote, not_sure, created_at }` (last 60 messages). Replies without a real clause are saved as "I'm not sure, ask an expert." |
| `translations` | jsonb | Translated explanations, made once per part: `{ zh: { summary: [{ label, plain_text }], risks: [{ title, explanation }], "comic:4.4": { title, assumptions, captions } } }`. Original clause text is never translated. |
| `situation` | text | What the user typed in "Tell us about you", masked like `raw_text`. Empty if they left it blank |
| `tailored` | jsonb | Personal parts made from `situation`: `{ summary_order: [key], risks: [{ index, level, why_for_you }], plan: [{ text, clause_numbers[], help }] }`, where `help` is `mom` / `tadm` / `probono` / `scamshield` / `acra` / `case`. Remade when the situation changes; `summary` and `risks` stay as they are. Translations of `why_for_you` and plan steps are kept in `translations` |
| `decisions` | jsonb | `{ risks: { "<item index>": "ask" / "ok" / "wrong" }, message, message_plain: { lang, text }, plain_outdated, draft_for: [item index], choice, updated_at }`, where `message` is the English draft as last edited, `message_plain` is its plain-words version in the chosen language (`plain_outdated` once the draft is edited after it), `draft_for` the warnings the draft was made for, and `choice` is `null` / `sign` / `negotiate` / `expert` / `walk_away`. Added by `supabase/add-decisions.sql` |
| `checks` | jsonb | The second AI's check (FR10): `{ stage, checker: "nvidia" / "claude", backup: null / "off" / "timeout" / "error", wrong: [...], missed: [...], results: [{ id, part, reason, before, after, status: "fixed" / "unclear", added, clause_numbers[] }], demo, check_ms, fix_ms }`. The fixes themselves are saved in `summary`, `risks` and `tailored` (items get `checked: "fixed" / "unclear" / "disputed"`, new warnings `found_by: "second_check"`; `results[].planted` marks the demo's planted mistakes). Shown only in the judge view. Cleared when the situation changes. Added by `supabase/add-checks.sql` |
| `status` | text | `uploaded` / `processing` / `ready` / `error` |

**Delete** removes the row, including all derived fields (and the Storage file, for older uploads that have one).
