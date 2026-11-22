// Edge Function: pres-ai  (JWT majburiy; ruxsat: can_pres() — owner yoki "pres" guruhi; kunlik limit: pres_ai_hit)
// Secrets: GEMINI_API_KEY va/yoki GROQ_API_KEY (ielts-ai bilan umumiy), ixtiyoriy: ANTHROPIC_API_KEY, PRES_MODEL, GEMINI_MODEL, AI_DAILY_LIMIT
// Amallar: health | variants (3 xil taqdimot rejasi) | digest (uzun matnni qisqartirish) | slide (slayd matnini qayta yozish)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ANGLES, DIGEST_PROMPT, chunkText, cleanDeck, cleanTexts, clip, outlinePrompt, outlineUser, parseJSON, slidePrompt } from './lib.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
const LIMIT = Math.min(500, Math.max(1, Math.floor(Number(Deno.env.get('AI_DAILY_LIMIT')) || 30)))
const GEMINI = Deno.env.get('GEMINI_API_KEY') || '', GROQ = Deno.env.get('GROQ_API_KEY') || '', ANTH = Deno.env.get('ANTHROPIC_API_KEY') || ''
const GMODELS = [Deno.env.get('GEMINI_MODEL'), 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'].filter(Boolean) as string[]
const GROQ_MODELS = [Deno.env.get('GROQ_MODEL'), 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'].filter(Boolean) as string[]

type Opt = { json: boolean; temp: number; maxTok: number }

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctl.signal }) } finally { clearTimeout(to) }
}

async function viaAnthropic(system: string, user: string, o: Opt): Promise<string> {
  const r = await timedFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ANTH, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: Deno.env.get('PRES_MODEL') || 'claude-sonnet-5-5', max_tokens: o.maxTok, temperature: o.temp, system, messages: [{ role: 'user', content: user }] }),
  }, 110000)
  const j: any = await r.json().catch(() => ({}))
  const t = (j?.content || []).map((p: any) => p?.text || '').join('')
  if (!r.ok || !t) throw new Error(`anthropic ${r.status}: ${String(j?.error?.message || 'bo‘sh').slice(0, 80)}`)
  return t
}

async function viaGemini(system: string, user: string, o: Opt): Promise<string> {
  const errs: string[] = []
  for (const m of GMODELS.slice(0, 3)) {
    for (const think of /2\.5/.test(m) ? [true, false] : [false]) {
      let r: Response
      try {
        r = await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: o.temp, maxOutputTokens: o.maxTok, ...(o.json ? { responseMimeType: 'application/json' } : {}), ...(think ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
          }),
        }, 100000)
      } catch { errs.push(`${m} vaqt`); break }
      const j: any = await r.json().catch(() => ({}))
      if (r.status === 400 && think && /think/i.test(String(j?.error?.message || ''))) continue
      const t = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('')
      if (r.ok && t) return t
      errs.push(`${m} ${r.status}${r.ok ? ' bo‘sh' : ''}`)
      if (r.status === 401 || r.status === 403) throw new Error('gemini [' + errs.join('; ') + ']')
      break
    }
  }
  throw new Error('gemini [' + errs.join('; ') + ']')
}

async function viaGroq(system: string, user: string, o: Opt): Promise<string> {
  const errs: string[] = []
  for (const model of GROQ_MODELS.slice(0, 2)) {
    let r: Response
    try {
      r = await timedFetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + GROQ },
        body: JSON.stringify({ model, temperature: o.temp, max_tokens: Math.min(o.maxTok, 8000), messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(o.json ? { response_format: { type: 'json_object' } } : {}), ...(/gpt-oss/.test(model) ? { reasoning_effort: 'low' } : {}) }),
      }, 100000)
    } catch { errs.push(`${model} vaqt`); continue }
    const j: any = await r.json().catch(() => ({}))
    const t = String(j?.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    if (r.ok && t) return t
    errs.push(`${model} ${r.status}: ${String(j?.error?.message || 'bo‘sh').slice(0, 60)}`)
    if (r.status === 401) break
  }
  throw new Error('groq [' + errs.join('; ') + ']')
}

/** Mavjud provayderlarni ketma-ket sinaydi: Anthropic (kalit bo‘lsa) → Gemini → Groq. */
async function ask(system: string, user: string, o: Partial<Opt> = {}): Promise<string> {
  const opt: Opt = { json: true, temp: 0.7, maxTok: 8192, ...o }
  const chain: [string, () => Promise<string>][] = []
  if (ANTH) chain.push(['anthropic', () => viaAnthropic(system, user, opt)])
  if (GEMINI) chain.push(['gemini', () => viaGemini(system, user, opt)])
  if (GROQ) chain.push(['groq', () => viaGroq(system, user, opt)])
  if (!chain.length) throw new Error('nokey')
  const errs: string[] = []
  for (const [name, f] of chain) { try { return await f() } catch (e) { const m = String((e as Error).message); console.error(name, m); errs.push(m) } }
  throw new Error(errs.join(' | '))
}

async function variants(b: any): Promise<Response> {
  const n = Math.min(20, Math.max(4, Math.floor(Number(b.slides) || 10)))
  const lang = ['uz', 'uz-cyrl', 'ru', 'en'].includes(b.lang) ? b.lang : 'uz'
  const user = outlineUser({ topic: clip(b.topic, 300), audience: clip(b.audience, 120), tone: clip(b.tone, 80), extra: clip(b.extra, 400), source: String(b.source || '').slice(0, 24000) })
  if (!clip(b.topic, 300) && !String(b.source || '').trim()) return json({ error: 'Mavzu yoki manba matn kiriting.' }, 400)
  const want = Math.min(3, Math.max(1, Math.floor(Number(b.count) || 3)))
  const res = await Promise.allSettled(Array.from({ length: want }, (_, i) => ask(outlinePrompt({ n, lang, angle: i }), user, { temp: 0.75 + i * 0.1, maxTok: 8192 })))
  const out: any[] = [], errs: string[] = []
  res.forEach((r, i) => {
    if (r.status !== 'fulfilled') { errs.push(String(r.reason?.message || r.reason).slice(0, 200)); return }
    const d = cleanDeck(parseJSON(r.value))
    if (d) out.push({ angle: i, name: ['Klassik', 'Vizual', 'Hikoya'][i] || 'Variant', ...d }); else errs.push('javob tushunarsiz (variant ' + (i + 1) + ')')
  })
  if (!out.length) return json({ error: 'AI taqdimot tuza olmadi — ' + (errs[0] || 'noma’lum xato') }, 502)
  return json({ variants: out, failed: errs.length, angles: ANGLES.length })
}

async function digest(b: any): Promise<Response> {
  const text = String(b.text || '').slice(0, 130000)
  if (text.trim().length < 200) return json({ error: 'Matn juda qisqa.' }, 400)
  const parts = chunkText(text, 14000, 8)
  const res = await Promise.allSettled(parts.map((p, i) => ask(DIGEST_PROMPT, `PART ${i + 1} of ${parts.length}:\n"""\n${p}\n"""`, { json: false, temp: 0.2, maxTok: 1200 })))
  const notes = res.map((r, i) => r.status === 'fulfilled' ? `[${i + 1}] ${r.value.trim()}` : '').filter(Boolean)
  if (!notes.length) return json({ error: 'Matnni qisqartirib bo‘lmadi — ' + String((res[0] as any)?.reason?.message || '').slice(0, 200) }, 502)
  return json({ digest: notes.join('\n\n').slice(0, 14000), parts: parts.length, ok: notes.length })
}

async function slide(b: any): Promise<Response> {
  const items: { id: string; text: string }[] = (Array.isArray(b.texts) ? b.texts : []).slice(0, 12).map((t: any) => ({ id: clip(t?.id, 40), text: String(t?.text ?? '').slice(0, 1500) })).filter((t: any) => t.id)
  if (!items.length) return json({ error: 'Slaydda matn yo‘q.' }, 400)
  const op = String(b.op || 'rewrite')
  const raw = await ask(slidePrompt(op, String(b.instruction || '')), JSON.stringify({ items, deckTitle: clip(b.deckTitle, 100) }), { temp: 0.6, maxTok: 3000 })
  const texts = cleanTexts(parseJSON(raw), [...items.map((i) => i.id), '__notes'])
  if (!texts) return json({ error: 'AI javobi tushunarsiz. Qayta urinib ko‘ring.' }, 502)
  return json({ texts })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST kerak' }, 405)
  let b: any; try { b = await req.json() } catch { return json({ error: 'So‘rov noto‘g‘ri' }, 400) }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })
  const action = String(b.action || '')
  if (action === 'health') {
    const { data } = await sb.rpc('can_pres')
    if (!data) return json({ error: 'Taqdimot AI uchun ruxsat yo‘q', allowed: false }, 403)
    const { data: own } = await sb.rpc('is_owner')
    return json({ ok: true, allowed: true, owner: !!own, limit: own ? null : LIMIT, providers: { anthropic: !!ANTH, gemini: !!GEMINI, groq: !!GROQ } })
  }
  if (!['variants', 'digest', 'slide'].includes(action)) return json({ error: 'Noma’lum amal' }, 400)
  if (!ANTH && !GEMINI && !GROQ) return json({ error: 'AI hali sozlanmagan (kalit qo‘yilmagan). Ilova egasiga ayting.' }, 503)
  const { error: hitErr } = await sb.rpc('pres_ai_hit', { p_limit: LIMIT })
  if (hitErr) { const lim = /limit/i.test(hitErr.message); return json({ error: lim ? hitErr.message : 'Taqdimot AI uchun ruxsat yo‘q' }, lim ? 429 : 403) }
  try {
    if (action === 'variants') return await variants(b)
    if (action === 'digest') return await digest(b)
    return await slide(b)
  } catch (e) {
    const m = String((e as Error).message || e)
    return json({ error: m === 'nokey' ? 'AI sozlanmagan.' : 'AI xatosi — ' + m.slice(0, 300) }, 502)
  }
})
