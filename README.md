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

## Reja
2. AI (Claude): mavzu bo‘yicha bir nechta variant, slaydni qayta yozish/qisqartirish — Supabase Edge Function orqali (API kalit faqat serverda)
3. PDF / DOCX / kitobdan taqdimot yaratish
4. Hisoblar, obuna va AI limitlari (sotish uchun); jadval va diagramma elementlari
