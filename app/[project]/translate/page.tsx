import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProjectConfig, getActiveLanguages } from '@/lib/config';
import { auth } from '@/lib/auth';

export default async function LanguageSelectionPage({
  params,
}: {
  params: { project: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  let project;
  try {
    project = getProjectConfig(params.project);
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-4">
            The project &quot;{params.project}&quot; does not exist.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const activeLanguages = getActiveLanguages(project);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← Back to projects
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Select a Language
          </h1>
          <p className="text-gray-600">
            Choose which language you want to translate {project.name} into
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4">
            {(session.user as any).image && (
              <img
                src={(session.user as any).image}
                alt="Profile"
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-gray-900">
                Signed in as {session.user.name || session.user.email}
              </p>
              <p className="text-sm text-gray-600">
                Ready to contribute to {project.name}
              </p>
            </div>
          </div>
        </div>

        {/* Language Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {activeLanguages.map(({ code, config }) => (
            <Link
              key={code}
              href={`/${params.project}/translate/${code}`}
              className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-gray-900"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {config.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Language Code: <span className="font-mono">{code}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {config.status}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {config.direction.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Initialized {new Date(config.initialized).toLocaleDateString()}
                </span>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {activeLanguages.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">
              No Active Languages
            </h3>
            <p className="text-yellow-800 text-sm">
              This project doesn&apos;t have any active language translations yet.
              Please contact the project administrator to initialize languages.
            </p>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            How to Contribute
          </h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
            <li>Select the language you want to translate</li>
            <li>Choose a file from the dashboard</li>
            <li>Translate the content using the three-column editor</li>
            <li>Save your progress as you work</li>
            <li>Create a pull request when finished</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
