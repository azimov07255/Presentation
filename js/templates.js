// Tayyor boshlang‘ich andozalar (o‘zbekcha namuna matnlar bilan)
import { newSlide } from './layouts.js';

export const TEMPLATES = [
  { id: 'blank', name: 'Bo‘sh', desc: 'Sarlavha slaydidan boshlang', n: 1,
    build: (th, t) => [newSlide('title', th, { title: t || 'Taqdimot sarlavhasi' })] },
  { id: 'lecture', name: 'Ma’ruza / referat', desc: 'Reja, bo‘limlar, raqamlar, xulosa', n: 9,
    build: (th, t) => [
      newSlide('title', th, { title: t || 'Mavzu nomi', subtitle: 'Fan nomi · Muallif ismi · 2026', label: 'Ma’ruza' }),
      newSlide('agenda', th, { title: 'Reja', items: ['Kirish va dolzarblik', 'Asosiy tushunchalar', 'Tahlil va misollar', 'Xulosa va tavsiyalar'] }),
      newSlide('section', th, { no: '01', title: 'Kirish va dolzarblik', subtitle: 'Mavzu nima uchun muhim?' }),
      newSlide('bullets', th, { title: 'Asosiy tushunchalar', bullets: ['Birinchi tushuncha va uning ta’rifi', 'Ikkinchi tushuncha va uning vazifasi', 'Ular o‘rtasidagi bog‘liqlik', 'Amaliy ahamiyati'] }),
      newSlide('two', th, { title: 'Ikki yondashuv', left: { h: 'Nazariy', bullets: ['Asosiy qoidalar', 'Mavjud modellar', 'Cheklovlar'] }, right: { h: 'Amaliy', bullets: ['Real misollar', 'Qo‘llanish sohalari', 'Natijalar'] } }),
      newSlide('stats', th, { title: 'Raqamlarda', stats: [{ v: '73%', l: 'Birinchi ko‘rsatkich izohi' }, { v: '3.5x', l: 'Ikkinchi ko‘rsatkich izohi' }, { v: '12 mln', l: 'Uchinchi ko‘rsatkich izohi' }] }),
      newSlide('quote', th, { quote: 'Bilim — eng yaxshi investitsiya.', author: 'Mashhur olim' }),
      newSlide('bullets', th, { title: 'Xulosa', bullets: ['Asosiy natija', 'Amaliy tavsiya', 'Keyingi tadqiqot yo‘nalishi'] }),
      newSlide('thanks', th, { title: 'E’tiboringiz uchun rahmat!', subtitle: 'Savollar? · email@misol.uz' }),
    ] },
  { id: 'defense', name: 'Kurs ishi himoyasi', desc: 'Maqsad, usul, natija, xulosa', n: 8,
    build: (th, t) => [
      newSlide('title', th, { title: t || 'Kurs ishi mavzusi', subtitle: 'Talaba: Ism Familiya · Ilmiy rahbar: F.I.Sh.', label: 'Kurs ishi himoyasi' }),
      newSlide('bullets', th, { title: 'Mavzuning dolzarbligi', bullets: ['Muammoning qisqa bayoni', 'Mavzuning ilmiy va amaliy ahamiyati', 'Mavjud yechimlarning kamchiliklari'] }),
      newSlide('two', th, { title: 'Maqsad va vazifalar', left: { h: 'Maqsad', bullets: ['Tadqiqotning bosh maqsadi'] }, right: { h: 'Vazifalar', bullets: ['Birinchi vazifa', 'Ikkinchi vazifa', 'Uchinchi vazifa'] } }),
      newSlide('steps', th, { title: 'Tadqiqot bosqichlari', steps: [{ h: 'Tahlil', t: 'Adabiyotlar va ma’lumotlar tahlili' }, { h: 'Usul', t: 'Tanlangan metodologiya' }, { h: 'Tajriba', t: 'Amaliy qism' }, { h: 'Natija', t: 'Xulosalar' }] }),
      newSlide('stats', th, { title: 'Asosiy natijalar', stats: [{ v: '92%', l: 'Aniqlik ko‘rsatkichi' }, { v: '+38%', l: 'Oldingi usulga nisbatan o‘sish' }, { v: '5 ta', l: 'Sinovdan o‘tgan holat' }] }),
      newSlide('bullets', th, { title: 'Xulosa', bullets: ['Maqsadga erishildi', 'Amaliy tavsiyalar ishlab chiqildi', 'Keyingi ishlar yo‘nalishi belgilandi'] }),
      newSlide('thanks', th, { title: 'Rahmat!', subtitle: 'Savollaringizga javob berishga tayyorman' }),
    ] },
  { id: 'pitch', name: 'Startap taqdimoti', desc: 'Muammo, yechim, bozor, jamoa', n: 8,
    build: (th, t) => [
      newSlide('title', th, { title: t || 'Loyiha nomi', subtitle: 'Bir jumlada: siz nima qilasiz va kim uchun', label: 'Pitch · 2026' }),
      newSlide('statement', th, { text: 'Muammo: odamlar [muammo] tufayli vaqt va pul yo‘qotmoqda.', sub: 'Muammoni kuchli bir jumlada ifodalang' }),
      newSlide('bullets', th, { title: 'Bizning yechim', bullets: ['Yechim nima va qanday ishlaydi', 'Asosiy afzallik', 'Nima uchun aynan hozir'] }),
      newSlide('stats', th, { title: 'Bozor hajmi', stats: [{ v: '$4.2 mlrd', l: 'Umumiy bozor' }, { v: '$800 mln', l: 'Qo‘lga kiritish mumkin' }, { v: '$40 mln', l: 'Birinchi 3 yil maqsadi' }] }),
      newSlide('steps', th, { title: 'Yo‘l xaritasi', steps: [{ h: 'MVP', t: 'Birinchi versiya' }, { h: 'Pilot', t: 'Dastlabki mijozlar' }, { h: 'O‘sish', t: 'Marketing va savdo' }, { h: 'Kengayish', t: 'Yangi bozorlar' }] }),
      newSlide('two', th, { title: 'Jamoa va so‘rov', left: { h: 'Jamoa', bullets: ['Asoschi — rol', 'Hamasoschi — rol', 'Maslahatchi'] }, right: { h: 'Biz so‘raymiz', bullets: ['Investitsiya hajmi', 'Mablag‘ sarfi', 'Maqsadli ko‘rsatkichlar'] } }),
      newSlide('thanks', th, { title: 'Birga quramiz', subtitle: 'email@misol.uz · +998 90 000 00 00' }),
    ] },
];
