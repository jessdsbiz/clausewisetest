// Getting text out of uploads, in the browser.
// PDFs: pdf.js. Photos: shrunk here, then read by a vision model via /read-photo.

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

// ---------- Photos ----------

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

// Draws part of the image (rows y0..y1) scaled so its longest side is at most maxSide.
function toJpeg(img, maxSide, quality, y0 = 0, y1 = img.naturalHeight) {
  const w = img.naturalWidth;
  const h = y1 - y0;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, y0, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Reading a whole page takes the vision model ~25s, close to the function time limit
// (30s locally, 60s on Netlify). So the photo is cut into strips that are read in
// parallel. Cuts go through the middle of the widest blank gap between lines of text,
// so no line is sliced in half.
const STRIPS = 3;

function findCuts(img) {
  const w = 400;
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  // How much dark "ink" is in each row of the small copy.
  const ink = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i] + px[i + 1] + px[i + 2] < 3 * 150) ink[y]++;
    }
  }

  const cuts = [];
  for (let s = 1; s < STRIPS; s++) {
    const target = Math.round((h * s) / STRIPS);
    const lo = Math.max(1, target - Math.round(h * 0.08));
    const hi = Math.min(h - 1, target + Math.round(h * 0.08));

    // Treat rows with almost no ink (allowing for photo noise) as blank.
    let minInk = Infinity;
    for (let y = lo; y < hi; y++) minInk = Math.min(minInk, ink[y]);
    const blank = (y) => ink[y] <= minInk + 1;

    // Find the widest run of blank rows; on a tie, the one closest to the target.
    let best = { mid: target, len: 0 };
    for (let y = lo; y < hi; y++) {
      if (!blank(y)) continue;
      const start = y;
      while (y + 1 < hi && blank(y + 1)) y++;
      const run = { mid: Math.round((start + y) / 2), len: y - start + 1 };
      if (run.len > best.len || (run.len === best.len && Math.abs(run.mid - target) < Math.abs(best.mid - target))) best = run;
    }
    cuts.push(Math.round((best.mid / h) * img.naturalHeight));
  }
  return cuts;
}

// Each strip must fit the vision model's inline image limit.
const READ_LIMIT_CHARS = 175_000;
const READ_ATTEMPTS = [[1600, 0.8], [1400, 0.7], [1200, 0.65], [1000, 0.6], [800, 0.6]];

function stripDataUrl(img, y0, y1) {
  let dataUrl = '';
  for (const [side, quality] of READ_ATTEMPTS) {
    dataUrl = toJpeg(img, side, quality, y0, y1).toDataURL('image/jpeg', quality);
    if (dataUrl.length <= READ_LIMIT_CHARS) break;
  }
  return dataUrl;
}

export async function photoToText(file, apiCall) {
  const img = await loadImage(file);
  const edges = [0, ...findCuts(img), img.naturalHeight];

  const parts = await Promise.all(edges.slice(0, -1).map((y0, i) =>
    apiCall('read-photo', { method: 'POST', json: { image: stripDataUrl(img, y0, edges[i + 1]) }, what: 'reading your photo' })));

  const text = parts.map((p) => p.text).filter(Boolean).join('\n').trim();
  if (!text) {
    throw new Error('We could not read any text in this photo. Try again with better light, holding the phone flat above the page.');
  }
  // The photo itself is not kept anywhere: only this text is used from here on.
  return { text };
}
