// Getting text out of uploads, in the browser.
// PDFs: pdf.js. Photos: shrunk here, then each page is read by Claude vision via /read-page.

const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
let pdfjsPromise = null;

function loadPdfJs() {
  pdfjsPromise ||= import(`${PDFJS_BASE}pdf.min.mjs`).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
    return pdfjs;
  });
  return pdfjsPromise;
}

export async function pdfToText(file) {
  let pdfjs;
  try {
    pdfjs = await loadPdfJs();
  } catch {
    pdfjsPromise = null;
    throw new Error('Could not load the PDF reader. Check your internet and try again.');
  }

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') throw new Error('This PDF is password-protected. Remove the password and try again.');
    throw new Error('This file could not be opened as a PDF.');
  }

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let text = '';
    for (const item of content.items) {
      text += item.str;
      if (item.hasEOL) text += '\n';
    }
    pages.push(text.replace(/[ \t]+\n/g, '\n').trim());
  }
  await doc.destroy();

  const text = pages.join('\n\n').trim();
  if (text.replace(/\s/g, '').length < 50) {
    throw new Error("This PDF looks like a scanned picture, so we couldn't read the words. Take a photo of the page instead.");
  }
  return { text, pageCount: pages.length };
}

// ---------- Photos ("No more typing", PRD FR9) ----------
// Each page is shrunk here, on the phone, then read by Claude vision in its own call. The photos
// stay in the browser only: once their text is read they are dropped, and only the masked text
// is ever saved.

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('This photo could not be opened. Try a JPG or PNG.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Draws the image scaled so its longest side is at most maxSide, on white.
function toCanvas(img, maxSide) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Claude reads a page best at about 1568px on its longest side. Usually 0.3-1 MB as a JPEG, so
// every request stays well under Netlify's 6 MB limit; smaller and plainer if a photo is still big.
const PAGE_LIMIT_CHARS = 2_000_000;
const PAGE_ATTEMPTS = [[1568, 0.82], [1400, 0.75], [1200, 0.7], [1000, 0.65]];

// -> { image: data URL to read, thumb: small data URL for the page strip }
export async function preparePhoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose a photo.');
  const img = await loadImage(file);
  let image = '';
  for (const [side, quality] of PAGE_ATTEMPTS) {
    image = toCanvas(img, side).toDataURL('image/jpeg', quality);
    if (image.length <= PAGE_LIMIT_CHARS) break;
  }
  return { image, thumb: toCanvas(img, 240).toDataURL('image/jpeg', 0.7) };
}

// Reads one page. -> { text, readable: "yes" | "partly" | "no", problem, printed_page }
export function readPage(image, apiCall, pageNumber) {
  return apiCall('read-page', { method: 'POST', json: { image }, what: `reading page ${pageNumber}` });
}
