import {
  createInitialTranslationMetadata,
  updateFileMetadata,
  calculateStats,
  countWords,
} from '@/lib/translation-metadata';
import { getProjectConfig } from '@/lib/config';
import type { TranslationFileMetadata } from '@/types';

describe('Translation Metadata', () => {
  const project = getProjectConfig('topten');

  describe('createInitialTranslationMetadata', () => {
    it('should create initial metadata structure', () => {
      const files = ['file1.md', 'file2.md', 'file3.md'];
      const metadata = createInitialTranslationMetadata(
        'topten',
        project,
        'es-ES',
        'Spanish (Spain)',
        'ltr',
        'coordinator-user',
        files,
        'abc123'
      );

      expect(metadata.version).toBe('1.0');
      expect(metadata.language).toBe('es-ES');
      expect(metadata.languageName).toBe('Spanish (Spain)');
      expect(metadata.direction).toBe('ltr');
      expect(metadata.project).toBe('topten');
      expect(metadata.coordinator).toBe('coordinator-user');
      expect(metadata.initialized).toBeDefined();
      expect(metadata.lastUpdated).toBeDefined();
    });

    it('should initialize all files as not-started', () => {
      const files = ['file1.md', 'file2.md'];
      const metadata = createInitialTranslationMetadata(
        'topten',
        project,
        'es-ES',
        'Spanish (Spain)',
        'ltr',
        'coordinator-user',
        files,
        'abc123'
      );

      expect(Object.keys(metadata.files)).toHaveLength(2);
      expect(metadata.files['file1.md'].status).toBe('not-started');
      expect(metadata.files['file2.md'].status).toBe('not-started');
      expect(metadata.files['file1.md'].machineTranslated).toBe(true);
      expect(metadata.files['file2.md'].humanReviewed).toBe(false);
    });

    it('should initialize stats correctly', () => {
      const files = ['file1.md', 'file2.md', 'file3.md'];
      const metadata = createInitialTranslationMetadata(
        'topten',
        project,
        'es-ES',
        'Spanish (Spain)',
        'ltr',
        'coordinator-user',
        files,
        'abc123'
      );

      expect(metadata.stats.totalFiles).toBe(3);
      expect(metadata.stats.completed).toBe(0);
      expect(metadata.stats.inProgress).toBe(0);
      expect(metadata.stats.notStarted).toBe(3);
      expect(metadata.stats.percentComplete).toBe(0);
    });

    it('should set meta information', () => {
      const files = ['file1.md'];
      const metadata = createInitialTranslationMetadata(
        'topten',
        project,
        'es-ES',
        'Spanish (Spain)',
        'ltr',
        'coordinator-user',
        files,
        'source-commit-sha'
      );

      expect(metadata.meta.machineTranslationService).toBe('DeepL');
      expect(metadata.meta.sourceCommitSha).toBe('source-commit-sha');
      expect(metadata.meta.machineTranslationDate).toBeDefined();
      expect(metadata.meta.notes).toBe('Initialized with machine translation');
    });

    it('should handle RTL languages', () => {
      const files = ['file1.md'];
      const metadata = createInitialTranslationMetadata(
        'topten',
        project,
        'ar-SA',
        'Arabic (Saudi Arabia)',
        'rtl',
        'coordinator-user',
        files,
        'abc123'
      );

      expect(metadata.direction).toBe('rtl');
      expect(metadata.language).toBe('ar-SA');
    });
  });

  describe('updateFileMetadata', () => {
    let baseMetadata: ReturnType<typeof createInitialTranslationMetadata>;

    beforeEach(() => {
      baseMetadata = createInitialTranslationMetadata(
        'topten',
        project,
        'es-ES',
        'Spanish (Spain)',
        'ltr',
        'coordinator-user',
        ['file1.md', 'file2.md'],
        'abc123'
      );
    });

    it('should update file status', () => {
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'in-progress',
      });

      expect(updated.files['file1.md'].status).toBe('in-progress');
      expect(updated.files['file2.md'].status).toBe('not-started');
    });

    it('should update last contributor', () => {
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        lastContributor: 'john-doe',
        lastCommitSha: 'commit-sha-123',
      });

      expect(updated.files['file1.md'].lastContributor).toBe('john-doe');
      expect(updated.files['file1.md'].lastCommitSha).toBe('commit-sha-123');
    });

    it('should update lastUpdated timestamp', () => {
      const beforeUpdate = new Date().toISOString();
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'in-progress',
      });
      const afterUpdate = new Date().toISOString();

      expect(updated.files['file1.md'].lastUpdated).toBeDefined();
      expect(updated.files['file1.md'].lastUpdated!).toBeGreaterThanOrEqual(
        beforeUpdate
      );
      expect(updated.files['file1.md'].lastUpdated!).toBeLessThanOrEqual(afterUpdate);
    });

    it('should update PR information', () => {
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'complete',
        prNumber: 123,
        prUrl: 'https://github.com/owner/repo/pull/123',
      });

      expect(updated.files['file1.md'].prNumber).toBe(123);
      expect(updated.files['file1.md'].prUrl).toBe(
        'https://github.com/owner/repo/pull/123'
      );
    });

    it('should recalculate stats after update', () => {
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'complete',
      });

      expect(updated.stats.completed).toBe(1);
      expect(updated.stats.notStarted).toBe(1);
      expect(updated.stats.percentComplete).toBe(50);
    });

    it('should update metadata lastUpdated', () => {
      const beforeUpdate = new Date().toISOString();
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'in-progress',
      });
      const afterUpdate = new Date().toISOString();

      expect(updated.lastUpdated).toBeDefined();
      expect(updated.lastUpdated).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updated.lastUpdated).toBeLessThanOrEqual(afterUpdate);
    });

    it('should create file entry if not exists', () => {
      const updated = updateFileMetadata(baseMetadata, 'new-file.md', {
        status: 'in-progress',
      });

      expect(updated.files['new-file.md']).toBeDefined();
      expect(updated.files['new-file.md'].status).toBe('in-progress');
    });

    it('should preserve other file data when updating', () => {
      const updated = updateFileMetadata(baseMetadata, 'file1.md', {
        status: 'in-progress',
        lastContributor: 'user1',
      });

      const updated2 = updateFileMetadata(updated, 'file1.md', {
        lastCommitSha: 'new-sha',
      });

      expect(updated2.files['file1.md'].status).toBe('in-progress');
      expect(updated2.files['file1.md'].lastContributor).toBe('user1');
      expect(updated2.files['file1.md'].lastCommitSha).toBe('new-sha');
    });
  });

  describe('calculateStats', () => {
    it('should calculate stats for all not-started files', () => {
      const files: Record<string, TranslationFileMetadata> = {
        'file1.md': {
          status: 'not-started',
          lastUpdated: null,
          lastContributor: null,
          lastCommitSha: null,
          prNumber: null,
          prUrl: null,
          wordCount: 100,
          machineTranslated: true,
          humanReviewed: false,
        },
        'file2.md': {
          status: 'not-started',
          lastUpdated: null,
          lastContributor: null,
          lastCommitSha: null,
          prNumber: null,
          prUrl: null,
          wordCount: 200,
          machineTranslated: true,
          humanReviewed: false,
        },
      };

      const stats = calculateStats(files);
      expect(stats.totalFiles).toBe(2);
      expect(stats.completed).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.notStarted).toBe(2);
      expect(stats.percentComplete).toBe(0);
    });

    it('should calculate stats for mixed statuses', () => {
      const files: Record<string, TranslationFileMetadata> = {
        'file1.md': {
          status: 'complete',
          lastUpdated: '2025-01-01',
          lastContributor: 'user1',
          lastCommitSha: 'sha1',
          prNumber: 1,
          prUrl: 'url1',
          wordCount: 100,
          machineTranslated: true,
          humanReviewed: true,
        },
        'file2.md': {
          status: 'in-progress',
          lastUpdated: '2025-01-02',
          lastContributor: 'user2',
          lastCommitSha: 'sha2',
          prNumber: null,
          prUrl: null,
          wordCount: 200,
          machineTranslated: true,
          humanReviewed: false,
        },
        'file3.md': {
          status: 'not-started',
          lastUpdated: null,
          lastContributor: null,
          lastCommitSha: null,
          prNumber: null,
          prUrl: null,
          wordCount: 300,
          machineTranslated: true,
          humanReviewed: false,
        },
      };

      const stats = calculateStats(files);
      expect(stats.totalFiles).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.notStarted).toBe(1);
      expect(stats.percentComplete).toBe(33); // 1/3 rounded
    });

    it('should calculate word counts', () => {
      const files: Record<string, TranslationFileMetadata> = {
        'file1.md': {
          status: 'complete',
          lastUpdated: '2025-01-01',
          lastContributor: 'user1',
          lastCommitSha: 'sha1',
          prNumber: 1,
          prUrl: 'url1',
          wordCount: 500,
          machineTranslated: true,
          humanReviewed: true,
        },
        'file2.md': {
          status: 'complete',
          lastUpdated: '2025-01-02',
          lastContributor: 'user2',
          lastCommitSha: 'sha2',
          prNumber: 2,
          prUrl: 'url2',
          wordCount: 300,
          machineTranslated: true,
          humanReviewed: true,
        },
        'file3.md': {
          status: 'in-progress',
          lastUpdated: '2025-01-03',
          lastContributor: 'user3',
          lastCommitSha: 'sha3',
          prNumber: null,
          prUrl: null,
          wordCount: 200,
          machineTranslated: true,
          humanReviewed: false,
        },
      };

      const stats = calculateStats(files);
      expect(stats.totalWords).toBe(1000);
      expect(stats.translatedWords).toBe(800); // Only completed files
    });

    it('should extract unique contributors', () => {
      const files: Record<string, TranslationFileMetadata> = {
        'file1.md': {
          status: 'complete',
          lastUpdated: '2025-01-01',
          lastContributor: 'user1',
          lastCommitSha: 'sha1',
          prNumber: 1,
          prUrl: 'url1',
          wordCount: 100,
          machineTranslated: true,
          humanReviewed: true,
        },
        'file2.md': {
          status: 'complete',
          lastUpdated: '2025-01-02',
          lastContributor: 'user2',
          lastCommitSha: 'sha2',
          prNumber: 2,
          prUrl: 'url2',
          wordCount: 200,
          machineTranslated: true,
          humanReviewed: true,
        },
        'file3.md': {
          status: 'complete',
          lastUpdated: '2025-01-03',
          lastContributor: 'user1', // Duplicate
          lastCommitSha: 'sha3',
          prNumber: 3,
          prUrl: 'url3',
          wordCount: 300,
          machineTranslated: true,
          humanReviewed: true,
        },
      };

      const stats = calculateStats(files);
      expect(stats.contributors).toHaveLength(2);
      expect(stats.contributors).toContain('user1');
      expect(stats.contributors).toContain('user2');
    });

    it('should handle empty files object', () => {
      const stats = calculateStats({});
      expect(stats.totalFiles).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.notStarted).toBe(0);
      expect(stats.percentComplete).toBe(0);
      expect(stats.totalWords).toBe(0);
      expect(stats.translatedWords).toBe(0);
      expect(stats.contributors).toHaveLength(0);
    });
  });

  describe('countWords', () => {
    it('should count words in simple text', () => {
      const count = countWords('Hello world this is a test');
      expect(count).toBe(6);
    });

    it('should ignore code blocks', () => {
      const markdown = `
Hello world

\`\`\`javascript
const test = "ignore this code";
console.log("and this");
\`\`\`

More text here
`;
      const count = countWords(markdown);
      expect(count).toBeLessThan(20); // Should not count code words
      expect(count).toBeGreaterThan(0); // Should count "Hello world" and "More text here"
    });

    it('should ignore inline code', () => {
      const markdown = 'Use the `console.log()` function to debug';
      const count = countWords(markdown);
      // Should count words but not the inline code
      expect(count).toBeGreaterThan(0);
    });

    it('should ignore markdown syntax', () => {
      const markdown = '# Header\n\n**Bold** and *italic* text';
      const count = countWords(markdown);
      expect(count).toBe(5); // Header, Bold, and, italic, text
    });

    it('should handle empty content', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('\n\n\n')).toBe(0);
    });

    it('should handle content with multiple spaces', () => {
      const count = countWords('word1    word2     word3');
      expect(count).toBe(3);
    });

    it('should handle real markdown example', () => {
      const markdown = `# Broken Access Control

Access control enforces policy such that users cannot act outside of their intended permissions.

## Description

Access control weakness allows attackers to bypass authorization and perform tasks as though they were privileged users.`;

      const count = countWords(markdown);
      expect(count).toBeGreaterThan(20);
      expect(count).toBeLessThan(50);
    });
  });
});
