import {
  ensureFork,
  checkForkSyncStatus,
  syncForkWithUpstream,
  getForkStatus,
  createPullRequest,
  getExistingPR,
} from '@/lib/fork-management';
import { createGitHubClient } from '@/lib/github';
import type { SyncStatus } from '@/types';

// Mock the GitHub client
jest.mock('@/lib/github');

describe('Fork Management', () => {
  let mockGitHubClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubClient = {
      getFork: jest.fn(),
      createFork: jest.fn(),
      getBranch: jest.fn(),
      createBranch: jest.fn(),
      compareCommits: jest.fn(),
      mergeUpstream: jest.fn(),
      createPullRequest: jest.fn(),
      listPullRequests: jest.fn(),
    };
  });

  describe('ensureFork', () => {
    it('should return existing fork info', async () => {
      mockGitHubClient.getFork.mockResolvedValue({
        data: { id: 123, name: 'Top10' },
      });
      mockGitHubClient.getBranch.mockResolvedValue({
        data: { name: 'translations/es-ES' },
      });

      const result = await ensureFork(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(result.exists).toBe(true);
      expect(result.hasBranch).toBe(true);
      expect(result.owner).toBe('user');
      expect(result.repo).toBe('Top10');
      expect(result.branchName).toBe('translations/es-ES');
      expect(result.forkUrl).toBe('https://github.com/user/Top10');
    });

    it('should create fork if it does not exist', async () => {
      mockGitHubClient.getFork.mockResolvedValue(null);
      mockGitHubClient.createFork.mockResolvedValue({
        data: { id: 124, name: 'Top10' },
      });
      mockGitHubClient.getBranch.mockResolvedValue({
        data: { name: 'translations/es-ES' },
      });

      const result = await ensureFork(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(mockGitHubClient.createFork).toHaveBeenCalledWith('OWASP', 'Top10');
      expect(result.exists).toBe(true);
    });

    it('should create branch if it does not exist in fork', async () => {
      mockGitHubClient.getFork.mockResolvedValue({
        data: { id: 123, name: 'Top10' },
      });
      mockGitHubClient.getBranch
        .mockRejectedValueOnce({ status: 404 }) // Branch doesn't exist in fork
        .mockResolvedValueOnce({
          // Branch exists in upstream
          data: { name: 'translations/es-ES', commit: { sha: 'abc123' } },
        });
      mockGitHubClient.createBranch.mockResolvedValue({
        data: { ref: 'refs/heads/translations/es-ES' },
      });

      const result = await ensureFork(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(mockGitHubClient.createBranch).toHaveBeenCalledWith(
        'user',
        'Top10',
        'translations/es-ES',
        'abc123'
      );
      expect(result.hasBranch).toBe(true);
    });

    it('should handle case where upstream branch does not exist', async () => {
      mockGitHubClient.getFork.mockResolvedValue({
        data: { id: 123, name: 'Top10' },
      });
      mockGitHubClient.getBranch.mockRejectedValue({ status: 404 });

      const result = await ensureFork(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(result.exists).toBe(true);
      expect(result.hasBranch).toBe(false);
    });
  });

  describe('checkForkSyncStatus', () => {
    it('should detect fork is behind upstream', async () => {
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 5,
          ahead_by: 0,
          commits: [
            {
              sha: 'abc',
              commit: {
                message: 'Update file',
                author: { name: 'John', date: '2025-01-01' },
              },
            },
          ],
        },
      });

      const result = await checkForkSyncStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES'
      );

      expect(result.status).toBe('behind');
      expect(result.behindBy).toBe(5);
      expect(result.aheadBy).toBe(0);
      expect(result.commits).toHaveLength(1);
    });

    it('should detect fork is ahead of upstream', async () => {
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 0,
          ahead_by: 3,
          commits: [],
        },
      });

      const result = await checkForkSyncStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES'
      );

      expect(result.status).toBe('ahead');
      expect(result.behindBy).toBe(0);
      expect(result.aheadBy).toBe(3);
    });

    it('should detect fork has diverged', async () => {
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 2,
          ahead_by: 3,
          commits: [],
        },
      });

      const result = await checkForkSyncStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES'
      );

      expect(result.status).toBe('diverged');
      expect(result.behindBy).toBe(2);
      expect(result.aheadBy).toBe(3);
    });

    it('should detect fork is identical to upstream', async () => {
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 0,
          ahead_by: 0,
          commits: [],
        },
      });

      const result = await checkForkSyncStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES'
      );

      expect(result.status).toBe('identical');
      expect(result.behindBy).toBe(0);
      expect(result.aheadBy).toBe(0);
    });

    it('should handle missing commits data', async () => {
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 1,
          ahead_by: 0,
        },
      });

      const result = await checkForkSyncStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES'
      );

      expect(result.commits).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockGitHubClient.compareCommits.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        checkForkSyncStatus(
          mockGitHubClient,
          'user',
          'OWASP',
          'Top10',
          'translations/es-ES'
        )
      ).rejects.toThrow('Failed to check sync status');
    });
  });

  describe('syncForkWithUpstream', () => {
    it('should sync fork successfully', async () => {
      mockGitHubClient.mergeUpstream.mockResolvedValue({
        data: { message: 'Successfully merged' },
      });

      const result = await syncForkWithUpstream(
        mockGitHubClient,
        'user',
        'Top10',
        'translations/es-ES'
      );

      expect(result.success).toBe(true);
      expect(result.conflicts).toBe(false);
      expect(mockGitHubClient.mergeUpstream).toHaveBeenCalledWith(
        'user',
        'Top10',
        'translations/es-ES'
      );
    });

    it('should handle merge conflicts', async () => {
      mockGitHubClient.mergeUpstream.mockRejectedValue({
        status: 409,
      });

      const result = await syncForkWithUpstream(
        mockGitHubClient,
        'user',
        'Top10',
        'translations/es-ES'
      );

      expect(result.success).toBe(false);
      expect(result.conflicts).toBe(true);
      expect(result.conflictUrl).toContain('user/Top10');
    });

    it('should throw error on other failures', async () => {
      mockGitHubClient.mergeUpstream.mockRejectedValue({
        status: 500,
      });

      await expect(
        syncForkWithUpstream(
          mockGitHubClient,
          'user',
          'Top10',
          'translations/es-ES'
        )
      ).rejects.toThrow('Failed to sync fork');
    });
  });

  describe('getForkStatus', () => {
    it('should return status when fork does not exist', async () => {
      mockGitHubClient.getFork.mockResolvedValue(null);

      const result = await getForkStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(result.hasFork).toBe(false);
      expect(result.syncStatus).toBeNull();
      expect(result.needsSync).toBe(false);
      expect(result.forkUrl).toBe('https://github.com/OWASP/Top10');
    });

    it('should return full status when fork exists', async () => {
      mockGitHubClient.getFork.mockResolvedValue({
        data: { id: 123, name: 'Top10' },
      });
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 3,
          ahead_by: 0,
          commits: [],
        },
      });

      const result = await getForkStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(result.hasFork).toBe(true);
      expect(result.syncStatus).toBeDefined();
      expect(result.syncStatus?.status).toBe('behind');
      expect(result.needsSync).toBe(true);
      expect(result.forkUrl).toBe('https://github.com/user/Top10');
    });

    it('should show no sync needed when identical', async () => {
      mockGitHubClient.getFork.mockResolvedValue({
        data: { id: 123, name: 'Top10' },
      });
      mockGitHubClient.compareCommits.mockResolvedValue({
        data: {
          behind_by: 0,
          ahead_by: 0,
          commits: [],
        },
      });

      const result = await getForkStatus(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'es-ES'
      );

      expect(result.needsSync).toBe(false);
    });
  });

  describe('createPullRequest', () => {
    it('should create PR successfully', async () => {
      mockGitHubClient.createPullRequest.mockResolvedValue({
        data: {
          number: 123,
          html_url: 'https://github.com/OWASP/Top10/pull/123',
        },
      });

      const result = await createPullRequest(
        mockGitHubClient,
        'user',
        'OWASP',
        'Top10',
        'translations/es-ES',
        'Spanish translation',
        'Translation body'
      );

      expect(result.number).toBe(123);
      expect(result.url).toBe('https://github.com/OWASP/Top10/pull/123');
      expect(mockGitHubClient.createPullRequest).toHaveBeenCalledWith(
        'OWASP',
        'Top10',
        'Spanish translation',
        'user:translations/es-ES',
        'translations/es-ES',
        'Translation body'
      );
    });

    it('should throw error on PR creation failure', async () => {
      mockGitHubClient.createPullRequest.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(
        createPullRequest(
          mockGitHubClient,
          'user',
          'OWASP',
          'Top10',
          'translations/es-ES',
          'Title',
          'Body'
        )
      ).rejects.toThrow('Failed to create pull request');
    });
  });

  describe('getExistingPR', () => {
    it('should find existing PR', async () => {
      mockGitHubClient.listPullRequests.mockResolvedValue({
        data: [
          {
            number: 100,
            html_url: 'https://github.com/OWASP/Top10/pull/100',
            head: { ref: 'translations/es-ES', user: { login: 'user' } },
          },
          {
            number: 101,
            html_url: 'https://github.com/OWASP/Top10/pull/101',
            head: { ref: 'translations/fr-FR', user: { login: 'other' } },
          },
        ],
      });

      const result = await getExistingPR(
        mockGitHubClient,
        'OWASP',
        'Top10',
        'user',
        'translations/es-ES'
      );

      expect(result).toBeDefined();
      expect(result?.number).toBe(100);
      expect(result?.url).toBe('https://github.com/OWASP/Top10/pull/100');
    });

    it('should return null when no PR exists', async () => {
      mockGitHubClient.listPullRequests.mockResolvedValue({
        data: [
          {
            number: 101,
            html_url: 'https://github.com/OWASP/Top10/pull/101',
            head: { ref: 'translations/fr-FR', user: { login: 'other' } },
          },
        ],
      });

      const result = await getExistingPR(
        mockGitHubClient,
        'OWASP',
        'Top10',
        'user',
        'translations/es-ES'
      );

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockGitHubClient.listPullRequests.mockRejectedValue(
        new Error('API error')
      );

      const result = await getExistingPR(
        mockGitHubClient,
        'OWASP',
        'Top10',
        'user',
        'translations/es-ES'
      );

      expect(result).toBeNull();
    });

    it('should match both branch and user', async () => {
      mockGitHubClient.listPullRequests.mockResolvedValue({
        data: [
          {
            number: 100,
            html_url: 'https://github.com/OWASP/Top10/pull/100',
            head: { ref: 'translations/es-ES', user: { login: 'other-user' } },
          },
          {
            number: 101,
            html_url: 'https://github.com/OWASP/Top10/pull/101',
            head: { ref: 'translations/es-ES', user: { login: 'user' } },
          },
        ],
      });

      const result = await getExistingPR(
        mockGitHubClient,
        'OWASP',
        'Top10',
        'user',
        'translations/es-ES'
      );

      expect(result?.number).toBe(101); // Should match the correct user
    });
  });
});
