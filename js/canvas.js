// Muharrir maydoni: tanlash, ko‘chirish, o‘lchamini o‘zgartirish, aylantirish, matnni joyida tahrirlash
import { W, H, h, clamp, round, toast } from './util.js';
import { S, on, emit, slide, theme, select, toggleSel, snap, touch, edit, findEl, selEls, addEl, addAsset, delSelected, dupSelected, copySel, pasteClip, undo, redo } from './model.js';
import { slideNode } from './render.js';
import { uid } from './util.js';

const view = { k: 1 };
let area, scaler, stage, layer, selLayer, guideLayer, marq;
let editing = null;      // { id, node }
let drag = null;         // joriy sudrash holati
let inspectorHook = () => {};
export const setInspectorHook = f => { inspectorHook = f; };
export const isEditingText = () => !!editing;

export function initCanvas(root) {
  area = root;
  scaler = h('div', { id: 'scaler' });
  stage = h('div', { id: 'stage' });
  selLayer = h('div', { id: 'sel-layer' });
  guideLayer = h('div', { id: 'guide-layer' });
  marq = h('div', { id: 'marquee', hidden: true });
  layer = h('div', { id: 'slide-layer' });
  stage.append(layer, selLayer, guideLayer, marq);
  scaler.append(stage); area.append(scaler);

  new ResizeObserver(fit).observe(area);
  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  document.addEventListener('keydown', onKey);
  document.addEventListener('paste', onPaste);
  area.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); area.classList.add('drop'); } });
  area.addEventListener('dragleave', () => area.classList.remove('drop'));
  area.addEventListener('drop', e => {
    area.classList.remove('drop');
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
    if (!files.length) return; e.preventDefault(); files.forEach(f => addImageFile(f));
  });

  on('change', () => { if (!editing) render(); });
  on('select', () => { if (!editing) drawSel(); });
  on('slide', () => { endEdit(true); render(); });
  fit(); render();
}

export function fit() {
  if (!area) return;
  const r = area.getBoundingClientRect(), pad = r.width < 700 ? 16 : 48;
  const k = clamp(Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H), 0.1, 2);
  view.k = k;
  scaler.style.width = W * k + 'px'; scaler.style.height = H * k + 'px';
  stage.style.transform = `scale(${k})`; stage.style.setProperty('--k', 1 / k);
  drawSel();
}

export function render() {
  if (!S.deck || !stage) return;
  const sn = slideNode(slide(), theme(), S.assets, 'edit');
  layer.replaceChildren(sn);
  drawSel();
}

// ---------- koordinatalar ----------
const pt = e => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / view.k, y: (e.clientY - r.top) / view.k }; };
const nodeOf = id => layer.querySelector(`.el[data-id="${id}"]`);
const rad = d => d * Math.PI / 180;

// ---------- tanlov qatlami ----------
const HANDLES = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];
export function drawSel() {
  if (!selLayer) return;
  selLayer.replaceChildren();
  if (editing) return;
  const els = selEls();
  els.forEach(el => {
    const o = h('div', { class: 'selo', style: { left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', transform: `rotate(${el.r || 0}deg)` } });
    if (els.length === 1) {
      HANDLES.forEach(([n, fx, fy]) => o.append(h('div', { class: 'hd', 'data-h': n, style: { left: fx * 100 + '%', top: fy * 100 + '%', cursor: n + '-resize' } })));
      o.append(h('div', { class: 'rot-line' }), h('div', { class: 'hd rot', 'data-h': 'rot', title: 'Aylantirish' }));
    }
    selLayer.append(o);
  });
  if (els.length > 1) {
    const b = bounds(els);
    selLayer.append(h('div', { class: 'selo group', style: { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' } }));
  }
}
function bounds(els) {
  const x1 = Math.min(...els.map(e => e.x)), y1 = Math.min(...els.map(e => e.y));
  const x2 = Math.max(...els.map(e => e.x + e.w)), y2 = Math.max(...els.map(e => e.y + e.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ---------- sichqoncha / sensor ----------
function onDown(e) {
  if (e.button > 0 || editing && e.target.closest('.tx[contenteditable]')) return;
  if (editing) endEdit();
  const p = pt(e), hd = e.target.closest('[data-h]');
  if (hd) {
    const el = selEls()[0]; if (!el) return;
    e.preventDefault();
    drag = { type: hd.dataset.h === 'rot' ? 'rot' : 'resize', h: hd.dataset.h, el, o: { x: el.x, y: el.y, w: el.w, h: el.h, r: el.r || 0 }, p, started: false };
    return;
  }
  const node = e.target.closest('.el');
  if (node && !node.closest('#sel-layer')) {
    const id = node.dataset.id;
    if (e.shiftKey) toggleSel(id); else if (!S.sel.includes(id)) select([id]);
    if (!S.sel.includes(id)) return;
    e.preventDefault();
    drag = { type: 'move', p, id, slot: node.classList.contains('el-image') && node.querySelector('.slot'), orig: new Map(selEls().map(x => [x.id, { x: x.x, y: x.y }])), started: false };
    return;
  }
  // bo‘sh joy: marquee
  if (!e.shiftKey) select([]);
  drag = { type: 'marq', p, base: e.shiftKey ? [...S.sel] : [], started: false };
 
}

function onMove(e) {
  if (!drag) return;
  const p = pt(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;
  if (!drag.started) { if (Math.hypot(dx, dy) * view.k < 3) return; drag.started = true; if (drag.type !== 'marq') snap(); }
  if (drag.type === 'move') doMove(dx, dy, e);
  else if (drag.type === 'resize') doResize(dx, dy, e);
  else if (drag.type === 'rot') doRotate(p, e);
  else doMarquee(p);
}

function otherCandidates() {
  const ids = new Set(S.sel);
  return slide().els.filter(o => !ids.has(o.id) && o.kind !== 'glow' && !(o.w > W * .9 && o.h > H * .9));
}
function doMove(dx, dy, e) {
  const els = selEls(), o = drag.orig;
  const first = o.get(els[0].id);
  const b = bounds(els.map(el => ({ x: o.get(el.id).x, y: o.get(el.id).y, w: el.w, h: el.h })));
  let sx = 0, sy = 0, gx = null, gy = null;
  if (!e.altKey) {
    const th = 6 / view.k, oth = otherCandidates();
    const xs = [0, W / 2, W, 96, W - 96, ...oth.flatMap(q => [q.x, q.x + q.w / 2, q.x + q.w])];
    const ys = [0, H / 2, H, 72, H - 72, ...oth.flatMap(q => [q.y, q.y + q.h / 2, q.y + q.h])];
    let bx = th + 1, by = th + 1;
    for (const m of [b.x + dx, b.x + dx + b.w / 2, b.x + dx + b.w]) for (const c of xs) { const d = c - m; if (Math.abs(d) < bx) { bx = Math.abs(d); sx = d; gx = c; } }
    for (const m of [b.y + dy, b.y + dy + b.h / 2, b.y + dy + b.h]) for (const c of ys) { const d = c - m; if (Math.abs(d) < by) { by = Math.abs(d); sy = d; gy = c; } }
    if (bx > th) { sx = 0; gx = null; } if (by > th) { sy = 0; gy = null; }
  }
  if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) { dy = 0; sy = 0; gy = null; } else { dx = 0; sx = 0; gx = null; } }
  els.forEach(el => {
    const s = o.get(el.id); el.x = round(s.x + dx + sx, 1); el.y = round(s.y + dy + sy, 1);
    const n = nodeOf(el.id); if (n) { n.style.left = el.x + 'px'; n.style.top = el.y + 'px'; }
  });
  void first; drawSel(); showGuides(gx, gy);
}
function showGuides(gx, gy) {
  guideLayer.replaceChildren();
  if (gx != null) guideLayer.append(h('div', { class: 'gl v', style: { left: gx + 'px' } }));
  if (gy != null) guideLayer.append(h('div', { class: 'gl hz', style: { top: gy + 'px' } }));
}

function doResize(dx, dy, e) {
  const { el, o } = drag, hn = drag.h, a = rad(o.r), cos = Math.cos(a), sin = Math.sin(a);
  const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
  let l = -o.w / 2, r = o.w / 2, t = -o.h / 2, b = o.h / 2;
  const hasW = hn.includes('w'), hasE = hn.includes('e'), hasN = hn.includes('n'), hasS = hn.includes('s');
  if (hasW) l += lx; if (hasE) r += lx; if (hasN) t += ly; if (hasS) b += ly;
  const MIN = 12, ratio = o.w / o.h, lock = (e.shiftKey || el.t === 'image') && hn.length === 2;
  if (lock) {
    let nw = r - l; if (nw < MIN) nw = MIN; const nh = nw / ratio;
    if (hasW) l = r - nw; else r = l + nw;
    if (hasN) t = b - nh; else b = t + nh;
  } else {
    if (r - l < MIN) { if (hasE) r = l + MIN; else l = r - MIN; }
    if (b - t < MIN) { if (hasS) b = t + MIN; else t = b - MIN; }
  }
  const w = r - l, hh = b - t, cxl = (l + r) / 2, cyl = (t + b) / 2;
  const cx = o.x + o.w / 2 + cxl * cos - cyl * sin, cy = o.y + o.h / 2 + cxl * sin + cyl * cos;
  el.w = round(w, 1); el.h = round(hh, 1); el.x = round(cx - w / 2, 1); el.y = round(cy - hh / 2, 1);
  const n = nodeOf(el.id); if (n) { Object.assign(n.style, { left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px' }); if (el.t === 'shape') { n.innerHTML = ''; n.insertAdjacentHTML('afterbegin', shapeHTML(el)); } }
  drawSel(); inspectorHook();
}
import { shapeSVG } from './render.js';
const shapeHTML = el => shapeSVG(el, theme());

function doRotate(p, e) {
  const { el, o } = drag, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  let ang = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
  ang = ((ang % 360) + 360) % 360;
  if (e.shiftKey) ang = Math.round(ang / 15) * 15; else for (const s of [0, 45, 90, 135, 180, 225, 270, 315, 360]) if (Math.abs(ang - s) < 3) ang = s % 360;
  el.r = round(ang, 1);
  const n = nodeOf(el.id); if (n) n.style.transform = `rotate(${el.r}deg)`;
  drawSel(); inspectorHook();
}

function doMarquee(p) {
  const x = Math.min(p.x, drag.p.x), y = Math.min(p.y, drag.p.y), w = Math.abs(p.x - drag.p.x), hh = Math.abs(p.y - drag.p.y);
  marq.hidden = false; Object.assign(marq.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
  const hit = slide().els.filter(el => el.kind !== 'glow' && el.x < x + w && el.x + el.w > x && el.y < y + hh && el.y + el.h > y && !(el.w > W * .9 && el.h > H * .9)).map(e => e.id);
  S.sel = [...new Set([...drag.base, ...hit])]; drawSel(); emit('select-live');
}

function onUp() {
  if (!drag) return;
  const d = drag; drag = null; marq.hidden = true; guideLayer.replaceChildren();
  if (d.started && d.type !== 'marq') { touch(); emit('change'); }
  else if (d.type === 'marq' && d.started) emit('select');
  else if (d.type === 'move' && !d.started) {
    const now = Date.now(), dbl = lastTap.id === d.id && now - lastTap.t < 380;
    lastTap = dbl ? { id: '', t: 0 } : { id: d.id, t: now };
    if (d.slot) pickImageFile(f => fillSlot(d.id, f));
    else if (dbl) openElement(d.id);
  }
}
let lastTap = { id: '', t: 0 };

function openElement(id) {
  const el = findEl(id); if (!el) return;
  if (el.t === 'text') startEdit(el.id);
  else if (el.t === 'image' && el.src) pickImageFile(f => fillSlot(el.id, f));
}

// ---------- matnni joyida tahrirlash ----------
export function startEdit(id) {
  const el = findEl(id); if (!el || el.t !== 'text') return;
  endEdit(); select([id]);
  const node = nodeOf(id)?.querySelector('.tx'); if (!node) return;
  snap('text:' + id);
  const box = nodeOf(id); delete box.dataset.empty;
  node.classList.add('editing'); if (el.bullet) node.classList.add('bl');
  node.textContent = el.text || '';
  try { node.contentEditable = 'plaintext-only'; } catch { /* */ }
  if (node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';
  editing = { id, node, el };
  selLayer.replaceChildren(h('div', { class: 'selo editing', style: { left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', transform: `rotate(${el.r || 0}deg)` } }));
  node.focus();
  const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(rg);
  node.addEventListener('input', onEditInput);
  node.addEventListener('blur', onEditBlur);
  node.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  node.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); endEdit(); } e.stopPropagation(); });
}
function onEditInput() {
  if (!editing) return; const { node, el } = editing;
  // Matnning haqiqiy balandligi (qator balandligi bo‘yicha): faqat u quti balandligidan oshsa quti kengayadi
  const prev = node.style.height; node.style.height = 'auto';
  const natural = Math.ceil(node.offsetHeight); node.style.height = prev;
  if (natural > el.h + 1) {
    el.h = natural; const b = nodeOf(el.id); if (b) b.style.height = el.h + 'px';
    const so = selLayer.firstChild; if (so) so.style.height = el.h + 'px';
  }
}
function onEditBlur() { endEdit(); }
export function endEdit(silent = false) {
  if (!editing) return;
  const { node, el } = editing; editing = null;
  node.removeEventListener('blur', onEditBlur);
  let t = node.innerText.replace(/​/g, '').replace(/\r/g, '');
  t = t.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
  if (t !== (el.text || '')) { el.text = t; touch(); }
  if (!silent) { emit('change'); emit('select'); }
}

// ---------- rasm ----------
export function pickImageFile(cb) {
  const inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
  inp.addEventListener('change', () => { if (inp.files[0]) cb(inp.files[0]); inp.remove(); });
  document.body.append(inp); inp.click();
}
export function readImage(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Faylni o‘qib bo‘lmadi'));
    fr.onload = () => {
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') return img(fr.result, 0, 0, true);
      img(fr.result);
    };
    function img(src, w0, h0, raw) {
      const im = new Image();
      im.onerror = () => rej(new Error('Rasm formati qo‘llab-quvvatlanmaydi'));
      im.onload = () => {
        const nw = im.naturalWidth || 800, nh = im.naturalHeight || 600;
        if (raw) return res({ src, w: nw, h: nh });
        const k = Math.min(1, 1920 / Math.max(nw, nh)), cw = Math.round(nw * k), ch = Math.round(nh * k);
        const c = h('canvas'); c.width = cw; c.height = ch;
        const g = c.getContext('2d'); if (file.type !== 'image/png') { g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); }
        g.drawImage(im, 0, 0, cw, ch);
        res({ src: file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88), w: cw, h: ch });
      };
      im.src = src;
    }
    fr.readAsDataURL(file);
  });
}
export async function addImageFile(file) {
  try {
    const r = await readImage(file), id = addAsset(r.src);
    const k = Math.min(1, 760 / r.w, 460 / r.h), w = Math.round(r.w * k), hh = Math.round(r.h * k);
    // tanlangan bo‘sh rasm joyi bo‘lsa — shuni to‘ldiramiz
    const slot = selEls().find(e => e.t === 'image' && !e.src);
    if (slot) return fillSlot(slot.id, file, r, id);
    addEl({ id: uid('e'), t: 'image', x: Math.round((W - w) / 2), y: Math.round((H - hh) / 2), w, h: hh, src: id, fit: 'cover', rx: 0 });
  } catch (e) { toast(e.message, 'err'); }
}
async function fillSlot(elId, file, r, aid) {
  try {
    r ||= await readImage(file); aid ||= addAsset(r.src);
    edit(() => { const el = findEl(elId); if (el) { el.src = aid; el.fit = el.fit || 'cover'; } });
  } catch (e) { toast(e.message, 'err'); }
}

// ---------- almashish buferi va klaviatura ----------
function onPaste(e) {
  if (editing || isTyping(e.target) || !location.hash.startsWith('#/d/')) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); files.forEach(addImageFile); }
}
export const isTyping = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function onKey(e) {
  if (!S.deck || !location.hash.startsWith('#/d/') || document.querySelector('.modal-back, #present')) return;
  if (isTyping(e.target)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'c') { if (copySel()) { e.preventDefault(); toast('Nusxalandi'); } return; }
  if (mod && k === 'x') { if (copySel()) { e.preventDefault(); delSelected(); } return; }
  if (mod && k === 'v') { if (S.clip) { e.preventDefault(); pasteClip(); } return; }
  if (mod && k === 'd') { e.preventDefault(); dupSelected(); return; }
  if (mod && k === 'a') { e.preventDefault(); select(slide().els.filter(x => x.kind !== 'glow').map(x => x.id)); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { if (S.sel.length) { e.preventDefault(); delSelected(); } return; }
  if (e.key === 'Escape') { select([]); return; }
  if (e.key === 'Enter' && S.sel.length === 1) { const el = selEls()[0]; if (el.t === 'text') { e.preventDefault(); startEdit(el.id); } return; }
  if (e.key.startsWith('Arrow') && S.sel.length) {
    e.preventDefault(); const st = e.shiftKey ? 10 : 1, els = selEls();
    snap('nudge');
    els.forEach(el => { if (e.key === 'ArrowLeft') el.x -= st; if (e.key === 'ArrowRight') el.x += st; if (e.key === 'ArrowUp') el.y -= st; if (e.key === 'ArrowDown') el.y += st; });
    touch(); emit('change');
  }
}
