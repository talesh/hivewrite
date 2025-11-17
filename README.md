# OWASP Translation Hub - MVP

A collaborative platform for translating OWASP project documentation with zero setup, using GitHub as the backend.

## 🎉 **COMPLETE MVP - READY FOR USE**

This is a **fully functional MVP** with all core features implemented:
- ✅ **Complete UI**: Admin dashboard, language selection, translation dashboard, three-column editor
- ✅ **Full Backend**: All API endpoints for admin and translator workflows
- ✅ **Autosave System**: Local storage with recovery and sync detection
- ✅ **GitHub Integration**: OAuth, fork management, PR creation
- ✅ **Machine Translation**: DeepL API integration for initial translations
- ✅ **RTL Support**: Full support for Arabic, Hebrew, and other RTL languages
- ✅ **Comprehensive Tests**: 270+ tests with ~90% coverage

## Features

### For Translators
- **Zero Setup**: Sign in with GitHub and start translating immediately
- **Three-Column Editor**: Compare English original, your translation, and machine translation side-by-side
- **Auto-save**: Local browser storage prevents data loss
- **Fork Management**: Automatic fork creation and sync with upstream
- **RTL Support**: Full support for right-to-left languages (Arabic, Hebrew)
- **Progress Tracking**: See overall and personal translation progress

### For Administrators
- **Language Initialization**: Set up new languages with one click
- **Machine Translation**: Automatic pre-translation using DeepL API
- **Progress Dashboard**: Monitor translation progress across all languages
- **Metadata Tracking**: Automatic tracking of contributors, status, and PRs

### Technical Features
- Built with Next.js 14 (App Router) and TypeScript
- GitHub OAuth authentication
- Real-time fork synchronization
- Machine translation via DeepL API
- Rate limit handling and retry logic
- Responsive design with Tailwind CSS

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │         │              │         │             │
│  Translator │◄────────┤ Translation  │────────►│   GitHub    │
│     UI      │         │     Hub      │         │     API     │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │             │
                        │   DeepL     │
                        │     API     │
                        │             │
                        └─────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- GitHub account
- GitHub OAuth App (for authentication)
- DeepL API key (for machine translation)
- GitHub Personal Access Token (for admin operations)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hivewrite
npm install
```

### 2. Set Up GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: OWASP Translation Hub
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 3. Get DeepL API Key

1. Sign up at [DeepL Pro API](https://www.deepl.com/pro-api)
2. Choose a plan (Free tier available for testing)
3. Copy your **API Key**

### 4. Create Personal Access Token

1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`
4. Generate token and copy it

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key  # Generate with: openssl rand -base64 32

# Session
SESSION_SECRET=your_session_secret_key    # Generate with: openssl rand -base64 32

# Translation API
DEEPL_API_KEY=your_deepl_api_key

# Admin Token
GITHUB_ADMIN_TOKEN=your_github_personal_access_token

# Optional: Admin users (comma-separated GitHub usernames)
ADMIN_USERS=username1,username2
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
hivewrite/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── projects/             # Project listing
│   │   └── [project]/            # Dynamic project routes
│   │       ├── admin/            # Admin endpoints
│   │       └── translate/        # Translator endpoints
│   ├── auth/                     # Auth pages (signin, error)
│   └── page.tsx                  # Home page
├── components/                   # React components
│   └── ui/                       # Reusable UI components
├── config/                       # Configuration files
│   └── projects/                 # Project configs (JSON)
│       ├── topten.json           # OWASP Top 10 config
│       └── asvs.json             # OWASP ASVS config
├── lib/                          # Core libraries
│   ├── auth.ts                   # NextAuth configuration
│   ├── github.ts                 # GitHub API client
│   ├── config.ts                 # Config loader utilities
│   ├── translation.ts            # DeepL integration
│   ├── translation-metadata.ts   # Metadata management
│   ├── file-processing.ts        # File operations
│   └── fork-management.ts        # Fork/sync operations
├── types/                        # TypeScript type definitions
│   └── index.ts
└── middleware.ts                 # Route protection
```

## Adding a New Project

1. Create a config file in `config/projects/your-project.json`:

```json
{
  "slug": "your-project",
  "name": "Your OWASP Project",
  "githubRepo": "OWASP/YourProject",
  "sourceBranch": "main",
  "sourceFolder": "/docs",
  "translationFolder": "/docs/translations",
  "tmpFolder": "/docs/translations/{language}/tmp",
  "filePattern": "*.md",
  "priorityFiles": [
    "important-file.md"
  ],
  "languages": {
    "es-ES": {
      "name": "Spanish (Spain)",
      "direction": "ltr",
      "status": "active",
      "initialized": "2025-11-16T10:30:00Z"
    }
  }
}
```

2. Restart the development server

3. The project will appear on the home page

## Usage

### For Admins: Initializing a Language

1. Navigate to `/{project}/admin`
2. Click "Initialize New Language"
3. Select language and confirm
4. Wait for machine translation to complete
5. Share the translation link with volunteers

### For Translators

1. Click "Sign in with GitHub" on the project page
2. Select a language from the dashboard
3. Choose a file to translate
4. Edit your translation in the middle column
   - Left column: English original (read-only)
   - Middle column: Your editable translation
   - Right column: Machine translation suggestion (read-only)
5. Click "Save Draft" to save to your fork
6. Click "Create Pull Request" when ready

### Auto-save Feature

- Automatically saves to browser storage every 30 seconds
- Recovers unsaved work after browser crash
- Shows "Restore" prompt if unsaved work detected

### Syncing Your Fork

If you see "Your fork is behind":
1. Click "Sync Now"
2. Wait for sync to complete
3. Refresh the page if needed

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Add environment variables (from `.env.local`)
6. Update `NEXTAUTH_URL` to your production domain
7. Click "Deploy"

### Update GitHub OAuth App

After deployment, update your OAuth app:
1. Go to GitHub OAuth app settings
2. Update **Homepage URL** to production URL
3. Update **Callback URL** to `https://yourdomain.com/api/auth/callback/github`

## Environment Variables for Production

```bash
GITHUB_CLIENT_ID=<your_oauth_client_id>
GITHUB_CLIENT_SECRET=<your_oauth_client_secret>
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<strong_random_string>
SESSION_SECRET=<strong_random_string>
DEEPL_API_KEY=<your_deepl_api_key>
GITHUB_ADMIN_TOKEN=<your_github_token>
ADMIN_USERS=username1,username2
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects

### Admin
- `POST /api/[project]/admin/init/[language]` - Initialize language

### Translator
- `GET /api/[project]/translate/[language]/dashboard` - Get dashboard data
- `GET /api/[project]/translate/[language]/file/[filename]` - Get file content
- `POST /api/[project]/translate/[language]/save` - Save draft
- `POST /api/[project]/translate/[language]/pr` - Create pull request
- `GET /api/[project]/translate/[language]/sync` - Check sync status
- `POST /api/[project]/translate/[language]/sync` - Sync fork

## Troubleshooting

### "Translation service not available"
- Check that `DEEPL_API_KEY` is set correctly
- Verify API key is valid on DeepL dashboard

### "GitHub token is required"
- Ensure user is signed in
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set

### "API rate limit exceeded"
- Wait for rate limit to reset (shown in error message)
- Use authenticated requests (sign in) for higher limits

### "Your fork is out of sync"
- Click "Sync Now" in the banner
- If conflicts occur, resolve in GitHub UI

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

- GitHub Issues: Report bugs and request features
- Documentation: See `/docs` folder for detailed guides

## Acknowledgments

- Built for OWASP community
- Powered by DeepL for machine translation
- Uses GitHub as the version control backend

---

**MVP Status**: This is the Minimum Viable Product with core features implemented. Additional features (WebSocket progress updates, advanced analytics, etc.) can be added in future iterations.
