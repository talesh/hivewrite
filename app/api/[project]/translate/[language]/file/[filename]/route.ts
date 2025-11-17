import { NextRequest } from 'next/server';
import { requireAuth, getServerAccessToken } from '@/lib/auth';
import {
  getLanguageConfig,
  parseGitHubRepo,
  getSourceFilePath,
  getTranslationFilePath,
  getMachineTranslationFilePath,
  getTranslationBranchName,
} from '@/lib/config';
import { createGitHubClient } from '@/lib/github';
import { getFileContentAsText } from '@/lib/file-processing';
import { loadTranslationMetadata } from '@/lib/translation-metadata';
import { ensureFork } from '@/lib/fork-management';
import {
  withErrorHandling,
  createSuccessResponse,
  logger,
} from '@/lib/api-utils';
import { sanitizeFilename } from '@/lib/validation';
import type { EditorData } from '@/types';

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { project: string; language: string; filename: string } }
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

  // Decode and sanitize filename
  const filename = decodeURIComponent(params.filename);
  const safeFilename = sanitizeFilename(filename);

  logger.debug('Loading file for editing', {
    user: user.username,
    project: params.project,
    language: params.language,
    filename: safeFilename,
  });

  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  // Create GitHub client with user's access token
  const githubClient = createGitHubClient(accessToken);

  // Ensure user has fork
  await ensureFork(githubClient, user.username, owner, repo, languageCode);

  // Get all three versions of the content
  const [englishContent, translationContent, machineContent, metadata] = await Promise.all([
    // English original from upstream
    getFileContentAsText(
      githubClient,
      owner,
      repo,
      getSourceFilePath(project, safeFilename),
      project.sourceBranch
    ),

    // Working translation from user's fork
    getFileContentAsText(
      githubClient,
      user.username,
      repo,
      getTranslationFilePath(project, languageCode, safeFilename),
      branchName
    ).catch(() => ''), // Return empty if doesn't exist yet

    // Machine translation from tmp folder in upstream
    getFileContentAsText(
      githubClient,
      owner,
      repo,
      getMachineTranslationFilePath(project, languageCode, safeFilename),
      branchName
    ).catch(() => ''), // Return empty if doesn't exist

    // Load metadata
    loadTranslationMetadata(githubClient, owner, repo, project, languageCode, branchName),
  ]);

  const fileMetadata = metadata?.files[safeFilename] || {
    status: 'not-started',
    lastUpdated: null,
    lastContributor: null,
    lastCommitSha: null,
    prNumber: null,
    prUrl: null,
    wordCount: 0,
    machineTranslated: false,
    humanReviewed: false,
  };

  const editorData: EditorData = {
    filename: safeFilename,
    englishContent,
    translationContent,
    machineContent,
    metadata: fileMetadata,
    language: {
      code: languageCode,
      name: language.name,
      direction: language.direction,
    },
  };

  logger.info('File loaded successfully', {
    user: user.username,
    filename: safeFilename,
    hasTranslation: translationContent.length > 0,
    hasMachine: machineContent.length > 0,
  });

  return createSuccessResponse(editorData);
});
