import { NextResponse } from 'next/server';

/**
 * Standardized API Error Response Format
 */

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface APISuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

/**
 * Error Codes
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_FILENAME = 'INVALID_FILENAME',
  INVALID_PATH = 'INVALID_PATH',

  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // External Services
  GITHUB_ERROR = 'GITHUB_ERROR',
  TRANSLATION_ERROR = 'TRANSLATION_ERROR',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Create standardized error responses
 */

export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
  status: number,
  details?: any
): NextResponse<APIErrorResponse> {
  const isProduction = process.env.NODE_ENV === 'production';

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        // Only include details in development mode
        details: isProduction ? undefined : details,
      },
    },
    { status }
  );
}

export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<APISuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Common Error Response Creators
 */

export function unauthorized(message: string = 'Authentication required'): NextResponse<APIErrorResponse> {
  return createErrorResponse(ErrorCode.UNAUTHORIZED, message, 401);
}

export function forbidden(message: string = 'Access denied'): NextResponse<APIErrorResponse> {
  return createErrorResponse(ErrorCode.FORBIDDEN, message, 403);
}

export function notFound(message: string = 'Resource not found'): NextResponse<APIErrorResponse> {
  return createErrorResponse(ErrorCode.NOT_FOUND, message, 404);
}

export function validationError(message: string, details?: any): NextResponse<APIErrorResponse> {
  return createErrorResponse(ErrorCode.VALIDATION_ERROR, message, 400, details);
}

export function rateLimitExceeded(resetAt: number): NextResponse<APIErrorResponse> {
  const response = createErrorResponse(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    429,
    { resetAt }
  );

  // Add Retry-After header
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  response.headers.set('Retry-After', retryAfter.toString());

  return response;
}

export function internalError(error: any): NextResponse<APIErrorResponse> {
  // Log the full error server-side
  console.error('Internal error:', error);

  const isProduction = process.env.NODE_ENV === 'production';

  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    isProduction ? 'An internal error occurred' : error.message,
    500,
    isProduction ? undefined : {
      stack: error.stack,
      name: error.name,
    }
  );
}

/**
 * Sanitize Error Messages
 * Removes sensitive information from error messages in production
 */

export function sanitizeErrorMessage(error: any): string {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production, return generic messages for internal errors
    if (error.message?.includes('ENOENT')) {
      return 'Resource not found';
    }
    if (error.message?.includes('EACCES')) {
      return 'Access denied';
    }
    if (error.message?.includes('timeout')) {
      return 'Request timeout';
    }
    // Don't expose internal error details
    return 'An error occurred';
  }

  // In development, return the actual error message
  return error.message || 'Unknown error';
}

/**
 * API Route Handler Wrapper
 * Provides consistent error handling, logging, and response formatting
 */

type HandlerFunction = (
  request: Request,
  context: any
) => Promise<NextResponse>;

export function withErrorHandling(handler: HandlerFunction): HandlerFunction {
  return async (request: Request, context: any) => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      console.error('API route error:', {
        path: request.url,
        method: request.method,
        error: error.message,
        stack: error.stack,
      });

      // Handle specific error types
      if (error.message === 'Authentication required') {
        return unauthorized();
      }

      if (error.message?.startsWith('Unauthorized')) {
        return forbidden(error.message);
      }

      if (error.message?.startsWith('Validation error')) {
        return validationError(error.message);
      }

      if (error.message?.includes('not found')) {
        return notFound(error.message);
      }

      // Default to internal error
      return internalError(error);
    }
  };
}

/**
 * Logging Utilities
 * Simple structured logging (replace with proper logger like Winston/Pino in production)
 */

export const logger = {
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  },

  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },

  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
};

/**
 * Request Validation Helper
 */

export async function parseRequestBody<T = any>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
