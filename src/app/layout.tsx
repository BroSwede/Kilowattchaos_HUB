import type { Metadata, Viewport } from 'next';
import './auth.css';

export const metadata: Metadata = {
  title: 'Kilowattchaos Hub',
  description: 'The team hub for FTC team Kilowattchaos.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#E8F542' };

// three.js for the robot viewer. An import map must come before any module script, so it lives in <head>.
const IMPORT_MAP = JSON.stringify({
  imports: {
    three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/',
    'three-mesh-bvh': 'https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js',
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />
        <script type="importmap" dangerouslySetInnerHTML={{ __html: IMPORT_MAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
