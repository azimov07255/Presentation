// O‘ng panel: dizayn (mavzu, maket, fon, o‘tish, izoh) va tanlangan element xossalari
import { W, H, h, ic, clamp, round } from './util.js';
import { S, on, slide, theme, selEls, edit, touch, emit, setTheme, addSlide, delSelected, dupSelected, reorder, findEl } from './model.js';
import { THEMES, FONT_LIST, SWATCH_TOKENS, TOKEN_NAMES, color } from './themes.js';
import { LAYOUTS, newSlide } from './layouts.js';
import { thumb } from './render.js';
import { pickImageFile, readImage, setInspectorHook, startEdit } from './canvas.js';
import { addAsset } from './model.js';
import { aiSlide, askCustom } from './ai.js';

let root, tab = 'design', sig = '', syncs = [];

export function initInspector(el) {
  root = el;
  on('select', () => { if (S.sel.length && tab === 'design') tab = 'edit'; else if (!S.sel.length && tab === 'edit') tab = 'design'; build(); });
  on('slide', () => build());
  on('change', e => { const s = signature(); if (s !== sig || e?.full) build(); else sync(); });
  on('open', () => { tab = 'design'; build(); });
  setInspectorHook(sync);
  build();
}
const bgSig = () => { const b = slide()?.bg; return !b ? '' : typeof b === 'string' ? b : b.g.join('+'); };
const signature = () => [S.cur, S.sel.join(','), selEls().map(e => e.t + (e.kind || '')).join(','), tab, S.deck?.theme, bgSig()].join('|');
const sync = () => syncs.forEach(f => f());

// ---------- kichik UI bo‘laklari ----------
const sec = (title, ...kids) => h('section', { class: 'sec' }, title ? h('h4', {}, title) : null, ...kids);
const row = (label, ...c) => h('div', { class: 'row' }, label ? h('label', {}, label) : null, h('div', { class: 'ctl' }, ...c));
const getp = (p, d) => { const e = selEls()[0]; return e ? (e[p] ?? d) : d; };
const apply = (p, v, key) => edit(() => selEls().forEach(e => { e[p] = v; }), key || 'p:' + p);

function seg(p, opts, def) {
  const w = h('div', { class: 'seg' });
  const btns = opts.map(o => { const b = h('button', { type: 'button', title: o.t || '', html: o.i ? ic(o.i, 16) : '', onclick: () => apply(p, o.v) }, o.l || null); b._v = o.v; w.append(b); return b; });
  syncs.push(() => btns.forEach(b => b.classList.toggle('on', getp(p, def) === b._v)));
  return w;
}
function toggle(p, icon, title, label) {
  const b = h('button', { type: 'button', class: 'tgl', title, html: icon ? ic(icon, 16) : '', onclick: () => apply(p, !getp(p, false)) }, label || null);
  syncs.push(() => b.classList.toggle('on', !!getp(p, false)));
  return b;
}
function num(p, { min = -9999, max = 9999, step = 1, suffix = '', dec = 0, get, set } = {}) {
  const i = h('input', { type: 'number', min, max, step, inputmode: 'decimal' });
  const g = get || (() => getp(p, 0));
  i.addEventListener('input', () => { if (i.value === '' || isNaN(+i.value)) return; const v = clamp(+i.value, min, max); set ? set(v) : apply(p, v); });
  i.addEventListener('blur', () => { i.value = round(g(), dec); });
  syncs.push(() => { if (document.activeElement !== i) i.value = round(g(), dec); });
  return h('div', { class: 'num' }, i, suffix ? h('span', {}, suffix) : null);
}
function slider(p, { min, max, step = 1, fmt = v => v, def = 0 }) {
  const out = h('span', { class: 'sv' }), i = h('input', { type: 'range', min, max, step });
  i.addEventListener('input', () => { apply(p, +i.value); out.textContent = fmt(+i.value); });
  syncs.push(() => { const v = getp(p, def); i.value = v; out.textContent = fmt(+v); i.style.setProperty('--p', ((v - min) / (max - min)) * 100 + '%'); });
  i.addEventListener('input', () => i.style.setProperty('--p', ((+i.value - min) / (max - min)) * 100 + '%'));
  return h('div', { class: 'sld' }, i, out);
}
function colorPick(p, { none = false, def = '@tx' } = {}) {
  const th = theme(), w = h('div', { class: 'swatches' });
  const items = [];
  if (none) items.push({ v: 'none', el: h('button', { type: 'button', class: 'sw none', title: 'Yo‘q' }) });
  SWATCH_TOKENS.forEach(t => items.push({ v: '@' + t, el: h('button', { type: 'button', class: 'sw', title: TOKEN_NAMES[t], style: { background: th.c[t] } }) }));
  const cust = h('input', { type: 'color', class: 'sw custom', title: 'Boshqa rang' });
  cust.addEventListener('input', () => apply(p, cust.value));
  items.forEach(it => { it.el.addEventListener('click', () => apply(p, it.v)); w.append(it.el); });
  w.append(cust);
  syncs.push(() => {
    const v = getp(p, def);
    items.forEach(it => it.el.classList.toggle('on', it.v === v));
    const isCustom = typeof v === 'string' && v[0] === '#'; cust.classList.toggle('on', isCustom);
    cust.value = isCustom && /^#[0-9a-f]{6}$/i.test(v) ? v : (color(v === 'none' ? '@bg' : v, th).startsWith('#') && color(v === 'none' ? '@bg' : v, th).length === 7 ? color(v === 'none' ? '@bg' : v, th) : '#888888');
  });
  return w;
}
function fontSel() {
  const s = h('select', { class: 'sel' }, h('option', { value: 'H' }, 'Sarlavha shrifti'), h('option', { value: 'B' }, 'Matn shrifti'), ...FONT_LIST.map(f => h('option', { value: f }, f)));
  s.addEventListener('change', () => apply('font', s.value));
  syncs.push(() => { s.value = getp('font', 'B'); });
  return s;
}

// ---------- hizalash ----------
function align(kind) {
  const els = selEls(); if (!els.length) return;
  const box = els.length > 1 ? (() => { const x = Math.min(...els.map(e => e.x)), y = Math.min(...els.map(e => e.y)); return { x, y, w: Math.max(...els.map(e => e.x + e.w)) - x, h: Math.max(...els.map(e => e.y + e.h)) - y }; })() : { x: 0, y: 0, w: W, h: H };
  edit(() => els.forEach(e => {
    if (kind === 'l') e.x = box.x; if (kind === 'c') e.x = box.x + (box.w - e.w) / 2; if (kind === 'r') e.x = box.x + box.w - e.w;
    if (kind === 't') e.y = box.y; if (kind === 'm') e.y = box.y + (box.h - e.h) / 2; if (kind === 'b') e.y = box.y + box.h - e.h;
    e.x = round(e.x, 1); e.y = round(e.y, 1);
  }));
}

// ---------- AI yordamchi (tezkor tugmalar) ----------
function aiSection(scopeText) {
  const b = (op, l) => h('button', { class: 'btn ai-chip', type: 'button', onclick: () => aiSlide(op), html: ic('magic', 14) + ' ' + l });
  return sec('AI yordamchi', h('p', { class: 'mu s', style: { margin: '0 0 10px' } }, scopeText),
    h('div', { class: 'chips' }, b('rewrite', 'Qayta yoz'), b('shorten', 'Qisqartir'), b('expand', 'Kengaytir'), b('fix', 'Imlo'), b('notes', 'Izoh yoz'),
      h('button', { class: 'btn ai-chip', type: 'button', onclick: askCustom, html: ic('text', 14) + ' Boshqa…' })));
}

// ---------- tanlangan element ----------
function elementTab(box) {
  const els = selEls(); if (!els.length) return;
  const single = els.length === 1, el = els[0], types = new Set(els.map(e => e.t));
  const all = [...types];
  box.append(h('div', { class: 'selhead' }, h('b', {}, single ? ({ text: 'Matn', shape: 'Shakl', image: 'Rasm' }[el.t]) : `${els.length} ta element`),
    h('div', { class: 'acts' },
      h('button', { class: 'btn-ic', title: 'Nusxa (Ctrl+D)', onclick: dupSelected, html: ic('copy') }),
      h('button', { class: 'btn-ic danger', title: 'O‘chirish (Del)', onclick: delSelected, html: ic('trash') }))));

  if (all.length === 1 && all[0] === 'text') {
    box.append(
      aiSection('Tanlangan matnga qo‘llanadi'),
      sec('Matn',
        row('Shrift', fontSel()),
        row('O‘lcham', num('fs', { min: 8, max: 400, suffix: 'px' }), h('div', { class: 'seg' }, ...[['fw', 'bold', 'Qalin', 700, 400], ['fi', 'italic', 'Kursiv'], ['u', 'underline', 'Tagiga chizish'], ['up', 'caps', 'KATTA HARF']].map(([p, i, t, on_, off]) => {
          const b = h('button', { type: 'button', title: t, html: ic(i, 16), onclick: () => apply(p, p === 'fw' ? (getp('fw', 400) >= 600 ? 400 : 700) : !getp(p, false)) });
          syncs.push(() => b.classList.toggle('on', p === 'fw' ? getp('fw', 400) >= 600 : !!getp(p, false))); void on_; void off; return b;
        }))),
        row('Hizalash', seg('al', [{ v: 'left', i: 'left', t: 'Chapga' }, { v: 'center', i: 'center', t: 'Markazga' }, { v: 'right', i: 'right', t: 'O‘ngga' }], 'left'),
          seg('va', [{ v: 'top', i: 'align_t', t: 'Tepaga' }, { v: 'middle', i: 'align_m', t: 'O‘rtaga' }, { v: 'bottom', i: 'align_b', t: 'Pastga' }], 'top')),
        row('Rang', colorPick('c', { def: '@tx' }))),
      sec('Oraliq',
        row('Qator', slider('lh', { min: 0.8, max: 2.4, step: 0.05, fmt: v => v.toFixed(2), def: 1.25 })),
        row('Harflar', slider('ls', { min: -3, max: 24, step: 0.5, fmt: v => v + 'px', def: 0 })),
        row('Abzats', slider('ps', { min: 0, max: 60, step: 1, fmt: v => v + 'px', def: 0 }))),
      sec('Ro‘yxat', row('Nuqtali', toggle('bullet', 'list', 'Nuqtali ro‘yxat'), h('div', { style: { flex: 1 } }), colorPick('bc', { def: '@ac' }))));
    if (single) box.append(h('button', { class: 'btn wide', onclick: () => startEdit(el.id), html: ic('text', 16) + ' Matnni tahrirlash (Enter)' }));
  }
  if (all.length === 1 && all[0] === 'shape') {
    const sh = h('button', { class: 'tgl', type: 'button', html: ic('palette', 16) + ' Gradient', onclick: () => edit(() => els.forEach(e => { e.g = e.g ? undefined : ['@ac', '@ac2']; if (e.g) e.ga = 135; }), 'grad') });
    syncs.push(() => sh.classList.toggle('on', !!getp('g', null)));
    box.append(sec('Shakl',
      row('To‘ldirish', colorPick('fill', { none: true, def: '@ac' })),
      row('', sh),
      row('Chiziq', colorPick('stroke', { none: true, def: 'none' })),
      row('Qalinlik', slider('sw', { min: 0, max: 24, step: 1, fmt: v => v + 'px', def: 0 })),
      els.every(e => e.kind === 'rect') ? row('Burchak', slider('rx', { min: 0, max: 200, step: 1, fmt: v => v + 'px', def: 0 })) : null,
      row('Tiniqlik', slider('o', { min: 0.05, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%', def: 1 })),
      row('Soya', toggle('sh', null, 'Soya', 'Soya')),
    ));
  }
  if (all.length === 1 && all[0] === 'image') {
    box.append(sec('Rasm',
      row('Joylash', seg('fit', [{ v: 'cover', l: 'To‘ldirish' }, { v: 'contain', l: 'Sig‘dirish' }], 'cover')),
      row('Burchak', slider('rx', { min: 0, max: 200, step: 1, fmt: v => v + 'px', def: 0 })),
      row('Tiniqlik', slider('o', { min: 0.05, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%', def: 1 })),
      row('Soya', toggle('sh', null, 'Soya', 'Soya')),
      h('button', { class: 'btn wide', onclick: () => pickImageFile(async f => { const r = await readImage(f), id = addAsset(r.src); edit(() => els.forEach(e => { e.src = id; })); }), html: ic('image', 16) + ' Rasmni almashtirish' })));
  }
  if (types.has('text') && types.size > 1) box.append(sec('Umumiy', row('Tiniqlik', slider('o', { min: 0.05, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + '%', def: 1 }))));

  // joylashuv
  const pos = single ? sec('Joylashuv',
    h('div', { class: 'grid4' }, ...[['x', 'X'], ['y', 'Y'], ['w', 'Eni'], ['h', 'Bo‘yi']].map(([p, l]) => h('label', { class: 'mini' }, l, num(p, { min: p === 'x' || p === 'y' ? -3000 : 8, max: 4000 }))),
    ), row('Burilish', num('r', { min: -360, max: 360, suffix: '°' }), slider('r', { min: -180, max: 180, step: 1, fmt: v => '', def: 0 }))) : sec('Joylashuv');
  const al = h('div', { class: 'aligns' }, ...[['l', 'align_l', 'Chapga'], ['c', 'align_c', 'Markazga (gor.)'], ['r', 'align_r', 'O‘ngga'], ['t', 'align_t', 'Tepaga'], ['m', 'align_m', 'Markazga (ver.)'], ['b', 'align_b', 'Pastga']].map(([k, i, t]) => h('button', { class: 'btn-ic', title: t + (single ? ' (slayd bo‘yicha)' : ''), onclick: () => align(k), html: ic(i, 18) })));
  pos.append(al, h('div', { class: 'aligns' }, ...[['front', 'front', 'Eng oldinga'], ['up', 'up', 'Bir oldinga'], ['down', 'down', 'Bir orqaga'], ['back', 'back', 'Eng orqaga']].map(([k, i, t]) => h('button', { class: 'btn-ic', title: t, onclick: () => reorder(k), html: ic(i, 18) }))));
  box.append(pos);
}

// ---------- dizayn ----------
function designTab(box) {
  const th = theme();
  box.append(aiSection('Tanlanmagan bo‘lsa, butun slayd matniga qo‘llanadi'));
  // mavzular
  const tg = h('div', { class: 'theme-grid' }, ...THEMES.map(t => {
    const b = h('button', { class: 'theme-card' + (t.id === th.id ? ' on' : ''), title: t.name, onclick: () => setTheme(t.id) }, thumb(newSlide('title', t, { title: t.name, subtitle: 'Mavzu namunasi', label: '' }), t, {}, 116), h('span', {}, t.name));
    return b;
  }));
  box.append(sec('Mavzu', tg));

  // maketlar
  const lg = h('div', { class: 'layout-grid' }, ...LAYOUTS.map(l => h('button', { class: 'layout-card', title: l.name + ' maketi bilan yangi slayd', onclick: () => addSlide(l.id) },
    thumb(newSlide(l.id, th, {}), th, {}, 116), h('span', {}, l.name))));
  box.append(sec('Yangi slayd (maket)', lg));

  // fon
  const s = slide(), bg = s.bg;
  const kind = !bg ? 'theme' : typeof bg === 'string' ? 'solid' : 'grad';
  const setBg = v => edit(() => { slide().bg = v; }, 'bg');
  const bgRow = h('div', { class: 'seg full' },
    h('button', { class: kind === 'theme' ? 'on' : '', onclick: () => setBg(null) }, 'Mavzu'),
    h('button', { class: kind === 'solid' ? 'on' : '', onclick: () => setBg('@bg') }, 'Yaxlit'),
    h('button', { class: kind === 'grad' ? 'on' : '', onclick: () => setBg({ g: ['@bg', '@ac'], a: 135 }) }, 'Gradient'));
  const bgBox = sec('Slayd foni', bgRow);
  const swatchFor = (get, set) => {
    const w = h('div', { class: 'swatches' });
    SWATCH_TOKENS.forEach(t => w.append(h('button', { class: 'sw' + (get() === '@' + t ? ' on' : ''), title: TOKEN_NAMES[t], style: { background: th.c[t] }, onclick: () => set('@' + t) })));
    const cu = h('input', { type: 'color', class: 'sw custom' + (/^#/.test(get() || '') ? ' on' : ''), value: /^#[0-9a-f]{6}$/i.test(get() || '') ? get() : '#888888' });
    cu.addEventListener('input', () => set(cu.value)); w.append(cu); return w;
  };
  if (kind === 'solid') bgBox.append(row('Rang', swatchFor(() => slide().bg, v => setBg(v))));
  if (kind === 'grad') bgBox.append(row('Dan', swatchFor(() => slide().bg.g[0], v => setBg({ ...slide().bg, g: [v, slide().bg.g[1]] }))), row('Gacha', swatchFor(() => slide().bg.g[1], v => setBg({ ...slide().bg, g: [slide().bg.g[0], v] }))),
    row('Burchak', (() => { const i = h('input', { type: 'range', min: 0, max: 360, step: 5, value: slide().bg.a ?? 135 }); i.addEventListener('input', () => setBg({ ...slide().bg, a: +i.value })); return i; })()));
  box.append(bgBox);

  // o‘tish va izoh
  const tr = h('select', { class: 'sel' }, ...[['none', 'Yo‘q'], ['fade', 'So‘nish'], ['slide', 'Surilish'], ['zoom', 'Kattalashish']].map(([v, l]) => h('option', { value: v }, l)));
  tr.value = s.tr || 'fade'; tr.addEventListener('change', () => edit(() => { slide().tr = tr.value; }, 'tr'));
  const notes = h('textarea', { class: 'notes', rows: 5, placeholder: 'Taqdimot paytida o‘zingizga ko‘rinadigan izohlar…' }); notes.value = s.notes || '';
  notes.addEventListener('input', () => { edit(() => { slide().notes = notes.value; }, 'notes'); });
  box.append(sec('Namoyish', row('O‘tish', tr)), sec('Izohlar (spiker uchun)', notes));
}

function build() {
  if (!root || !S.deck) return;
  syncs = []; sig = signature();
  const top = h('div', { class: 'tabs' },
    h('button', { class: tab === 'design' ? 'on' : '', onclick: () => { tab = 'design'; build(); } }, 'Dizayn'),
    h('button', { class: tab === 'edit' ? 'on' : '', onclick: () => { tab = 'edit'; build(); } }, 'Element'));
  const body = h('div', { class: 'insp-body' });
  if (tab === 'edit') {
    if (S.sel.length) elementTab(body); else body.append(h('div', { class: 'empty' }, h('div', { html: ic('shape', 28) }), h('p', {}, 'Slaydda elementni tanlang yoki yuqoridan yangisini qo‘shing.')));
  } else designTab(body);
  const st = root.querySelector('.insp-body')?.scrollTop || 0;
  root.replaceChildren(top, body); body.scrollTop = tab === sigTab ? st : 0; sigTab = tab;
  sync();
}
let sigTab = 'design';
export { findEl, touch, emit };
