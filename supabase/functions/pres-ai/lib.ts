// pres-ai: sof mantiq (promptlar, AI javobini tekshirish/tozalash). Tarmoqsiz — Node/Deno da sinash mumkin.
// Slayd ma'lumotlari ilovadagi maketlar (js/layouts.js) kiritishiga to'g'ri keladi.

export const LAYOUTS = ['title', 'agenda', 'section', 'bullets', 'two', 'image', 'quote', 'stats', 'steps', 'statement', 'thanks']
export const LANGS: Record<string, string> = { uz: 'Uzbek (Latin script)', 'uz-cyrl': 'Uzbek (Cyrillic script)', ru: 'Russian', en: 'English' }
export const ANGLES = [
  'Classic academic: clear logical structure, key definitions, concrete examples, a conclusion.',
  'Visual and punchy: minimal text per slide, short bold statements, big ideas; prefer the stats, steps, statement and two layouts over long bullet lists.',
  'Storytelling: open with a question or a problem, build a narrative arc (problem, insight, solution, impact), finish with a call to action.',
]

export const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const clipNL = (v: unknown, n: number) => String(v ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n)
const list = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.map((i: any) => clip(typeof i === 'string' ? i : (i?.text ?? i?.t ?? ''), len)).filter(Boolean).slice(0, max) : []

/** AI qaytargan matndan JSON ajratib oladi (```json qobig'i va ortiqcha matnga chidamli). */
export function parseJSON(t: string): any {
  const s = String(t || '').replace(/^﻿/, '').replace(/```(?:json)?/gi, '').trim()
  try { return JSON.parse(s) } catch { /* pastda */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)) } catch { /* */ } }
  return null
}

export function cleanSlide(x: any): any | null {
  if (!x || typeof x !== 'object') return null
  const layout = String(x.layout || '').toLowerCase().trim()
  if (!LAYOUTS.includes(layout)) return null
  const notes = clipNL(x.notes, 700)
  const base = { layout, ...(notes ? { notes } : {}) }
  switch (layout) {
    case 'title': return { ...base, title: clip(x.title, 120), subtitle: clip(x.subtitle, 160), label: clip(x.label, 40) }
    case 'agenda': { const items = list(x.items, 6, 70); return items.length < 2 ? null : { ...base, title: clip(x.title, 40), items } }
    case 'section': return { ...base, no: clip(x.no, 3), title: clip(x.title, 90), subtitle: clip(x.subtitle, 140) }
    case 'bullets': { const bullets = list(x.bullets, 7, 150); return bullets.length ? { ...base, title: clip(x.title, 100), bullets } : null }
    case 'two': {
      const side = (s: any) => ({ h: clip(s?.h ?? s?.title, 40), bullets: list(s?.bullets, 5, 100) })
      const left = side(x.left), right = side(x.right)
      return left.bullets.length && right.bullets.length ? { ...base, title: clip(x.title, 100), left, right } : null
    }
    case 'image': return { ...base, title: clip(x.title, 100), bullets: list(x.bullets, 4, 110), imageQuery: clip(x.imageQuery, 80) }
    case 'quote': { const quote = clip(x.quote, 300); return quote ? { ...base, quote, author: clip(x.author, 60) } : null }
    case 'stats': {
      const stats = (Array.isArray(x.stats) ? x.stats : []).map((s: any) => ({ v: clip(s?.v, 14), l: clip(s?.l, 90) })).filter((s: any) => s.v).slice(0, 4)
      return stats.length >= 2 ? { ...base, title: clip(x.title, 100), stats } : null
    }
    case 'steps': {
      const steps = (Array.isArray(x.steps) ? x.steps : []).map((s: any) => ({ h: clip(s?.h, 30), t: clip(s?.t, 90) })).filter((s: any) => s.h).slice(0, 5)
      return steps.length >= 3 ? { ...base, title: clip(x.title, 100), steps } : null
    }
    case 'statement': { const text = clip(x.text, 160); return text ? { ...base, text, sub: clip(x.sub, 140) } : null }
    case 'thanks': return { ...base, title: clip(x.title, 50), subtitle: clip(x.subtitle, 120) }
  }
  return null
}

export function cleanDeck(raw: any): { title: string; slides: any[] } | null {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : []).map(cleanSlide).filter(Boolean).slice(0, 40)
  if (slides.length < 3) return null
  return { title: clip(raw?.title || slides[0]?.title, 100) || 'Taqdimot', slides }
}

/** Slayd matnlarini qayta yozish javobi: faqat ma'lum id lar qabul qilinadi. */
export function cleanTexts(raw: any, ids: string[]): { id: string; text: string }[] | null {
  const arr = Array.isArray(raw?.texts) ? raw.texts : null
  if (!arr) return null
  const ok = new Set(ids), out: { id: string; text: string }[] = []
  for (const t of arr) { const id = String(t?.id ?? ''); if (ok.has(id) && typeof t?.text === 'string') out.push({ id, text: clipNL(t.text, 1200) }) }
  return out.length ? out : null
}

export function outlinePrompt(o: { n: number; lang: string; angle: number }): string {
  const lang = LANGS[o.lang] || LANGS.uz
  return `You are an expert presentation writer and designer. Create a slide deck outline as JSON for the given topic.

LANGUAGE: write ALL slide text and speaker notes in ${lang}. Only "imageQuery" is in English.

Return ONLY valid JSON (no markdown) of the shape {"title":"deck title","slides":[ ... ]}. Each slide is an object with a "layout" and these fields:
- {"layout":"title","title":"","subtitle":"","label":"short tag such as the course or event"}
- {"layout":"agenda","title":"","items":["", ...]}  (3-6 items)
- {"layout":"section","no":"01","title":"","subtitle":""}
- {"layout":"bullets","title":"","bullets":["", ...]}  (3-6 bullets, each at most 14 words, no trailing period)
- {"layout":"two","title":"","left":{"h":"","bullets":["", ...]},"right":{"h":"","bullets":["", ...]}}  (2-4 bullets per side)
- {"layout":"image","title":"","bullets":["", ...],"imageQuery":"short English search phrase for a fitting photo"}  (2-4 bullets)
- {"layout":"quote","quote":"","author":""}
- {"layout":"stats","title":"","stats":[{"v":"73%","l":"short caption"}, ...]}  (3 or 4 items)
- {"layout":"steps","title":"","steps":[{"h":"","t":""}, ...]}  (3-5 steps, "h" max 3 words)
- {"layout":"statement","text":"","sub":""}  (one powerful sentence)
- {"layout":"thanks","title":"","subtitle":""}
Every slide may also include "notes": 2-4 sentences of speaker notes in the same language.

RULES
- Produce exactly ${o.n} slides. The first slide is "title", the last is "thanks". Use at least 4 different layouts and never the same layout three times in a row.
- Slide titles: short and specific (at most 8 words); prefer a clear claim to a bare label.
- NEVER invent statistics, dates, quotations, names or sources. Use a number only if it appears in the SOURCE or is a very well-known established fact. If you have no reliable figures, skip the "stats" and "quote" layouts and use qualitative wording.
- If a SOURCE text is provided, build the content ONLY from it and keep its terminology and facts. Do not add outside facts.
- Keep text compact: slides are read from a distance. No emojis.

STYLE ANGLE: ${ANGLES[o.angle % ANGLES.length]}`
}

export function outlineUser(o: { topic: string; audience: string; tone: string; extra: string; source: string }): string {
  return [`TOPIC: ${o.topic || '(derive the topic from the SOURCE)'}`, o.audience && `AUDIENCE: ${o.audience}`, o.tone && `TONE: ${o.tone}`, o.extra && `EXTRA INSTRUCTIONS: ${o.extra}`,
    o.source && `SOURCE (the only allowed basis for facts):\n"""\n${o.source}\n"""`].filter(Boolean).join('\n')
}

export const OPS: Record<string, string> = {
  rewrite: 'Rewrite the text to be clearer, more engaging and more professional. Keep the meaning and approximately the same length.',
  shorten: 'Make the text shorter and punchier (about 40-50% fewer words). Keep the key meaning. Slide text must be compact.',
  expand: 'Expand the text a little with relevant detail or an example (about 30-50% more words). Do not invent statistics or sources.',
  fix: 'Fix spelling, grammar and punctuation only. Do not change the wording otherwise.',
  translate_uz: 'Translate the text into Uzbek (Latin script).',
  translate_ru: 'Translate the text into Russian.',
  translate_en: 'Translate the text into English.',
  notes: 'Write concise speaker notes (3-5 sentences) for this slide in the same language as the slide text. Put them in a single item with id "__notes".',
  custom: '',
}

export function slidePrompt(op: string, instruction: string): string {
  const task = op === 'custom' ? clip(instruction, 400) : (OPS[op] || OPS.rewrite) + (instruction ? ` Additional instruction: ${clip(instruction, 300)}` : '')
  return `You edit the text of one presentation slide. The slide text elements are given as JSON items {"id","text"}; a newline in "text" separates paragraphs or bullet items.
TASK: ${task}
Return ONLY valid JSON: {"texts":[{"id":"...","text":"..."}]} containing the SAME ids you were given (you may omit items that need no change). Keep the original language unless the task says otherwise. Keep line-break structure (one bullet per line) unless the task requires changing it. Never invent statistics or sources. No emojis.`
}

export const DIGEST_PROMPT = `You prepare source material for a presentation. Summarize the given PART of a document into compact study notes (maximum 1800 characters): the headings/topic of this part, key definitions, important facts, numbers and examples exactly as stated. Keep the ORIGINAL language of the document. Return plain text only, no preamble.`

export function chunkText(t: string, size = 12000, max = 8): string[] {
  const s = String(t || '').replace(/\r/g, '').trim(), out: string[] = []
  if (s.length <= size) return s ? [s] : []
  const n = Math.min(max, Math.ceil(s.length / size)), step = Math.ceil(s.length / n)
  for (let i = 0; i < s.length && out.length < n; i += step) out.push(s.slice(i, i + step))
  return out
}
