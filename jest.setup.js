import '@testing-library/jest-dom';

// Mock environment variables
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DEEPL_API_KEY = 'test-deepl-key';
process.env.GITHUB_ADMIN_TOKEN = 'test-admin-token';
