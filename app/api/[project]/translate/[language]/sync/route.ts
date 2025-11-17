import { NextRequest } from 'next/server';
import { requireAuth, getServerAccessToken } from '@/lib/auth';
import {
  getLanguageConfig,
  parseGitHubRepo,
  getTranslationBranchName,
} from '@/lib/config';
import { createGitHubClient } from '@/lib/github';
import { syncForkWithUpstream, checkForkSyncStatus } from '@/lib/fork-management';
import {
  withErrorHandling,
  createSuccessResponse,
  logger,
} from '@/lib/api-utils';
import type { SyncForkResponse } from '@/types';

export const GET = withErrorHandling(async (
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

  logger.debug('Checking fork sync status', {
    user: user.username,
    project: params.project,
    language: params.language,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // Check sync status
  const syncStatus = await checkForkSyncStatus(
    githubClient,
    user.username,
    owner,
    repo,
    branchName
  );

  logger.info('Fork sync status checked', {
    user: user.username,
    behindBy: syncStatus.behindBy,
    aheadBy: syncStatus.aheadBy,
  });

  return createSuccessResponse({ syncStatus });
});

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

  logger.info('Starting fork sync', {
    user: user.username,
    project: params.project,
    language: params.language,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // Sync fork
  const result = await syncForkWithUpstream(
    githubClient,
    user.username,
    repo,
    branchName
  );

  if (result.success) {
    logger.info('Fork synced successfully', {
      user: user.username,
    });
  } else {
    logger.warn('Fork sync failed due to conflicts', {
      user: user.username,
      conflicts: result.conflicts,
    });
  }

  const response: SyncForkResponse = {
    success: result.success,
    message: result.success
      ? 'Fork synced successfully'
      : 'Sync failed due to conflicts',
    conflicts: result.conflicts,
    conflictUrl: result.conflictUrl,
  };

  return createSuccessResponse(response);
});
