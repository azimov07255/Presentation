// Brauzer ichida saqlash (IndexedDB). Rasmlar taqdimot bilan birga saqlanadi.
const DB = 'slaydo', ST = 'decks';
let dbp;
const open = () => dbp ||= new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error('IndexedDB yo‘q'));
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => { const t = db.transaction(ST, mode), q = fn(t.objectStore(ST)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
};
const mem = new Map(); // IndexedDB ishlamasa (maxfiy rejim) — vaqtincha xotira

export async function saveDeck(deck, assets) {
  const rec = { id: deck.id, title: deck.title, updated: deck.updated, deck, assets };
  try { await tx('readwrite', s => s.put(rec)); } catch { mem.set(rec.id, rec); }
}
export async function loadDeck(id) {
  try { const r = await tx('readonly', s => s.get(id)); if (r) return r; } catch { /* xotiraga o‘tadi */ }
  return mem.get(id) || null;
}
export async function listDecks() {
  let a = [];
  try { a = await tx('readonly', s => s.getAll()) || []; } catch { /* */ }
  const ids = new Set(a.map(r => r.id)); mem.forEach(r => { if (!ids.has(r.id)) a.push(r); });
  return a.sort((x, y) => y.updated - x.updated);
}
export async function removeDeck(id) {
  mem.delete(id);
  try { await tx('readwrite', s => s.delete(id)); } catch { /* */ }
}
