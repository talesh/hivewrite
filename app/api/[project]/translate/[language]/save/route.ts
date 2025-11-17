import { NextRequest } from 'next/server';
import { requireAuth, getServerAccessToken } from '@/lib/auth';
import {
  getLanguageConfig,
  parseGitHubRepo,
  getTranslationFilePath,
  getTranslationBranchName,
} from '@/lib/config';
import { createGitHubClient } from '@/lib/github';
import { saveFileToFork } from '@/lib/file-processing';
import { markFileInProgress } from '@/lib/translation-metadata';
import {
  withErrorHandling,
  parseRequestBody,
  validationError,
  internalError,
  createSuccessResponse,
  logger,
} from '@/lib/api-utils';
import {
  validateRequest,
  saveDraftRequestSchema,
  sanitizeFilename,
} from '@/lib/validation';
import type { SaveDraftResponse } from '@/types';

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { project: string; language: string } }
) => {
  // Authenticate user
  const user = await requireAuth();
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    throw new Error('Authentication required: Access token not available');
  }

  // Get project configuration
  const { project, languageCode } = getLanguageConfig(
    params.project,
    params.language
  );

  // Parse and validate request body
  const body = await parseRequestBody(request);
  const validated = validateRequest(saveDraftRequestSchema, body);
  const { filename, content } = validated;

  // Sanitize filename to prevent path traversal
  const safeFilename = sanitizeFilename(filename);

  logger.info('Saving draft', {
    user: user.username,
    project: params.project,
    language: params.language,
    filename: safeFilename,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // Save to user's fork
  const filePath = getTranslationFilePath(project, languageCode, safeFilename);
  const result = await saveFileToFork(
    githubClient,
    user.username,
    repo,
    filePath,
    content,
    `[Draft] Update ${languageCode} translation for ${safeFilename}`,
    branchName
  );

  // Update metadata to mark as in-progress
  try {
    const adminToken = process.env.GITHUB_ADMIN_TOKEN;
    if (adminToken) {
      const adminGitHub = createGitHubClient(adminToken);

      await markFileInProgress(
        adminGitHub,
        owner,
        repo,
        project,
        languageCode,
        safeFilename,
        user.username,
        result.sha,
        branchName
      );
    } else {
      logger.warn('Admin token not configured, skipping metadata update');
    }
  } catch (metadataError) {
    // Don't fail the save if metadata update fails
    logger.error('Failed to update metadata', metadataError);
  }

  const response: SaveDraftResponse = {
    success: true,
    message: 'Draft saved successfully',
    commitSha: result.sha,
    timestamp: new Date().toISOString(),
  };

  return createSuccessResponse(response);
});
