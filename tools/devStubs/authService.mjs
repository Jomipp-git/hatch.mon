/* Offline stand-in for authService.mjs, served ONLY by `tools/serveLocal.py --offline`.
 *
 * It is never staged into dist/ and never reaches the deployed site: the builder's allowlist
 * follows index.html, which imports the real module. Swapping happens in the local server, so
 * nothing in the shipped tree knows this file exists.
 *
 * There is no Supabase import here, so an offline session cannot reach the production project
 * even by accident. The save row lives in localStorage, which means the real cloudSaveService
 * still runs its whole revision/merge path against it — only the transport is local.
 */
const USER_ID = '00000000-0000-4000-8000-0000000000de';
const EMAIL = 'local@hatch.mon';
const ROW_KEY = 'hatch.mon.devcloud.row';
const session = {
 user: {id: USER_ID, email: EMAIL},
 access_token: 'offline', refresh_token: 'offline', expires_at: 2 ** 31 - 1,
};

const readRow = () => {try {return JSON.parse(localStorage.getItem(ROW_KEY) || 'null');} catch {return null;}};
const writeRow = row => localStorage.setItem(ROW_KEY, JSON.stringify(row));

// Only the four calls cloudSaveService makes are implemented; anything else must fail loudly
// rather than silently resolve, so a missing stub shows up here instead of in the game.
function table(name) {
 if (name !== 'game_saves') throw Error(`offline stub: unknown table ${name}`);
 return {
  select() {return this;},
  eq() {return this;},
  async maybeSingle() {return {data: readRow(), error: null};},
  async upsert(row) {
   writeRow({game_state: row.game_state, schema_version: row.schema_version, updated_at: row.updated_at});
   return {data: null, error: null};
  },
 };
}

export const client = {
 from: table,
 auth: {
  async getSession() {return {data: {session}, error: null};},
  onAuthStateChange(callback) {
   queueMicrotask(() => callback('SIGNED_IN', session));
   return {data: {subscription: {unsubscribe() {}}}};
  },
 },
 // No channel(): cloudSaveService falls back to polling, which is what we want locally.
};

export const auth = {
 login: async () => ({data: {session}, error: null}),
 signup: async () => ({data: {session}, error: null}),
 google: async () => ({data: {}, error: null}),
 recover: async () => ({data: {}, error: null}),
 update: async () => ({data: {}, error: null}),
 logout: async () => ({error: null}),
};

const authText = (key, vars) => globalThis.HatchI18n?.t(key, vars) ?? key;
export function humanError() {return authText('auth.requestFailed');}

// This module is deferred, so DOMContentLoaded may already have fired by now.
const showBadge = () => {
 const badge = document.createElement('div');
 badge.textContent = 'OFFLINE · datos locales';
 badge.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;padding:3px 10px;font:700 11px/1.4 ui-monospace,monospace;' +
  'letter-spacing:.08em;background:#b4351f;color:#fff;border-bottom-right-radius:8px;pointer-events:none';
 document.body.append(badge);
};
if (document.body) showBadge(); else addEventListener('DOMContentLoaded', showBadge);
