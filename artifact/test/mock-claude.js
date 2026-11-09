// Test double for the claude.ai runtime (db, user, comments), for local Playwright runs only.
// Shared across tabs through localStorage; ?as=<id>&owner=1 picks the viewer.
(() => {
  const KEY = 'kwc-mock-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const subs = new Set();
  const notify = () => setTimeout(() => subs.forEach((f) => f()), 0);
  addEventListener('storage', (e) => { if (e.key === KEY) notify(); });
  const snapDoc = (path, d) => ({ id: path.split('/').pop(), exists: d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(JSON.stringify(d))), metadata: { fromCache: false, hasPendingWrites: false } });
  const inColl = (path, p) => p.startsWith(path + '/') && p.slice(path.length + 1).indexOf('/') === -1;
  function query(path, filters = [], lim = 1000) {
    const run = () => { const d = load(); const docs = Object.keys(d).filter((p) => inColl(path, p)).filter((p) => filters.every(([f, op, v]) => (op === '==' ? d[p][f] === v : true))).slice(0, lim).map((p) => snapDoc(p, d[p])); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }; };
    return {
      path,
      where: (f, op, v) => query(path, [...filters, [f, op, v]], lim), orderBy: () => query(path, filters, lim), limit: (n) => query(path, filters, n),
      get: async () => run(),
      onSnapshot: (next) => { const f = () => next(run()); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
      doc: (id = Math.random().toString(36).slice(2)) => doc(`${path}/${id}`),
      add: async (data) => { const r = doc(`${path}/${Math.random().toString(36).slice(2)}`); await r.set(data); return r; },
    };
  }
  function doc(path) {
    return {
      id: path.split('/').pop(), path,
      get: async () => snapDoc(path, load()[path]),
      set: async (data) => { const d = load(); d[path] = JSON.parse(JSON.stringify(data)); save(d); notify(); },
      update: async (data) => { const d = load(); if (!d[path]) throw { code: 'invalid_argument', message: 'missing doc' }; d[path] = { ...d[path], ...JSON.parse(JSON.stringify(data)) }; save(d); notify(); },
      delete: async () => { const d = load(); delete d[path]; save(d); notify(); },
      onSnapshot: (next) => { const f = () => next(snapDoc(path, load()[path])); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
      collection: (p) => query(`${path}/${p}`),
    };
  }
  const qs = new URLSearchParams(location.search);
  const uid = qs.get('as') || 'owner', owner = qs.get('owner') === '1';
  const caps = {
    db: { doc, collection: (p) => query(p) },
    user: { id: async () => uid, isOwner: async () => owner, canEdit: async () => owner, me: async () => ({ id: uid, name: uid, isOwner: owner }) },
    comments: { openComposer: async () => ({ opened: true }) },
  };
  window.claude = { use: (n) => new Promise((r) => setTimeout(() => r(caps[n] || null), 50)) };
})();
