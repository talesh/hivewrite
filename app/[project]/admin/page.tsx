'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import type { ProjectConfig } from '@/types';

interface AdminDashboardData {
  project: ProjectConfig;
  activeLanguages: Array<{ code: string; config: any }>;
}

export default function AdminDashboardPage() {
  const params = useParams();
  const projectSlug = params.project as string;

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingLanguage, setInitializingLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [projectSlug]);

  const loadDashboard = async () => {
    try {
      const response = await fetch(`/api/${projectSlug}/admin/dashboard`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have admin access to this project');
        }
        if (response.status === 404) {
          throw new Error('Project not found');
        }
        throw new Error('Failed to load admin dashboard');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeLanguage = async (languageCode: string) => {
    setInitializingLanguage(languageCode);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/${projectSlug}/admin/init/${languageCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.message || 'Failed to initialize language');
      }

      const languageName = data?.project.languages[languageCode]?.name || languageCode;
      setSuccess(
        `Successfully initialized ${languageName}! Processed ${result.data?.filesProcessed || 0} files.`
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred during initialization');
    } finally {
      setInitializingLanguage(null);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading admin dashboard..." />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <Loading fullScreen text="Loading..." />;
  }

  const { project, activeLanguages } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← Back to projects
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {project.name} - Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage language translations for {project.githubRepo}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Success</p>
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Project Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Project Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Repository:</span>
              <p className="text-gray-600">{project.githubRepo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Source Branch:</span>
              <p className="text-gray-600">{project.sourceBranch}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Source Folder:</span>
              <p className="text-gray-600">{project.sourceFolder}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Active Languages:</span>
              <p className="text-gray-600">{activeLanguages.length}</p>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Language Management</h2>

          <div className="space-y-4">
            {activeLanguages.map(({ code, config }) => (
              <div
                key={code}
                className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {config.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {config.status}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {config.direction.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      Language Code: <span className="font-mono">{code}</span>
                      {' · '}
                      Initialized: {new Date(config.initialized).toLocaleDateString()}
                    </p>

                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleInitializeLanguage(code)}
                        loading={initializingLanguage === code}
                        disabled={initializingLanguage !== null}
                      >
                        Re-initialize
                      </Button>

                      <Link href={`/${projectSlug}/translate/${code}`}>
                        <Button size="sm" variant="primary">
                          View Dashboard
                        </Button>
                      </Link>

                      <a
                        href={`https://github.com/${project.githubRepo}/tree/translations/${code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        View on GitHub
                        <svg
                          className="ml-1 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Start Guide</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Re-initialize a language to update machine translations from source files</li>
              <li>Click "View Dashboard" to see translation progress</li>
              <li>Share the dashboard link with volunteer translators</li>
              <li>Monitor progress and review pull requests on GitHub</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
