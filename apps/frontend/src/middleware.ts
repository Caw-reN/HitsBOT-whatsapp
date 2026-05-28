import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Route Guard: Protect /dashboard and its sub-routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      console.log(`[Middleware] 🔒 Unauthenticated access to ${pathname} - Redirecting to /login`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirect logged-in users away from login pages
  if (pathname === '/login' || pathname === '/') {
    if (token) {
      console.log(`[Middleware] 🔓 User already logged in - Redirecting from ${pathname} to /dashboard`);
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Specify exactly which routes this middleware should execute on
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/login', 
    '/'
  ],
};
