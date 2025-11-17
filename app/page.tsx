import Link from 'next/link';
import { getAllProjectConfigs } from '@/lib/config';

export default function HomePage() {
  const projects = getAllProjectConfigs();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            OWASP Translation Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Collaborate with volunteers worldwide to translate OWASP project documentation
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {projects.map((project) => {
            const activeLanguages = Object.values(project.languages).filter(
              (l) => l.status === 'active'
            );

            return (
              <div
                key={project.slug}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {project.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  {project.githubRepo}
                </p>

                <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {activeLanguages.length} languages
                  </span>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/${project.slug}/admin`}
                    className="flex-1 text-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Admin
                  </Link>
                  <Link
                    href={`/${project.slug}/translate`}
                    className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Translate
                  </Link>
                </div>

                {/* Language List */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Active Languages:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeLanguages.slice(0, 5).map((lang, idx) => {
                      const code = Object.keys(project.languages).find(
                        (k) => project.languages[k] === lang
                      );
                      return (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {lang.name}
                        </span>
                      );
                    })}
                    {activeLanguages.length > 5 && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        +{activeLanguages.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <div className="space-y-4 text-gray-600">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sign in with GitHub</h3>
                <p>Authenticate using your GitHub account to start contributing.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Choose a project and language</h3>
                <p>Select from available OWASP projects and the language you want to translate to.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Translate and contribute</h3>
                <p>Use the three-column editor to translate documentation with machine translation suggestions.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Submit a pull request</h3>
                <p>When ready, create a pull request for review and merge into the project.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
