# Slaydo — taqdimot yaratish ilovasi

Chiroyli taqdimotlarni brauzerda yarating, erkin tahrirlang va **haqiqiy PowerPoint (.pptx)** yoki PDF sifatida yuklab oling. Server shart emas, internetsiz ishlaydi (PWA). Nomi `js/util.js` dagi `APP_NAME` da — xohlagan nomga almashtiring.

## 1-bosqich (tayyor)
- **Muharrir:** matn, shakl (8 xil), rasm; sudrash, o‘lcham, aylantirish, snap-chiziqlar, ko‘p tanlash, hizalash, qatlamlar, Undo/Redo, nusxa/qo‘yish, rasmni tashlab/qo‘yib qo‘shish
- **8 ta dizayn mavzusi** (Aurora, Ivory, Emerald, Sunset, Ocean, Mono, Rose, Campus) — mavzu almashsa ranglar, shriftlar va bezaklar o‘zi yangilanadi
- **12 ta slayd maketi** + 4 ta tayyor andoza (ma’ruza, kurs ishi himoyasi, startap, bo‘sh)
- **Namoyish rejimi:** to‘liq ekran, o‘tish animatsiyalari, spiker izohlari, klaviatura va swipe
- **Eksport:** `.pptx` (matnlar PowerPoint’da tahrirlanadi), PDF (chop etish orqali), `.json` zaxira
- Avto-saqlash (IndexedDB), yorug‘/qorong‘i interfeys, telefon va planshetga moslashgan

## Ishga tushirish
```bash
python3 -m http.server 8765   # keyin http://localhost:8765
```
GitHub Pages / Netlify / Cloudflare Pages’ga to‘g‘ridan-to‘g‘ri joylanadi (build kerak emas). PWA uchun HTTPS kerak.

## Sinovlar (Playwright)
```bash
node tests/smoke.cjs     # asosiy oqim: yaratish, tahrir, undo, eksport, namoyish
node tests/visual.cjs    # barcha maket × mavzu skrinshotlari (tests/out)
```

## Tuzilma
| Fayl | Vazifasi |
|---|---|
| `js/model.js` | holat, tarix (undo/redo), slayd va element amallari |
| `js/layouts.js`, `js/templates.js` | maketlar va andozalar (AI keyinchalik shu funksiyalardan foydalanadi) |
| `js/render.js` | slaydni DOM ga chizish (muharrir, eskiz, namoyish, PDF uchun bir xil) |
| `js/canvas.js` | muharrir maydoni: tanlash, sudrash, resize, aylantirish, matn tahriri |
| `js/inspector.js`, `js/rail.js` | o‘ng panel va slaydlar ro‘yxati |
| `js/export.js` | PPTX / PDF / JSON |
| `js/present.js` | namoyish rejimi |
| `sw.js` | offline; **o‘zgartirsangiz `VERSION` ni oshiring** |

## 2-bosqich: AI (tayyor)
- **AI bilan yaratish:** mavzu yozing yoki **PDF / DOCX / TXT** yuklang (kitob ham mumkin: uzun matn avval qisqartiriladi, betlarni tanlash mumkin) → **3 xil variant** (Klassik, Vizual, Hikoya) → dizaynni tanlab, bittasini oching. Til: o‘zbek (lotin/kirill), rus, ingliz.
- **Slayd bilan ishlash:** qayta yozish, qisqartirish, kengaytirish, imlo, tarjima, spiker izohi yozish va o‘z buyrug‘ingiz. Tanlangan matnga yoki butun slaydga qo‘llanadi; Undo bilan qaytariladi.
- **AI hech qachon raqam, iqtibos yoki manba to‘qimaydi** (prompt shunday talab qiladi); baribir muhim joylarni tekshiring.

### Arxitektura va sozlash
- Brauzer → Supabase **Edge Function `pres-ai`** (`supabase/functions/pres-ai/`) → Gemini / Groq (ixtiyoriy Anthropic). Kalitlar faqat serverda.
- Loyiha: `testlar-app` (hisoblar `js/config.js`). Ruxsat: `can_pres()` — owner yoki **`pres`** guruhidagi faol foydalanuvchi; kunlik limit `AI_DAILY_LIMIT` (standart 30 so‘rov).
- Migratsiya: `supabase/migrations/20261122_pres_ai.sql` (`can_pres`, `pres_ai_usage`, `pres_ai_hit`).
- Secrets (Supabase → Edge Functions → Secrets): `GEMINI_API_KEY` va/yoki `GROQ_API_KEY` (IELTS bilan umumiy), ixtiyoriy `ANTHROPIC_API_KEY`, `PRES_MODEL`.
- Sinovlar: `node --test tests/ai-lib.test.mjs` (AI javobini tekshirish), `node tests/ai.cjs` (butun oqim, tarmoq soxtalashtirilgan).

## Reja
3. Rasm qidirish/yaratish, jadval va diagramma elementlari
4. Hisoblar boshqaruvi, obuna va to‘lov (sotish uchun)
