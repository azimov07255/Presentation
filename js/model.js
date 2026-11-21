// Holat: joriy taqdimot, tanlov, tarix (undo/redo) va hodisalar
import { uid, json, clamp } from './util.js';
import { themeById } from './themes.js';
import { newSlide, redecorate } from './layouts.js';

export const S = { deck: null, assets: {}, cur: 0, sel: [], hist: [], fut: [], lastKey: '', lastAt: 0, clip: null };
const L = {};
export const on = (ev, f) => { (L[ev] ||= []).push(f); return () => { L[ev] = L[ev].filter(x => x !== f); }; };
export const emit = (ev, d) => (L[ev] || []).slice().forEach(f => f(d));

export const theme = () => themeById(S.deck.theme);
export const slide = () => S.deck?.slides[S.cur];
export const selEls = () => { const s = slide(); return s ? s.els.filter(e => S.sel.includes(e.id)) : []; };
export const findEl = id => slide()?.els.find(e => e.id === id);

export function newDeck(themeId, title = 'Yangi taqdimot') {
  return { v: 1, id: uid('d'), title, theme: themeId, slides: [], created: Date.now(), updated: Date.now() };
}

export function openDeck(deck, assets = {}) {
  S.deck = deck; S.assets = assets; S.cur = 0; S.sel = []; S.hist = []; S.fut = []; S.lastKey = '';
  emit('open'); emit('slide'); emit('change', { full: true });
}

// ---- tarix ----
const MAX_HIST = 100;
export function snap(key = '') {
  const now = Date.now();
  if (key && key === S.lastKey && now - S.lastAt < 1200) { S.lastAt = now; return; }
  S.hist.push(json({ d: S.deck, cur: S.cur })); if (S.hist.length > MAX_HIST) S.hist.shift();
  S.fut = []; S.lastKey = key; S.lastAt = now;
}
function restore(str) {
  const o = JSON.parse(str); S.deck = o.d; S.cur = clamp(o.cur, 0, S.deck.slides.length - 1);
  const ids = new Set(slide().els.map(e => e.id)); S.sel = S.sel.filter(i => ids.has(i));
  emit('slide'); emit('select'); emit('change', { full: true });
}
export function undo() { if (!S.hist.length) return; S.fut.push(json({ d: S.deck, cur: S.cur })); restore(S.hist.pop()); S.lastKey = ''; }
export function redo() { if (!S.fut.length) return; S.hist.push(json({ d: S.deck, cur: S.cur })); restore(S.fut.pop()); S.lastKey = ''; }

// Tarixga yozib, o‘zgartirish kiritadi
export function edit(fn, key = '') { snap(key); fn(); touch(); emit('change'); }
export function touch() { S.deck.updated = Date.now(); }

// ---- tanlov ----
export function select(ids, additive = false) {
  ids = [].concat(ids || []);
  S.sel = additive ? [...new Set([...S.sel, ...ids])] : ids;
  emit('select');
}
export function toggleSel(id) { S.sel = S.sel.includes(id) ? S.sel.filter(x => x !== id) : [...S.sel, id]; emit('select'); }

export function goSlide(i) {
  i = clamp(i, 0, S.deck.slides.length - 1);
  if (i === S.cur && S.sel.length === 0) return;
  S.cur = i; S.sel = []; emit('slide'); emit('select'); emit('change');
}

// ---- slaydlar ----
export function addSlide(layoutId = 'bullets', at = S.cur + 1, d) {
  edit(() => { const s = newSlide(layoutId, theme(), d); S.deck.slides.splice(at, 0, s); S.cur = at; S.sel = []; });
  emit('slide'); emit('select');
}
export function dupSlide(i = S.cur) {
  edit(() => {
    const c = JSON.parse(json(S.deck.slides[i])); c.id = uid('s'); c.els.forEach(e => { e.id = uid('e'); });
    S.deck.slides.splice(i + 1, 0, c); S.cur = i + 1; S.sel = [];
  });
  emit('slide'); emit('select');
}
export function delSlide(i = S.cur) {
  if (S.deck.slides.length <= 1) { edit(() => { S.deck.slides[0] = newSlide('blank', theme()); S.sel = []; }); emit('slide'); emit('select'); return; }
  edit(() => { S.deck.slides.splice(i, 1); S.cur = clamp(S.cur > i || S.cur === S.deck.slides.length ? S.cur - 1 : S.cur, 0, S.deck.slides.length - 1); S.sel = []; });
  emit('slide'); emit('select');
}
export function moveSlide(from, to) {
  if (from === to) return;
  edit(() => { const [s] = S.deck.slides.splice(from, 1); S.deck.slides.splice(to, 0, s); S.cur = to; });
  emit('slide');
}

// ---- elementlar ----
export function addEl(el, select_ = true) {
  edit(() => { slide().els.push(el); });
  if (select_) select([el.id]);
}
export function delSelected() {
  if (!S.sel.length) return;
  edit(() => { const s = slide(); s.els = s.els.filter(e => !S.sel.includes(e.id)); S.sel = []; });
  emit('select');
}
export function dupSelected() {
  const els = selEls(); if (!els.length) return;
  const copies = els.map(e => ({ ...JSON.parse(json(e)), id: uid('e'), x: e.x + 24, y: e.y + 24 }));
  edit(() => { slide().els.push(...copies); });
  select(copies.map(c => c.id));
}
export function copySel() { const els = selEls(); if (els.length) S.clip = JSON.parse(json(els)); return !!els.length; }
export function pasteClip() {
  if (!S.clip) return false;
  const copies = S.clip.map(e => ({ ...JSON.parse(json(e)), id: uid('e'), x: e.x + 24, y: e.y + 24 }));
  S.clip = copies.map(c => ({ ...c })); // keyingi qo‘yish yana siljiydi
  edit(() => { slide().els.push(...copies); });
  select(copies.map(c => c.id)); return true;
}
export function reorder(dir) { // 'front' | 'back' | 'up' | 'down'
  const els = selEls(); if (!els.length) return;
  edit(() => {
    const s = slide(); const ids = new Set(els.map(e => e.id));
    if (dir === 'front') s.els = [...s.els.filter(e => !ids.has(e.id)), ...els];
    else if (dir === 'back') s.els = [...els, ...s.els.filter(e => !ids.has(e.id))];
    else {
      const a = s.els; const step = dir === 'up' ? 1 : -1;
      const idx = a.map((e, i) => ids.has(e.id) ? i : -1).filter(i => i >= 0);
      (step > 0 ? idx.reverse() : idx).forEach(i => { const j = i + step; if (j >= 0 && j < a.length && !ids.has(a[j].id)) [a[i], a[j]] = [a[j], a[i]]; });
    }
  });
}

export function addAsset(dataUrl) { const id = uid('a'); S.assets[id] = dataUrl; return id; }

// Mavzuni almashtirish: ranglar tokenlar orqali o‘zi yangilanadi
export function setTheme(id) {
  edit(() => { S.deck.theme = id; const th = themeById(id); S.deck.slides.forEach(s => redecorate(s, th)); S.sel = []; });
  emit('slide'); emit('select');
}
