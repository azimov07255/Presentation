// Chap panel: slaydlar eskizlari, tartiblash (sudrab), nusxa va o‘chirish
import { h, ic, debounce } from './util.js';
import { S, on, theme, goSlide, addSlide, dupSlide, delSlide, moveSlide } from './model.js';
import { thumb } from './render.js';

let root, list, dragFrom = -1;
export function initRail(el) {
  root = el;
  list = h('div', { class: 'rail-list' });
  const add = h('button', { class: 'rail-add', onclick: () => addSlide('bullets'), html: ic('plus', 16) + ' Yangi slayd' });
  root.append(list, add);
  const draw = debounce(build, 120);
  on('change', e => (e?.full ? build() : draw()));
  on('slide', build);
  on('open', build);
  build();
}

function build() {
  if (!S.deck) return;
  const th = theme(), keep = list.scrollTop;
  list.replaceChildren(...S.deck.slides.map((s, i) => {
    const card = h('div', { class: 'rail-item' + (i === S.cur ? ' on' : ''), draggable: 'true', 'data-i': i, role: 'button', tabindex: 0, 'aria-label': `Slayd ${i + 1}` },
      h('span', { class: 'no' }, String(i + 1)),
      h('div', { class: 'rt' }, thumb(s, th, S.assets, 176)),
      h('div', { class: 'ra' },
        h('button', { class: 'btn-ic sm', title: 'Nusxa', onclick: e => { e.stopPropagation(); dupSlide(i); }, html: ic('copy', 14) }),
        h('button', { class: 'btn-ic sm danger', title: 'O‘chirish', onclick: e => { e.stopPropagation(); delSlide(i); }, html: ic('trash', 14) })));
    card.addEventListener('click', () => goSlide(i));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') goSlide(i); });
    card.addEventListener('dragstart', e => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); card.classList.add('drag'); });
    card.addEventListener('dragend', () => { card.classList.remove('drag'); list.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
    card.addEventListener('dragover', e => { if (dragFrom < 0) return; e.preventDefault(); card.classList.add('over'); });
    card.addEventListener('dragleave', () => card.classList.remove('over'));
    card.addEventListener('drop', e => { e.preventDefault(); card.classList.remove('over'); if (dragFrom >= 0) moveSlide(dragFrom, i); dragFrom = -1; });
    return card;
  }));
  list.scrollTop = keep;
  const cur = list.querySelector('.on'); if (cur) { const r = cur.getBoundingClientRect(), p = list.getBoundingClientRect(); if (r.top < p.top || r.bottom > p.bottom) cur.scrollIntoView({ block: 'nearest' }); }
}
