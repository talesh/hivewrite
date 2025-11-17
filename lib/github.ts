import { Octokit } from '@octokit/rest';

// Type definitions for GitHub API responses
export interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

export class GitHubError extends Error {
  constructor(
    public status: number,
    public response: GitHubErrorResponse,
    message?: string
  ) {
    super(message || `GitHub API error: ${status}`);
    this.name = 'GitHubError';
  }
}

interface GitHubClientOptions {
  token: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number; // Request timeout in milliseconds
}

export class GitHubClient {
  private octokit: Octokit;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;
  private warningCallback?: (message: string) => void;

  constructor(options: GitHubClientOptions) {
    this.octokit = new Octokit({
      auth: options.token,
      request: {
        timeout: options.timeout || 30000, // 30 second default timeout
      },
    });
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
  }

  setWarningCallback(callback: (message: string) => void) {
    this.warningCallback = callback;
  }

  private showWarning(message: string) {
    if (this.warningCallback) {
      this.warningCallback(message);
    } else {
      console.warn(message);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableStatus(status: number): boolean {
    return [500, 502, 503, 504].includes(status);
  }

  private handleError(error: unknown): never {
    // Type guard to check if error has expected structure
    const errorObj = error as { status?: number; response?: GitHubErrorResponse };
    const status = errorObj.status || 500;

    const userMessages: Record<number, string> = {
      401: 'Your session expired. Please log in again.',
      403: 'API rate limit exceeded. Please try again in a few minutes.',
      404: 'File or repository not found. Please sync your fork.',
      409: 'This file was updated by someone else. Please refresh.',
      422: 'Invalid file content. Please check your changes.',
      500: 'GitHub is experiencing issues. Your work is saved locally.',
    };

    const message = userMessages[status] || 'An error occurred. Please try again.';
    throw new GitHubError(
      status,
      errorObj.response || { message: 'Unknown error' },
      message
    );
  }

  private checkRateLimits(headers: Record<string, string | undefined>) {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    const RATE_LIMIT_WARNING_THRESHOLD = 100;

    if (remaining && parseInt(remaining) < RATE_LIMIT_WARNING_THRESHOLD) {
      this.showWarning(`Low API quota: ${remaining} requests remaining`);
    }

    if (remaining && parseInt(remaining) === 0 && reset) {
      const resetDate = new Date(parseInt(reset) * 1000);
      this.showWarning(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
    }
  }

  async request<T>(
    fn: () => Promise<T>,
    retries?: number
  ): Promise<T> {
    const maxAttempts = retries !== undefined ? retries : this.maxRetries;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fn();

        // Check rate limits on successful responses
        if (response && typeof response === 'object' && 'headers' in response) {
          const headers = (response as { headers: Record<string, string | undefined> }).headers;
          this.checkRateLimits(headers);
        }

        return response;
      } catch (error: unknown) {
        const errorObj = error as { status?: number };
        const isRetryable = this.isRetryableStatus(errorObj.status || 0);
        const isLastAttempt = attempt === maxAttempts - 1;

        if (isRetryable && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * this.retryDelay; // Exponential backoff
          console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await this.sleep(delay);
          continue;
        }

        this.handleError(error);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Unexpected error in request');
  }

  // Repository operations
  async getRepository(owner: string, repo: string) {
    return this.request(() => this.octokit.repos.get({ owner, repo }));
  }

  async createFork(owner: string, repo: string) {
    return this.request(() => this.octokit.repos.createFork({ owner, repo }));
  }

  async getFork(owner: string, repo: string, username: string) {
    try {
      return await this.request(() =>
        this.octokit.repos.get({ owner: username, repo })
      );
    } catch (error: unknown) {
      const errorObj = error as { status?: number };
      if (errorObj.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Branch operations
  async createBranch(owner: string, repo: string, branchName: string, sha: string) {
    return this.request(() =>
      this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha,
      })
    );
  }

  async getBranch(owner: string, repo: string, branch: string) {
    return this.request(() =>
      this.octokit.repos.getBranch({ owner, repo, branch })
    );
  }

  async listBranches(owner: string, repo: string) {
    return this.request(() =>
      this.octokit.repos.listBranches({ owner, repo })
    );
  }

  // File operations
  async getFileContent(owner: string, repo: string, path: string, ref?: string) {
    return this.request(() =>
      this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })
    );
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ) {
    return this.request(() =>
      this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha,
      })
    );
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string
  ) {
    return this.request(() =>
      this.octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
      })
    );
  }

  // Directory operations
  async getDirectoryContents(owner: string, repo: string, path: string, ref?: string) {
    return this.request(() =>
      this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })
    );
  }

  // Pull Request operations
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    return this.request(() =>
      this.octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      })
    );
  }

  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all') {
    return this.request(() =>
      this.octokit.pulls.list({
        owner,
        repo,
        state,
      })
    );
  }

  // Compare commits
  async compareCommits(owner: string, repo: string, base: string, head: string) {
    return this.request(() =>
      this.octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      })
    );
  }

  // Merge upstream
  async mergeUpstream(owner: string, repo: string, branch: string) {
    return this.request(() =>
      this.octokit.repos.mergeUpstream({
        owner,
        repo,
        branch,
      })
    );
  }

  // Commit operations
  async getCommit(owner: string, repo: string, ref: string) {
    return this.request(() =>
      this.octokit.repos.getCommit({
        owner,
        repo,
        ref,
      })
    );
  }

  // User operations
  async getAuthenticatedUser() {
    return this.request(() => this.octokit.users.getAuthenticated());
  }

  async getUser(username: string) {
    return this.request(() => this.octokit.users.getByUsername({ username }));
  }

  // Rate limit check
  async getRateLimit() {
    return this.request(() => this.octokit.rateLimit.get());
  }
}

// Factory function to create GitHub client
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}

// Helper to get GitHub client from session token
export function getGitHubClientFromToken(token: string): GitHubClient {
  if (!token) {
    throw new Error('GitHub token is required');
  }
  return createGitHubClient(token);
}
