import { NextResponse } from 'next/server';

/**
 * Prisma error codes
 */
export const PRISMA_ERROR_CODES = {
  TABLE_NOT_FOUND: 'P2021',
  COLUMN_NOT_FOUND: 'P2000',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  UNIQUE_CONSTRAINT: 'P2002',
} as const;

/**
 * Check if an error is a database-related error
 */
export function isDatabaseError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error?.code;
  const errorMessage = error?.message || '';
  
  return (
    (typeof errorCode === 'string' && errorCode.startsWith('P')) ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('Table') ||
    errorMessage.includes('Column')
  );
}

/**
 * Check if error is a table/column not found error
 */
export function isTableOrColumnNotFoundError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error?.code;
  const errorMessage = error?.message || '';
  
  return (
    errorCode === PRISMA_ERROR_CODES.TABLE_NOT_FOUND ||
    errorCode === PRISMA_ERROR_CODES.COLUMN_NOT_FOUND ||
    errorMessage.includes('does not exist') ||
    (errorMessage.includes('Table') && errorMessage.includes('not found')) ||
    (errorMessage.includes('Column') && errorMessage.includes('does not exist'))
  );
}

/**
 * Handle Prisma errors and return appropriate error messages
 */
export function handlePrismaError(error: any): { message: string; status: number } {
  if (!error) {
    return { message: 'An unexpected error occurred', status: 500 };
  }

  const errorCode = error?.code;
  const errorMessage = error?.message || '';

  // Table/column not found errors
  if (isTableOrColumnNotFoundError(error)) {
    return {
      message: 'Database migration required. Please run: npx prisma migrate deploy',
      status: 500,
    };
  }

  // Unique constraint violation
  if (errorCode === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
    return {
      message: 'A record with this value already exists',
      status: 409,
    };
  }

  // Foreign key constraint violation
  if (errorCode === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT) {
    return {
      message: 'Invalid reference to related record',
      status: 400,
    };
  }

  // Generic database error
  if (isDatabaseError(error)) {
    return {
      message: 'Database error occurred',
      status: 500,
    };
  }

  // Unknown error
  return {
    message: errorMessage || 'An unexpected error occurred',
    status: 500,
  };
}

/**
 * Create a standardized API error response
 */
export function createApiErrorResponse(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Create a standardized API success response
 */
export function createApiSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: any = { data };
  if (message) {
    response.message = message;
  }
  return NextResponse.json(response, { status });
}

/**
 * Render a database migration error component
 */
export function renderMigrationError(): JSX.Element {
  return (
    <div className="alert alert-warning" role="alert">
      <strong>Database Migration Required</strong>
      <p className="mb-0">The messages table has not been created yet. Please run: <code>npx prisma migrate deploy</code></p>
    </div>
  );
}

/**
 * Render a generic error component
 */
export function renderGenericError(): JSX.Element {
  return (
    <div className="alert alert-danger" role="alert">
      <strong>Error Loading Messages</strong>
      <p className="mb-0">An error occurred while loading messages. Please try refreshing the page.</p>
    </div>
  );
}

