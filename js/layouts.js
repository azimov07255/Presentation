// Slayd maketlari. Har bir make(th, d) tayyor elementlar ro‘yxatini qaytaradi.
// Xuddi shu funksiyalar keyinchalik AI tuzgan strukturadan slayd yasash uchun ham ishlatiladi.
import { uid } from './util.js';

const T = (x, y, w, h, text, o = {}) => ({ id: uid('e'), t: 'text', x, y, w, h, text, fs: 28, fw: 400, font: 'B', c: '@tx', al: 'left', va: 'top', lh: 1.25, ...o });
const S = (kind, x, y, w, h, o = {}) => ({ id: uid('e'), t: 'shape', kind, x, y, w, h, fill: '@ac', ...o });
const I = (x, y, w, h, o = {}) => ({ id: uid('e'), t: 'image', x, y, w, h, src: null, fit: 'cover', rx: 0, ...o });
export const mk = { T, S, I };

// ---- matn sig‘ishini taxmin qilish (brauzer o‘lchamisiz, tez) ----
// Belgi kengligi taxmini (shrift o‘lchamiga nisbatan): qalin sarlavhalar kengroq, oddiy matn torroq
const cpl = (w, fs, f) => Math.max(3, Math.floor(w / (fs * f)));
const lines = (txt, w, fs, f) => String(txt).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / cpl(w, fs, f))), 0);
export function fitTitle(txt, w, base, min, maxLines = 2) {
  let fs = base;
  while (fs > min && lines(txt, w, fs, 0.62) > maxLines) fs -= 2;
  return fs;
}
export function fitList(items, w, hbox, base, min, lh = 1.4, ps = 12) {
  let fs = base;
  const total = f => items.reduce((s, t) => s + lines(t, w - f * 1.2, f, 0.55) * f * lh + ps, 0);
  while (fs > min && total(fs) > hbox) fs -= 1;
  return fs;
}
const asArr = (v, def) => (Array.isArray(v) && v.length ? v : def);

// ---- bezaklar ----
// Bezak elementlari dk=1 bilan belgilanadi: mavzu almashtirilganda ular yangi mavzuning bezagiga almashtiriladi
const deco = (th, kind) => decoRaw(th, kind).map(e => ({ ...e, dk: 1 }));
function decoRaw(th, kind) {
  const cover = kind === 'cover';
  if (kind === 'center') {
    if (th.deco === 'frame') return [S('rect', 28, 28, 1224, 664, { fill: 'none', stroke: '@line', sw: 2, rx: 6 }), S('ellipse', 1110, 560, 96, 96, { fill: '@ac', o: .92 }), S('ellipse', 1066, 604, 40, 40, { fill: '@ac2', o: .9 }), S('ellipse', 74, 76, 28, 28, { fill: '@ac' })];
    if (th.deco === 'blocks') return [S('ellipse', 1040, -150, 340, 340, { g: ['@ac', '@ac2'], ga: 135, o: .9 }), S('ellipse', -110, 520, 300, 300, { g: ['@ac2', '@ac'], ga: 135, o: .85 }), S('ellipse', 1150, 540, 64, 64, { fill: '@ac2', o: .85 })];
    return decoRaw(th, 'cover');
  }
  switch (th.deco) {
    case 'glow': return cover
      ? [S('glow', 640, -260, 1000, 1000, { fill: '@ac', o: .55 }), S('glow', -300, 300, 860, 860, { fill: '@ac2', o: .32 })]
      : [S('glow', 900, -300, 700, 700, { fill: '@ac', o: .32 }), S('glow', -260, 520, 560, 560, { fill: '@ac2', o: .16 })];
    case 'blocks': return cover
      ? [S('ellipse', 800, 40, 560, 560, { g: ['@ac', '@ac2'], ga: 135, o: .95 }), S('ellipse', 1010, 470, 190, 190, { fill: '@ac2', o: .85 }), S('ellipse', 700, 520, 120, 120, { fill: 'none', stroke: '@ac2', sw: 3 })]
      : [S('ellipse', 1090, -130, 300, 300, { g: ['@ac', '@ac2'], ga: 135, o: .9 }), S('ellipse', 1000, 40, 70, 70, { fill: '@ac2', o: .85 })];
    case 'frame': return cover
      ? [S('rect', 28, 28, 1224, 664, { fill: 'none', stroke: '@line', sw: 2, rx: 6 }), S('ellipse', 1010, 360, 360, 360, { fill: '@ac', o: .92 }), S('ellipse', 1160, 250, 120, 120, { fill: '@ac2', o: .9 })]
      : [S('rect', 28, 28, 1224, 664, { fill: 'none', stroke: '@line', sw: 2, rx: 6 }), S('ellipse', 1192, 40, 28, 28, { fill: '@ac' })];
    case 'bars': return cover
      ? [S('rect', 0, 0, 22, 720, { fill: '@ac' }), S('ellipse', 880, -120, 620, 620, { fill: 'none', stroke: '@ac', sw: 2, o: .5 }), S('ellipse', 960, -40, 460, 460, { fill: 'none', stroke: '@ac2', sw: 2, o: .5 }), S('ellipse', 1060, 70, 260, 260, { fill: '@ac', o: .16 })]
      : [S('rect', 0, 0, 14, 720, { fill: '@ac' }), S('rect', 14, 0, 4, 720, { fill: '@ac2', o: .8 })];
    default: return [];
  }
}
const COVER_BG = { g: ['@bg', '@bg2'], a: 140 };

// ---- maketlar ----
export const LAYOUTS = [
  { id: 'title', name: 'Sarlavha', make(th, d = {}) {
    const title = d.title || 'Taqdimot sarlavhasi', fs = fitTitle(title, 880, 76, 40, 3);
    return { bg: COVER_BG, els: [...deco(th, 'cover'),
      T(96, 96, 900, 30, d.label ?? 'Universitet · 2026', { fs: 18, fw: 600, c: '@ac', ls: 3, up: true }),
      T(96, 170, 880, 280, title, { fs, fw: 800, font: 'H', lh: 1.08, va: 'bottom' }),
      S('rect', 96, 472, 72, 6, { rx: 3 }),
      T(96, 500, 760, 110, d.subtitle ?? 'Qisqa izoh yoki muallif ismi', { fs: 26, c: '@mu', lh: 1.4 })] };
  } },
  { id: 'section', name: 'Bo‘lim', make(th, d = {}) {
    const title = d.title || 'Bo‘lim nomi';
    return { bg: { g: ['@bg2', '@bg'], a: 200 }, els: [...deco(th, 'cover'),
      T(96, 120, 700, 230, d.no ?? '01', { fs: 210, fw: 800, font: 'H', c: '@ac', lh: 1, o: .95 }),
      T(96, 380, 900, 150, title, { fs: fitTitle(title, 900, 60, 36, 2), fw: 700, font: 'H', lh: 1.12 }),
      T(96, 548, 800, 70, d.subtitle ?? '', { fs: 24, c: '@mu', lh: 1.4 })] };
  } },
  { id: 'bullets', name: 'Ro‘yxat', make(th, d = {}) {
    const title = d.title || 'Slayd sarlavhasi';
    const items = asArr(d.bullets, ['Birinchi muhim fikr', 'Ikkinchi muhim fikr', 'Uchinchi muhim fikr']);
    const fs = fitList(items, 1088, 410, 30, 18);
    return { els: [...deco(th, 'content'),
      S('rect', 96, 64, 56, 6, { rx: 3 }),
      T(96, 84, 1000, 100, title, { fs: fitTitle(title, 1000, 44, 30, 2), fw: 700, font: 'H', lh: 1.12 }),
      T(96, 214, 1088, 420, items.join('\n'), { fs, bullet: true, lh: 1.4, ps: 12 })] };
  } },
  { id: 'two', name: 'Ikki ustun', make(th, d = {}) {
    const title = d.title || 'Taqqoslash';
    const L = d.left || { h: 'Birinchi', bullets: ['Fikr bir', 'Fikr ikki', 'Fikr uch'] };
    const R = d.right || { h: 'Ikkinchi', bullets: ['Fikr bir', 'Fikr ikki', 'Fikr uch'] };
    const fl = fitList(asArr(L.bullets, ['']), 432, 270, 24, 16, 1.4, 10), fr = fitList(asArr(R.bullets, ['']), 432, 270, 24, 16, 1.4, 10);
    const fs = Math.min(fl, fr);
    const card = x => S('rect', x, 214, 528, 410, { rx: 24, fill: '@card', stroke: '@line', sw: 1, sh: true });
    return { els: [...deco(th, 'content'),
      S('rect', 96, 64, 56, 6, { rx: 3 }),
      T(96, 84, 1000, 100, title, { fs: fitTitle(title, 1000, 44, 30, 2), fw: 700, font: 'H', lh: 1.12 }),
      card(96), card(656),
      T(128, 244, 464, 48, L.h || '', { fs: 28, fw: 700, font: 'H', c: '@ac' }),
      T(128, 308, 464, 290, asArr(L.bullets, ['']).join('\n'), { fs, bullet: true, lh: 1.4, ps: 10 }),
      T(688, 244, 464, 48, R.h || '', { fs: 28, fw: 700, font: 'H', c: '@ac2' }),
      T(688, 308, 464, 290, asArr(R.bullets, ['']).join('\n'), { fs, bullet: true, lh: 1.4, ps: 10, bc: '@ac2' })] };
  } },
  { id: 'image', name: 'Rasm + matn', make(th, d = {}) {
    const title = d.title || 'Rasm bilan slayd';
    const items = asArr(d.bullets, ['Rasm haqida qisqa izoh', 'Asosiy fikrni ta’kidlang']);
    const img = I(672, 88, 512, 544, { rx: 28, sh: true, src: d.img || null });
    return { els: [...deco(th, 'content'),
      S('rect', 96, 100, 56, 6, { rx: 3 }),
      T(96, 124, 520, 210, title, { fs: fitTitle(title, 520, 44, 28, 3), fw: 700, font: 'H', lh: 1.12 }),
      T(96, 352, 520, 280, items.join('\n'), { fs: fitList(items, 520, 280, 24, 16), bullet: true, lh: 1.4, ps: 12 }), img] };
  } },
  { id: 'quote', name: 'Iqtibos', make(th, d = {}) {
    const q = d.quote || 'Bu yerga ilhomlantiruvchi iqtibos yoki asosiy fikr yoziladi.';
    return { bg: { g: ['@bg2', '@bg'], a: 200 }, els: [...deco(th, 'content'),
      T(96, 60, 240, 220, '“', { fs: 260, fw: 800, font: 'H', c: '@ac', lh: 1 }),
      T(160, 220, 960, 300, q, { fs: fitTitle(q, 960, 50, 28, 5), fw: 500, fi: true, font: 'H', lh: 1.3, va: 'middle' }),
      S('rect', 160, 548, 48, 5, { rx: 2.5, fill: '@ac2' }),
      T(160, 566, 960, 44, d.author ? '— ' + d.author : '— Muallif', { fs: 24, c: '@mu', fw: 600 })] };
  } },
  { id: 'stats', name: 'Raqamlar', make(th, d = {}) {
    const title = d.title || 'Raqamlarda natija';
    const st = asArr(d.stats, [{ v: '85%', l: 'Birinchi ko‘rsatkich izohi' }, { v: '2.4x', l: 'Ikkinchi ko‘rsatkich izohi' }, { v: '1 200+', l: 'Uchinchi ko‘rsatkich izohi' }]).slice(0, 4);
    const n = st.length, gap = 28, w = (1088 - gap * (n - 1)) / n;
    const els = [...deco(th, 'content'), S('rect', 96, 64, 56, 6, { rx: 3 }),
      T(96, 84, 1000, 100, title, { fs: fitTitle(title, 1000, 44, 30, 2), fw: 700, font: 'H', lh: 1.12 })];
    st.forEach((s, i) => {
      const x = Math.round(96 + i * (w + gap)), ww = Math.round(w);
      els.push(S('rect', x, 230, ww, 380, { rx: 24, fill: '@card', stroke: '@line', sw: 1, sh: true }),
        S('rect', x + 32, 262, 40, 5, { rx: 2.5, fill: i % 2 ? '@ac2' : '@ac' }),
        T(x + 32, 290, ww - 64, 120, s.v || '', { fs: fitTitle(s.v || '', ww - 64, n > 3 ? 64 : 80, 36, 1), fw: 800, font: 'H', c: i % 2 ? '@ac2' : '@ac', lh: 1.05, va: 'middle' }),
        T(x + 32, 430, ww - 64, 150, s.l || '', { fs: 22, c: '@mu', lh: 1.45 }));
    });
    return { els };
  } },
  { id: 'steps', name: 'Bosqichlar', make(th, d = {}) {
    const title = d.title || 'Ish bosqichlari';
    const st = asArr(d.steps, [{ h: 'Tahlil', t: 'Muammo va maqsadni aniqlash' }, { h: 'Reja', t: 'Vazifalar va muddatlarni belgilash' }, { h: 'Amalga oshirish', t: 'Ishni bajarish va nazorat' }, { h: 'Natija', t: 'Xulosa va baholash' }]).slice(0, 5);
    const n = st.length, step = 1088 / n;
    const els = [...deco(th, 'content'), S('rect', 96, 64, 56, 6, { rx: 3 }),
      T(96, 84, 1000, 100, title, { fs: fitTitle(title, 1000, 44, 30, 2), fw: 700, font: 'H', lh: 1.12 })];
    els.push(S('line', 96 + step / 2, 284, step * (n - 1), 8, { sw: 4, fill: '@line' }));
    st.forEach((s, i) => {
      const cx = Math.round(96 + step * (i + .5));
      els.push(S('ellipse', cx - 38, 250, 76, 76, { fill: i % 2 ? '@ac2' : '@ac' }),
        T(cx - 38, 250, 76, 76, String(i + 1), { fs: 32, fw: 800, font: 'H', al: 'center', va: 'middle', c: '@onac' }),
        T(cx - step / 2 + 12, 356, step - 24, 60, s.h || '', { fs: 26, fw: 700, font: 'H', al: 'center', lh: 1.2 }),
        T(cx - step / 2 + 12, 424, step - 24, 190, s.t || '', { fs: 20, c: '@mu', al: 'center', lh: 1.45 }));
    });
    return { els };
  } },
  { id: 'statement', name: 'Katta gap', make(th, d = {}) {
    const txt = d.text || 'Bitta kuchli fikr — butun slaydda.';
    return { bg: COVER_BG, els: [...deco(th, 'center'),
      T(128, 150, 1024, 330, txt, { fs: fitTitle(txt, 1024, 68, 34, 4), fw: 800, font: 'H', al: 'center', va: 'middle', lh: 1.15 }),
      S('rect', 604, 516, 72, 6, { rx: 3 }),
      T(228, 544, 824, 80, d.sub ?? '', { fs: 24, c: '@mu', al: 'center', lh: 1.4 })] };
  } },
  { id: 'agenda', name: 'Reja', make(th, d = {}) {
    const items = asArr(d.items, ['Kirish va maqsad', 'Asosiy qism', 'Tahlil va natijalar', 'Xulosa']).slice(0, 6);
    const els = [...deco(th, 'content'), S('rect', 96, 100, 56, 6, { rx: 3 }),
      T(96, 124, 360, 160, d.title || 'Reja', { fs: 64, fw: 800, font: 'H', lh: 1.05 })];
    const rowH = Math.min(92, 520 / items.length), y0 = 120;
    items.forEach((t, i) => {
      const y = Math.round(y0 + i * rowH);
      els.push(T(520, y, 80, rowH - 16, String(i + 1).padStart(2, '0'), { fs: 36, fw: 800, font: 'H', c: i % 2 ? '@ac2' : '@ac', va: 'middle' }),
        T(612, y, 572, rowH - 16, t, { fs: fitTitle(t, 572, 30, 20, 2), fw: 500, va: 'middle', lh: 1.25 }),
        S('line', 520, y + rowH - 10, 664, 4, { sw: 1, fill: '@line' }));
    });
    return { els };
  } },
  { id: 'thanks', name: 'Rahmat', make(th, d = {}) {
    return { bg: COVER_BG, els: [...deco(th, 'center'),
      T(96, 210, 1088, 190, d.title || 'Rahmat!', { fs: fitTitle(d.title || 'Rahmat!', 1088, 128, 44, 1), fw: 800, font: 'H', al: 'center', va: 'middle', lh: 1 }),
      S('rect', 604, 424, 72, 6, { rx: 3 }),
      T(240, 452, 800, 90, d.subtitle ?? 'Savollaringiz bormi? · email@misol.uz', { fs: 26, c: '@mu', al: 'center', lh: 1.4 })] };
  } },
  { id: 'blank', name: 'Bo‘sh', make() { return { els: [] }; } },
];
const COVER_LAYOUTS = new Set(['title', 'section']), CENTER_LAYOUTS = new Set(['statement', 'thanks']);
export function redecorate(slide, th) {
  const kind = slide.layout === 'blank' ? null : COVER_LAYOUTS.has(slide.layout) ? 'cover' : CENTER_LAYOUTS.has(slide.layout) ? 'center' : 'content';
  if (!slide.els.some(e => e.dk) && !kind) return;
  slide.els = [...(kind ? deco(th, kind) : []), ...slide.els.filter(e => !e.dk)];
}
export const layoutById = id => LAYOUTS.find(l => l.id === id) || LAYOUTS[0];

export function newSlide(layoutId, th, d) {
  const L = layoutById(layoutId), r = L.make(th, d);
  return { id: uid('s'), layout: L.id, bg: r.bg || null, els: r.els, notes: d?.notes || '', tr: 'fade' };
}
