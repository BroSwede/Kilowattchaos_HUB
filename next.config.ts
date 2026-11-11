import type { NextConfig } from 'next';

const config: NextConfig = {
  // PGlite ships a WebAssembly Postgres; keep it out of the server bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
  // BioBuzz XR is a static site in public/biobuzz-xr; serve its start page at the folder's own address.
  async rewrites() {
    return [
      { source: '/biobuzz-xr', destination: '/biobuzz-xr/index.html' },
      { source: '/biobuzz-xr/', destination: '/biobuzz-xr/index.html' },
    ];
  },
  async headers() {
    return [
      { source: '/biobuzz-xr/assets/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/hub/model/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'same-origin' },
      ] },
      // BioBuzz XR's Driver Academy runs the match sim in a frame of its own site, so it may frame same-origin pages.
      { source: '/((?!biobuzz-xr).*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      { source: '/biobuzz-xr/:path*', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
    ];
  },
};
export default config;
