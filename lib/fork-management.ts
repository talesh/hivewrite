import type { SyncStatus, SyncStatusResponse } from '@/types';
import { GitHubClient } from './github';
import { getTranslationBranchName } from './config';

export interface ForkInfo {
  exists: boolean;
  hasBranch: boolean;
  owner: string;
  repo: string;
  branchName: string;
  forkUrl?: string;
}

/**
 * Ensure user has a fork of the repository with the translation branch
 */
export async function ensureFork(
  githubClient: GitHubClient,
  username: string,
  upstreamOwner: string,
  upstreamRepo: string,
  languageCode: string
): Promise<ForkInfo> {
  const branchName = getTranslationBranchName(languageCode);

  // Check if fork exists
  let fork = await githubClient.getFork(upstreamOwner, upstreamRepo, username);

  if (!fork) {
    // Create fork
    const createResult = await githubClient.createFork(upstreamOwner, upstreamRepo);
    fork = createResult.data;

    // Wait a bit for fork to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const forkUrl = `https://github.com/${username}/${upstreamRepo}`;

  // Check if translation branch exists in fork
  let hasBranch = false;
  try {
    await githubClient.getBranch(username, upstreamRepo, branchName);
    hasBranch = true;
  } catch (error: any) {
    if (error.status === 404) {
      // Branch doesn't exist, try to create it from upstream
      try {
        const upstreamBranch = await githubClient.getBranch(
          upstreamOwner,
          upstreamRepo,
          branchName
        );

        await githubClient.createBranch(
          username,
          upstreamRepo,
          branchName,
          upstreamBranch.data.commit.sha
        );

        hasBranch = true;
      } catch (branchError: any) {
        // If upstream branch doesn't exist either, that's fine for now
        console.error('Could not create branch:', branchError.message);
      }
    } else {
      throw error;
    }
  }

  return {
    exists: true,
    hasBranch,
    owner: username,
    repo: upstreamRepo,
    branchName,
    forkUrl,
  };
}

/**
 * Check fork sync status compared to upstream
 */
export async function checkForkSyncStatus(
  githubClient: GitHubClient,
  username: string,
  upstreamOwner: string,
  repo: string,
  branchName: string
): Promise<SyncStatusResponse> {
  try {
    // Compare fork branch with upstream branch
    const comparison = await githubClient.compareCommits(
      upstreamOwner,
      repo,
      `${username}:${branchName}`,
      `${upstreamOwner}:${branchName}`
    );

    const behindBy = comparison.data.behind_by || 0;
    const aheadBy = comparison.data.ahead_by || 0;

    let status: SyncStatus;
    if (behindBy === 0 && aheadBy === 0) {
      status = 'identical';
    } else if (behindBy > 0 && aheadBy === 0) {
      status = 'behind';
    } else if (behindBy === 0 && aheadBy > 0) {
      status = 'ahead';
    } else {
      status = 'diverged';
    }

    const commits = comparison.data.commits?.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
    })) || [];

    return {
      status,
      behindBy,
      aheadBy,
      commits,
    };
  } catch (error: any) {
    console.error('Error checking sync status:', error);
    throw new Error(`Failed to check sync status: ${error.message}`);
  }
}

/**
 * Sync fork with upstream repository
 */
export async function syncForkWithUpstream(
  githubClient: GitHubClient,
  username: string,
  repo: string,
  branchName: string
): Promise<{
  success: boolean;
  conflicts: boolean;
  conflictUrl?: string;
}> {
  try {
    // Use GitHub's merge upstream API
    await githubClient.mergeUpstream(username, repo, branchName);

    return {
      success: true,
      conflicts: false,
    };
  } catch (error: any) {
    // Check if it's a merge conflict
    if (error.status === 409) {
      return {
        success: false,
        conflicts: true,
        conflictUrl: `https://github.com/${username}/${repo}/compare/${branchName}`,
      };
    }

    throw new Error(`Failed to sync fork: ${error.message}`);
  }
}

/**
 * Get fork status summary for UI display
 */
export async function getForkStatus(
  githubClient: GitHubClient,
  username: string,
  upstreamOwner: string,
  repo: string,
  languageCode: string
): Promise<{
  hasFork: boolean;
  syncStatus: SyncStatusResponse | null;
  needsSync: boolean;
  forkUrl: string;
}> {
  const branchName = getTranslationBranchName(languageCode);

  // Check if fork exists
  const fork = await githubClient.getFork(upstreamOwner, repo, username);

  if (!fork) {
    return {
      hasFork: false,
      syncStatus: null,
      needsSync: false,
      forkUrl: `https://github.com/${upstreamOwner}/${repo}`,
    };
  }

  // Check sync status
  const syncStatus = await checkForkSyncStatus(
    githubClient,
    username,
    upstreamOwner,
    repo,
    branchName
  );

  const needsSync = syncStatus.behindBy > 0;

  return {
    hasFork: true,
    syncStatus,
    needsSync,
    forkUrl: `https://github.com/${username}/${repo}`,
  };
}

/**
 * Create a pull request from fork to upstream
 */
export async function createPullRequest(
  githubClient: GitHubClient,
  username: string,
  upstreamOwner: string,
  repo: string,
  branchName: string,
  title: string,
  body?: string
): Promise<{
  number: number;
  url: string;
}> {
  try {
    const pr = await githubClient.createPullRequest(
      upstreamOwner,
      repo,
      title,
      `${username}:${branchName}`,
      branchName,
      body
    );

    return {
      number: pr.data.number,
      url: pr.data.html_url,
    };
  } catch (error: any) {
    throw new Error(`Failed to create pull request: ${error.message}`);
  }
}

/**
 * Check if user has any existing PRs for a file
 */
export async function getExistingPR(
  githubClient: GitHubClient,
  upstreamOwner: string,
  repo: string,
  username: string,
  branchName: string
): Promise<{ number: number; url: string } | null> {
  try {
    const prs = await githubClient.listPullRequests(upstreamOwner, repo, 'open');

    const userPR = prs.data.find(
      (pr) => pr.head.ref === branchName && pr.head.user?.login === username
    );

    if (userPR) {
      return {
        number: userPR.number,
        url: userPR.html_url,
      };
    }

    return null;
  } catch (error: any) {
    console.error('Error checking existing PRs:', error);
    return null;
  }
}
