import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

/**
 * Authentication middleware for API routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = verifyAccessToken(token);

      // Attach user info to request
      (req as AuthenticatedRequest).user = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
      };

      return handler(req as AuthenticatedRequest);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
  };
}

/**
 * Get user from request (for use in route handlers)
 */
export function getUserFromRequest(
  req: NextRequest
): { userId: string; username: string; email: string } | null {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
