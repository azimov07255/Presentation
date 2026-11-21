// Vizual tekshiruv: har bir maket × mavzu skrinshoti (qisqa va uzun matn bilan)
// node tests/visual.cjs   → SHOTS/vis-<mavzu>-<n>.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const THEMES = (process.env.THEMES || 'aurora,ivory,sunset,campus').split(',');
const LONG = 'Raqamli iqtisodiyot sharoitida kichik va o‘rta biznes subyektlarining raqobatbardoshligini oshirishning zamonaviy yo‘nalishlari';

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(400);
  await p.click('.hero-cta .big'); await p.click('.np-foot .big'); await p.waitForTimeout(900);
  for (const th of THEMES) {
    for (const long of [false, true]) {
      await p.evaluate(async ({ th, long, LONG }) => {
        const M = await import('/js/model.js'), L = await import('/js/layouts.js'), T = await import('/js/themes.js');
        const theme = T.themeById(th); M.S.deck.theme = th;
        const t = long ? LONG : undefined;
        const b6 = ['Birinchi muhim fikr ' + (long ? 'va uning batafsil izohi ikki qatorga cho‘ziladi' : ''), 'Ikkinchi muhim fikr', 'Uchinchi muhim fikr', 'To‘rtinchi fikr', 'Beshinchi fikr', 'Oltinchi fikr'];
        M.S.deck.slides = [
          L.newSlide('title', theme, { title: t, subtitle: long ? 'Talaba: Abdullayev Abdullajon · Ilmiy rahbar: prof. Karimov K.K.' : undefined }),
          L.newSlide('section', theme, { title: t }), L.newSlide('bullets', theme, { title: t, bullets: long ? b6 : undefined }),
          L.newSlide('two', theme, { title: t }), L.newSlide('image', theme, { title: t }), L.newSlide('quote', theme, { quote: long ? LONG + ' ' + LONG : undefined }),
          L.newSlide('stats', theme, { title: t, stats: long ? [{ v: '1 250 000', l: 'Uzun izoh ' + LONG.slice(0, 40) }, { v: '$4.2 mlrd', l: 'Ikkinchi' }, { v: '38.5%', l: 'Uchinchi' }, { v: '12 mln', l: 'To‘rtinchi' }] : undefined }),
          L.newSlide('steps', theme, { title: t }), L.newSlide('statement', theme, { text: t }),
          L.newSlide('agenda', theme, { items: long ? [LONG, 'Ikkinchi band', 'Uchinchi', 'To‘rtinchi', 'Beshinchi', 'Oltinchi'] : undefined }),
          L.newSlide('thanks', theme, { title: long ? 'E’tiboringiz uchun katta rahmat!' : undefined }), L.newSlide('blank', theme),
        ];
        M.S.cur = 0; M.S.sel = []; M.emit('slide'); M.emit('select'); M.emit('change', { full: true });
      }, { th, long, LONG });
      const n = await p.locator('.rail-item').count();
      for (let i = 0; i < n; i++) {
        await p.evaluate(async i => { const M = await import('/js/model.js'); M.goSlide(i); }, i);
        await p.waitForTimeout(60);
        await p.locator('#scaler').screenshot({ path: path.join(OUT, `vis-${th}${long ? '-long' : ''}-${String(i).padStart(2, '0')}.png`) });
      }
    }
  }
  console.log(errs.length ? 'ERR ' + errs.join('\n') : 'tayyor: ' + OUT);
  await b.close();
})();
