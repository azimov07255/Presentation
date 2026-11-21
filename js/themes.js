// Dizayn mavzulari: ranglar tokenlar (@bg, @tx, @ac ...) orqali ishlatiladi, shuning uchun mavzuni almashtirish butun taqdimotni qayta bo‘yaydi.
export const FONTS = {
  'Inter':            { stack: "'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif", pptx: 'Calibri', web: 'Inter:wght@400;500;600;700;800' },
  'Montserrat':       { stack: "'Montserrat','Segoe UI','Helvetica Neue',Arial,sans-serif", pptx: 'Arial', web: 'Montserrat:wght@400;500;600;700;800' },
  'Poppins':          { stack: "'Poppins','Segoe UI','Helvetica Neue',Arial,sans-serif", pptx: 'Arial', web: 'Poppins:wght@400;500;600;700' },
  'Playfair Display': { stack: "'Playfair Display',Georgia,'Times New Roman',serif", pptx: 'Georgia', web: 'Playfair+Display:wght@400;600;700;800' },
  'Space Grotesk':    { stack: "'Space Grotesk','Segoe UI',Arial,sans-serif", pptx: 'Arial', web: 'Space+Grotesk:wght@400;500;700' },
  'Georgia':          { stack: "Georgia,'Times New Roman',serif", pptx: 'Georgia' },
  'Arial':            { stack: "Arial,'Helvetica Neue',sans-serif", pptx: 'Arial' },
  'Trebuchet MS':     { stack: "'Trebuchet MS','Segoe UI',Arial,sans-serif", pptx: 'Trebuchet MS' },
  'Courier New':      { stack: "'Courier New',ui-monospace,monospace", pptx: 'Courier New' },
};
export const FONT_LIST = Object.keys(FONTS);

export const THEMES = [
  { id: 'aurora', name: 'Aurora', dark: true, deco: 'glow', fh: 'Montserrat', fb: 'Inter',
    c: { bg: '#0B1020', bg2: '#1A1442', tx: '#F4F6FF', mu: '#9AA3C7', ac: '#7C5CFF', ac2: '#22D3EE', card: '#161B36', line: '#2A3158', onac: '#FFFFFF' } },
  { id: 'ivory', name: 'Ivory', dark: false, deco: 'frame', fh: 'Playfair Display', fb: 'Inter',
    c: { bg: '#FAF6EF', bg2: '#F1E9DC', tx: '#231F1A', mu: '#7A6F63', ac: '#B8532B', ac2: '#D99A3D', card: '#FFFFFF', line: '#E3D8C6', onac: '#FFFFFF' } },
  { id: 'emerald', name: 'Emerald', dark: true, deco: 'glow', fh: 'Space Grotesk', fb: 'Inter',
    c: { bg: '#07140F', bg2: '#0C2A20', tx: '#EAFBF3', mu: '#86B5A0', ac: '#2DD4A0', ac2: '#C6F24E', card: '#0F2219', line: '#1C4030', onac: '#04130C' } },
  { id: 'sunset', name: 'Sunset', dark: true, deco: 'blocks', fh: 'Poppins', fb: 'Inter',
    c: { bg: '#1A0F1F', bg2: '#3A1230', tx: '#FFF4EE', mu: '#D4A5B5', ac: '#FF6B4A', ac2: '#FFB347', card: '#2A1730', line: '#4D2745', onac: '#FFFFFF' } },
  { id: 'ocean', name: 'Ocean', dark: false, deco: 'bars', fh: 'Poppins', fb: 'Inter',
    c: { bg: '#F4F8FF', bg2: '#E3EEFF', tx: '#0F1E3D', mu: '#5B6F96', ac: '#2563EB', ac2: '#06B6D4', card: '#FFFFFF', line: '#D5E2F7', onac: '#FFFFFF' } },
  { id: 'mono', name: 'Mono', dark: false, deco: 'frame', fh: 'Montserrat', fb: 'Inter',
    c: { bg: '#FFFFFF', bg2: '#F2F2F2', tx: '#0A0A0A', mu: '#6B6B6B', ac: '#0A0A0A', ac2: '#FF3B30', card: '#F5F5F5', line: '#E0E0E0', onac: '#FFFFFF' } },
  { id: 'rose', name: 'Rose', dark: false, deco: 'blocks', fh: 'Playfair Display', fb: 'Inter',
    c: { bg: '#FFF5F7', bg2: '#FFE4EB', tx: '#3B1220', mu: '#9A6577', ac: '#D6336C', ac2: '#9C36B5', card: '#FFFFFF', line: '#F6CFDB', onac: '#FFFFFF' } },
  { id: 'campus', name: 'Campus', dark: true, deco: 'bars', fh: 'Playfair Display', fb: 'Inter',
    c: { bg: '#0D1B3D', bg2: '#13295C', tx: '#F5F1E6', mu: '#A9B6D6', ac: '#E5B54A', ac2: '#6EA8FE', card: '#14275A', line: '#27407F', onac: '#0D1B3D' } },
];
export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0];

export const color = (v, th) => (typeof v === 'string' && v[0] === '@') ? (th.c[v.slice(1)] || '#000000') : (v || 'transparent');
export const fontKey = (v, th) => v === 'H' ? th.fh : (v === 'B' || !v) ? th.fb : v;
export const fontStack = (v, th) => (FONTS[fontKey(v, th)] || FONTS.Inter).stack;
export const fontPptx = (v, th) => (FONTS[fontKey(v, th)] || FONTS.Inter).pptx;

export const SWATCH_TOKENS = ['tx', 'mu', 'ac', 'ac2', 'card', 'bg', 'line', 'onac'];
export const TOKEN_NAMES = { tx: 'Matn', mu: 'Xira matn', ac: 'Asosiy', ac2: 'Qo‘shimcha', card: 'Karta', bg: 'Fon', bg2: 'Fon 2', line: 'Chiziq', onac: 'Asosiy ustidagi matn' };

// Google Fonts ni bir marta yuklash (oflayn bo‘lsa zaxira shriftlar ishlatiladi)
export function loadWebFonts() {
  if (document.getElementById('webfonts')) return;
  const fams = Object.values(FONTS).filter(f => f.web).map(f => 'family=' + f.web).join('&');
  const l = document.createElement('link');
  l.id = 'webfonts'; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
  document.head.append(l);
}
