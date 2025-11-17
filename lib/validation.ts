import { z } from 'zod';
import path from 'path';

/**
 * Path Sanitization
 * Prevents path traversal attacks by validating and normalizing file paths
 */

export function sanitizeFilename(filename: string): string {
  // Remove any path components - only allow the filename itself
  const normalized = path.basename(filename);

  // Check if normalization changed the filename (indicates path traversal attempt)
  if (normalized !== filename) {
    throw new Error('Invalid filename: path traversal detected');
  }

  // Additional checks for suspicious characters
  if (normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
    throw new Error('Invalid filename: contains prohibited characters');
  }

  // Ensure filename is not empty
  if (!normalized || normalized.trim() === '') {
    throw new Error('Invalid filename: cannot be empty');
  }

  return normalized;
}

export function sanitizePath(filepath: string, allowedBasePaths: string[]): string {
  // Normalize the path
  const normalized = path.normalize(filepath).replace(/\\/g, '/');

  // Check if the normalized path starts with any of the allowed base paths
  const isAllowed = allowedBasePaths.some(basePath => {
    const normalizedBase = path.normalize(basePath).replace(/\\/g, '/');
    return normalized.startsWith(normalizedBase);
  });

  if (!isAllowed) {
    throw new Error('Invalid path: outside allowed directories');
  }

  return normalized;
}

/**
 * Zod Validation Schemas
 * Defines schemas for validating API request inputs
 */

// Language code validation (e.g., "en-US", "ar-SA")
export const languageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}-[A-Z]{2}$/, 'Invalid language code format (expected: xx-XX)');

// Project slug validation (alphanumeric and hyphens only)
export const projectSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Invalid project slug (only lowercase letters, numbers, and hyphens allowed)')
  .min(1)
  .max(100);

// Filename validation (markdown files)
export const filenameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_.-]+\.md$/, 'Invalid filename (must be a .md file with safe characters)')
  .min(1)
  .max(255);

// Content validation (with size limits)
export const contentSchema = z
  .string()
  .min(1, 'Content cannot be empty')
  .max(10_000_000, 'Content too large (max 10MB)');

// Commit message validation
export const commitMessageSchema = z
  .string()
  .min(3, 'Commit message too short')
  .max(500, 'Commit message too long');

/**
 * API Request Validation Schemas
 */

// Save draft request
export const saveDraftRequestSchema = z.object({
  filename: filenameSchema,
  content: contentSchema,
});

export type SaveDraftRequest = z.infer<typeof saveDraftRequestSchema>;

// Create PR request
export const createPRRequestSchema = z.object({
  filename: filenameSchema,
  content: contentSchema,
  message: commitMessageSchema,
});

export type CreatePRRequest = z.infer<typeof createPRRequestSchema>;

// Initialize language request
export const initLanguageRequestSchema = z.object({
  force: z.boolean().optional(),
});

export type InitLanguageRequest = z.infer<typeof initLanguageRequestSchema>;

/**
 * Validation Helper Functions
 */

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation error: ${messages}`);
    }
    throw error;
  }
}

/**
 * Rate Limiting Helpers
 * Note: Requires @upstash/ratelimit and @upstash/redis
 * For now, these are placeholder functions
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple in-memory rate limiter (for development)
// In production, use @upstash/ratelimit with Redis
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const existing = rateLimitStore.get(key);

  // Clean up expired entries
  if (existing && existing.resetAt < now) {
    rateLimitStore.delete(key);
  }

  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  // Increment count
  existing.count++;

  if (existing.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetAt,
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: existing.resetAt,
  };
}

/**
 * Admin Authorization Helpers
 */

export function isProjectAdmin(username: string, projectSlug: string): boolean {
  const adminUsers = process.env.ADMIN_USERS?.split(',').map(u => u.trim()) || [];

  // For MVP, we have global admins. In production, implement per-project permissions
  return adminUsers.includes(username);
}

export function requireProjectAdmin(username: string, projectSlug: string): void {
  if (!isProjectAdmin(username, projectSlug)) {
    throw new Error('Unauthorized: Admin access required');
  }
}
