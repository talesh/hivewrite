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
import { createPullRequest, getExistingPR } from '@/lib/fork-management';
import { markFileComplete } from '@/lib/translation-metadata';
import {
  withErrorHandling,
  parseRequestBody,
  createSuccessResponse,
  logger,
} from '@/lib/api-utils';
import {
  validateRequest,
  createPRRequestSchema,
  sanitizeFilename,
} from '@/lib/validation';
import type { CreatePRResponse } from '@/types';

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
  const { project, language, languageCode } = getLanguageConfig(
    params.project,
    params.language
  );

  // Parse and validate request body
  const body = await parseRequestBody(request);
  const validated = validateRequest(createPRRequestSchema, body);
  const { filename, content, message } = validated;

  // Sanitize filename to prevent path traversal
  const safeFilename = sanitizeFilename(filename);

  logger.info('Creating pull request', {
    user: user.username,
    project: params.project,
    language: params.language,
    filename: safeFilename,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // First, save the file to user's fork
  const filePath = getTranslationFilePath(project, languageCode, safeFilename);
  const saveResult = await saveFileToFork(
    githubClient,
    user.username,
    repo,
    filePath,
    content,
    message || `[${languageCode}] Complete translation for ${safeFilename}`,
    branchName
  );

  // Check if PR already exists
  let existingPR = await getExistingPR(
    githubClient,
    owner,
    repo,
    user.username,
    branchName
  );

  let prNumber: number;
  let prUrl: string;

  if (existingPR) {
    // PR already exists, just return it
    prNumber = existingPR.number;
    prUrl = existingPR.url;
    logger.info('Updated existing PR', { prNumber, prUrl });
  } else {
    // Create new PR
    const prTitle = `[${languageCode}] ${language.name} translation for ${safeFilename}`;
    const prBody = `## Summary
- Translated ${safeFilename} to ${language.name}
- Updated by: @${user.username}

${message ? `\n## Notes\n${message}` : ''}

🤖 Generated with [OWASP Translation Hub](https://github.com/OWASP/translation-hub)`;

    const pr = await createPullRequest(
      githubClient,
      user.username,
      owner,
      repo,
      branchName,
      prTitle,
      prBody
    );

    prNumber = pr.number;
    prUrl = pr.url;
    logger.info('Created new PR', { prNumber, prUrl });
  }

  // Update metadata to mark as complete
  try {
    const adminToken = process.env.GITHUB_ADMIN_TOKEN;
    if (adminToken) {
      const adminGitHub = createGitHubClient(adminToken);

      await markFileComplete(
        adminGitHub,
        owner,
        repo,
        project,
        languageCode,
        safeFilename,
        user.username,
        saveResult.sha,
        prNumber,
        prUrl,
        branchName
      );
    } else {
      logger.warn('Admin token not configured, skipping metadata update');
    }
  } catch (metadataError) {
    logger.error('Failed to update metadata', metadataError);
  }

  const response: CreatePRResponse = {
    success: true,
    message: existingPR
      ? 'Changes added to existing pull request'
      : 'Pull request created successfully',
    prNumber,
    prUrl,
  };

  return createSuccessResponse(response);
});
