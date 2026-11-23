// Ilova qobig‘i: yo‘naltirish (home / muharrir), yuqori panel, qo‘shish asboblari, saqlash
import { APP_NAME, h, ic, $, toast, uid, debounce, W, H } from './util.js';
import { S, on, emit, openDeck, undo, redo, addEl, theme, slide, select, touch, insertSlides } from './model.js';
import { loadWebFonts } from './themes.js';
import { saveDeck, loadDeck } from './store.js';
import { initCanvas, fit, startEdit, pickImageFile, addImageFile, endEdit } from './canvas.js';
import { initInspector } from './inspector.js';
import { initRail } from './rail.js';
import { renderHome } from './home.js';
import { present } from './present.js';
import { exportPPTX, exportPDF, exportJSON } from './export.js';
import { openGenerate, aiSlide, askCustom, buildSlides } from './ai.js';
import * as Cloud from './cloud.js';

const app = $('#app');
let editorEl = null, saveState = 'saved';

// ---------- tashqi ko‘rinish (yorug‘/qorong‘i) ----------
function applyUI(m) { document.documentElement.dataset.ui = m; try { localStorage.setItem('slaydo-ui', m); } catch { /* */ } $('meta[name=theme-color]')?.setAttribute('content', m === 'dark' ? '#0d0e14' : '#f4f5fa'); }
function initUI() {
  let m; try { m = localStorage.getItem('slaydo-ui'); } catch { /* */ }
  applyUI(m || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
}
export const toggleUI = () => applyUI(document.documentElement.dataset.ui === 'dark' ? 'light' : 'dark');

// ---------- yo‘naltirish ----------
export const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
async function route() {
  document.querySelectorAll('.modal-back, #present, .pop').forEach(n => n.remove());
  const m = location.hash.match(/^#\/d\/(.+)$/);
  if (!m) { await flushSave(); S.deck = null; app.dataset.view = 'home'; return renderHome(app, { go, toggleUI }); }
  const rec = await loadDeck(m[1]);
  if (!rec) { toast('Taqdimot topilmadi', 'err'); return go('#/'); }
  app.dataset.view = 'editor'; app.className = 'editor-view'; buildEditor(); app.replaceChildren(editorEl); openDeck(rec.deck, rec.assets || {});
  $('#title-in').value = rec.deck.title; setSave('saved'); requestAnimationFrame(fit);
}

// ---------- saqlash ----------
const setSave = s => { saveState = s; const e = $('#save-st'); if (e) { e.textContent = s === 'saved' ? 'Saqlandi' : s === 'saving' ? 'Saqlanmoqda…' : 'Saqlab bo‘lmadi'; e.dataset.s = s; } };
let pending = false;
const doSave = async () => { if (!S.deck) return; pending = false; try { await saveDeck(S.deck, S.assets); setSave('saved'); } catch { setSave('err'); } };
const saveSoon = debounce(doSave, 700);
async function flushSave() { if (pending && S.deck) await doSave(); }
on('change', () => { if (!S.deck) return; pending = true; setSave('saving'); saveSoon(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
addEventListener('pagehide', flushSave);

// ---------- yordamchi menyular ----------
function popover(anchor, items, align = 'left') {
  document.querySelectorAll('.pop').forEach(n => n.remove());
  const pop = h('div', { class: 'pop', role: 'menu' }, ...items.map(it => it.sep ? h('hr') : h('button', { role: 'menuitem', onclick: () => { pop.remove(); it.fn(); }, html: (it.i ? ic(it.i, 16) : '') + `<span>${it.l}</span>` + (it.s ? `<small>${it.s}</small>` : '') })));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth;
  pop.style.top = r.bottom + 8 + 'px'; pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, align === 'right' ? r.right - pw : r.left)) + 'px';
  setTimeout(() => { const close = e => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('pointerdown', close, true); } }; document.addEventListener('pointerdown', close, true); }, 0);
}

// ---------- element qo‘shish ----------
const ID = () => uid('e');
function addText() {
  const el = { id: ID(), t: 'text', x: 320, y: 300, w: 640, h: 80, text: 'Matn yozing', fs: 40, fw: 600, font: 'B', c: '@tx', al: 'left', va: 'top', lh: 1.25 };
  addEl(el); setTimeout(() => startEdit(el.id), 30);
}
const SHAPES = [['rect', 'To‘rtburchak', 280, 180], ['rrect', 'Yumaloq to‘rtburchak', 280, 180], ['ellipse', 'Doira / ellips', 220, 220], ['triangle', 'Uchburchak', 220, 200], ['diamond', 'Romb', 220, 220], ['star', 'Yulduz', 220, 220], ['arrow', 'Strelka', 300, 120], ['line', 'Chiziq', 360, 12]];
function addShape(kind, w, hh) {
  const rr = kind === 'rrect';
  addEl({ id: ID(), t: 'shape', kind: rr ? 'rect' : kind, rx: rr ? 28 : 0, x: Math.round((W - w) / 2), y: Math.round((H - hh) / 2), w, h: hh, fill: '@ac', ...(kind === 'line' ? { sw: 6, fill: '@ac' } : {}) });
}
function shapeMenu(e) { popover(e.currentTarget, SHAPES.map(([k, l, w, hh]) => ({ l, i: 'shape', fn: () => addShape(k, w, hh) }))); }

// ---------- muharrir qobig‘i ----------
function buildEditor() {
  if (editorEl) return;
  const title = h('input', { id: 'title-in', class: 'title-in', 'aria-label': 'Taqdimot nomi', maxlength: 80, placeholder: 'Taqdimot nomi' });
  title.addEventListener('input', () => { S.deck.title = title.value; touch(); emit('change'); });
  const tb = (icon, label, fn, cls = '') => h('button', { class: 'tool ' + cls, title: label, 'aria-label': label, onclick: fn, html: ic(icon, 18) + `<span>${label}</span>` });
  const exportBtn = h('button', { class: 'btn', onclick: e => popover(e.currentTarget, [
    { l: 'PowerPoint (.pptx)', s: 'PowerPoint’da tahrirlash mumkin', i: 'download', fn: async () => { try { toast('PPTX tayyorlanmoqda…'); endEdit(); await exportPPTX(); toast('PPTX yuklab olindi', 'ok'); } catch (err) { console.error(err); toast('PPTX xatosi: ' + err.message, 'err'); } } },
    { l: 'PDF', s: 'Chop etish → PDF sifatida saqlash', i: 'file', fn: () => { endEdit(); exportPDF(); } },
    { sep: 1 }, { l: 'Zaxira (.json)', s: 'Keyin qayta ochish uchun', i: 'copy', fn: () => exportJSON() },
  ], 'right'), html: ic('download', 16) + ' <span class="hide-s">Eksport</span>' });
  const aiBtn = h('button', { class: 'btn ai-btn', onclick: e => popover(e.currentTarget, [
    { l: 'Yangi slaydlar (AI)', s: 'Mavzu yoki fayl asosida 3 variant', i: 'sparkle', fn: () => { endEdit(); openGenerate({ mode: 'append', onPick: ({ slides }) => insertSlides(slides) }); } },
    { sep: 1 },
    { l: 'Qayta yozish', s: 'Tanlangan matn yoki butun slayd', i: 'magic', fn: () => aiSlide('rewrite') },
    { l: 'Qisqartirish', i: 'magic', fn: () => aiSlide('shorten') },
    { l: 'Kengaytirish', i: 'magic', fn: () => aiSlide('expand') },
    { l: 'Imlo va grammatika', i: 'magic', fn: () => aiSlide('fix') },
    { l: 'Tarjima: o‘zbekcha', i: 'magic', fn: () => aiSlide('translate_uz') },
    { l: 'Tarjima: ruscha', i: 'magic', fn: () => aiSlide('translate_ru') },
    { l: 'Tarjima: inglizcha', i: 'magic', fn: () => aiSlide('translate_en') },
    { l: 'Spiker izohini yozish', i: 'notes', fn: () => aiSlide('notes') },
    { l: 'O‘z buyrug‘im…', i: 'text', fn: askCustom },
    ...(Cloud.isIn() ? [{ sep: 1 }, { l: 'Hisobdan chiqish (' + Cloud.who() + ')', i: 'lock', fn: () => { Cloud.signOut(); toast('Hisobdan chiqildi'); } }] : []),
  ], 'right'), html: ic('sparkle', 16) + ' <span class="hide-s">AI</span>' });
  const top = h('header', { class: 'topbar' },
    h('button', { class: 'btn-ic', title: 'Bosh sahifa', 'aria-label': 'Bosh sahifa', onclick: () => go('#/'), html: ic('home') }),
    h('div', { class: 'brand-s' }, h('span', { class: 'logo sm', html: ic('layout', 16) })),
    title, h('span', { id: 'save-st', class: 'save-st' }),
    h('div', { class: 'sp' }),
    h('button', { class: 'btn-ic', title: 'Bekor qilish (Ctrl+Z)', onclick: undo, html: ic('undo') }),
    h('button', { class: 'btn-ic', title: 'Qaytarish (Ctrl+Y)', onclick: redo, html: ic('redo') }),
    h('button', { class: 'btn-ic hide-xs', title: 'Yorug‘/qorong‘i', onclick: toggleUI, html: ic('moon') }),
    h('button', { class: 'btn only-s', title: 'Xossalar paneli', onclick: () => editorEl.classList.toggle('insp-open'), html: ic('palette', 16) + ' <span class="hide-s">Panel</span>' }),
    aiBtn, exportBtn,
    h('button', { class: 'big sm', onclick: () => { endEdit(); present(S.cur); }, html: ic('play', 14) + ' <span class="hide-s">Namoyish</span>' }));

  const tools = h('div', { class: 'tools' },
    tb('text', 'Matn', addText), tb('shape', 'Shakl', shapeMenu), tb('image', 'Rasm', () => pickImageFile(addImageFile)),
    h('i', { class: 'vr' }), tb('fullscreen', 'Moslash', fit, 'only-ic'));
  const area = h('div', { id: 'canvas-area' });
  const center = h('main', { class: 'center' }, tools, area);
  const rail = h('aside', { id: 'rail', 'aria-label': 'Slaydlar' });
  const insp = h('aside', { id: 'inspector', 'aria-label': 'Xossalar' });
  editorEl = h('div', { id: 'editor' }, top, rail, center, insp);
  app.replaceChildren(editorEl);   // o‘lchamlar to‘g‘ri hisoblanishi uchun avval DOM ga qo‘yamiz
  initCanvas(area); initRail(rail); initInspector(insp);
  loadWebFonts();
}
on('open', () => { /* yangi taqdimot ochilganda yordamchi holatni tiklash */ });
addEventListener('present-exit', () => { emit('slide'); emit('select'); emit('change', { full: true }); });

// ---------- ishga tushirish ----------
initUI(); loadWebFonts();
addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
export { APP_NAME, theme, slide, select, saveState, buildSlides };
