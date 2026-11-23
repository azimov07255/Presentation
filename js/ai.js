// AI: kirish, "3 variant" yaratish oynasi (mavzu yoki fayl asosida), slayd matnini AI bilan yaxshilash
import { h, ic, modal, toast } from './util.js';
import * as C from './cloud.js';
import { THEMES, themeById } from './themes.js';
import { newSlide } from './layouts.js';
import { thumb, elNode } from './render.js';
import { extractText, pdfInfo, ACCEPT } from './files.js';
import { S, slide, theme, selEls, edit } from './model.js';

// ---------- umumiy: xato matnlari, band ko‘rsatkichi ----------
export function errText(e) {
  if (e.net) return 'Internetga ulanib bo‘lmadi. Ulanishni tekshiring.';
  if (e.status === 403) return 'Bu hisobda AI uchun ruxsat yo‘q. Ilova egasidan “pres” guruhini so‘rang.';
  if (e.status === 429) return e.message;
  return e.message || 'Noma’lum xato';
}
function busy(msg) {
  const el = h('div', { class: 'ai-busy', role: 'status' }, h('i', { class: 'spin' }), h('span', {}, msg));
  document.body.append(el);
  return () => el.remove();
}

// ---------- kirish ----------
export function ensureLogin() {
  if (C.isIn()) return Promise.resolve(true);
  return new Promise(resolve => {
    let done = false;
    const login = h('input', { class: 'inp', name: 'login', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', placeholder: 'Login yoki email', required: true });
    const pw = h('input', { class: 'inp', name: 'pw', type: 'password', autocomplete: 'current-password', placeholder: 'Parol', required: true });
    const err = h('p', { class: 'form-err', role: 'alert' });
    const btn = h('button', { class: 'big', type: 'submit' }, 'Kirish');
    const form = h('form', { class: 'dlg', novalidate: true },
      h('h3', {}, 'AI uchun kiring'),
      h('p', { class: 'mu' }, 'AI funksiyalari hisob bilan ishlaydi. Hisobni ilova egasi ochib beradi.'),
      h('label', { class: 'lb' }, 'Login'), login, h('label', { class: 'lb' }, 'Parol'), pw, err,
      h('div', { class: 'np-foot' }, btn));
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      if (!login.value.trim() || !pw.value) { err.textContent = 'Login va parolni kiriting'; return; }
      btn.disabled = true; btn.textContent = 'Tekshirilmoqda…';
      try { await C.signIn(login.value, pw.value); done = true; m.close(); resolve(true); }
      catch (ex) { err.textContent = errText(ex); btn.disabled = false; btn.textContent = 'Kirish'; }
    });
    const m = modal(form, { onClose: () => { if (!done) resolve(false); } });
    setTimeout(() => login.focus(), 60);
  });
}

// ---------- slayd ma'lumotidan haqiqiy slaydlar ----------
const slideTitle = d => d.title || d.text || d.quote || d.label || d.layout;
export function buildSlides(variant, th) { return variant.slides.map(d => newSlide(d.layout, th, d)); }

// ---------- "Yangi taqdimot / slaydlar qo'shish" oynasi ----------
const LANG_OPTS = [['uz', 'O‘zbekcha (lotin)'], ['ru', 'Русский'], ['en', 'English'], ['uz-cyrl', 'Ўзбекча (кирилл)']];
const TONES = [['', 'Oddiy'], ['formal, academic', 'Rasmiy / ilmiy'], ['friendly and simple', 'Do‘stona va sodda'], ['concise and punchy', 'Qisqa va lo‘nda'], ['inspiring, persuasive', 'Ilhomlantiruvchi']];

export function openGenerate({ mode = 'new', onPick }) {
  const st = { topic: '', source: '', fileName: '', n: 10, lang: 'uz', tone: '', audience: '', extra: '', themeId: mode === 'append' && S.deck ? S.deck.theme : THEMES[0].id, pdf: null, pages: '' };
  const root = h('div', { class: 'ai' });
  const m = modal(root, { wide: true });

  const select = (opts, val, set) => { const s = h('select', { class: 'sel' }, ...opts.map(([v, l]) => h('option', { value: v }, l))); s.value = val; s.addEventListener('change', () => set(s.value)); return s; };

  // 1) forma
  function viewForm(msg) {
    const topic = h('textarea', { class: 'inp ta', rows: 2, placeholder: 'Masalan: Sun’iy intellektning ta’limdagi o‘rni', maxlength: 300 }); topic.value = st.topic;
    topic.addEventListener('input', () => { st.topic = topic.value; });
    const file = h('input', { type: 'file', accept: ACCEPT, hidden: true });
    const fileInfo = h('div', { class: 'file-info' });
    const pagesRow = h('div', { class: 'row pages', hidden: true }, h('label', {}, 'Betlar'), h('input', { class: 'inp sm', placeholder: 'Hammasi (masalan: 1-30)', value: st.pages }));
    pagesRow.querySelector('input').addEventListener('input', e => { st.pages = e.target.value; });
    const src = h('textarea', { class: 'inp ta', rows: 3, placeholder: 'Yoki bu yerga matnni joylashtiring (ixtiyoriy). Berilsa, AI faqat shu matndan foydalanadi.' }); src.value = st.fileName ? '' : st.source;
    src.addEventListener('input', () => { st.source = src.value; st.fileName = ''; paintFile(); });
    const drop = h('button', { type: 'button', class: 'dropz', onclick: () => file.click(), html: ic('file', 20) + '<span><b>PDF, DOCX yoki TXT yuklang</b><small>Kitob, maqola yoki konspekt asosida taqdimot</small></span>' });
    function paintFile() {
      fileInfo.replaceChildren();
      if (st.fileName) fileInfo.append(h('span', { class: 'chip' }, h('i', { class: 'chip-ic', html: ic('file', 14) }), st.fileName, ' · ', Math.round(st.source.length / 1000) + ' ming belgi',
        h('button', { type: 'button', class: 'x', 'aria-label': 'Olib tashlash', onclick: () => { st.fileName = ''; st.source = ''; st.pdf = null; pagesRow.hidden = true; paintFile(); }, html: ic('close', 12) })));
      pagesRow.hidden = !st.pdf;
    }
    async function takeFile(f) {
      if (!f) return;
      const stop = busy('Fayl o‘qilmoqda…');
      try {
        if (/\.pdf$/i.test(f.name)) { st.pdf = f; try { const p = await pdfInfo(f); pagesRow.querySelector('label').textContent = `Betlar (${p.numPages})`; } catch { /* matnni baribir ajratamiz */ } }
        else st.pdf = null;
        const r = await extractText(f, { pages: st.pages });
        st.source = r.text; st.fileName = f.name; src.value = '';
        if (!st.topic.trim()) { st.topic = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(); topic.value = st.topic; }
        paintFile();
      } catch (e) { toast(e.message, 'err'); } finally { stop(); }
    }
    file.addEventListener('change', () => { takeFile(file.files[0]); file.value = ''; });
    pagesRow.querySelector('input').addEventListener('change', async () => { if (st.pdf) takeFile(st.pdf); });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); takeFile(e.dataTransfer.files[0]); });

    const n = h('input', { type: 'range', min: 5, max: 20, step: 1, value: st.n }), nv = h('b', {}, String(st.n));
    n.addEventListener('input', () => { st.n = +n.value; nv.textContent = n.value; n.style.setProperty('--p', ((n.value - 5) / 15) * 100 + '%'); }); n.style.setProperty('--p', ((st.n - 5) / 15) * 100 + '%');
    const aud = h('input', { class: 'inp sm', placeholder: 'Masalan: 2-kurs talabalari', value: st.audience, maxlength: 100 }); aud.addEventListener('input', () => { st.audience = aud.value; });
    const extra = h('input', { class: 'inp sm', placeholder: 'Qo‘shimcha istak (ixtiyoriy): masalan, amaliy misollar ko‘proq', value: st.extra, maxlength: 300 }); extra.addEventListener('input', () => { st.extra = extra.value; });
    const go = h('button', { class: 'big', type: 'button', onclick: () => start(), html: ic('sparkle', 18) + ' 3 ta variant yaratish' });
    root.replaceChildren(...[
      h('h3', {}, mode === 'append' ? 'AI bilan slaydlar qo‘shish' : 'AI bilan taqdimot yaratish'),
      msg ? h('p', { class: 'form-err' }, msg) : null,
      h('label', { class: 'lb' }, 'Mavzu'), topic,
      h('label', { class: 'lb' }, 'Manba (ixtiyoriy)'), drop, fileInfo, pagesRow, src, file,
      h('div', { class: 'ai-opts' },
        h('div', {}, h('label', { class: 'lb' }, 'Slaydlar soni'), h('div', { class: 'sld' }, n, nv)),
        h('div', {}, h('label', { class: 'lb' }, 'Til'), select(LANG_OPTS, st.lang, v => { st.lang = v; })),
        h('div', {}, h('label', { class: 'lb' }, 'Uslub'), select(TONES, st.tone, v => { st.tone = v; })),
        h('div', {}, h('label', { class: 'lb' }, 'Kimlar uchun'), aud)),
      h('label', { class: 'lb' }, 'Qo‘shimcha'), extra,
      h('div', { class: 'np-foot' }, go)].filter(Boolean));
    paintFile(); setTimeout(() => topic.focus(), 60);
  }

  // 2) yuklanish
  async function start() {
    if (!st.topic.trim() && !st.source.trim()) { viewForm('Mavzu yozing yoki fayl yuklang.'); return; }
    if (!(await ensureLogin())) return;
    const msgs = h('p', { class: 'mu center' }, 'Tayyorlanmoqda…');
    root.replaceChildren(h('h3', {}, 'AI ishlamoqda…'), msgs,
      h('div', { class: 'ai-skel' }, ...[0, 1, 2].map(() => h('div', { class: 'skel-card' }, h('i'), h('i'), h('i')))),
      h('p', { class: 'mu center s' }, 'Odatda 20–40 soniya. Oynani yopmang.'));
    try {
      let source = st.source;
      if (source.length > 22000) {
        msgs.textContent = 'Uzun matn tahlil qilinmoqda (' + Math.round(source.length / 1000) + ' ming belgi)…';
        source = (await C.fn('pres-ai', { action: 'digest', text: source })).digest;
      }
      msgs.textContent = 'Uchta variant yozilmoqda…';
      const r = await C.fn('pres-ai', { action: 'variants', topic: st.topic, source, slides: st.n, lang: st.lang, tone: st.tone, audience: st.audience, extra: st.extra });
      viewResults(r);
    } catch (e) {
      if (e.status === 401) { C.signOut(); }
      viewForm(errText(e));
    }
  }

  // 3) natija
  function viewResults(r) {
    const variants = r.variants || [], grid = h('div', { class: 'var-grid' });
    const themeRow = h('div', { class: 'theme-row' });
    function paint() {
      const th = themeById(st.themeId);
      themeRow.replaceChildren(h('span', { class: 'lb inline' }, 'Dizayn:'), ...THEMES.map(t => h('button', { class: 'tdot' + (t.id === st.themeId ? ' on' : ''), title: t.name, 'aria-label': t.name, style: { background: `linear-gradient(135deg, ${t.c.bg} 0 50%, ${t.c.ac} 50% 100%)` }, onclick: () => { st.themeId = t.id; paint(); } })));
      grid.replaceChildren(...variants.map(v => {
        const slides = buildSlides(v, th);
        return h('div', { class: 'var-card' },
          h('div', { class: 'var-head' }, h('span', { class: 'badge' }, v.name), h('b', {}, v.title), h('span', { class: 'mu s' }, `${v.slides.length} slayd`)),
          h('div', { class: 'var-thumbs' }, ...slides.slice(0, 4).map(s => thumb(s, th, {}, 124))),
          h('ol', { class: 'var-list' }, ...v.slides.slice(0, 12).map(d => h('li', {}, slideTitle(d)))),
          h('button', { class: 'big sm', onclick: () => { m.close(); onPick({ title: v.title, slides, themeId: st.themeId, variant: v }); } }, mode === 'append' ? 'Qo‘shish' : 'Shuni tanlash'));
      }));
    }
    root.replaceChildren(...[
      h('h3', {}, 'Variantni tanlang'),
      r.failed ? h('p', { class: 'mu s' }, `${r.failed} ta variant yaratilmadi — qolganlari tayyor.`) : null,
      themeRow, grid,
      h('div', { class: 'np-foot split' }, h('button', { class: 'btn', onclick: () => viewForm() }, 'Ortga'), h('button', { class: 'btn', onclick: start, html: ic('sparkle', 16) + ' Qayta yaratish' }))].filter(Boolean));
    paint();
  }

  viewForm();
}

// ---------- slayd matnini AI bilan yaxshilash ----------
const OPNAME = { rewrite: 'qayta yozildi', shorten: 'qisqartirildi', expand: 'kengaytirildi', fix: 'imlosi tuzatildi', translate_uz: 'o‘zbekchaga tarjima qilindi', translate_ru: 'ruschaga tarjima qilindi', translate_en: 'inglizchaga tarjima qilindi', notes: 'izoh yozildi', custom: 'o‘zgartirildi' };

// Matn qutiga sig‘masa, shriftni biroz kichraytiradi
function fitText(el, th) {
  const host = h('div', { style: { position: 'fixed', left: '-9999px', top: '0', width: '1400px', pointerEvents: 'none' } });
  document.body.append(host);
  const orig = el.fs, floor = Math.max(12, Math.round(orig * 0.6));
  const natural = () => { host.replaceChildren(elNode({ ...el, x: 0, y: 0, r: 0 }, th, { assets: {}, mode: 'show' })); const tx = host.querySelector('.tx'); tx.style.height = 'auto'; return tx.offsetHeight; };
  let guard = 0; while (natural() > el.h + 1 && el.fs > floor && guard++ < 80) el.fs -= 1;
  host.remove();
}

export async function aiSlide(op, instruction = '') {
  if (!S.deck) return;
  const s = slide(), withText = e => e.t === 'text' && String(e.text || '').trim();
  const picked = selEls().filter(withText), targets = picked.length ? picked : s.els.filter(withText);
  if (!targets.length) { toast('Slaydda matn yo‘q', 'err'); return; }
  if (!(await ensureLogin())) return;
  const stop = busy('AI ishlamoqda…');
  try {
    const r = await C.fn('pres-ai', { action: 'slide', op, instruction, texts: targets.map(e => ({ id: e.id, text: e.text })), deckTitle: S.deck.title });
    const th = theme(); let changed = 0;
    edit(() => {
      for (const t of r.texts) {
        if (t.id === '__notes') { s.notes = t.text; changed++; continue; }
        const el = s.els.find(e => e.id === t.id); if (el && el.t === 'text' && t.text !== el.text) { el.text = t.text; fitText(el, th); changed++; }
      }
    });
    toast(changed ? `Slayd ${OPNAME[op] || 'yangilandi'}` : 'AI o‘zgartirish taklif qilmadi', changed ? 'ok' : '');
  } catch (e) {
    if (e.status === 401) C.signOut();
    toast(errText(e), 'err');
  } finally { stop(); }
}

export function askCustom() {
  const inp = h('input', { class: 'inp', placeholder: 'Masalan: “ikkita misol qo‘sh” yoki “rasmiyroq qil”', maxlength: 300 });
  const form = h('form', { class: 'dlg' }, h('h3', {}, 'AI ga buyruq bering'), h('p', { class: 'mu' }, 'Tanlangan matnga (tanlanmagan bo‘lsa, butun slaydga) qo‘llanadi.'), inp, h('div', { class: 'np-foot' }, h('button', { class: 'big', type: 'submit' }, 'Bajarish')));
  const m = modal(form);
  form.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; m.close(); aiSlide('custom', v); });
  setTimeout(() => inp.focus(), 60);
}

