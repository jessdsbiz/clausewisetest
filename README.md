# ClauseWise SG

**ClauseWise SG explains contracts in plain words, as a comic or read aloud, in English, 中文, Bahasa Melayu and தமிழ். It flags scam signs and risky terms, and every answer points back to the exact clause.**

It is built for people in Singapore who are about to sign a job offer, a rental, a phone plan, a loan, a business agreement or an insurance policy, and who may not have time or money for a lawyer.

> **ClauseWise SG explains contracts. It is not legal advice.** Warning signs are not a verdict: ClauseWise SG can never confirm whether a contract is genuine or safe. For a big decision, ask a qualified professional (TADM, Pro Bono SG, CASE or ScamShield 1799 can help).

- **Live site:** https://clausewisetest.netlify.app
- **Judge view** (shows what the two AIs changed on a scan): https://clausewisetest.netlify.app/?judge=1
- **Demo** (plants two mistakes on purpose, so you can watch the AI check catch them): https://clausewisetest.netlify.app/?demo=fail&judge=1

**Team:** Jess, Shania, Crystabelle

---

## The five surprise features

The hackathon brief lists five surprise features. Four are built and can be shown live; Feature 5 is not built.

| # | Feature | Where to find it in the app | What the AI does |
|---|---------|-----------------------------|------------------|
| 1 | **Your User Changed** (personalised AI) | "Tell us about you" on Home (or the mic next to it); the "Made for you" banner on the contract; "Your plan before you sign" at the end of the Summary tab | Reads a person's own words about their situation and reorders the summary, adds "Why this matters for you" lines and builds a 3 to 6 step plan, each step linked to a clause. Fixed filters are not used. |
| 2 | **Human Must Decide** | "You decide" (the button on a contract's top bar, or `#/contract/<id>/decide`) | Drafts a polite message from the warnings the user marked "I'll ask about this" and flags any risk. Nothing is sent: the user checks, edits and sends it, then chooses Sign, Negotiate first, Get expert help or Walk away. Nothing is pre-selected. |
| 3 | **No More Typing** (voice and photos) | Home: "Take photos" (many pages, reordered and checked by AI), "Upload PDF", and the mic in "Tell us about you" and in the chatbot | A vision model reads photographed pages and puts them in order, flagging blurry, missing or repeated pages. Speech recognition turns spoken words into text in the box. The contract type, company and key dates are detected for the user to confirm. |
| 4 | **Make It Fail** (AI checks AI) | "✓ Checked twice" on every summary and warning; the judge view (`?judge=1`) and the demo (`?demo=fail&judge=1`) | Claude writes the explanations. A second AI from another company (NVIDIA Nemotron) checks each point against its clause and looks for missed risks. Claude fixes what it finds, and the fix is checked again. Code also checks every quote and number against the contract. |
| 5 | **Make It Act** (AI uses tools) | Not built. The placeholder "Agents at work" is hidden. | — |

Baseline before the reveal: commit `4425493` (2 Nov 2026 handoff). Everything built after it is listed in [WHATS_NEW.md](WHATS_NEW.md) and [REQUIREMENTS.md](REQUIREMENTS.md) section 4.

---

## What the app does

1. **Add a contract:** upload a PDF, take photos of each page, or speak the situation. Personal numbers (NRIC/FIN, bank and card numbers) are hidden in the browser before anything is sent.
2. **Confirm the type:** the AI detects the type (job offer, rental, phone or subscription, loan, business, insurance policy or other) and the company. A confident answer is pre-selected; otherwise the best guess is shown for the user to confirm.
3. **Read it four ways:**
   - **Summary:** key points in plain words, each tagged to its clause, plus key dates.
   - **Risks:** a scam check and warnings, each with its priority (High, Medium or Info), its clause and its quote.
   - **Comic:** a 4-panel story of one clause, with the original clause hidden until asked, the assumptions shown, and a sign on Mei's face for each panel's risk.
   - **Ask:** a chatbot that answers only from the contract and quotes the clause it used.
4. **Listen:** read-aloud through Azure AI Speech in all four languages (device voice only if Azure fails).
5. **Decide:** the "You decide" page (see Feature 2).

Every screen says that ClauseWise SG explains contracts and is not legal advice.

---

## Tech stack

- **Front end:** plain HTML, CSS and JavaScript; a PWA that installs on phones; a desktop layout for 1024px and wider, with a Phone / Desktop view switch.
- **AI:** Claude API (Haiku) for summaries, risks, plans, the chatbot, comics, translations, contract type and drafts. NVIDIA Build (Nemotron) as the second AI that checks Claude's work, with Claude as its backup. Claude's vision reads photographed pages.
- **Speech:** Azure AI Speech for read-aloud audio (en-SG, zh-CN, ms-MY and ta-SG voices). The browser's Web Speech API for voice input.
- **Serverless:** Netlify Functions (`netlify/functions/`) hold every AI and database call, so keys never reach the browser.
- **Database:** Supabase (Postgres). Each device has its own contracts, identified by a random ID kept in the browser.
- **Hosting:** Netlify, deployed from GitHub on every push to `main`.

---

## Folders and files

```
public/                 The web app that the browser loads
  index.html            The page shell
  css/styles.css        All styles (design tokens at the top)
  js/app.js             The screens, routing and flows
  js/ui-text.js         Translations of the app's own labels, and the names that are never translated
  js/api.js             Calls to the functions (device ID, timeouts)
  js/extract.js         Reads text from PDFs in the browser
  js/comic-kit.js       Comic panels: backgrounds, characters, speech bubbles, risk signs
  js/mei.js             Mei, the ClauseWise mascot (approved artwork)
  js/speech.js          Read-aloud (Azure clips, device-voice fallback)
  js/voice.js           Voice input
  js/privacy.js         Hides NRIC/FIN, bank and card numbers in the browser
  js/legal.js           Privacy policy, terms of use and the upload consent boxes
  sw.js                 Service worker (offline app shell)
netlify/
  functions/            Serverless functions (each one is an endpoint)
    contracts.mjs       Save, list, change and decide on contracts
    detect.mjs          Contract type, company, key dates, insurance check (Feature 3)
    read-page.mjs       Reads a photographed page with vision (Feature 3)
    collate.mjs         Puts photographed pages in order (Feature 3)
    personal.mjs        Finds personal details in a contract
    summary.mjs         Plain-words summary
    risks.mjs           Scam check and warnings
    tailor.mjs          "Your plan before you sign" (Feature 1)
    check.mjs           The AI check that catches mistakes (Feature 4)
    decide.mjs          The draft message and plain-words version (Feature 2)
    comic.mjs           Comic storyboards
    ask.mjs             The chatbot
    translate.mjs       Translations of AI-written text
    speech.mjs          Azure AI Speech
    contact.mjs         The privacy contact email (CONTACT_EMAIL)
    health.mjs          A simple status check
  lib/                  Shared code: AI calls, prompts, quote checks, clause splitting,
                        database access, do-not-translate names
mockup/                 The design mockups (phone screens and desktop)
supabase/               Database setup (SQL, see below)
PRD.md                  Product requirements
REQUIREMENTS.md         Requirements and user stories
WHATS_NEW.md            What is new, for judges
netlify.toml            Netlify build settings
.env.example            Every environment variable name (empty values)
```

---

## Run it locally

You need Node.js 18 or newer, the Netlify CLI, and your own keys.

```bash
npm install
cp .env.example .env          # then fill in your own values; never commit .env
npx netlify dev --port 8899 --staticServerPort 4099
```

Open http://localhost:8899. Use the ports above if something else is using 8888 or 3999.

### Environment variables

The app reads these names from `.env` locally and from Netlify's environment variables when deployed. Values are never stored in the repository.

| Name | Used for |
|------|----------|
| `AI_PROVIDER` | `claude` (default) or `nvidia` |
| `ANTHROPIC_API_KEY` | Claude API |
| `ANTHROPIC_MODEL`, `ANTHROPIC_RISK_MODEL` | Optional Claude model names |
| `NVIDIA_API_KEY` | NVIDIA Build (the second checker, and the fallback provider) |
| `NVIDIA_*_MODEL`, `SECOND_CHECKER` | Optional NVIDIA model names and checker choice |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure AI Speech (region is a code such as `eastasia`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server key (server-side only) |
| `CONTACT_EMAIL` | The Data Protection Officer's email on the privacy page (empty: "Contact details coming soon") |
| `CLAUSEWISE_DEBUG` | Optional: logs the steps of the chatbot function |

### Database (Supabase)

Run these in the Supabase SQL editor, **in this order**:

1. `supabase/setup.sql` (creates the `contracts` table)
2. `supabase/add-personal-details.sql`
3. `supabase/add-situation.sql`
4. `supabase/add-decisions.sql`
5. `supabase/add-checks.sql`

---

## Deploy

Netlify builds the site from `public/` and the functions from `netlify/functions/` (see `netlify.toml`). Add the environment variables above in Netlify's **Site configuration → Environment variables**, with the functions scope. Each push to `main` deploys.

---

## Judges: where to look

1. Open the live site on a laptop and on a phone. Upload a contract (or use the demo).
2. Open a contract and watch the "✓ Checked twice" tick appear once the second AI has checked the answer.
3. Open `?judge=1` for the "Behind the scenes" view: what Claude wrote, what NVIDIA caught, and the final answer.
4. Open `?demo=fail&judge=1` to see two mistakes planted on purpose, and the check catching them.
5. Mark a warning "I'll ask about this", then open "You decide" for the draft (Feature 2).

---

## Not legal advice

ClauseWise SG explains contracts in plain words. It is not legal advice, it does not say whether a contract is safe or legal, and it never sends anything on your behalf. Warnings show where to look more closely. For a big decision, ask a qualified professional.
