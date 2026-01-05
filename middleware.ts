import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ['/dashboard', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Auth routes (redirect to dashboard if already logged in)
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Validate session if cookie exists
  let isValidSession = false;
  if (sessionCookie?.value) {
    try {
      // Quick validation: check if user exists
      const user = await prisma.user.findUnique({
        where: { id: sessionCookie.value },
        select: { id: true },
      });
      isValidSession = !!user;
    } catch (error) {
      // If database error, treat as invalid session
      isValidSession = false;
    }
  }

  if (isProtectedRoute && !isValidSession) {
    // Clear invalid session cookie if it exists
    if (sessionCookie) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && isValidSession) {
    // Redirect to dashboard if trying to access auth routes while logged in
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

