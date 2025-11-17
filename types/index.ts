// Project Configuration Types
export interface LanguageConfig {
  name: string;
  direction: 'ltr' | 'rtl';
  status: 'active' | 'inactive' | 'archived';
  initialized: string; // ISO date string
}

export interface ProjectConfig {
  slug: string;
  name: string;
  githubRepo: string; // Format: "OWASP/Top10"
  sourceBranch: string;
  sourceFolder: string;
  translationFolder: string;
  tmpFolder: string;
  filePattern: string;
  priorityFiles: string[];
  languages: Record<string, LanguageConfig>;
}

// Translation Metadata Types
export type FileStatus = 'not-started' | 'in-progress' | 'complete';

export interface TranslationFileMetadata {
  status: FileStatus;
  lastUpdated: string | null; // ISO date string
  lastContributor: string | null;
  lastCommitSha: string | null;
  prNumber: number | null;
  prUrl: string | null;
  wordCount: number;
  machineTranslated: boolean;
  humanReviewed: boolean;
}

export interface TranslationStats {
  totalFiles: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentComplete: number;
  totalWords: number;
  translatedWords: number;
  contributors: string[];
}

export interface TranslationMeta {
  machineTranslationService: string;
  machineTranslationDate: string; // ISO date string
  sourceCommitSha: string;
  notes: string;
}

export interface TranslationMetadata {
  version: string;
  language: string;
  languageName: string;
  direction: 'ltr' | 'rtl';
  project: string;
  coordinator: string;
  initialized: string; // ISO date string
  lastUpdated: string; // ISO date string
  files: Record<string, TranslationFileMetadata>;
  stats: TranslationStats;
  meta: TranslationMeta;
}

// API Response Types
export interface FileListItem {
  filename: string;
  status: FileStatus;
  lastUpdated: string | null;
  lastContributor: string | null;
  prNumber: number | null;
  prUrl: string | null;
  wordCount: number;
  isPriority: boolean;
}

export interface DashboardData {
  project: ProjectConfig;
  language: LanguageConfig;
  languageCode: string;
  files: FileListItem[];
  stats: TranslationStats;
  userStats: {
    completedFiles: number;
    lastSession: string | null;
  };
}

export interface EditorData {
  filename: string;
  englishContent: string;
  translationContent: string;
  machineContent: string;
  metadata: TranslationFileMetadata;
  language: {
    code: string;
    name: string;
    direction: 'ltr' | 'rtl';
  };
}

// Sync Status Types
export type SyncStatus = 'behind' | 'ahead' | 'diverged' | 'identical';

export interface SyncStatusResponse {
  status: SyncStatus;
  behindBy: number;
  aheadBy: number;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
}

// GitHub Types
export interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
}

// Session Types
export interface SessionUser {
  username: string;
  name: string | null;
  email: string | null;
  avatar: string;
  accessToken: string;
}

export interface AppSession {
  user?: SessionUser;
}

// API Request/Response Types
export interface InitializeLanguageRequest {
  sourceCommit?: string;
}

export interface InitializeLanguageResponse {
  success: boolean;
  message: string;
  branchUrl?: string;
  filesProcessed?: number;
}

export interface SaveDraftRequest {
  content: string;
}

export interface SaveDraftResponse {
  success: boolean;
  message: string;
  commitSha?: string;
  timestamp?: string;
}

export interface CreatePRRequest {
  content: string;
  message?: string;
}

export interface CreatePRResponse {
  success: boolean;
  message: string;
  prNumber?: number;
  prUrl?: string;
}

export interface SyncForkRequest {
  // No body needed
}

export interface SyncForkResponse {
  success: boolean;
  message: string;
  conflicts?: boolean;
  conflictUrl?: string;
}

// Autosave Types
export interface AutosaveData {
  content: string;
  timestamp: string; // ISO date string
  fileHash: string;
}

export interface AutosaveKey {
  project: string;
  language: string;
  filename: string;
}

// Error Types
export interface APIError {
  error: string;
  message: string;
  status: number;
  details?: any;
}

// Admin Types
export interface AdminDashboardData {
  project: ProjectConfig;
  languages: Array<{
    code: string;
    config: LanguageConfig;
    stats: TranslationStats;
    lastActivity: string | null;
  }>;
}

export interface LanguageInitProgress {
  filename: string;
  status: 'pending' | 'translating' | 'complete' | 'error';
  error?: string;
}

// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Column Types for Editor
export type EditorColumn = 'english' | 'translation' | 'machine';

// Language Direction
export type TextDirection = 'ltr' | 'rtl';

// Progress Types
export interface ProgressMetrics {
  percentage: number;
  completed: number;
  total: number;
  inProgress: number;
}
