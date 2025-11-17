import type { ProjectConfig, LanguageInitProgress } from '@/types';
import { GitHubClient } from './github';
import { getTranslationService } from './translation';
import {
  getSourceFilePath,
  getTranslationFilePath,
  getMachineTranslationFilePath,
  getTranslationBranchName,
  parseGitHubRepo,
  matchesFilePattern,
} from './config';
import {
  createInitialTranslationMetadata,
  saveTranslationMetadata,
  countWords,
} from './translation-metadata';

export interface InitializeLanguageOptions {
  project: ProjectConfig;
  languageCode: string;
  languageName: string;
  direction: 'ltr' | 'rtl';
  coordinator: string;
  sourceCommit?: string;
  onProgress?: (progress: LanguageInitProgress) => void;
}

export interface InitializeLanguageResult {
  success: boolean;
  filesProcessed: number;
  errors: string[];
  branchUrl: string;
}

/**
 * Initialize a new language translation
 * This creates the branch, translates all files, and sets up metadata
 */
export async function initializeLanguage(
  githubClient: GitHubClient,
  options: InitializeLanguageOptions
): Promise<InitializeLanguageResult> {
  const { project, languageCode, languageName, direction, coordinator } = options;
  const { owner, repo } = parseGitHubRepo(project.githubRepo);
  const branchName = getTranslationBranchName(languageCode);

  const errors: string[] = [];
  let filesProcessed = 0;

  try {
    // Step 1: Get source branch reference
    const sourceBranch = await githubClient.getBranch(
      owner,
      repo,
      options.sourceCommit || project.sourceBranch
    );
    const sourceCommitSha = sourceBranch.data.commit.sha;

    // Step 2: Create translation branch
    try {
      await githubClient.createBranch(owner, repo, branchName, sourceCommitSha);
    } catch (error: any) {
      if (error.status !== 422) {
        // Branch already exists is fine
        throw error;
      }
    }

    // Step 3: Get all files from source folder
    const sourceFiles = await getSourceFiles(
      githubClient,
      owner,
      repo,
      project,
      project.sourceBranch
    );

    // Step 4: Process each file
    const translationService = getTranslationService();

    if (!translationService.isAvailable()) {
      throw new Error('Translation service not available. Check DEEPL_API_KEY.');
    }

    for (const file of sourceFiles) {
      try {
        options.onProgress?.({
          filename: file.name,
          status: 'translating',
        });

        // Get file content
        const content = await getFileContentAsText(
          githubClient,
          owner,
          repo,
          file.path,
          project.sourceBranch
        );

        // Translate content
        const translatedContent = await translationService.translateMarkdown(
          content,
          languageCode
        );

        // Save to working translation folder
        const translationPath = getTranslationFilePath(
          project,
          languageCode,
          file.name
        );
        await githubClient.createOrUpdateFile(
          owner,
          repo,
          translationPath,
          translatedContent,
          `[${languageCode}] Initialize translation for ${file.name}`,
          branchName
        );

        // Save to tmp backup folder
        const tmpPath = getMachineTranslationFilePath(
          project,
          languageCode,
          file.name
        );
        await githubClient.createOrUpdateFile(
          owner,
          repo,
          tmpPath,
          translatedContent,
          `[${languageCode}] Machine translation backup for ${file.name}`,
          branchName
        );

        filesProcessed++;

        options.onProgress?.({
          filename: file.name,
          status: 'complete',
        });
      } catch (error: any) {
        const errorMsg = `Failed to process ${file.name}: ${error.message}`;
        errors.push(errorMsg);

        options.onProgress?.({
          filename: file.name,
          status: 'error',
          error: errorMsg,
        });
      }
    }

    // Step 5: Create translation.json metadata
    const fileNames = sourceFiles.map((f) => f.name);
    const metadata = createInitialTranslationMetadata(
      project.slug,
      project,
      languageCode,
      languageName,
      direction,
      coordinator,
      fileNames,
      sourceCommitSha
    );

    // Update word counts
    for (const file of sourceFiles) {
      try {
        const content = await getFileContentAsText(
          githubClient,
          owner,
          repo,
          file.path,
          project.sourceBranch
        );
        const wordCount = countWords(content);
        if (metadata.files[file.name]) {
          metadata.files[file.name].wordCount = wordCount;
          metadata.stats.totalWords += wordCount;
        }
      } catch (error) {
        // Continue if word count fails
      }
    }

    await saveTranslationMetadata(
      githubClient,
      owner,
      repo,
      project,
      languageCode,
      metadata,
      branchName,
      `[${languageCode}] Initialize translation metadata`
    );

    return {
      success: errors.length === 0,
      filesProcessed,
      errors,
      branchUrl: `https://github.com/${owner}/${repo}/tree/${branchName}`,
    };
  } catch (error: any) {
    throw new Error(`Failed to initialize language: ${error.message}`);
  }
}

/**
 * Get all source files from the project source folder
 */
async function getSourceFiles(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  project: ProjectConfig,
  branch: string
): Promise<Array<{ name: string; path: string }>> {
  const contents = await githubClient.getDirectoryContents(
    owner,
    repo,
    project.sourceFolder,
    branch
  );

  if (!Array.isArray(contents.data)) {
    throw new Error('Expected directory contents');
  }

  const files: Array<{ name: string; path: string }> = [];

  for (const item of contents.data) {
    if (item.type === 'file' && matchesFilePattern(project, item.name)) {
      files.push({
        name: item.name,
        path: item.path,
      });
    }
  }

  // Sort by priority files first
  files.sort((a, b) => {
    const aIsPriority = project.priorityFiles.includes(a.name);
    const bIsPriority = project.priorityFiles.includes(b.name);

    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;

    return a.name.localeCompare(b.name);
  });

  return files;
}

/**
 * Get file content as text from GitHub
 */
export async function getFileContentAsText(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  const response = await githubClient.getFileContent(owner, repo, path, ref);

  if ('content' in response.data && response.data.type === 'file') {
    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  }

  throw new Error(`File not found or not a file: ${path}`);
}

/**
 * Get file SHA from GitHub
 */
export async function getFileSha(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const response = await githubClient.getFileContent(owner, repo, path, ref);

    if ('sha' in response.data) {
      return response.data.sha;
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
 * Save file to user's fork
 */
export async function saveFileToFork(
  githubClient: GitHubClient,
  username: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
): Promise<{ sha: string }> {
  // Get existing file SHA if it exists
  const sha = await getFileSha(githubClient, username, repo, path, branch);

  const response = await githubClient.createOrUpdateFile(
    username,
    repo,
    path,
    content,
    message,
    branch,
    sha || undefined
  );

  return {
    sha: response.data.commit.sha,
  };
}
