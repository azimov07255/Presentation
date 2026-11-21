// Namoyish rejimi: to‘liq ekran, o‘tish animatsiyalari, izohlar, klaviatura va suruv (swipe)
import { W, H, h, ic, clamp } from './util.js';
import { S, theme } from './model.js';
import { slideNode } from './render.js';

export function present(start = 0) {
  if (document.getElementById('present')) return;
  const slides = S.deck.slides, th = theme(), assets = S.assets;
  let i = clamp(start, 0, slides.length - 1), notesOn = false, black = false, idle;

  const frame = h('div', { class: 'pframe' });
  const bar = h('div', { class: 'pbar' });
  const prog = h('div', { class: 'pprog' }, h('i'));
  const notes = h('div', { class: 'pnotes', hidden: true });
  const cnt = h('span', { class: 'pcount' });
  const ov = h('div', { id: 'present', tabindex: -1 }, frame, notes, bar, prog);
  const btn = (icon, title, fn) => h('button', { class: 'btn-ic', title, 'aria-label': title, onclick: e => { e.stopPropagation(); fn(); }, html: ic(icon, 20) });
  bar.append(btn('chevron', 'Oldingi', () => go(i - 1)), cnt, btn('chevron', 'Keyingi', () => go(i + 1)),
    h('span', { class: 'sp' }), btn('notes', 'Izohlar (N)', toggleNotes), btn('fullscreen', 'To‘liq ekran (F)', fs), btn('close', 'Chiqish (Esc)', exit));
  bar.children[0].style.transform = 'rotate(180deg)';
  document.body.append(ov);

  function layout() {
    const k = Math.min(innerWidth / W, innerHeight / H);
    frame.style.transform = `translate(-50%,-50%) scale(${k})`;
  }
  function show(n, dir = 1, first = false) {
    const s = slides[n], node = slideNode(s, th, assets, 'show');
    node.classList.add('pslide');
    const old = frame.querySelector('.pslide:not(.leaving)'), tr = first ? 'none' : (s.tr || 'fade');
    if (old) { old.classList.add('leaving'); setTimeout(() => old.remove(), 520); }
    if (tr !== 'none') node.classList.add('in-' + tr + (dir < 0 ? '-back' : ''));
    frame.append(node);
    cnt.textContent = `${n + 1} / ${slides.length}`;
    prog.firstChild.style.width = ((n + 1) / slides.length) * 100 + '%';
    notes.textContent = s.notes || 'Bu slayd uchun izoh yo‘q.';
  }
  function go(n) { n = clamp(n, 0, slides.length - 1); if (n === i) return; const dir = n > i ? 1 : -1; i = n; show(i, dir); }
  function toggleNotes() { notesOn = !notesOn; notes.hidden = !notesOn; }
  function fs() { document.fullscreenElement ? document.exitFullscreen() : ov.requestFullscreen?.().catch(() => {}); }
  function exit() {
    document.removeEventListener('keydown', key, true); removeEventListener('resize', layout);
    document.removeEventListener('fullscreenchange', fsChange);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ov.remove(); S.cur = i; S.sel = []; window.dispatchEvent(new CustomEvent('present-exit', { detail: i }));
  }
  function fsChange() { setTimeout(layout, 60); }
  function key(e) {
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); e.stopPropagation(); go(i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); e.stopPropagation(); go(i - 1); }
    else if (k === 'Home') go(0); else if (k === 'End') go(slides.length - 1);
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); exit(); }
    else if (k.toLowerCase() === 'f') fs();
    else if (k.toLowerCase() === 'n') toggleNotes();
    else if (k.toLowerCase() === 'b' || k === '.') { black = !black; ov.classList.toggle('black', black); }
  }
  // bosish: chap 30% — orqaga, qolgani — oldinga; suruv
  let sx = null;
  ov.addEventListener('pointerdown', e => { sx = e.clientX; });
  ov.addEventListener('pointerup', e => {
    if (sx == null || e.target.closest('.pbar, .pnotes')) { sx = null; return; }
    const d = e.clientX - sx; sx = null;
    if (Math.abs(d) > 50) go(i + (d < 0 ? 1 : -1)); else go(e.clientX < innerWidth * .3 ? i - 1 : i + 1);
  });
  ov.addEventListener('pointermove', () => { ov.classList.add('active'); clearTimeout(idle); idle = setTimeout(() => ov.classList.remove('active'), 2200); });
  document.addEventListener('keydown', key, true); addEventListener('resize', layout); document.addEventListener('fullscreenchange', fsChange);
  layout(); show(i, 1, true); ov.classList.add('active'); idle = setTimeout(() => ov.classList.remove('active'), 2200);
  ov.focus(); ov.requestFullscreen?.().catch(() => {});
}
