# What's new in ClauseWise SG

Live site: https://clausewisetest.netlify.app

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
