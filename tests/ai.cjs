// AI oqimi sinovi (tarmoq soxtalashtirilgan: haqiqiy Supabase/AI chaqirilmaydi).
// node tests/ai.cjs  (avval: python3 -m http.server 8765 — loyiha papkasida)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const FIX = path.join(__dirname, 'fixtures');

const deck = (name, title, extra = []) => ({ angle: 0, name, title, slides: [
  { layout: 'title', title, subtitle: 'AI yaratgan taqdimot', label: 'Sinov', notes: 'Kirish izohi' },
  { layout: 'agenda', title: 'Reja', items: ['Kirish', 'Asosiy qism', 'Xulosa'] },
  { layout: 'bullets', title: 'Asosiy fikrlar', bullets: ['Birinchi fikr', 'Ikkinchi fikr', 'Uchinchi fikr'] },
  { layout: 'stats', title: 'Raqamlarda', stats: [{ v: '73%', l: 'Birinchi' }, { v: '3x', l: 'Ikkinchi' }, { v: '12', l: 'Uchinchi' }] },
  ...extra, { layout: 'thanks', title: 'Rahmat!', subtitle: 'Savollar?' }] });
const VARIANTS = [deck('Klassik', 'Iqtisodiyot asoslari'), deck('Vizual', 'Bozor va narx', [{ layout: 'statement', text: 'Talab narxni belgilaydi' }]),
  deck('Hikoya', 'Pul qayerga ketadi?', [{ layout: 'steps', title: 'Yo‘l', steps: [{ h: 'A', t: 'a' }, { h: 'B', t: 'b' }, { h: 'C', t: 'c' }] }])];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; const calls = [];
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

  let mode = 'ok';   // ok | 403 | 429
  await p.route('**/auth/v1/token*', r => {
    const body = JSON.parse(r.request().postData() || '{}');
    if (body.password === 'xato') return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error_description: 'Invalid login credentials' }) });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'u1', email: body.email } }) });
  });
  await p.route('**/functions/v1/pres-ai', async r => {
    const req = JSON.parse(r.request().postData() || '{}'); calls.push(req);
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: 'ok' });
    const cors = { 'access-control-allow-origin': '*' };
    if (mode === '403') return r.fulfill({ status: 403, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'Taqdimot AI uchun ruxsat yo‘q' }) });
    if (mode === '429') return r.fulfill({ status: 429, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'Bugungi AI limiti tugadi (30). Ertaga qayta urinib ko‘ring.' }) });
    await new Promise(x => setTimeout(x, 400));
    if (req.action === 'variants') return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ variants: VARIANTS, failed: 0 }) });
    if (req.action === 'digest') return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ digest: 'Qisqartirilgan matn. '.repeat(50) }) });
    if (req.action === 'slide') {
      const texts = req.texts.map(t => ({ id: t.id, text: req.op === 'shorten' ? 'QISQA' : req.op === 'notes' ? '' : t.text + ' (AI)' }));
      if (req.op === 'notes') texts.length = 0, texts.push({ id: '__notes', text: 'Yangi spiker izohi' });
      return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ texts }) });
    }
    r.fulfill({ status: 400, headers: cors, contentType: 'application/json', body: '{"error":"?"}' });
  });

  await p.goto(URL); await p.waitForTimeout(500);
  // 1) bosh sahifadan AI — forma, kirish
  await p.click('.hero-cta .btn.ghost'); await p.waitForTimeout(300);
  ok(!(await p.locator('.ai').innerText()).split('\n').includes('null'), 'formada “null” matni yo‘q');
  await p.screenshot({ path: path.join(OUT, 'ai-1-form.png') });
  await p.click('.ai .big');   // mavzu bo‘sh
  ok((await p.locator('.form-err').innerText()).includes('Mavzu'), 'bo‘sh mavzu rad etildi');
  await p.fill('.ai textarea >> nth=0', 'Iqtisodiyot asoslari');
  await p.click('.ai .big'); await p.waitForTimeout(300);
  ok(await p.locator('input[name=login]').count() === 1, 'kirish oynasi chiqdi');
  await p.fill('input[name=login]', 'sinov1'); await p.fill('input[name=pw]', 'xato'); await p.click('.dlg .big'); await p.waitForTimeout(300);
  ok((await p.locator('.form-err').last().innerText()).includes('noto‘g‘ri'), 'noto‘g‘ri parol xabari');
  await p.fill('input[name=pw]', 'togri'); await p.click('.dlg .big'); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, 'ai-2-loading.png') });
  await p.waitForSelector('.var-card', { timeout: 15000 });
  ok(await p.locator('.var-card').count() === 3, '3 ta variant ko‘rsatildi');
  ok(calls.some(c => c.action === 'variants' && c.topic === 'Iqtisodiyot asoslari' && c.slides === 10 && c.lang === 'uz'), 'serverga to‘g‘ri parametrlar ketdi');
  ok(!(await p.locator('.ai').innerText()).split('\n').includes('null'), 'natijada “null” matni yo‘q');
  await p.screenshot({ path: path.join(OUT, 'ai-3-results.png') });
  await p.click('.tdot[title="Ivory"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, 'ai-3b-ivory.png') });
  await p.locator('.var-card').nth(1).locator('.big').click(); await p.waitForTimeout(1000);
  ok(await p.locator('#editor').count() === 1, 'tanlangan variant muharrirda ochildi');
  ok(await p.locator('.rail-item').count() === 6, '2-variant: 6 slayd');
  ok(await p.locator('#title-in').inputValue() === 'Bozor va narx', 'taqdimot nomi AI sarlavhasidan');
  await p.screenshot({ path: path.join(OUT, 'ai-4-editor.png') });

  // 2) slayd AI
  await p.click('.rail-item >> nth=2'); await p.waitForTimeout(300);
  await p.click('.topbar .ai-btn'); await p.click('.pop button:has-text("Qisqartirish")'); await p.waitForTimeout(900);
  const txt = await p.locator('#stage').innerText();
  ok(txt.includes('QISQA'), 'AI “qisqartirish” slayd matnini almashtirdi');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  ok(!(await p.locator('#stage').innerText()).includes('QISQA'), 'AI o‘zgarishini undo bilan qaytarish mumkin');
  await p.click('.topbar .ai-btn'); await p.click('.pop button:has-text("Spiker izohini")'); await p.waitForTimeout(800);
  await p.click('.tabs button:has-text("Dizayn")');
  ok((await p.locator('textarea.notes').inputValue()).includes('Yangi spiker izohi'), 'AI spiker izohini yozdi');
  // inspektordagi tezkor tugma
  await p.click('.ai-chip:has-text("Kengaytir")'); await p.waitForTimeout(800);
  ok((await p.locator('#stage').innerText()).includes('(AI)'), 'inspektor AI tugmasi ishladi');

  // 3) xatolar
  mode = '403'; await p.click('.ai-chip:has-text("Qayta yoz")'); await p.waitForTimeout(600);
  ok((await p.locator('#toast').innerText()).includes('ruxsat yo‘q'), '403 — tushunarli xabar');
  mode = '429'; await p.click('.ai-chip:has-text("Imlo")'); await p.waitForTimeout(600);
  ok((await p.locator('#toast').innerText()).includes('limiti tugadi'), '429 — limit xabari');
  mode = 'ok';

  // 4) “slaydlar qo‘shish” va fayldan matn
  await p.click('.topbar .ai-btn'); await p.click('.pop button:has-text("Yangi slaydlar")'); await p.waitForTimeout(300);
  for (const f of ['kitob.txt', 'kitob.docx', 'kitob.pdf']) {
    if (await p.locator('.chip .x').count()) await p.click('.chip .x');
    await p.setInputFiles('.ai input[type=file]', path.join(FIX, f)); await p.waitForSelector('.chip', { timeout: 20000 });
    const chip = await p.locator('.chip').innerText();
    ok(/ming belgi/.test(chip) && chip.includes(f), f + ': matn ajratildi (' + chip.trim().replace(/\s+/g, ' ') + ')');
  }
  ok((await p.locator('.ai textarea >> nth=0').inputValue()).length > 0, 'fayl nomidan mavzu to‘ldirildi');
  await p.screenshot({ path: path.join(OUT, 'ai-5-file.png') });
  const before = await p.locator('.rail-item').count();
  await p.click('.ai .big'); await p.waitForSelector('.var-card', { timeout: 15000 });
  await p.locator('.var-card').nth(0).locator('.big').click(); await p.waitForTimeout(800);
  ok(await p.locator('.rail-item').count() === before + 5, 'AI slaydlari joriy taqdimotga qo‘shildi');
  ok(calls.filter(c => c.action === 'variants').pop().source.length > 100, 'fayl matni serverga yuborildi');

  console.log(errs.length ? errs.join('\n') : 'Konsol xatolari yo‘q');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
