import { NextResponse } from 'next/server';

// Unit IV: Protected Routes & Session Management
// Next.js Edge Middleware to guard private routes before page rendering
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('clyra_token')?.value;

  // Protected paths requiring authenticated session
  const isProtectedPath =
    pathname.startsWith('/my-bookings') ||
    pathname.startsWith('/organizer') ||
    pathname.startsWith('/admin');

  if (isProtectedPath && !token) {
    // Redirect unauthenticated requests to login page with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Ensure middleware only intercepts protected page routes, never API or static assets
export const config = {
  matcher: [
    '/my-bookings/:path*',
    '/organizer/:path*',
    '/admin/:path*',
  ],
};
