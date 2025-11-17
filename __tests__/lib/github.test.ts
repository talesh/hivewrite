import { GitHubClient, GitHubError, createGitHubClient } from '@/lib/github';

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        get: jest.fn(),
        createFork: jest.fn(),
        getBranch: jest.fn(),
        listBranches: jest.fn(),
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        deleteFile: jest.fn(),
        compareCommits: jest.fn(),
        mergeUpstream: jest.fn(),
        getCommit: jest.fn(),
      },
      git: {
        createRef: jest.fn(),
      },
      pulls: {
        create: jest.fn(),
        list: jest.fn(),
      },
      users: {
        getAuthenticated: jest.fn(),
        getByUsername: jest.fn(),
      },
      rateLimit: {
        get: jest.fn(),
      },
    })),
  };
});

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createGitHubClient('test-token');
    mockOctokit = (client as any).octokit;
  });

  describe('constructor', () => {
    it('should create a client with token', () => {
      expect(client).toBeInstanceOf(GitHubClient);
    });

    it('should set custom retry options', () => {
      const customClient = new GitHubClient({
        token: 'test-token',
        maxRetries: 5,
        retryDelay: 2000,
      });
      expect(customClient).toBeInstanceOf(GitHubClient);
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 404,
        response: { data: {} },
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow(
        GitHubError
      );
      await expect(client.getRepository('owner', 'repo')).rejects.toThrow(
        'File or repository not found'
      );
    });

    it('should handle 403 rate limit errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 403,
        response: { data: {} },
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should handle 401 authentication errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 401,
        response: { data: {} },
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow(
        'Your session expired'
      );
    });

    it('should handle 409 conflict errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 409,
        response: { data: {} },
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow(
        'This file was updated by someone else'
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 errors', async () => {
      mockOctokit.repos.get
        .mockRejectedValueOnce({ status: 500, response: {} })
        .mockRejectedValueOnce({ status: 500, response: {} })
        .mockResolvedValueOnce({ data: { id: 1, name: 'test-repo' } });

      const result = await client.getRepository('owner', 'repo');
      expect(result.data.name).toBe('test-repo');
      expect(mockOctokit.repos.get).toHaveBeenCalledTimes(3);
    });

    it('should retry on 502 errors', async () => {
      mockOctokit.repos.get
        .mockRejectedValueOnce({ status: 502, response: {} })
        .mockResolvedValueOnce({ data: { id: 1, name: 'test-repo' } });

      const result = await client.getRepository('owner', 'repo');
      expect(result.data.name).toBe('test-repo');
      expect(mockOctokit.repos.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 errors', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 404,
        response: {},
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow();
      expect(mockOctokit.repos.get).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      mockOctokit.repos.get.mockRejectedValue({
        status: 500,
        response: {},
      });

      await expect(client.getRepository('owner', 'repo')).rejects.toThrow();
      expect(mockOctokit.repos.get).toHaveBeenCalledTimes(3); // Default max retries
    });
  });

  describe('rate limit checking', () => {
    it('should check rate limits on successful responses', async () => {
      const warningSpy = jest.fn();
      client.setWarningCallback(warningSpy);

      mockOctokit.repos.get.mockResolvedValue({
        data: { id: 1 },
        headers: {
          'x-ratelimit-remaining': '50',
          'x-ratelimit-reset': '1234567890',
        },
      });

      await client.getRepository('owner', 'repo');
      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining('Low API quota')
      );
    });

    it('should warn when rate limit is zero', async () => {
      const warningSpy = jest.fn();
      client.setWarningCallback(warningSpy);

      mockOctokit.repos.get.mockResolvedValue({
        data: { id: 1 },
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1234567890',
        },
      });

      await client.getRepository('owner', 'repo');
      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded')
      );
    });
  });

  describe('repository operations', () => {
    it('should get repository', async () => {
      const mockRepo = { id: 1, name: 'test-repo', full_name: 'owner/test-repo' };
      mockOctokit.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await client.getRepository('owner', 'test-repo');
      expect(result.data).toEqual(mockRepo);
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
      });
    });

    it('should create fork', async () => {
      const mockFork = { id: 2, name: 'test-repo', owner: { login: 'user' } };
      mockOctokit.repos.createFork.mockResolvedValue({ data: mockFork });

      const result = await client.createFork('owner', 'test-repo');
      expect(result.data).toEqual(mockFork);
      expect(mockOctokit.repos.createFork).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo',
      });
    });

    it('should get fork and return null if not found', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 404 });

      const result = await client.getFork('owner', 'repo', 'user');
      expect(result).toBeNull();
    });

    it('should get fork successfully', async () => {
      const mockFork = { id: 2, name: 'repo' };
      mockOctokit.repos.get.mockResolvedValue({ data: mockFork });

      const result = await client.getFork('owner', 'repo', 'user');
      expect(result.data).toEqual(mockFork);
    });
  });

  describe('branch operations', () => {
    it('should create branch', async () => {
      const mockRef = { ref: 'refs/heads/new-branch', object: { sha: 'abc123' } };
      mockOctokit.git.createRef.mockResolvedValue({ data: mockRef });

      const result = await client.createBranch('owner', 'repo', 'new-branch', 'abc123');
      expect(result.data).toEqual(mockRef);
      expect(mockOctokit.git.createRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'refs/heads/new-branch',
        sha: 'abc123',
      });
    });

    it('should get branch', async () => {
      const mockBranch = { name: 'main', commit: { sha: 'abc123' } };
      mockOctokit.repos.getBranch.mockResolvedValue({ data: mockBranch });

      const result = await client.getBranch('owner', 'repo', 'main');
      expect(result.data).toEqual(mockBranch);
    });

    it('should list branches', async () => {
      const mockBranches = [
        { name: 'main', commit: { sha: 'abc123' } },
        { name: 'develop', commit: { sha: 'def456' } },
      ];
      mockOctokit.repos.listBranches.mockResolvedValue({ data: mockBranches });

      const result = await client.listBranches('owner', 'repo');
      expect(result.data).toEqual(mockBranches);
    });
  });

  describe('file operations', () => {
    it('should get file content', async () => {
      const mockContent = {
        type: 'file',
        content: Buffer.from('test content').toString('base64'),
        sha: 'abc123',
      };
      mockOctokit.repos.getContent.mockResolvedValue({ data: mockContent });

      const result = await client.getFileContent('owner', 'repo', 'path/to/file.md');
      expect(result.data).toEqual(mockContent);
    });

    it('should create or update file', async () => {
      const mockResponse = {
        content: { sha: 'new-sha' },
        commit: { sha: 'commit-sha' },
      };
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: mockResponse,
      });

      const result = await client.createOrUpdateFile(
        'owner',
        'repo',
        'path/to/file.md',
        'new content',
        'commit message',
        'main',
        'old-sha'
      );

      expect(result.data).toEqual(mockResponse);
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/file.md',
        message: 'commit message',
        content: Buffer.from('new content').toString('base64'),
        branch: 'main',
        sha: 'old-sha',
      });
    });

    it('should delete file', async () => {
      const mockResponse = { commit: { sha: 'commit-sha' } };
      mockOctokit.repos.deleteFile.mockResolvedValue({ data: mockResponse });

      const result = await client.deleteFile(
        'owner',
        'repo',
        'path/to/file.md',
        'delete message',
        'file-sha',
        'main'
      );

      expect(result.data).toEqual(mockResponse);
    });

    it('should get directory contents', async () => {
      const mockContents = [
        { type: 'file', name: 'file1.md', path: 'docs/file1.md' },
        { type: 'file', name: 'file2.md', path: 'docs/file2.md' },
      ];
      mockOctokit.repos.getContent.mockResolvedValue({ data: mockContents });

      const result = await client.getDirectoryContents('owner', 'repo', 'docs');
      expect(result.data).toEqual(mockContents);
    });
  });

  describe('pull request operations', () => {
    it('should create pull request', async () => {
      const mockPR = {
        number: 123,
        html_url: 'https://github.com/owner/repo/pull/123',
      };
      mockOctokit.pulls.create.mockResolvedValue({ data: mockPR });

      const result = await client.createPullRequest(
        'owner',
        'repo',
        'PR Title',
        'user:feature-branch',
        'main',
        'PR body'
      );

      expect(result.data).toEqual(mockPR);
      expect(mockOctokit.pulls.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'PR Title',
        head: 'user:feature-branch',
        base: 'main',
        body: 'PR body',
      });
    });

    it('should list pull requests', async () => {
      const mockPRs = [
        { number: 1, title: 'PR 1' },
        { number: 2, title: 'PR 2' },
      ];
      mockOctokit.pulls.list.mockResolvedValue({ data: mockPRs });

      const result = await client.listPullRequests('owner', 'repo', 'open');
      expect(result.data).toEqual(mockPRs);
    });
  });

  describe('compare and merge operations', () => {
    it('should compare commits', async () => {
      const mockComparison = {
        ahead_by: 5,
        behind_by: 2,
        commits: [],
      };
      mockOctokit.repos.compareCommits.mockResolvedValue({ data: mockComparison });

      const result = await client.compareCommits('owner', 'repo', 'base', 'head');
      expect(result.data).toEqual(mockComparison);
    });

    it('should merge upstream', async () => {
      const mockMerge = { message: 'Successfully merged' };
      mockOctokit.repos.mergeUpstream.mockResolvedValue({ data: mockMerge });

      const result = await client.mergeUpstream('owner', 'repo', 'main');
      expect(result.data).toEqual(mockMerge);
    });
  });

  describe('user operations', () => {
    it('should get authenticated user', async () => {
      const mockUser = { login: 'testuser', id: 123 };
      mockOctokit.users.getAuthenticated.mockResolvedValue({ data: mockUser });

      const result = await client.getAuthenticatedUser();
      expect(result.data).toEqual(mockUser);
    });

    it('should get user by username', async () => {
      const mockUser = { login: 'testuser', id: 123 };
      mockOctokit.users.getByUsername.mockResolvedValue({ data: mockUser });

      const result = await client.getUser('testuser');
      expect(result.data).toEqual(mockUser);
    });
  });

  describe('rate limit operations', () => {
    it('should get rate limit', async () => {
      const mockRateLimit = {
        rate: { limit: 5000, remaining: 4999, reset: 1234567890 },
      };
      mockOctokit.rateLimit.get.mockResolvedValue({ data: mockRateLimit });

      const result = await client.getRateLimit();
      expect(result.data).toEqual(mockRateLimit);
    });
  });

  describe('factory function', () => {
    it('should create client from token', () => {
      const newClient = createGitHubClient('new-token');
      expect(newClient).toBeInstanceOf(GitHubClient);
    });
  });
});

describe('GitHubError', () => {
  it('should create error with status and response', () => {
    const error = new GitHubError(404, { data: {} }, 'Not found');
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('GitHubError');
  });

  it('should create error with default message', () => {
    const error = new GitHubError(500, { data: {} });
    expect(error.message).toBe('GitHub API error: 500');
  });
});
