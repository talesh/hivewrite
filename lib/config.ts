import fs from 'fs';
import path from 'path';
import type { ProjectConfig, LanguageConfig } from '@/types';

const CONFIG_DIR = path.join(process.cwd(), 'config', 'projects');

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Get all available project slugs
 */
export function getProjectSlugs(): string[] {
  try {
    const files = fs.readdirSync(CONFIG_DIR);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''));
  } catch (error) {
    console.error('Error reading project configs:', error);
    return [];
  }
}

/**
 * Load a project configuration by slug
 */
export function getProjectConfig(slug: string): ProjectConfig {
  const configPath = path.join(CONFIG_DIR, `${slug}.json`);

  if (!fs.existsSync(configPath)) {
    throw new ConfigError(`Project configuration not found: ${slug}`);
  }

  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData) as ProjectConfig;

    // Validate required fields
    validateProjectConfig(config);

    return config;
  } catch (error: any) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`Failed to load project config: ${error.message}`);
  }
}

/**
 * Get all project configurations
 */
export function getAllProjectConfigs(): ProjectConfig[] {
  const slugs = getProjectSlugs();
  return slugs.map((slug) => getProjectConfig(slug));
}

/**
 * Validate project configuration
 */
function validateProjectConfig(config: any): asserts config is ProjectConfig {
  const requiredFields = [
    'slug',
    'name',
    'githubRepo',
    'sourceBranch',
    'sourceFolder',
    'translationFolder',
    'tmpFolder',
    'filePattern',
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new ConfigError(`Missing required field in project config: ${field}`);
    }
  }

  if (!config.languages || typeof config.languages !== 'object') {
    throw new ConfigError('Project config must have a languages object');
  }

  // Validate GitHub repo format
  const repoPattern = /^[\w-]+\/[\w-]+$/;
  if (!repoPattern.test(config.githubRepo)) {
    throw new ConfigError(
      `Invalid GitHub repo format: ${config.githubRepo}. Expected format: owner/repo`
    );
  }
}

/**
 * Get language configuration for a project
 */
export function getLanguageConfig(
  projectSlug: string,
  languageCode: string
): { project: ProjectConfig; language: LanguageConfig; languageCode: string } {
  const project = getProjectConfig(projectSlug);

  if (!project.languages[languageCode]) {
    throw new ConfigError(
      `Language not found: ${languageCode} for project ${projectSlug}`
    );
  }

  return {
    project,
    language: project.languages[languageCode],
    languageCode,
  };
}

/**
 * Get translation folder path with language substitution
 */
export function getTranslationFolderPath(
  project: ProjectConfig,
  languageCode: string
): string {
  return project.translationFolder;
}

/**
 * Get tmp folder path with language substitution
 */
export function getTmpFolderPath(
  project: ProjectConfig,
  languageCode: string
): string {
  return project.tmpFolder.replace('{language}', languageCode);
}

/**
 * Get translation branch name for a language
 */
export function getTranslationBranchName(languageCode: string): string {
  return `translations/${languageCode}`;
}

/**
 * Parse GitHub repo into owner and repo name
 */
export function parseGitHubRepo(githubRepo: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo] = githubRepo.split('/');
  if (!owner || !repo) {
    throw new ConfigError(`Invalid GitHub repo format: ${githubRepo}`);
  }
  return { owner, repo };
}

/**
 * Get file path in the repository
 */
export function getSourceFilePath(project: ProjectConfig, filename: string): string {
  return `${project.sourceFolder}/${filename}`.replace('//', '/');
}

/**
 * Get translation file path in the repository
 */
export function getTranslationFilePath(
  project: ProjectConfig,
  languageCode: string,
  filename: string
): string {
  return `${project.translationFolder}/${languageCode}/${filename}`.replace(
    '//',
    '/'
  );
}

/**
 * Get machine translation file path in tmp folder
 */
export function getMachineTranslationFilePath(
  project: ProjectConfig,
  languageCode: string,
  filename: string
): string {
  const tmpFolder = getTmpFolderPath(project, languageCode);
  return `${tmpFolder}/${filename}`.replace('//', '/');
}

/**
 * Get translation.json file path
 */
export function getTranslationMetadataPath(
  project: ProjectConfig,
  languageCode: string
): string {
  return `${project.translationFolder}/${languageCode}/translation.json`.replace(
    '//',
    '/'
  );
}

/**
 * Check if a file matches the project's file pattern
 */
export function matchesFilePattern(project: ProjectConfig, filename: string): boolean {
  const pattern = project.filePattern.replace('*', '.*');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(filename);
}

/**
 * Check if a file is a priority file
 */
export function isPriorityFile(project: ProjectConfig, filename: string): boolean {
  return project.priorityFiles.includes(filename);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(
  project: ProjectConfig,
  languageCode: string
): string {
  const language = project.languages[languageCode];
  return language ? language.name : languageCode;
}

/**
 * Get active languages for a project
 */
export function getActiveLanguages(project: ProjectConfig): Array<{
  code: string;
  config: LanguageConfig;
}> {
  return Object.entries(project.languages)
    .filter(([, config]) => config.status === 'active')
    .map(([code, config]) => ({ code, config }));
}

/**
 * Check if user has admin access (simple check for MVP)
 * In production, this would check against a database or config
 */
export function isProjectAdmin(username: string, projectSlug: string): boolean {
  // For MVP, check if username matches environment variable
  const adminUsers = process.env.ADMIN_USERS?.split(',') || [];
  return adminUsers.includes(username);
}
