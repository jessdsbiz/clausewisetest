// Privacy policy (#/privacy), terms of use (#/terms) and the consent step before an upload.
// The full text is in plain English, and the English version is the one that applies. The
// "In short" box and the consent checkboxes are in each of the app's four languages.
// (Malay and Tamil still need a native speaker's check, like the other Malay and Tamil text.)
//
// Keep the privacy text in step with the code: what is saved (netlify/functions/contracts.mjs),
// what is hidden (public/js/privacy.js) and who receives what (netlify/lib/claude.mjs, nvidia.mjs,
// netlify/functions/speech.mjs).

const LAST_UPDATED = { en: '6 November 2026', zh: '2026年11月6日', ms: '6 November 2026', ta: '6 நவம்பர் 2026' };

export const LEGAL_WORDS = {
  en: {
    privacyTitle: 'Privacy policy', termsTitle: 'Terms of use', inShort: 'In short',
    englishApplies: 'This is a summary. The full English version below is the one that applies.',
    lastUpdated: 'Last updated:',
    privacyShort: [
      'We use your contract only to explain it to you. We don\'t sell your data or use it to train AI.',
      'NRIC and bank numbers are hidden before your contract is saved. Names and addresses are not, so hide what you don\'t need to share.',
      'Your contract stays until you delete it. Delete it anytime with the delete button.',
      'AI services (Claude, NVIDIA, Microsoft Azure) process it for us. Supabase stores it and Netlify runs the app.',
    ],
    termsShort: [
      'ClauseWise SG explains contracts in plain words. It is not legal advice.',
      'The AI can make mistakes. Always check the original clause.',
      'Warning labels show what to check first. They never mean a contract is safe or a scam.',
      'It\'s a free beta. Only upload contracts that are yours, or that you have permission to share.',
    ],
    consentTitle: 'Before you add your contract',
    consentNric: 'I\'ve hidden my NRIC and other personal details I don\'t need to share',
    consentAdvice: 'I understand ClauseWise SG explains contracts and isn\'t legal advice',
    consentHint: 'Tick both boxes to add your contract.',
    privacyLink: 'Privacy', termsLink: 'Terms',
  },
  zh: {
    privacyTitle: '隐私政策', termsTitle: '使用条款', inShort: '简单来说',
    englishApplies: '这是摘要。以下的英文完整版本才是有效版本。',
    lastUpdated: '最后更新：',
    privacyShort: [
      '我们只用你的合同来为你解释它。我们不出售你的数据，也不用它来训练 AI。',
      'NRIC 和银行账号会在合同保存前被隐藏。姓名和地址不会被隐藏，所以请遮住你不需要分享的信息。',
      '你的合同会一直保留，直到你删除它。你可以随时用删除按钮删除。',
      'AI 服务（Claude、NVIDIA、Microsoft Azure）为我们处理数据。Supabase 负责储存，Netlify 负责运行应用。',
    ],
    termsShort: [
      'ClauseWise SG 用简单的话解释合同。这不是法律意见。',
      'AI 可能会出错。请一定核对原始条款。',
      '警示标签告诉你先看哪里。它们从不表示合同安全，也不表示合同是诈骗。',
      '这是免费测试版。只上传属于你、或你获准分享的合同。',
    ],
    consentTitle: '添加合同之前',
    consentNric: '我已遮住我的 NRIC 和其他不需要分享的个人资料',
    consentAdvice: '我明白 ClauseWise SG 只是解释合同，不是法律意见',
    consentHint: '请勾选两个方框，才能添加合同。',
    privacyLink: '隐私政策', termsLink: '使用条款',
  },
  ms: {
    privacyTitle: 'Dasar privasi', termsTitle: 'Terma penggunaan', inShort: 'Ringkasnya',
    englishApplies: 'Ini ringkasan. Versi penuh dalam bahasa Inggeris di bawah ialah versi yang terpakai.',
    lastUpdated: 'Kemas kini terakhir:',
    privacyShort: [
      'Kami guna kontrak anda hanya untuk menerangkannya kepada anda. Kami tidak menjual data anda atau menggunakannya untuk melatih AI.',
      'NRIC dan nombor bank disembunyikan sebelum kontrak anda disimpan. Nama dan alamat tidak disembunyikan, jadi tutup apa yang anda tidak perlu kongsi.',
      'Kontrak anda disimpan sehingga anda memadamnya. Padam bila-bila masa dengan butang padam.',
      'Perkhidmatan AI (Claude, NVIDIA, Microsoft Azure) memprosesnya untuk kami. Supabase menyimpannya dan Netlify menjalankan aplikasi.',
    ],
    termsShort: [
      'ClauseWise SG menerangkan kontrak dalam bahasa mudah. Ia bukan nasihat undang-undang.',
      'AI boleh tersilap. Sentiasa semak fasal asal.',
      'Label amaran menunjukkan apa yang perlu disemak dahulu. Ia tidak sekali-kali bermakna kontrak itu selamat atau satu penipuan.',
      'Ini versi beta percuma. Muat naik hanya kontrak milik anda, atau yang anda dibenarkan kongsi.',
    ],
    consentTitle: 'Sebelum anda menambah kontrak',
    consentNric: 'Saya telah menyembunyikan NRIC dan butiran peribadi lain yang tidak perlu saya kongsi',
    consentAdvice: 'Saya faham ClauseWise SG menerangkan kontrak dan bukan nasihat undang-undang',
    consentHint: 'Tandakan kedua-dua kotak untuk menambah kontrak anda.',
    privacyLink: 'Privasi', termsLink: 'Terma',
  },
  ta: {
    privacyTitle: 'தனியுரிமைக் கொள்கை', termsTitle: 'பயன்பாட்டு விதிமுறைகள்', inShort: 'சுருக்கமாக',
    englishApplies: 'இது ஒரு சுருக்கம். கீழே உள்ள முழு ஆங்கிலப் பதிப்பே செல்லுபடியாகும்.',
    lastUpdated: 'கடைசியாகப் புதுப்பித்தது:',
    privacyShort: [
      'உங்கள் ஒப்பந்தத்தை உங்களுக்கு விளக்க மட்டுமே பயன்படுத்துகிறோம். உங்கள் தரவை விற்பதில்லை, AI பயிற்சிக்கும் பயன்படுத்துவதில்லை.',
      'உங்கள் ஒப்பந்தம் சேமிக்கப்படும் முன் NRIC மற்றும் வங்கி எண்கள் மறைக்கப்படும். பெயர்களும் முகவரிகளும் மறைக்கப்படாது, எனவே பகிரத் தேவையில்லாதவற்றை மறைக்கவும்.',
      'நீங்கள் நீக்கும் வரை உங்கள் ஒப்பந்தம் வைக்கப்படும். நீக்கு பொத்தானைக் கொண்டு எப்போது வேண்டுமானாலும் நீக்கலாம்.',
      'AI சேவைகள் (Claude, NVIDIA, Microsoft Azure) எங்களுக்காக அதைச் செயலாக்குகின்றன. Supabase சேமிக்கிறது, Netlify செயலியை இயக்குகிறது.',
    ],
    termsShort: [
      'ClauseWise SG ஒப்பந்தங்களை எளிய வார்த்தைகளில் விளக்குகிறது. இது சட்ட ஆலோசனை அல்ல.',
      'AI தவறு செய்யலாம். எப்போதும் மூலப் பிரிவைச் சரிபார்க்கவும்.',
      'எச்சரிக்கை லேபிள்கள் முதலில் எதைச் சரிபார்க்க வேண்டும் என்று காட்டுகின்றன. ஒப்பந்தம் பாதுகாப்பானது அல்லது மோசடி என்று அவை ஒருபோதும் பொருள்படாது.',
      'இது இலவச சோதனைப் பதிப்பு. உங்களுடைய, அல்லது பகிர அனுமதி பெற்ற ஒப்பந்தங்களை மட்டும் பதிவேற்றவும்.',
    ],
    consentTitle: 'உங்கள் ஒப்பந்தத்தைச் சேர்க்கும் முன்',
    consentNric: 'என் NRIC மற்றும் பகிரத் தேவையில்லாத பிற தனிப்பட்ட விவரங்களை மறைத்துவிட்டேன்',
    consentAdvice: 'ClauseWise SG ஒப்பந்தங்களை விளக்குகிறது, இது சட்ட ஆலோசனை அல்ல என்பதைப் புரிந்துகொள்கிறேன்',
    consentHint: 'உங்கள் ஒப்பந்தத்தைச் சேர்க்க இரண்டு பெட்டிகளையும் டிக் செய்யவும்.',
    privacyLink: 'தனியுரிமை', termsLink: 'விதிமுறைகள்',
  },
};
export const legalWords = (lang) => LEGAL_WORDS[lang] || LEGAL_WORDS.en;
const legalLang = (lang) => (LEGAL_WORDS[lang] ? lang : 'en');

// Where to get help (the same places the app links to elsewhere).
const HELP = [
  ['MOM (Ministry of Manpower)', 'https://www.mom.gov.sg/employment-practices', 'jobs, pay and leave'],
  ['TADM', 'https://www.tal.sg/tadm', 'work disputes'],
  ['Pro Bono SG', 'https://www.probono.sg/', 'free legal help'],
  ['ScamShield Helpline 1799', 'tel:1799', 'if you think it might be a scam'],
  ['ACRA BizFile', 'https://www.bizfile.gov.sg/', 'check that a company is real'],
];
const link = (label, href) => `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;

// The Data Protection Officer's email comes from the server (CONTACT_EMAIL). undefined = still loading.
let contactEmail;
let contactLoading = null;
function contactHtml() {
  if (contactEmail === undefined) return 'Loading…';
  return contactEmail ? `<a href="mailto:${contactEmail}">${contactEmail}</a>` : 'Contact details coming soon';
}
function loadContact() {
  if (contactEmail !== undefined || contactLoading) return;
  contactLoading = fetch('/.netlify/functions/contact')
    .then((r) => (r.ok ? r.json() : { email: null }))
    .then((d) => {
      const email = typeof d?.email === 'string' ? d.email : '';
      contactEmail = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email) ? email : null;
    })
    .catch(() => { contactEmail = null; })
    .finally(() => {
      contactLoading = null;
      document.querySelectorAll('[data-dpo-contact]').forEach((el) => { el.innerHTML = contactHtml(); });
    });
}

function inShort(lang, kind) {
  const w = legalWords(lang);
  const points = kind === 'privacy' ? w.privacyShort : w.termsShort;
  return `
    <section class="legal-short" aria-labelledby="legal-short-h" lang="${legalLang(lang)}" data-keep>
      <h2 id="legal-short-h">${w.inShort}</h2>
      <ul>${points.map((p) => `<li>${p}</li>`).join('')}</ul>
      <p class="legal-applies">${w.englishApplies}</p>
    </section>`;
}

function head(lang, kind, langPicker) {
  const w = legalWords(lang);
  return `
    <div class="legal-top">${langPicker}</div>
    <h1 class="legal-h1" lang="${legalLang(lang)}" data-keep>${kind === 'privacy' ? w.privacyTitle : w.termsTitle}</h1>
    <p class="legal-updated" lang="${legalLang(lang)}" data-keep>${w.lastUpdated} ${LAST_UPDATED[legalLang(lang)]}</p>
    ${inShort(lang, kind)}`;
}

const PRIVACY_BODY = () => `
  <h2>What we collect, and why</h2>
  <p>We collect only what we need to explain the contract you add, and to show you the results again later.</p>
  <ul>
    <li><strong>Your contract's text.</strong> We read the text from your PDF in your browser, or from your photos with AI. We don't keep your original PDF or photos.</li>
    <li><strong>What you tell us.</strong> What you type or say in "Tell us about you", your questions to the chatbot, and what you do in "You decide" (the warnings you mark, the draft message and the option you pick).</li>
    <li><strong>What the app makes for you.</strong> The summary, warnings, plan, comics, translations, chatbot answers and the results of the second AI check.</li>
    <li><strong>A few basic details.</strong> The contract type, the language you chose, the file name and the date you added it.</li>
    <li><strong>A random device ID.</strong> It's kept in your browser and links your contracts to this browser. You don't need an account. We don't ask for your name, email or phone number.</li>
  </ul>
  <p>Your browser also keeps your language, your Phone or Desktop view choice and the plan steps you tick. These stay on your device.</p>

  <h2>What we hide, and what we don't</h2>
  <ul>
    <li><strong>NRIC and FIN numbers, and bank and card numbers, are hidden</strong> (for example S****567D and ****-7890) in your browser before your contract is saved or sent to an AI, and again on our server.</li>
    <li><strong>Photos are different.</strong> The AI has to read a photo before anything can be hidden, so it sees the whole photo. Cover your NRIC and bank details before you take each photo.</li>
    <li><strong>Other personal details are not hidden automatically.</strong> Names, home addresses, phone numbers and emails in your contract are saved with it and sent to the AI services so they can explain it. "Hide these too" on the Personal details screen hides them on your screen only.</li>
  </ul>

  <h2>What we don't do</h2>
  <ul>
    <li>We don't sell your data.</li>
    <li>We don't use your contracts to train AI.</li>
    <li>We don't share your contract with anyone except the services below, which we need to run the app.</li>
    <li>We never send anything to anyone for you.</li>
  </ul>

  <h2>Who handles your data for us</h2>
  <ul>
    <li><strong>Anthropic (Claude API)</strong> reads your contract and writes the explanations, warnings, plan, comics, translations and chatbot answers. Anthropic's terms for its API say it doesn't train its models on data sent through the API.</li>
    <li><strong>NVIDIA</strong> runs the second AI that checks Claude's work. It gets the clauses being checked and the explanations of them.</li>
    <li><strong>Microsoft Azure AI Speech</strong> turns text into speech when you use read-aloud. It gets only the short pieces of text being read.</li>
    <li><strong>Supabase</strong> stores your contracts and results in its database.</li>
    <li><strong>Netlify</strong> hosts the app and runs the server code that talks to these services.</li>
    <li><strong>Your browser's speech recognition</strong> is used when you tap the mic. It's run by your browser's maker (for example Google in Chrome, or Apple in Safari). We only receive the words.</li>
  </ul>
  <p>Each of these services handles data under its own terms. Like most online services, Netlify and Supabase keep short-term technical logs, such as IP addresses and errors. Our own error logs sometimes include a short piece of an AI answer, to help us fix problems.</p>

  <h2>How long we keep it, and how to delete it</h2>
  <ul>
    <li>Your contract and everything made from it stay until you delete them. We don't delete them automatically yet.</li>
    <li>To delete a contract, open it and tap <strong>Delete this contract</strong>, or tap the bin next to it in <a href="#/contracts">My contracts</a>. It's removed from our database straight away, with everything made from it. Copies held by the AI services follow their own terms.</li>
    <li>Your contracts are linked to this browser. If you clear your browser's data or change device, you can't open or delete them yourself any more. Write to us and we'll help.</li>
  </ul>

  <h2>Your rights</h2>
  <p>You can ask us to see, correct or delete the data we hold about you. Write to:</p>
  <p class="legal-contact"><strong>Data Protection Officer, ClauseWise SG</strong><br><span data-dpo-contact>${contactHtml()}</span></p>
  <p>Tell us roughly when you added the contract and what it was, so we can find it.</p>

  <h2>Before you upload</h2>
  <ul>
    <li>Hide your NRIC and any personal details you don't need to share.</li>
    <li>Only use ClauseWise SG for your own contracts, or ones you have permission to share.</li>
  </ul>
  <p>See also our <a href="#/terms">terms of use</a>.</p>`;

const TERMS_BODY = () => `
  <h2>What ClauseWise SG is</h2>
  <p><strong>ClauseWise SG explains contracts in plain words. It is not legal advice and doesn't replace a lawyer.</strong> It never tells you whether to sign, and it never sends anything for you.</p>

  <h2>Warning labels</h2>
  <p>High, Medium and Info show what to review first. They never mean a contract is safe, or that it is a scam. ClauseWise SG can't confirm whether a contract is genuine.</p>

  <h2>Comics</h2>
  <p>Comics are example scenes made by AI. Each one says what it assumes. The original clause is what counts.</p>

  <h2>The AI can make mistakes</h2>
  <p>A second AI checks the work, but mistakes can still happen. Always check the original clause that each point links to.</p>

  <h2>Big decisions</h2>
  <p>For a big decision, talk to a qualified professional. These can help:</p>
  <ul>${HELP.map(([label, href, what]) => `<li>${link(label, href)}: ${what}</li>`).join('')}</ul>

  <h2>Free beta</h2>
  <p>ClauseWise SG is a free beta. There are no payments yet, and features may change.</p>

  <h2>Whose contracts you can upload</h2>
  <p>Only upload contracts that are yours. Don't upload a contract that belongs to someone else unless they've said you can.</p>

  <h2>Your data</h2>
  <p>Our <a href="#/privacy">privacy policy</a> explains what we collect, who handles it and how to delete it.</p>`;

// The page. `langPicker`: the app's language switch, drawn by app.js.
export function renderLegal(kind, lang, langPicker = '') {
  if (kind === 'privacy') loadContact();
  return `
    <article class="legal">
      ${head(lang, kind, langPicker)}
      <div class="legal-body" lang="en" data-keep>${kind === 'privacy' ? PRIVACY_BODY() : TERMS_BODY()}</div>
    </article>`;
}

// The two checkboxes before an upload. Nothing about them is saved: they only unlock this upload.
export function consentHtml(lang, consent, off = '') {
  const w = legalWords(lang);
  const box = (id, key, text) => `
    <label class="consent-row">
      <input type="checkbox" id="${id}" ${consent[key] ? 'checked' : ''} ${off}>
      <span>${text}</span>
    </label>`;
  const both = consent.nric && consent.advice;
  return `
    <fieldset class="consent" lang="${legalLang(lang)}" data-keep>
      <legend>${w.consentTitle}</legend>
      ${box('consent-nric', 'nric', w.consentNric)}
      ${box('consent-advice', 'advice', w.consentAdvice)}
      <p class="consent-foot">
        ${both ? '' : `<span id="consent-hint">${w.consentHint}</span>`}
        <a href="#/privacy">${w.privacyLink}</a> <span aria-hidden="true">·</span> <a href="#/terms">${w.termsLink}</a>
      </p>
    </fieldset>`;
}
