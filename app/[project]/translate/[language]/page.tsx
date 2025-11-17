'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import type { DashboardData, SyncStatusResponse } from '@/types';

export default function TranslationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectSlug = params.project as string;
  const languageCode = params.language as string;

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/dashboard`
      );

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setDashboardData(data.data);
      setSyncStatus(data.forkStatus?.syncStatus || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectSlug, languageCode]);

  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/sync`
      );

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.syncStatus);
      }
    } catch (err) {
      // Silently fail - sync status is not critical
    }
  }, [projectSlug, languageCode]);

  useEffect(() => {
    loadDashboard();
    checkSyncStatus();
  }, [loadDashboard, checkSyncStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        `/api/${projectSlug}/translate/${languageCode}/sync`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Sync failed');
      }

      // Reload dashboard after sync
      await loadDashboard();
      alert('Fork synced successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to sync fork');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading dashboard..." />;
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Failed to load dashboard'}</p>
          <Link href={`/${projectSlug}/translate`} className="text-blue-600 hover:underline">
            Return to language selection
          </Link>
        </div>
      </div>
    );
  }

  const { project, language, stats, files, userStats } = dashboardData;
  const needsSync = syncStatus && syncStatus.behindBy > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${projectSlug}/translate`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← Back to language selection
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {project.name} - {language.name} Translation
          </h1>
          <p className="text-gray-600">
            Translate documentation files to {language.name}
          </p>
        </div>

        {/* Sync Banner */}
        {needsSync && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Your fork is {syncStatus.behindBy} commits behind
                </h3>
                <p className="text-sm text-yellow-800">
                  Other translators have submitted work. Sync your fork to get the latest changes.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSync}
                loading={syncing}
              >
                Sync Now
              </Button>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Progress</h3>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {stats.percentComplete}%
            </div>
            <ProgressBar percentage={stats.percentComplete} color="blue" />
            <p className="text-sm text-gray-600 mt-2">
              {stats.completed} of {stats.totalFiles} files complete
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Your Contribution</h3>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {userStats.completedFiles}
            </div>
            <p className="text-sm text-gray-600">
              {userStats.completedFiles === 1 ? 'file' : 'files'} completed
            </p>
            {userStats.lastSession && (
              <p className="text-xs text-gray-500 mt-2">
                Last session: {new Date(userStats.lastSession).toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-medium text-yellow-600">{stats.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Started:</span>
                <span className="font-medium text-gray-400">{stats.notStarted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Translation Files</h2>
            <p className="text-sm text-gray-600 mt-1">
              {stats.contributors.length} contributors working on this translation
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {files.map((file) => {
              const statusColors = {
                'complete': 'bg-green-100 text-green-800',
                'in-progress': 'bg-yellow-100 text-yellow-800',
                'not-started': 'bg-gray-100 text-gray-600',
              };

              const statusIcons = {
                'complete': '✓',
                'in-progress': '✏️',
                'not-started': '☐',
              };

              return (
                <div key={file.filename} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">
                          {statusIcons[file.status]}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900">
                          {file.filename}
                        </h3>
                        {file.isPriority && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            Priority
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusColors[file.status]}`}>
                          {file.status.replace('-', ' ')}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        {file.lastContributor && (
                          <p>
                            Last updated by <span className="font-medium">{file.lastContributor}</span>
                            {file.lastUpdated && (
                              <span className="text-gray-500">
                                {' · '}
                                {new Date(file.lastUpdated).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        )}
                        {file.wordCount > 0 && (
                          <p>{file.wordCount.toLocaleString()} words</p>
                        )}
                        {file.prNumber && (
                          <p>
                            PR{' '}
                            <a
                              href={file.prUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              #{file.prNumber}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Link
                        href={`/${projectSlug}/translate/${languageCode}/edit/${encodeURIComponent(file.filename)}`}
                      >
                        <Button size="sm" variant={file.status === 'complete' ? 'secondary' : 'primary'}>
                          {file.status === 'complete' ? 'Review' : file.status === 'in-progress' ? 'Continue' : 'Start'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
