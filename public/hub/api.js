// The hub's link to the team database. Every zone page uses these helpers.
// Records are { id, user_id, author, data, created_at, updated_at }; `data` is whatever the page saved.
async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (res.status === 401) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.hash); throw new Error('Signed out'); }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `Could not save (${res.status}).`);
  return out;
}

// Preview mode (no sign-in, sample content only): the server marks the page, and every call stays in this tab.
export const PREVIEW = document.getElementById('kwc-root')?.dataset.preview === '1';
const live = {
  me: () => call('GET', '/api/me'),
  list: async (kind) => (await call('GET', `/api/records/${kind}`)).items,
  create: async (kind, data) => (await call('POST', `/api/records/${kind}`, { data })).item,
  update: async (kind, id, data) => (await call('PATCH', `/api/records/${kind}/${id}`, { data })).item,
  remove: (kind, id) => call('DELETE', `/api/records/${kind}/${id}`),
  checkinInfo: () => call('GET', '/api/checkin'),
  checkin: (code) => call('POST', '/api/checkin', { code }),
};
export const api = PREVIEW ? (await import('./preview.js')).previewApi : live;

// Who is signed in, the team roster and team settings. Filled once at boot (see app.js).
export const session = { user: null, roster: [], team: { name: 'Kilowattchaos', chatEnabled: false }, demo: false, preview: false };
export const isMentor = () => session.user?.role === 'mentor';
export const me = () => session.user?.name || '';
