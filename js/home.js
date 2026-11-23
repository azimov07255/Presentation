// Bosh sahifa: taqdimotlar galereyasi va “Yangi taqdimot” oynasi
import { APP_NAME, h, ic, modal, toast, uid } from './util.js';
import { THEMES, themeById } from './themes.js';
import { listDecks, removeDeck, saveDeck, loadDeck } from './store.js';
import { thumb } from './render.js';
import { newSlide } from './layouts.js';
import { newDeck } from './model.js';
import { TEMPLATES } from './templates.js';
import { openGenerate } from './ai.js';

const ago = t => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'hozirgina'; if (m < 60) return m + ' daqiqa oldin';
  const hh = Math.round(m / 60); if (hh < 24) return hh + ' soat oldin';
  const d = Math.round(hh / 24); if (d < 30) return d + ' kun oldin';
  return new Date(t).toLocaleDateString('uz-UZ');
};

export async function renderHome(root, { go, toggleUI }) {
  root.className = 'home'; root.replaceChildren();
  const decks = await listDecks();
  const head = h('header', { class: 'home-top' },
    h('div', { class: 'brand' }, h('span', { class: 'logo', html: ic('layout', 20) }), h('b', {}, APP_NAME)),
    h('div', { class: 'sp' }),
    h('button', { class: 'btn ghost', onclick: () => importFile(go), html: ic('file', 16) + ' Fayl ochish' }),
    h('button', { class: 'btn-ic', title: 'Yorug‘/qorong‘i', onclick: toggleUI, html: ic('moon') }));
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-glow' }),
    h('h1', {}, 'Taqdimotni ', h('em', {}, 'bir necha daqiqada'), ' yarating'),
    h('p', {}, 'Chiroyli dizayn, erkin tahrir va haqiqiy PowerPoint (.pptx) eksport. Internetsiz ham ishlaydi.'),
    h('div', { class: 'hero-cta' },
      h('button', { class: 'big', onclick: () => newDialog(go), html: ic('plus', 18) + ' Yangi taqdimot' }),
      h('button', { class: 'btn ghost lg', onclick: () => aiNew(go), html: ic('sparkle', 18) + ' AI bilan yaratish' })));
  root.append(head, hero);

  const sec = h('section', { class: 'decks' }, h('h2', {}, 'Taqdimotlaringiz', decks.length ? h('span', { class: 'cnt' }, String(decks.length)) : null));
  if (!decks.length) {
    sec.append(h('div', { class: 'empty-big' }, h('p', {}, 'Hali taqdimot yo‘q. Boshlash uchun andoza tanlang:'),
      h('div', { class: 'tpl-row' }, ...TEMPLATES.slice(1).map(t => h('button', { class: 'tpl', onclick: () => newDialog(go, t.id) }, h('b', {}, t.name), h('span', {}, t.desc))))));
  } else {
    const grid = h('div', { class: 'deck-grid' });
    decks.forEach(r => {
      const d = r.deck, th = themeById(d.theme);
      const card = h('div', { class: 'deck-card', tabindex: 0, role: 'button', 'aria-label': d.title },
        h('div', { class: 'deck-thumb' }, thumb(d.slides[0], th, r.assets || {}, 300)),
        h('div', { class: 'deck-meta' }, h('div', {}, h('b', {}, d.title || 'Nomsiz'), h('span', {}, `${d.slides.length} slayd · ${ago(r.updated)}`)),
          h('div', { class: 'deck-act' },
            h('button', { class: 'btn-ic sm', title: 'Nusxa', onclick: async e => { e.stopPropagation(); await duplicate(r); renderHome(root, { go, toggleUI }); }, html: ic('copy', 15) }),
            h('button', { class: 'btn-ic sm danger', title: 'O‘chirish', onclick: async e => { e.stopPropagation(); if (confirm(`“${d.title}” o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`)) { await removeDeck(d.id); renderHome(root, { go, toggleUI }); } }, html: ic('trash', 15) }))));
      card.addEventListener('click', () => go('#/d/' + d.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') go('#/d/' + d.id); });
      grid.append(card);
    });
    sec.append(grid);
  }
  root.append(sec, h('footer', { class: 'home-foot' }, `${APP_NAME} · ma’lumotlar faqat shu qurilmada saqlanadi`));
}

async function duplicate(r) {
  const c = JSON.parse(JSON.stringify(r.deck)); c.id = uid('d'); c.title += ' (nusxa)'; c.updated = Date.now();
  await saveDeck(c, r.assets || {});
}

function aiNew(go) {
  openGenerate({ mode: 'new', onPick: async ({ title, slides, themeId }) => {
    const d = newDeck(themeId, title || 'AI taqdimot'); d.slides = slides;
    await saveDeck(d, {}); go('#/d/' + d.id);
  } });
}

async function importFile(go) {
  const inp = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  inp.addEventListener('change', async () => {
    try {
      const o = JSON.parse(await inp.files[0].text());
      if (o.app !== 'slaydo' || !o.deck?.slides) throw new Error();
      o.deck.id = uid('d'); o.deck.updated = Date.now();
      await saveDeck(o.deck, o.assets || {}); go('#/d/' + o.deck.id);
    } catch { toast('Bu Slaydo fayli emas', 'err'); }
    inp.remove();
  });
  document.body.append(inp); inp.click();
}

export function newDialog(go, tplId = 'lecture') {
  let tpl = tplId, themeId = THEMES[0].id;
  const title = h('input', { class: 'inp', placeholder: 'Taqdimot nomi (masalan: Iqtisodiyot asoslari)', maxlength: 80 });
  const prev = h('div', { class: 'np-prev' });
  const tplBox = h('div', { class: 'tpl-row' }), thBox = h('div', { class: 'np-themes' });
  const paint = () => {
    const th = themeById(themeId), t = TEMPLATES.find(x => x.id === tpl);
    prev.replaceChildren(thumb(t.build(th, title.value.trim())[0], th, {}, 420));
    tplBox.replaceChildren(...TEMPLATES.map(x => h('button', { class: 'tpl' + (x.id === tpl ? ' on' : ''), onclick: () => { tpl = x.id; paint(); } }, h('b', {}, x.name), h('span', {}, `${x.desc} · ${x.n} slayd`))));
    thBox.replaceChildren(...THEMES.map(x => h('button', { class: 'np-theme' + (x.id === themeId ? ' on' : ''), title: x.name, onclick: () => { themeId = x.id; paint(); } },
      thumb(newSlide('title', x, { title: 'Aa', subtitle: '', label: '' }), x, {}, 92), h('span', {}, x.name))));
  };
  title.addEventListener('input', () => { const th = themeById(themeId), t = TEMPLATES.find(x => x.id === tpl); prev.replaceChildren(thumb(t.build(th, title.value.trim())[0], th, {}, 420)); });
  const create = async () => {
    const th = themeById(themeId), t = TEMPLATES.find(x => x.id === tpl), name = title.value.trim();
    const d = newDeck(th.id, name || 'Yangi taqdimot'); d.slides = t.build(th, name);
    await saveDeck(d, {}); m.close(); go('#/d/' + d.id);
  };
  const m = modal(h('div', { class: 'np' },
    h('h3', {}, 'Yangi taqdimot'),
    h('div', { class: 'np-grid' },
      h('div', { class: 'np-left' }, h('label', { class: 'lb' }, 'Nomi'), title, h('label', { class: 'lb' }, 'Andoza'), tplBox, h('label', { class: 'lb' }, 'Dizayn'), thBox),
      h('div', { class: 'np-right' }, prev)),
    h('div', { class: 'np-foot' }, h('button', { class: 'big', onclick: create, html: ic('sparkle', 18) + ' Yaratish' }))), { wide: true });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
  paint(); setTimeout(() => title.focus(), 50);
}
export { loadDeck };
