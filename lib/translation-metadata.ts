import type {
  TranslationMetadata,
  TranslationFileMetadata,
  TranslationStats,
  ProjectConfig,
  FileStatus,
} from '@/types';
import { GitHubClient } from './github';
import { getTranslationMetadataPath } from './config';

/**
 * Create initial translation metadata for a new language initialization
 */
export function createInitialTranslationMetadata(
  projectSlug: string,
  project: ProjectConfig,
  languageCode: string,
  languageName: string,
  direction: 'ltr' | 'rtl',
  coordinator: string,
  files: string[],
  sourceCommitSha: string
): TranslationMetadata {
  const now = new Date().toISOString();

  const filesMetadata: Record<string, TranslationFileMetadata> = {};

  for (const filename of files) {
    filesMetadata[filename] = {
      status: 'not-started',
      lastUpdated: null,
      lastContributor: null,
      lastCommitSha: null,
      prNumber: null,
      prUrl: null,
      wordCount: 0,
      machineTranslated: true,
      humanReviewed: false,
    };
  }

  const stats: TranslationStats = {
    totalFiles: files.length,
    completed: 0,
    inProgress: 0,
    notStarted: files.length,
    percentComplete: 0,
    totalWords: 0,
    translatedWords: 0,
    contributors: [],
  };

  return {
    version: '1.0',
    language: languageCode,
    languageName,
    direction,
    project: projectSlug,
    coordinator,
    initialized: now,
    lastUpdated: now,
    files: filesMetadata,
    stats,
    meta: {
      machineTranslationService: 'DeepL',
      machineTranslationDate: now,
      sourceCommitSha,
      notes: 'Initialized with machine translation',
    },
  };
}

/**
 * Load translation metadata from GitHub
 */
export async function loadTranslationMetadata(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  project: ProjectConfig,
  languageCode: string,
  branch: string
): Promise<TranslationMetadata | null> {
  try {
    const path = getTranslationMetadataPath(project, languageCode);
    const response = await githubClient.getFileContent(owner, repo, path, branch);

    if ('content' in response.data && response.data.type === 'file') {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return JSON.parse(content) as TranslationMetadata;
    }

    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Save translation metadata to GitHub
 */
export async function saveTranslationMetadata(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  project: ProjectConfig,
  languageCode: string,
  metadata: TranslationMetadata,
  branch: string,
  commitMessage: string
): Promise<void> {
  const path = getTranslationMetadataPath(project, languageCode);
  const content = JSON.stringify(metadata, null, 2);

  // Try to get existing file SHA
  let sha: string | undefined;
  try {
    const existing = await githubClient.getFileContent(owner, repo, path, branch);
    if ('sha' in existing.data) {
      sha = existing.data.sha;
    }
  } catch (error: any) {
    // File doesn't exist yet, which is fine
  }

  await githubClient.createOrUpdateFile(
    owner,
    repo,
    path,
    content,
    commitMessage,
    branch,
    sha
  );
}

/**
 * Update file metadata in translation.json
 */
export function updateFileMetadata(
  metadata: TranslationMetadata,
  filename: string,
  updates: Partial<TranslationFileMetadata>
): TranslationMetadata {
  const updatedFiles = { ...metadata.files };

  if (!updatedFiles[filename]) {
    updatedFiles[filename] = {
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
  }

  updatedFiles[filename] = {
    ...updatedFiles[filename],
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  // Recalculate stats
  const stats = calculateStats(updatedFiles);

  return {
    ...metadata,
    files: updatedFiles,
    stats,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate statistics from files metadata
 */
export function calculateStats(
  files: Record<string, TranslationFileMetadata>
): TranslationStats {
  const fileArray = Object.values(files);
  const totalFiles = fileArray.length;

  const completed = fileArray.filter((f) => f.status === 'complete').length;
  const inProgress = fileArray.filter((f) => f.status === 'in-progress').length;
  const notStarted = fileArray.filter((f) => f.status === 'not-started').length;

  const percentComplete = totalFiles > 0 ? Math.round((completed / totalFiles) * 100) : 0;

  const totalWords = fileArray.reduce((sum, f) => sum + f.wordCount, 0);
  const translatedWords = fileArray
    .filter((f) => f.status === 'complete')
    .reduce((sum, f) => sum + f.wordCount, 0);

  // Get unique contributors
  const contributorsSet = new Set<string>();
  fileArray.forEach((f) => {
    if (f.lastContributor) {
      contributorsSet.add(f.lastContributor);
    }
  });

  return {
    totalFiles,
    completed,
    inProgress,
    notStarted,
    percentComplete,
    totalWords,
    translatedWords,
    contributors: Array.from(contributorsSet),
  };
}

/**
 * Mark file as in progress
 */
export async function markFileInProgress(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  project: ProjectConfig,
  languageCode: string,
  filename: string,
  contributor: string,
  commitSha: string,
  branch: string
): Promise<void> {
  const metadata = await loadTranslationMetadata(
    githubClient,
    owner,
    repo,
    project,
    languageCode,
    branch
  );

  if (!metadata) {
    throw new Error('Translation metadata not found');
  }

  const updated = updateFileMetadata(metadata, filename, {
    status: 'in-progress',
    lastContributor: contributor,
    lastCommitSha: commitSha,
  });

  await saveTranslationMetadata(
    githubClient,
    owner,
    repo,
    project,
    languageCode,
    updated,
    branch,
    `[${languageCode}] Mark ${filename} as in progress`
  );
}

/**
 * Mark file as complete with PR info
 */
export async function markFileComplete(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  project: ProjectConfig,
  languageCode: string,
  filename: string,
  contributor: string,
  commitSha: string,
  prNumber: number,
  prUrl: string,
  branch: string
): Promise<void> {
  const metadata = await loadTranslationMetadata(
    githubClient,
    owner,
    repo,
    project,
    languageCode,
    branch
  );

  if (!metadata) {
    throw new Error('Translation metadata not found');
  }

  const updated = updateFileMetadata(metadata, filename, {
    status: 'complete',
    lastContributor: contributor,
    lastCommitSha: commitSha,
    prNumber,
    prUrl,
    humanReviewed: true,
  });

  await saveTranslationMetadata(
    githubClient,
    owner,
    repo,
    project,
    languageCode,
    updated,
    branch,
    `[${languageCode}] Mark ${filename} as complete (PR #${prNumber})`
  );
}

/**
 * Count words in markdown content
 */
export function countWords(content: string): number {
  // Remove code blocks
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');

  // Remove inline code
  const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');

  // Remove markdown syntax
  const cleanText = withoutInlineCode
    .replace(/[#*_\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Count words
  const words = cleanText.split(/\s+/).filter((word) => word.length > 0);

  return words.length;
}
