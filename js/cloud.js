// Bulut: kirish (Supabase Auth, parol bilan) va Edge Function chaqirish. Kutubxonasiz, kichik mijoz.
import { CLOUD } from './config.js';

const SK = 'slaydo:session:v1';
let sess = null, refreshing = null;
try { sess = JSON.parse(localStorage.getItem(SK)); } catch { sess = null; }
const store = s => { sess = s; try { s ? localStorage.setItem(SK, JSON.stringify(s)) : localStorage.removeItem(SK); } catch { /* xotira yopiq */ } };
const listeners = [];
export const onAuth = f => listeners.push(f);
const notify = () => listeners.forEach(f => f(sess));

export const isIn = () => !!sess;
export const who = () => (sess?.user?.email || '').replace('@' + CLOUD.loginDomain, '');

async function post(path, body, token) {
  let r;
  try { r = await fetch(CLOUD.url + path, { method: 'POST', headers: { apikey: CLOUD.key, 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }); }
  catch { const e = new Error('Internetga ulanib bo‘lmadi'); e.net = true; throw e; }
  const j = await r.json().catch(() => null);
  if (!r.ok) { const e = new Error(j?.error || j?.message || j?.msg || j?.error_description || ('HTTP ' + r.status)); e.status = r.status; e.body = j; throw e; }
  return j;
}
const fromTok = j => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user?.id, email: j.user?.email } });

export async function signIn(login, password) {
  login = String(login || '').trim();
  const email = login.includes('@') ? login : `${login.toLowerCase()}@${CLOUD.loginDomain}`;
  try { store(fromTok(await post('/auth/v1/token?grant_type=password', { email, password }))); }
  catch (e) { if (e.status === 400 || e.status === 401) e.message = 'Login yoki parol noto‘g‘ri'; throw e; }
  notify(); return sess;
}
export function signOut() { store(null); notify(); }

async function refresh() {
  if (!sess) throw new Error('Kirish kerak');
  refreshing ||= (async () => {
    try { store(fromTok(await post('/auth/v1/token?grant_type=refresh_token', { refresh_token: sess.refresh_token }))); }
    catch (e) { if (!e.net) { store(null); notify(); } throw e; }
    finally { refreshing = null; }
  })();
  return refreshing;
}
async function token() { if (!sess) throw new Error('Kirish kerak'); if (sess.expires_at - 45 < Date.now() / 1000) await refresh(); return sess.access_token; }

/** Edge Function chaqirish. Xato: e.status (401/403/429/502...), e.message — foydalanuvchiga ko‘rsatiladigan matn. */
export async function fn(name, body) {
  let tk = await token();
  const call = t => fetch(`${CLOUD.url}/functions/v1/${name}`, { method: 'POST', headers: { apikey: CLOUD.key, 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
  let r;
  try { r = await call(tk); } catch { const e = new Error('Internetga ulanib bo‘lmadi'); e.net = true; throw e; }
  if (r.status === 401) { await refresh(); tk = sess.access_token; try { r = await call(tk); } catch { const e = new Error('Internetga ulanib bo‘lmadi'); e.net = true; throw e; } }
  const j = await r.json().catch(() => null);
  if (!r.ok) { const e = new Error(j?.error || j?.message || ('Server xatosi (' + r.status + ')')); e.status = r.status; throw e; }
  return j;
}
