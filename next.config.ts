import type { NextConfig } from 'next';

const config: NextConfig = {
  // PGlite ships a WebAssembly Postgres; keep it out of the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  async headers() {
    return [
      { source: '/hub/model/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'same-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ] },
    ];
  },
};
export default config;
