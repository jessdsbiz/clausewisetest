// /.netlify/functions/read-page   ("No more typing", PRD FR9)
//   POST { image: "data:image/jpeg;base64,..." }
//     -> { text, readable: "yes" | "partly" | "no", problem, printed_page }
// Reads one photo of one contract page with Claude vision. The AI also says whether the page could
// be read properly and which page number is printed on it, so the app can put pages in order and
// ask the user to retake a bad photo instead of guessing. The photo is not stored anywhere, and
// NRIC/FIN and bank numbers are masked before the text leaves this function.

import { HttpError, errorResponse } from '../lib/http.mjs';
import { chatHedged, VISION_MODEL } from '../lib/ai.mjs';
import { hidePersonalNumbers } from '../../public/js/privacy.js';

// The browser shrinks each photo to about 1568px on its longest side (what Claude reads best),
// usually 0.3-1 MB. This keeps every request well under Netlify's 6 MB limit.
const MAX_IMAGE_CHARS = 3_000_000;

const PROMPT = `This is a photo of one page of a contract or letter. First answer three questions, one per line:
READABLE: yes, partly or no. "partly" means some words are blurry, cut off, covered, in shadow or too small to read. "no" means most of the page can't be read, or it is not a page of a document.
PROBLEM: a few words on what is wrong, e.g. "blurry", "bottom of the page is cut off", "too dark". Write none if nothing is wrong.
PAGE NUMBER: the page number printed on the page (e.g. 3 from "Page 3 of 8"). Write none if no page number is printed.
Then a line with only ---
Then copy out ALL of the text on the page exactly as written:
- Keep clause numbers (e.g. 1, 2.1, 5.3) and headings at the start of their lines.
- Keep each paragraph together, with a blank line between paragraphs.
- Keep the original wording. Do not summarise, explain, translate or correct anything, and never guess a word: write [unreadable] for any word you can't read.
- Plain text only: no markdown, no bold, no bullet symbols you added yourself.
- Do not add any titles, headings or notes that are not printed on the page.
- If there is no readable text, write NO_TEXT.`;

// "READABLE: partly\nPROBLEM: ...\nPAGE NUMBER: 3\n---\n<text>"
function parse(reply) {
  const at = reply.indexOf('\n---');
  const head = at >= 0 ? reply.slice(0, at) : '';
  let text = at >= 0 ? reply.slice(reply.indexOf('\n', at + 1) + 1) : reply;
  const field = (name) => (head.match(new RegExp(`^\\s*${name}\\s*:\\s*(.*)$`, 'im'))?.[1] || '').trim();
  let readable = field('READABLE').toLowerCase().match(/yes|partly|no/)?.[0] || 'yes';
  let problem = field('PROBLEM').replace(/^none\.?$/i, '').slice(0, 80);
  const printed = field('PAGE NUMBER').match(/\d{1,3}/)?.[0] || null;
  text = text.replace(/\*\*/g, '').trim();
  if (/^NO_TEXT\b/.test(text) || !text) {
    text = '';
    readable = 'no';
  }
  // Many words the AI could not read means the photo needs retaking, whatever it said above.
  const unreadable = (text.match(/\[unreadable\]/gi) || []).length;
  if (readable === 'yes' && unreadable >= 3) {
    readable = 'partly';
    problem ||= 'some words could not be read';
  }
  return { text, readable, problem, printed_page: printed };
}

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const { image } = await req.json().catch(() => ({}));
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      throw new HttpError(400, 'Please send a JPG, PNG or WebP photo.');
    }
    if (image.length > MAX_IMAGE_CHARS) throw new HttpError(413, 'This photo is too big to read. Try again with a smaller photo.');

    const reply = await chatHedged({
      model: VISION_MODEL,
      thinking: false,
      maxTokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: image } },
        ],
      }],
    }, {
      // Every AI call answers within 20s; a slow first try gets a second one alongside it.
      hedgeAfterMs: 10000,
      timeoutMs: 18000,
      busyMessage: 'Reading this page took too long. Please try again.',
    });
    const page = parse(reply);
    // Masked here too, so an NRIC or account number in a photo never reaches the browser unmasked.
    return Response.json({ ...page, text: hidePersonalNumbers(page.text).text });
  } catch (err) {
    return errorResponse(err);
  }
};
