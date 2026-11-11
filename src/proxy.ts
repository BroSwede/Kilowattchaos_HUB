import { NextResponse, type NextRequest } from 'next/server';
import { isPreview } from '@/lib/mode';

// In preview mode the site opens on a pretend sign-in page (/login) that lets anyone in, every setup and
// mentor page goes there too, and the data API is closed,
// so visitors only ever see sample content and nothing can be saved. See src/lib/mode.ts.
export function proxy(req: NextRequest) {
  if (!isPreview()) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'The hub is in preview mode, so nothing is saved.' }, { status: 403 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/', '/join', '/setup', '/mentor', '/pending', '/checkin', '/consent/:path*', '/api/:path*'],
};
