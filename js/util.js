// Umumiy yordamchilar: DOM, id, ikonkalar, xabarlar
export const APP_NAME = 'Slaydo';
export const W = 1280, H = 720; // slayd mantiqiy o‘lchami (px). PPTX: 13.333 x 7.5 dyuym (96 px = 1 dyuym)

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round = (v, d = 0) => { const m = 10 ** d; return Math.round(v * m) / m; };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
export const json = o => JSON.stringify(o);

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(2)) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}

// Lucide uslubidagi ikonkalar (24x24, stroke)
const P = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  text: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  shape: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="17" cy="7" r="4"/><path d="M12 21l-4.5-8L3 21z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-5-5L5 21"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  play: '<path d="M6 4l14 8-14 8z" fill="currentColor"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  front: '<rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/>',
  back: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 16v3a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2h-3" opacity=".6"/>',
  left: '<path d="M4 6h16M4 12h10M4 18h14"/>',
  center: '<path d="M4 6h16M7 12h10M5 18h14"/>',
  right: '<path d="M4 6h16M10 12h10M6 18h14"/>',
  justify: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4L9 20"/>',
  underline: '<path d="M6 4v7a6 6 0 0012 0V4M4 21h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  caps: '<path d="M3 18l5-13 5 13M5 13h6M15 18l3.5-9 3.5 9M16.4 15h4.2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  palette: '<path d="M12 3a9 9 0 000 18c1.4 0 2-.9 2-2 0-1.2-1-1.6-1-2.7 0-1 .8-1.8 1.9-1.8H17a4 4 0 004-4c0-4.4-4-7.5-9-7.5z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  notes: '<path d="M5 4h14v12H9l-4 4z"/><path d="M9 8h6M9 12h4"/>',
  magic: '<path d="M15 4l5 5L9 20l-5-5zM13 6l5 5M6 3v3M4.5 4.5h3M19 15v3M17.5 16.5h3"/>',
  align_l: '<path d="M4 3v18M8 7h12M8 17h7"/>', align_c: '<path d="M12 3v18M5 7h14M8 17h8"/>', align_r: '<path d="M20 3v18M4 7h12M9 17h7"/>',
  align_t: '<path d="M3 4h18M7 8v12M17 8v8"/>', align_m: '<path d="M3 12h18M7 5v14M17 8v8"/>', align_b: '<path d="M3 20h18M7 4v12M17 8v8"/>',
};
export const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

let toastTimer;
export function toast(msg, kind = '') {
  let t = $('#toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.className = 'show ' + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 2600);
}

export function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
export const safeName = s => (String(s || 'taqdimot').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80)) || 'taqdimot';

// Modal oyna
export function modal(content, { wide = false, onClose } = {}) {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' });
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 160); document.removeEventListener('keydown', key, true); onClose && onClose(); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  box.append(h('button', { class: 'modal-x btn-ic', 'aria-label': 'Yopish', onclick: close, html: ic('close') }), content);
  back.append(box);
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  document.body.append(back);
  return { close, box };
}
