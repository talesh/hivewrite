import { NextRequest } from 'next/server';
import { requireAuth, getServerAccessToken } from '@/lib/auth';
import { getLanguageConfig, parseGitHubRepo, getTranslationBranchName } from '@/lib/config';
import { createGitHubClient } from '@/lib/github';
import { loadTranslationMetadata } from '@/lib/translation-metadata';
import { ensureFork, getForkStatus } from '@/lib/fork-management';
import {
  withErrorHandling,
  createSuccessResponse,
  notFound,
  logger,
} from '@/lib/api-utils';
import type { DashboardData, FileListItem } from '@/types';

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
  const { project, language, languageCode } = getLanguageConfig(
    params.project,
    params.language
  );

  logger.debug('Loading dashboard', {
    user: user.username,
    project: params.project,
    language: params.language,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // Ensure user has fork
  await ensureFork(githubClient, user.username, owner, repo, languageCode);

  // Load translation metadata
  const metadata = await loadTranslationMetadata(
    githubClient,
    owner,
    repo,
    project,
    languageCode,
    branchName
  );

  if (!metadata) {
    return notFound('Translation metadata not found - This language has not been initialized yet');
  }

  // Build file list
  const files: FileListItem[] = Object.entries(metadata.files).map(
    ([filename, fileData]) => ({
      filename,
      status: fileData.status,
      lastUpdated: fileData.lastUpdated,
      lastContributor: fileData.lastContributor,
      prNumber: fileData.prNumber,
      prUrl: fileData.prUrl,
      wordCount: fileData.wordCount,
      isPriority: project.priorityFiles.includes(filename),
    })
  );

  // Calculate user stats
  const userFiles = files.filter(
    (f) => f.lastContributor === user.username && f.status === 'complete'
  );

  const userStats = {
    completedFiles: userFiles.length,
    lastSession: userFiles.length > 0
      ? userFiles.reduce((latest, f) =>
          f.lastUpdated && (!latest || f.lastUpdated > latest)
            ? f.lastUpdated
            : latest,
        null as string | null
      )
      : null,
  };

  // Check fork sync status
  const forkStatus = await getForkStatus(
    githubClient,
    user.username,
    owner,
    repo,
    languageCode
  );

  const dashboardData: DashboardData = {
    project,
    language,
    languageCode,
    files,
    stats: metadata.stats,
    userStats,
  };

  logger.info('Dashboard loaded successfully', {
    user: user.username,
    filesCount: files.length,
    userCompletedFiles: userStats.completedFiles,
  });

  return createSuccessResponse({
    data: dashboardData,
    forkStatus,
  });
});
