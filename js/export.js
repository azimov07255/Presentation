// Eksport: .pptx (PowerPoint'da tahrirlanadigan), .pdf (chop etish orqali), .json (zaxira)
import { W, H, h, download, safeName, toast } from './util.js';
import { S, theme } from './model.js';
import { color, fontPptx } from './themes.js';
import { shapeSVG, bgCSS, slideNode } from './render.js';

const PX = 1 / 96;                       // px -> dyuym
const hex = c => String(c).replace('#', '').slice(0, 6).toUpperCase();
const tr = o => Math.round((1 - (o ?? 1)) * 100);   // tiniqlik -> shaffoflik %

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function canvas(w, hh) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(hh); return c; }
const svgURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// Gradient / yorug‘lik (glow) shakllari PPTX da to‘g‘ridan-to‘g‘ri yo‘q — PNG ga aylantiramiz.
// Ular silliq bo‘lgani uchun kichik o‘lchamda ham sifatli; bir xil shakllar bir marta chiziladi (kesh).
const rasterCache = new Map();
async function rasterShape(el, th) {
  const maxSide = el.kind === 'glow' ? 256 : 900;
  const k = Math.min(1, maxSide / Math.max(el.w, el.h));
  const key = JSON.stringify([el.kind, el.w, el.h, el.fill, el.g, el.ga, el.rx, el.stroke, el.sw, th.id]);
  if (rasterCache.has(key)) return rasterCache.get(key);
  const svg = shapeSVG({ ...el, o: 1 }, th, true);
  const im = await loadImg(svgURL(svg));
  const c = canvas(Math.max(8, el.w * k), Math.max(8, el.h * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/png'); rasterCache.set(key, url); return url;
}
const bgCache = new Map();
async function rasterBg(bg, th) {
  const key = JSON.stringify([bg, th.id]); if (bgCache.has(key)) return bgCache.get(key);
  const c = canvas(1280, 720), g = c.getContext('2d');
  const a = ((bg.a ?? 160) - 90) * Math.PI / 180, cx = 640, cy = 360, len = Math.abs(1280 * Math.cos(a)) + Math.abs(720 * Math.sin(a));
  const gr = g.createLinearGradient(cx - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2, cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2);
  gr.addColorStop(0, color(bg.g[0], th)); gr.addColorStop(1, color(bg.g[1], th));
  g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  const url = c.toDataURL('image/jpeg', 0.9); bgCache.set(key, url); return url;
}
// Rasm: joylashuv (cover/contain) va burchak radiusini hisobga olib kesib beramiz
async function rasterImage(el, src) {
  const im = await loadImg(src), k = Math.min(2, Math.max(1, im.naturalWidth / el.w));
  const cw = Math.round(el.w * k), chh = Math.round(el.h * k), c = canvas(cw, chh), g = c.getContext('2d');
  const r = Math.min((el.rx || 0) * k, cw / 2, chh / 2);
  if (r > 0) { g.beginPath(); g.roundRect(0, 0, cw, chh, r); g.clip(); }
  const s = (el.fit === 'contain' ? Math.min : Math.max)(cw / im.naturalWidth, chh / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  g.drawImage(im, (cw - dw) / 2, (chh - dh) / 2, dw, dh);
  return c.toDataURL('image/png');
}

export async function exportPPTX(deck = S.deck, assets = S.assets) {
  rasterCache.clear(); bgCache.clear();
  if (!window.PptxGenJS) throw new Error('PPTX kutubxonasi yuklanmadi');
  const th = theme(), p = new window.PptxGenJS();
  p.layout = 'LAYOUT_WIDE'; p.title = deck.title; p.author = 'Slaydo'; p.company = 'Slaydo';
  p.theme = { headFontFace: fontPptx('H', th), bodyFontFace: fontPptx('B', th) };

  for (const sl of deck.slides) {
    const s = p.addSlide();
    // fon
    const bg = sl.bg || { g: ['@bg', '@bg2'], a: 160 };
    if (typeof bg === 'string') s.background = { color: hex(color(bg, th)) };
    else s.background = { data: await rasterBg(bg, th) };

    for (const el of sl.els) {
      const box = { x: el.x * PX, y: el.y * PX, w: el.w * PX, h: el.h * PX };
      const rot = el.r ? { rotate: ((el.r % 360) + 360) % 360 } : {};
      const shadow = el.sh ? { shadow: { type: 'outer', blur: 18, offset: 6, angle: 90, color: '000000', opacity: th.dark ? 0.5 : 0.22 } } : {};

      if (el.t === 'text') {
        const raw = String(el.text ?? ''); if (!raw.trim()) continue;
        const fs = el.fs * 0.75, ps = (el.ps || 0) * 0.75;
        const lines = (el.up ? raw.toUpperCase() : raw).split('\n');
        const runs = lines.map((t, i) => ({ text: t, options: { breakLine: i < lines.length - 1, bullet: el.bullet ? { indent: Math.round(fs * 1.1) } : false, paraSpaceAfter: ps } }));
        s.addText(runs, {
          ...box, ...rot, fontFace: fontPptx(el.font, th), fontSize: fs, color: hex(color(el.c || '@tx', th)),
          bold: (el.fw || 400) >= 600, italic: !!el.fi, underline: el.u ? { style: 'sng' } : undefined,
          align: el.al || 'left', valign: el.va === 'middle' ? 'middle' : el.va === 'bottom' ? 'bottom' : 'top',
          lineSpacingMultiple: Math.max(0.5, (el.lh || 1.25) / 1.2), charSpacing: (el.ls || 0) * 0.75,
          margin: 0, wrap: true, fit: 'none', transparency: tr(el.o),
        });
      } else if (el.t === 'shape') {
        const fillOn = el.fill !== 'none', lineOn = el.stroke && el.stroke !== 'none' && (el.sw || 0) > 0;
        if (el.kind === 'glow' || (el.g && el.g.length === 2)) {
          s.addImage({ data: await rasterShape(el, th), ...box, ...rot, transparency: tr(el.o), ...shadow });
          continue;
        }
        const T = p.ShapeType, map = { rect: el.rx > 0 ? T.roundRect : T.rect, ellipse: T.ellipse, triangle: T.triangle, diamond: T.diamond, star: T.star5, arrow: T.rightArrow, line: T.line };
        const type = map[el.kind] || T.rect;
        if (el.kind === 'line') {
          const c = el.stroke && el.stroke !== 'none' ? el.stroke : el.fill;
          s.addShape(type, { x: box.x, y: box.y + box.h / 2, w: box.w, h: 0, line: { color: hex(color(c, th)), width: (el.sw || 4) * 0.75, transparency: tr(el.o) }, ...rot });
        } else {
          s.addShape(type, {
            ...box, ...rot, fill: fillOn ? { color: hex(color(el.fill ?? '@ac', th)), transparency: tr(el.o) } : { type: 'none' },
            line: lineOn ? { color: hex(color(el.stroke, th)), width: el.sw * 0.75, transparency: tr(el.o) } : { type: 'none' },
            ...(el.kind === 'rect' && el.rx > 0 ? { rectRadius: Math.min(el.rx, el.w / 2, el.h / 2) * PX } : {}), ...shadow,
          });
        }
      } else if (el.t === 'image') {
        const src = el.src && assets[el.src]; if (!src) continue; // bo‘sh joy eksport qilinmaydi
        s.addImage({ data: await rasterImage(el, src), ...box, ...rot, transparency: tr(el.o), ...shadow });
      }
    }
    if (sl.notes) s.addNotes(sl.notes);
  }
  await p.writeFile({ fileName: safeName(deck.title) + '.pptx' });
}

// PDF: brauzerning "PDF sifatida saqlash" imkoniyati orqali (vektor sifat, matn tanlanadi)
export function exportPDF(deck = S.deck, assets = S.assets) {
  const th = theme();
  const root = h('div', { id: 'print-root' });
  const style = h('style', { id: 'print-style' }, `@page{size:${W}px ${H}px;margin:0}`);
  deck.slides.forEach(sl => { const pg = h('div', { class: 'print-page' }); pg.append(slideNode(sl, th, assets, 'show')); root.append(pg); });
  document.head.append(style); document.body.append(root); document.body.classList.add('printing');
  const t0 = document.title; document.title = safeName(deck.title);
  const done = () => { root.remove(); style.remove(); document.body.classList.remove('printing'); document.title = t0; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); setTimeout(() => { if (document.getElementById('print-root')) { /* afterprint kelmasa ham tozalaymiz */ setTimeout(done, 4000); } }, 500); }, 250);
  toast('Chop etish oynasida “PDF sifatida saqlash” ni tanlang');
}

export function exportJSON(deck = S.deck, assets = S.assets) {
  download(new Blob([JSON.stringify({ app: 'slaydo', v: 1, deck, assets })], { type: 'application/json' }), safeName(deck.title) + '.slaydo.json');
}

export { bgCSS };
