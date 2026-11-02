// /.netlify/functions/read-photo
// POST { image: "data:image/jpeg;base64,..." } -> { text }
// Reads the words in a photo of a contract or letter with the AI (Claude, or NVIDIA Build if AI_PROVIDER=nvidia).
// The browser sends one strip of the page per call; a blank strip returns empty text.

import { HttpError, errorResponse } from '../lib/http.mjs';
import { chatHedged, VISION_MODEL } from '../lib/ai.mjs';

// Images are sent inline; the browser shrinks photos to fit this.
const MAX_IMAGE_CHARS = 180_000;

const PROMPT = `This is a photo of part of a page from a contract or letter. Copy out ALL of the text exactly as written.
- Keep clause numbers (e.g. 1, 2.1, 5.3) and headings at the start of their lines.
- Keep each paragraph together, with a blank line between paragraphs.
- Keep the original wording. Do not summarise, explain, translate or correct anything.
- Plain text only: no markdown, no bold, no bullet symbols you added yourself.
- Do not add any titles, headings or notes that are not printed in the photo.
- If a word is covered or unreadable, write [unreadable].
- If there is no readable text, reply with exactly: NO_TEXT`;

export default async (req) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');

    const { image } = await req.json().catch(() => ({}));
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      throw new HttpError(400, 'Please send a JPG, PNG or WebP photo.');
    }
    if (image.length > MAX_IMAGE_CHARS) throw new HttpError(413, 'The photo is too big to read. Try a smaller photo.');

    // Our own time limit stays under netlify dev's 30s, so a slow read gives a clear message
    // instead of an empty 500.
    const text = await chatHedged({
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
      hedgeAfterMs: 12000,
      timeoutMs: 20000,
      busyMessage: 'Reading your photo took too long: the AI photo reader is busy. Please try again in a minute, or upload a PDF instead.',
    });

    if (text.includes('NO_TEXT') && text.length < 20) return Response.json({ text: '' });
    // The model sometimes adds markdown bold despite the prompt.
    return Response.json({ text: text.replace(/\*\*/g, '') });
  } catch (err) {
    return errorResponse(err);
  }
};
