import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and API routes
  const staticExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.css', '.js', '.json', '.map'];
  const isStaticAsset = staticExtensions.some(ext => pathname.endsWith(ext));
  
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || isStaticAsset) {
    return NextResponse.next();
  }

  // Protected routes
  const protectedRoutes = ['/dashboard', '/settings', '/lists'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if session cookie exists (validation happens in page components)
  // Note: We can't use Prisma in Edge Runtime, so we just check cookie existence
  // Page components will validate the session properly
  const hasSessionCookie = !!sessionCookie?.value;

  if (isProtectedRoute && !hasSessionCookie) {
    // Redirect to login if trying to access protected route without session cookie
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Removed auth route redirect - let page components handle session validation
  // This allows users with invalid/expired cookies to access login/register pages

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with common static extensions (using non-capturing group)
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|json|map))/?.*)',
  ],
};

