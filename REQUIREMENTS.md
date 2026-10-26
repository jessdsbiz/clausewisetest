# ClauseWise: Requirements

Source: [PRD.md](PRD.md). Scope is the PRD's **Must Have** list only. Nice to Have and Future items are out of scope for this build.

> Every screen shows: **"ClauseWise explains contracts. It is not legal advice."**

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

**App shell:** a mobile-first PWA that can be installed to a phone home screen. Purple branding. Bottom nav: Home / Contracts / Deadlines / Experts. The contract screen has 4 tabs: Summary / Risks / Comic / Ask. Deadlines and Experts are in the nav, but their content is Nice to Have, so they stay placeholders in this build.

**Technical constraints**
- Plain HTML, CSS and JavaScript (no framework).
- AI calls go only through Netlify Functions (`netlify/functions`) using NVIDIA Build models. `NVIDIA_API_KEY` lives in `.env` and never in browser files.
- pdf.js extracts PDF text in the browser. An NVIDIA Build vision model reads photos.
- Supabase stores uploads. Browser Web Speech API handles read-aloud.
- Runs locally with `netlify dev`. Tested on the fictional BrightPath job offer.

---

## 2. User stories and acceptance criteria

### US1: Upload a contract safely
*As a job seeker who has just received an offer letter, I want to upload the PDF or snap a photo of it, so that ClauseWise can explain it before I sign.*

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
- [ ] No request from the browser contains the NVIDIA API key.

### US2: Understand the key terms
*As a fresh graduate, I want the important terms pulled out in plain words, so that I don't miss anything about pay, probation or notice.*

- [ ] The contract is split into numbered clauses that match the contract's own numbering where it has one (e.g. 5.3).
- [ ] The Summary tab shows pay, hours, probation, notice, contract length, fees and key dates.
- [ ] Every summary item shows a clause tag (e.g. "Clause 4.2"). Tapping the tag shows the original clause text.
- [ ] If a term isn't in the contract, the item says "Not stated in this contract" instead of guessing.
- [ ] On the BrightPath offer, the summary shows: S$3,200/month (Clause 5.1); 40 hrs/week plus up to 2 Saturdays a month (3.2, 3.3); 3 months' probation, extendable by 3 more (4.1, 4.2); 1 week's notice during probation (4.4) and 30 days after confirmation (12.1); permanent role (1.4); S$350 fee (5.3); start date 1 December 2026 (1.2) and reply within 24 hours (Acceptance).

### US3: Spot risks and scam signs
*As someone worried about job scams, I want warning signs flagged with how serious they are, so that I know what to check before I pay or sign anything.*

- [ ] Each warning has a label (High / Medium / Info), a plain-words explanation and its source clause with the quoted text.
- [ ] Warnings are listed High first, then Medium, then Info.
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
- [ ] Summary, Risks, Comic captions and Ask replies can be shown in English, Chinese, Malay or Tamil, and the language can be changed after upload.
- [ ] A read-aloud button speaks the current content using the Web Speech API in the selected language, and can be stopped.
- [ ] The original clause text always stays in the contract's own language so it can be checked.

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
| `risks` | jsonb | `{ company: { name, uen, address, payee }, items: [{ level, kind, category, title, explanation, clause_numbers[], quote }] }`, where `level` is `high` / `medium` / `info` and `kind` is `scam_sign` / `risky_term`. `quote` is checked to be word-for-word from the first cited clause. |
| `comics` | jsonb | Array of `{ clause_number, title, assumptions: [text], panels: [{ background, expression, holding, character, character_mood, speech: { who, text } \| null, caption, key }] x4, created_at }`, one per clause. The app builds each panel from these parts with Mei (`mei.js`, outfit set by contract type) and the comic kit; no AI images. The original clause text and the "AI-generated example scene" label come from the app, not the AI. |
| `chat` | jsonb | Array of `{ role, text, clause_numbers[], quote, not_sure, created_at }` (last 60 messages). Replies without a real clause are saved as "I'm not sure, ask an expert." |
| `translations` | jsonb | Translated explanations, made once per part: `{ zh: { summary: [{ label, plain_text }], risks: [{ title, explanation }], "comic:4.4": { title, assumptions, captions } } }`. Original clause text is never translated. |
| `status` | text | `uploaded` / `processing` / `ready` / `error` |

**Delete** removes the row, including all derived fields (and the Storage file, for older uploads that have one).
