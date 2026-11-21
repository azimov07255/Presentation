// Slayd va elementlarni DOM ga chizish (muharrir, eskiz, namoyish va PDF uchun bir xil kod)
import { W, H, h, esc } from './util.js';
import { color, fontStack } from './themes.js';

let gseq = 0;
const nextId = () => 'g' + (++gseq);

export const defaultBg = { g: ['@bg', '@bg2'], a: 160 };
export function bgCSS(bg, th) {
  bg = bg || defaultBg;
  if (typeof bg === 'string') return color(bg, th);
  const [a, b] = bg.g || ['@bg', '@bg2'];
  return `linear-gradient(${bg.a ?? 160}deg, ${color(a, th)}, ${color(b, th)})`;
}

function starPoints(w, h, n = 5) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2, r = R * 0.42, pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rad * (w / Math.min(w, h))).toFixed(1)},${(cy + Math.sin(a) * rad * (h / Math.min(w, h))).toFixed(1)}`);
  }
  return pts.join(' ');
}

// SVG satri (DOM ga ham, PNG ga aylantirishga ham ishlatiladi)
export function shapeSVG(el, th, standalone = false) {
  const w = Math.max(1, el.w), hh = Math.max(1, el.h), sw = el.sw || 0;
  const id = nextId();
  const fill = el.fill === 'none' ? 'none' : color(el.fill ?? '@ac', th);
  const stroke = el.stroke ? color(el.stroke, th) : 'none';
  let defs = '', f = fill;
  if (el.g && el.g.length === 2 && el.kind !== 'glow') {
    const a = ((el.ga ?? 135) - 90) * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    defs = `<linearGradient id="${id}" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}"><stop offset="0" stop-color="${color(el.g[0], th)}"/><stop offset="1" stop-color="${color(el.g[1], th)}"/></linearGradient>`;
    f = `url(#${id})`;
  }
  const a = `fill="${f}" stroke="${stroke}" stroke-width="${sw}"`;
  const i = sw / 2;
  let body = '';
  switch (el.kind) {
    case 'ellipse': body = `<ellipse cx="${w / 2}" cy="${hh / 2}" rx="${Math.max(0, w / 2 - i)}" ry="${Math.max(0, hh / 2 - i)}" ${a}/>`; break;
    case 'triangle': body = `<polygon points="${w / 2},${i} ${w - i},${hh - i} ${i},${hh - i}" ${a} stroke-linejoin="round"/>`; break;
    case 'diamond': body = `<polygon points="${w / 2},${i} ${w - i},${hh / 2} ${w / 2},${hh - i} ${i},${hh / 2}" ${a} stroke-linejoin="round"/>`; break;
    case 'star': body = `<polygon points="${starPoints(w, hh)}" ${a} stroke-linejoin="round"/>`; break;
    case 'arrow': body = `<polygon points="${i},${hh * .3} ${w * .62},${hh * .3} ${w * .62},${i} ${w - i},${hh / 2} ${w * .62},${hh - i} ${w * .62},${hh * .7} ${i},${hh * .7}" ${a} stroke-linejoin="round"/>`; break;
    case 'line': body = `<line x1="${(el.sw || 4) / 2}" y1="${hh / 2}" x2="${w - (el.sw || 4) / 2}" y2="${hh / 2}" stroke="${stroke !== 'none' ? stroke : fill}" stroke-width="${el.sw || 4}" stroke-linecap="round"/><line x1="0" y1="${hh / 2}" x2="${w}" y2="${hh / 2}" stroke="rgba(0,0,0,0)" stroke-width="${Math.max(18, el.sw || 4)}"/>`; break;
    case 'glow': {
      const c = color(el.fill ?? '@ac', th);
      defs = `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset=".55" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
      body = `<ellipse cx="${w / 2}" cy="${hh / 2}" rx="${w / 2}" ry="${hh / 2}" fill="url(#${id})"/>`; break;
    }
    default: {
      const rx = Math.min(el.rx || 0, w / 2, hh / 2);
      body = `<rect x="${i}" y="${i}" width="${Math.max(0, w - sw)}" height="${Math.max(0, hh - sw)}" rx="${rx}" ${a}/>`;
    }
  }
  const ns = standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg${ns} viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" preserveAspectRatio="none" style="display:block;overflow:visible"><defs>${defs}</defs>${body}</svg>`;
}

const PHOTO_ICON = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="M21 15l-5-5L5 21"/></svg>';

// mode: 'edit' | 'thumb' | 'show'
export function elNode(el, th, ctx) {
  const mode = ctx.mode || 'show';
  const d = h('div', { class: 'el el-' + el.t, 'data-id': el.id });
  if (el.kind) d.dataset.kind = el.kind;
  const st = d.style;
  st.left = el.x + 'px'; st.top = el.y + 'px'; st.width = el.w + 'px'; st.height = el.h + 'px';
  if (el.r) st.transform = `rotate(${el.r}deg)`;
  if (el.o != null && el.o !== 1) st.opacity = el.o;
  if (el.sh) st.filter = `drop-shadow(0 ${th.dark ? 14 : 10}px ${th.dark ? 28 : 22}px rgba(${th.dark ? '0,0,0,.5' : '20,24,40,.22'}))`;

  if (el.t === 'text') {
    const tx = h('div', { class: 'tx' });
    const s = tx.style;
    s.fontSize = el.fs + 'px'; s.fontWeight = el.fw || 400; s.fontStyle = el.fi ? 'italic' : 'normal';
    s.color = color(el.c || '@tx', th); s.fontFamily = fontStack(el.font, th);
    s.textAlign = el.al || 'left'; s.setProperty('--lh', el.lh || 1.25); s.lineHeight = el.lh || 1.25;
    s.letterSpacing = (el.ls || 0) + 'px'; s.textTransform = el.up ? 'uppercase' : 'none';
    s.textDecoration = el.u ? 'underline' : 'none';
    s.justifyContent = el.va === 'middle' ? 'center' : el.va === 'bottom' ? 'flex-end' : 'flex-start';
    s.setProperty('--bc', color(el.bc || '@ac', th));
    s.setProperty('--ps', (el.ps || 0) + 'px');
    String(el.text ?? '').split('\n').forEach(line => tx.append(h('p', { class: el.bullet ? 'b' : '' }, line || '​')));
    if (mode === 'edit' && !String(el.text || '').trim()) d.dataset.empty = '1';
    d.append(tx);
  } else if (el.t === 'shape') {
    d.innerHTML = shapeSVG(el, th);
  } else if (el.t === 'image') {
    const src = el.src && ctx.assets ? ctx.assets[el.src] : null;
    if (src) {
      const img = h('img', { src, alt: '', draggable: 'false' });
      img.style.objectFit = el.fit || 'cover'; img.style.borderRadius = (el.rx || 0) + 'px';
      d.append(img);
    } else if (mode !== 'show') {
      d.append(h('div', { class: 'slot', style: { borderRadius: (el.rx || 0) + 'px' }, html: `${PHOTO_ICON}<span>Rasm qo‘shish</span>` }));
    }
  }
  return d;
}

export function slideNode(slide, th, assets, mode = 'show') {
  const s = h('div', { class: 'slide', 'data-mode': mode });
  s.style.width = W + 'px'; s.style.height = H + 'px';
  s.style.background = bgCSS(slide.bg, th);
  const ctx = { assets, mode };
  for (const el of slide.els) s.append(elNode(el, th, ctx));
  return s;
}

// Qobiq: slaydni berilgan kenglikka moslab ko‘rsatadi (eskiz uchun)
export function thumb(slide, th, assets, width, mode = 'thumb') {
  const k = width / W;
  const wrap = h('div', { class: 'thumb-box', style: { width: width + 'px', height: H * k + 'px' } });
  const sn = slideNode(slide, th, assets, mode);
  sn.style.transform = `scale(${k})`; sn.style.transformOrigin = '0 0';
  wrap.append(sn);
  return wrap;
}
