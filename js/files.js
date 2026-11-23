// Fayldan matn ajratish (brauzerning o‘zida, serverga yuklamasdan): PDF, DOCX, TXT/MD.
// Kutubxonalar kerak bo‘lganda yuklanadi (ilova tez ochilishi uchun).
const loaded = {};
function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Kutubxona yuklanmadi (internet kerak bo‘lishi mumkin)')); };
    document.head.append(s);
  });
}

export const MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** "1-20, 25" kabi oraliqni sahifa raqamlari ro‘yxatiga aylantiradi. */
export function parsePages(str, total) {
  const s = String(str || '').trim(); if (!s) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set();
  for (const part of s.split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) continue;
    const a = Math.max(1, +m[1]), b = Math.min(total, +(m[2] || m[1]));
    for (let i = a; i <= b; i++) set.add(i);
  }
  return [...set].sort((x, y) => x - y);
}

const tidy = t => String(t).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/-\n(?=\p{Ll})/gu, '').trim();

export async function pdfInfo(file) {
  await loadScript('vendor/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  return pdf;
}

/** Natija: { text, pages, total, kind } */
export async function extractText(file, { pages = '' } = {}) {
  if (file.size > MAX_BYTES) throw new Error('Fayl juda katta (25 MB gacha).');
  const name = (file.name || '').toLowerCase();
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith('text/')) {
    return { text: tidy(await file.text()), pages: 0, total: 0, kind: 'txt' };
  }
  if (name.endsWith('.docx')) {
    await loadScript('vendor/mammoth.browser.min.js');
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: tidy(r.value), pages: 0, total: 0, kind: 'docx' };
  }
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdf = await pdfInfo(file), list = parsePages(pages, pdf.numPages).slice(0, 400), out = [];
    for (const n of list) {
      const page = await pdf.getPage(n), c = await page.getTextContent();
      let line = '', y = null;
      for (const it of c.items) {                      // qatorlarni Y koordinatasi bo‘yicha yig‘amiz
        const yy = Math.round(it.transform[5]);
        if (y !== null && Math.abs(yy - y) > 3) { out.push(line); line = ''; }
        line += it.str + (it.hasEOL ? '\n' : ''); y = yy;
      }
      out.push(line, '');
    }
    const text = tidy(out.join('\n'));
    if (text.length < 80) throw new Error('Bu PDF dan matn topilmadi — u skanerlangan (rasm) bo‘lishi mumkin. Matnli PDF yoki DOCX tanlang.');
    return { text, pages: list.length, total: pdf.numPages, kind: 'pdf' };
  }
  throw new Error('Qo‘llab-quvvatlanadigan formatlar: PDF, DOCX, TXT, MD');
}
