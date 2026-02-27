import { NextRequest, NextResponse } from 'next/server';

const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const MOBILE_ALLOWED_PREFIXES = [
  '/assistant',
  '/login',
  '/signup',
  '/onboarding',
  '/invite/',
  '/auth/',
  '/api/',
  '/_next/',
];

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  if (!MOBILE_REGEX.test(ua)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const allowed =
    pathname === '/' ||
    MOBILE_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));

  if (allowed) return NextResponse.next();

  return NextResponse.redirect(new URL('/assistant', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
