// node --test tests/ai-lib.test.mjs  — AI javobini tekshirish mantig'i (tarmoqsiz)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJSON, cleanSlide, cleanDeck, cleanTexts, chunkText, outlinePrompt, slidePrompt } from '../supabase/functions/pres-ai/lib.ts';

test('parseJSON: kod qobig‘i va ortiqcha matn', () => {
  assert.deepEqual(parseJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJSON('Mana javob: {"a":2} rahmat'), { a: 2 });
  assert.equal(parseJSON('yaroqsiz'), null);
  assert.equal(parseJSON(''), null);
});
test('cleanSlide: noma’lum maket va bo‘sh maydonlar rad etiladi', () => {
  assert.equal(cleanSlide({ layout: 'hack', title: 'x' }), null);
  assert.equal(cleanSlide({ layout: 'bullets', title: 'x', bullets: [] }), null);
  assert.equal(cleanSlide({ layout: 'stats', stats: [{ v: '1', l: 'a' }] }), null);
  assert.equal(cleanSlide(null), null);
  assert.equal(cleanSlide('str'), null);
});
test('cleanSlide: uzunlik cheklovi va tozalash', () => {
  const s = cleanSlide({ layout: 'bullets', title: ' A   B ', bullets: ['x'.repeat(500), '', 'ok', { text: 'obj' }, 5, 'a', 'b', 'c', 'd'], notes: 'n' });
  assert.equal(s.title, 'A B'); assert.equal(s.bullets[0].length, 150); assert.equal(s.bullets.length, 7); assert.equal(s.notes, 'n');
  assert.ok(!s.bullets.includes(''));
});
test('cleanSlide: HTML o‘zgarishsiz matn bo‘lib qoladi (ilova textContent ishlatadi)', () => {
  const s = cleanSlide({ layout: 'statement', text: '<img src=x onerror=alert(1)>' });
  assert.equal(s.text, '<img src=x onerror=alert(1)>');
});
test('cleanDeck: kamida 3 slayd, kerakli maydonlar', () => {
  const raw = { title: 'T', slides: [
    { layout: 'title', title: 'Salom', subtitle: 's' },
    { layout: 'two', title: 'X', left: { h: 'A', bullets: ['1'] }, right: { h: 'B', bullets: ['2', '3'] } },
    { layout: 'steps', title: 'S', steps: [{ h: 'a', t: 'b' }, { h: 'c', t: 'd' }, { h: 'e', t: 'f' }] },
    { layout: 'bad' }, { layout: 'thanks', title: 'Rahmat' }] };
  const d = cleanDeck(raw); assert.equal(d.slides.length, 4); assert.equal(d.title, 'T');
  assert.equal(cleanDeck({ slides: [{ layout: 'title', title: 'x' }] }), null);
  assert.equal(cleanDeck(null), null);
});
test('cleanTexts: faqat ma’lum id lar', () => {
  const r = cleanTexts({ texts: [{ id: 'a', text: 'yangi' }, { id: 'zzz', text: 'begona' }, { id: 'b', text: 5 }] }, ['a', 'b']);
  assert.deepEqual(r, [{ id: 'a', text: 'yangi' }]);
  assert.equal(cleanTexts({ texts: [] }, ['a']), null); assert.equal(cleanTexts({}, ['a']), null);
});
test('chunkText: qismlarga bo‘lish va chegaralar', () => {
  assert.deepEqual(chunkText('qisqa'), ['qisqa']);
  const c = chunkText('x'.repeat(100000), 12000, 8); assert.equal(c.length, 8); assert.equal(c.join('').length, 100000);
  assert.deepEqual(chunkText(''), []);
});
test('promptlar: til va soni kiritiladi', () => {
  const p = outlinePrompt({ n: 9, lang: 'uz', angle: 1 });
  assert.match(p, /exactly 9 slides/); assert.match(p, /Uzbek \(Latin/); assert.match(p, /Visual and punchy/);
  assert.match(slidePrompt('shorten', ''), /shorter/);
  assert.match(slidePrompt('custom', 'jadvalga aylantir'), /jadvalga aylantir/);
});
