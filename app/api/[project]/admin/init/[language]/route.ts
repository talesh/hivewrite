import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getLanguageConfig } from '@/lib/config';
import { createGitHubClient } from '@/lib/github';
import { initializeLanguage } from '@/lib/file-processing';
import {
  withErrorHandling,
  parseRequestBody,
  createSuccessResponse,
  createErrorResponse,
  logger,
  rateLimitExceeded,
  forbidden,
  ErrorCode,
} from '@/lib/api-utils';
import {
  validateRequest,
  initLanguageRequestSchema,
  requireProjectAdmin,
  checkRateLimit,
} from '@/lib/validation';
import type { LanguageInitProgress } from '@/types';

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { project: string; language: string } }
) => {
  // Authenticate user
  const user = await requireAuth();

  // CRITICAL: Check admin authorization
  try {
    requireProjectAdmin(user.username, params.project);
  } catch (error) {
    logger.warn('Unauthorized admin access attempt', {
      user: user.username,
      project: params.project,
    });
    return forbidden('Admin access required for language initialization');
  }

  // Rate limiting: 5 initializations per hour per user
  const rateLimitResult = checkRateLimit(
    `init:${user.username}`,
    5,
    60 * 60 * 1000 // 1 hour
  );

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for language initialization', {
      user: user.username,
      resetAt: rateLimitResult.reset,
    });
    return rateLimitExceeded(rateLimitResult.reset);
  }

  // Get project and language config
  const projectSlug = params.project;
  const languageCode = params.language;

  const config = getLanguageConfig(projectSlug, languageCode);
  const { project, language, languageCode: langCode } = config;

  // Parse and validate request body
  const body = await parseRequestBody(request);
  const validated = validateRequest(initLanguageRequestSchema, body);

  logger.info('Starting language initialization', {
    user: user.username,
    project: projectSlug,
    language: languageCode,
    force: validated.force,
  });

  // Create GitHub client with admin token
  const adminToken = process.env.GITHUB_ADMIN_TOKEN;
  if (!adminToken) {
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Admin token not configured',
      500,
      'GITHUB_ADMIN_TOKEN environment variable not set'
    );
  }

  const githubClient = createGitHubClient(adminToken);

  // Progress tracking (in production, use WebSocket or SSE for real-time updates)
  const progressUpdates: LanguageInitProgress[] = [];

  const result = await initializeLanguage(githubClient, {
    project,
    languageCode: langCode,
    languageName: language.name,
    direction: language.direction,
    coordinator: user.username,
    sourceCommit: (validated as any).sourceCommit,
    onProgress: (progress) => {
      progressUpdates.push(progress);
      logger.debug('Initialization progress', progress);
    },
  });

  if (!result.success) {
    logger.error('Language initialization completed with errors', {
      filesProcessed: result.filesProcessed,
      errors: result.errors?.length || 0,
    });

    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Language initialization completed with errors',
      207, // Multi-Status
      {
        filesProcessed: result.filesProcessed,
        errors: result.errors,
        branchUrl: result.branchUrl,
        progress: progressUpdates,
      }
    );
  }

  logger.info('Language initialization successful', {
    filesProcessed: result.filesProcessed,
    branchUrl: result.branchUrl,
  });

  return createSuccessResponse(
    {
      filesProcessed: result.filesProcessed,
      branchUrl: result.branchUrl,
      progress: progressUpdates,
    },
    `Successfully initialized ${language.name} translation`
  );
});
