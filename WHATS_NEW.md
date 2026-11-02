# What's new in ClauseWise SG

Live site: https://clausewisetest.netlify.app

## Latest: contract type, translation, comics, voice and audio

**Contract type (FR2, "No more typing")**
- When the AI is confident, the type is pre-selected and the type buttons are hidden. You see "Detected: [type] from [company] · Change", with one short reason (for example, "It mentions salary, probation and notice period.").
- Tap **Change** to see the buttons. When the AI is unsure, or detection fails, the buttons show with the best guess highlighted: "We think this is a [type]. Is that right?"
- Judged by the content, not the company name: salary, probation, notice or working hours mean a job offer; rent, landlord, tenant or deposit mean rental; loan, interest or repayments mean a loan; a monthly plan, lock-in or auto-renewal mean a phone or subscription; services between businesses, invoices or a scope of work mean business.
- If you keep a type the AI doesn't think fits, the contract screen shows "You chose [type]. ClauseWise thinks this is a [type]." with a one-tap **Switch**. The full scam and risk check still runs.

**Full translation**
- In 中文, Bahasa Melayu and தமிழ், every label on every screen is translated: the Risks tab, comics, the plan, Deadlines, buttons, errors and pop-ups.
- Only the original contract text, company names, people's names, addresses and numbers stay as written.
- The page language follows your choice, and the choice carries from screen to screen.

**Comics**
- Speech bubble text and captions use the app font (with Chinese and Tamil fallbacks), in regular weight, at least 12px, fitted inside the bubble.
- The original clause is hidden until you tap **Read the original clause**. "What this scene assumes" stays visible.
- Mei's face follows each panel's risk: worried for a possible scam sign or high risk (with a red "!" sign and the label "Possible scam sign"); confused for a medium risk (amber "?" and "Check this"); calm with no sign for a normal panel; happy with a green tick for a good outcome. The sign sits beside her head and never covers her face or the bubble.

**Voice input**
- The text you speak is built from final results only. What is still being heard appears in grey under the box and is replaced as you speak. Repeated phrases are removed.
- On Android the app listens one phrase at a time. The box stays editable, and the mic button becomes **Stop** while listening.

**Audio in all four languages (Azure AI Speech)**
- Read-aloud uses Azure voices: English (en-SG-LunaNeural), 中文 (zh-CN-XiaoxiaoNeural), Bahasa Melayu (ms-MY-YasminNeural) and தமிழ் (ta-SG-VenbaNeural).
- Long text is read in short parts that play in order. Repeated parts are kept, so they aren't made twice. The speaker button pauses and resumes; "Stop reading" stops.
- The phone's or computer's own voice is used only if Azure fails.

**Desktop**
- The View switch (Auto, Phone, Desktop) fits the top bar at 1024px and wider.
- The Speak tab is gone. "Tell us about you" is always shown under Upload PDF and Take photos, with the mic and the NRIC reminder.
- The Deadlines page lists every key date from your contracts, soonest first, with "Add to calendar".

**Demo clean-up**
- The "Agents at work" card is hidden (it is not built yet). No "Coming later" banners remain.
- The judge view (?judge=1) and the demo (?demo=fail&judge=1) work in both layouts.

**Built with:** Claude API (Haiku) for the explanations, summaries, comics, translations and contract type; NVIDIA Nemotron as the second AI that checks Claude's work; Azure AI Speech for read-aloud audio; the browser's speech recognition for voice input; Netlify Functions and hosting; Supabase for storage; a PWA for phones.

## Checked twice, shown once ("Make it fail", FR10)

Two different AIs now work together before you see anything. Claude writes the summary, warnings and plan. A second AI from another company (NVIDIA Nemotron) checks every point against its clause and looks for risky clauses that were missed. Claude fixes anything it finds, and the fix is checked again.

- You see one clean, final answer in plain words in your language, with a small **✓ Checked twice** tick. While you wait, the screen shows "Reading your contract…", "Finding what matters…" and "Double-checking everything…".
- If something still can't be explained correctly, you see the clause itself with "This part is hard to explain. Read the clause or ask an expert."
- Scam-sign warnings are never dropped or weakened.
- If the double check takes more than 20 seconds, you get the first AI's answer (it has already passed our code checks) without the tick, so you're never stuck waiting.

**For judges**

- **Behind the scenes:** add `?judge=1` to see what the two AIs actually changed on your scan: "AI 1 (Claude) wrote" → "AI 2 (NVIDIA) caught" → "Final answer", plus any risks AI 2 found that AI 1 missed.
  https://clausewisetest.netlify.app/?judge=1
- **Demo:** add `?demo=fail&judge=1` to plant two mistakes on purpose (the notice period changed from 30 to 3 days, and the S$350 fee warning removed), labelled "Planted mistake", so you can watch them being caught every time.
  https://clausewisetest.netlify.app/?demo=fail&judge=1

Neither view is ever on without its link.

## No more typing (FR9)

- Photograph a contract page by page (up to 20 pages), or pick several photos at once. Retake, move or delete any page.
- AI reads every page, puts the pages in order, and asks you to retake a blurry page or add a missing one instead of guessing.
- The contract type and who it's with are detected for you ("Detected: Job offer from BrightPath Solutions · Change").
- Tap the mic to speak in "Tell us about you" and the chatbot, in English, Chinese, Malay or Tamil.

## You decide (FR8)

- Mark each warning "I'll ask about this", "I'm OK with this" or "This looks wrong".
- Get a polite draft message in English about the points you'll ask about, with a plain-words version in your language. Edit it and copy it; ClauseWise SG never sends anything.
- Choose Sign, Negotiate first, Get expert help or Walk away. Nothing is chosen for you.

## Your situation (FR7)

- Tell us a little about yourself, and the summary puts what matters most to you first, warnings say "Why this matters for you", and you get "Your plan before you sign" with places to get help.

ClauseWise SG explains contracts. It is not legal advice.
