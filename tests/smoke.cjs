// Tez sinov: node tests/smoke.cjs  (avval: python3 -m http.server 8765  — loyiha papkasida)
// Skrinshotlar SHOTS papkasiga tushadi (standart: ./tests/out)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

  await p.goto(URL); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, '1-home.png') });
  await p.click('.hero-cta .big'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, '2-new.png') });
  await p.fill('.inp', 'Iqtisodiyot asoslari'); await p.click('.np-foot .big'); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, '3-editor.png') });
  ok(await p.locator('.rail-item').count() === 9, 'ma’ruza andozasida 9 slayd');
  ok((await p.locator('#stage .el').count()) > 4, 'slaydda elementlar chizildi');

  // matnni tahrirlash
  const title = p.locator('#stage .el-text').nth(1);
  await title.dblclick(); await p.keyboard.press('Control+A'); await p.keyboard.type('Yangi sarlavha matni');
  await p.mouse.click(700, 130); await p.waitForTimeout(300);
  ok((await p.locator('#stage').innerText()).includes('Yangi sarlavha matni'), 'matn joyida tahrirlandi');

  // element qo‘shish + undo/redo
  const n0 = await p.locator('#stage .el').count();
  await p.click('.tool:has-text("Shakl")'); await p.click('.pop button:has-text("Doira")'); await p.waitForTimeout(200);
  ok(await p.locator('#stage .el').count() === n0 + 1, 'shakl qo‘shildi');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  ok(await p.locator('#stage .el').count() === n0, 'undo ishladi');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(200);
  ok(await p.locator('#stage .el').count() === n0 + 1, 'redo ishladi');

  // sudrash
  const shape = p.locator('#stage .el-shape').last(), bb0 = await shape.boundingBox();
  await p.mouse.move(bb0.x + bb0.width / 2, bb0.y + bb0.height / 2); await p.mouse.down(); await p.mouse.move(bb0.x + 140, bb0.y + 90, { steps: 6 }); await p.mouse.up();
  const bb1 = await shape.boundingBox(); ok(Math.abs(bb1.x - bb0.x) > 30, 'element sudralib ko‘chirildi');
  await p.screenshot({ path: path.join(OUT, '4-selected.png') });

  // mavzu almashtirish
  await p.keyboard.press('Escape'); await p.click('.tabs button:has-text("Dizayn")');
  await p.click('.theme-card[title="Ivory"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, '5-ivory.png') });

  // eksport
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), (async () => { await p.click('.topbar .btn:has-text("Eksport")'); await p.click('.pop button:has-text("PowerPoint")'); })()]);
  const file = path.join(OUT, 'test.pptx'); await dl.saveAs(file);
  ok(fs.statSync(file).size > 20000, 'PPTX yuklab olindi (' + fs.statSync(file).size + ' bayt)');

  // namoyish
  await p.click('.topbar .big'); await p.waitForTimeout(700);
  ok(await p.locator('#present').count() === 1, 'namoyish ochildi');
  const c0 = parseInt(await p.locator('.pcount').innerText());
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
  ok(parseInt(await p.locator('.pcount').innerText()) === c0 + 1, 'keyingi slaydga o‘tdi');
  await p.screenshot({ path: path.join(OUT, '6-present.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  console.log(errs.length ? errs.join('\n') : 'Konsol xatolari yo‘q');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
