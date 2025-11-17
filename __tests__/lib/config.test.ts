import {
  getProjectSlugs,
  getProjectConfig,
  getAllProjectConfigs,
  getLanguageConfig,
  getTranslationFolderPath,
  getTmpFolderPath,
  getTranslationBranchName,
  parseGitHubRepo,
  getSourceFilePath,
  getTranslationFilePath,
  getMachineTranslationFilePath,
  getTranslationMetadataPath,
  matchesFilePattern,
  isPriorityFile,
  getLanguageDisplayName,
  getActiveLanguages,
  ConfigError,
} from '@/lib/config';
import type { ProjectConfig } from '@/types';

describe('Config Module', () => {
  describe('getProjectSlugs', () => {
    it('should return array of project slugs', () => {
      const slugs = getProjectSlugs();
      expect(Array.isArray(slugs)).toBe(true);
      expect(slugs).toContain('topten');
      expect(slugs).toContain('asvs');
    });

    it('should filter only JSON files', () => {
      const slugs = getProjectSlugs();
      slugs.forEach((slug) => {
        expect(typeof slug).toBe('string');
        expect(slug).not.toContain('.json');
      });
    });
  });

  describe('getProjectConfig', () => {
    it('should load topten project config', () => {
      const config = getProjectConfig('topten');
      expect(config.slug).toBe('topten');
      expect(config.name).toBe('OWASP Top 10');
      expect(config.githubRepo).toBe('OWASP/Top10');
      expect(config.sourceBranch).toBe('main');
    });

    it('should load asvs project config', () => {
      const config = getProjectConfig('asvs');
      expect(config.slug).toBe('asvs');
      expect(config.name).toBe('OWASP ASVS');
      expect(config.githubRepo).toBe('OWASP/ASVS');
    });

    it('should throw error for non-existent project', () => {
      expect(() => getProjectConfig('nonexistent')).toThrow(ConfigError);
      expect(() => getProjectConfig('nonexistent')).toThrow(
        'Project configuration not found: nonexistent'
      );
    });

    it('should validate required fields', () => {
      const config = getProjectConfig('topten');
      expect(config.slug).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.githubRepo).toBeDefined();
      expect(config.sourceBranch).toBeDefined();
      expect(config.sourceFolder).toBeDefined();
      expect(config.translationFolder).toBeDefined();
      expect(config.tmpFolder).toBeDefined();
      expect(config.filePattern).toBeDefined();
    });

    it('should have languages object', () => {
      const config = getProjectConfig('topten');
      expect(config.languages).toBeDefined();
      expect(typeof config.languages).toBe('object');
    });
  });

  describe('getAllProjectConfigs', () => {
    it('should return all project configs', () => {
      const configs = getAllProjectConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should have valid project configs', () => {
      const configs = getAllProjectConfigs();
      configs.forEach((config) => {
        expect(config.slug).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.githubRepo).toBeDefined();
      });
    });
  });

  describe('getLanguageConfig', () => {
    it('should get language config for topten es-ES', () => {
      const result = getLanguageConfig('topten', 'es-ES');
      expect(result.project.slug).toBe('topten');
      expect(result.languageCode).toBe('es-ES');
      expect(result.language.name).toBe('Spanish (Spain)');
      expect(result.language.direction).toBe('ltr');
    });

    it('should get language config for topten ar-SA', () => {
      const result = getLanguageConfig('topten', 'ar-SA');
      expect(result.languageCode).toBe('ar-SA');
      expect(result.language.name).toBe('Arabic (Saudi Arabia)');
      expect(result.language.direction).toBe('rtl');
    });

    it('should throw error for non-existent language', () => {
      expect(() => getLanguageConfig('topten', 'xx-XX')).toThrow(ConfigError);
      expect(() => getLanguageConfig('topten', 'xx-XX')).toThrow(
        'Language not found: xx-XX for project topten'
      );
    });

    it('should throw error for non-existent project', () => {
      expect(() => getLanguageConfig('nonexistent', 'es-ES')).toThrow(ConfigError);
    });
  });

  describe('path utilities', () => {
    let project: ProjectConfig;

    beforeEach(() => {
      project = getProjectConfig('topten');
    });

    it('should get translation folder path', () => {
      const path = getTranslationFolderPath(project, 'es-ES');
      expect(path).toBe('/2_0_vulns/translations');
    });

    it('should get tmp folder path with language substitution', () => {
      const path = getTmpFolderPath(project, 'es-ES');
      expect(path).toBe('/2_0_vulns/translations/es-ES/tmp');
    });

    it('should get different tmp paths for different languages', () => {
      const esPath = getTmpFolderPath(project, 'es-ES');
      const arPath = getTmpFolderPath(project, 'ar-SA');
      expect(esPath).toBe('/2_0_vulns/translations/es-ES/tmp');
      expect(arPath).toBe('/2_0_vulns/translations/ar-SA/tmp');
    });

    it('should get translation branch name', () => {
      expect(getTranslationBranchName('es-ES')).toBe('translations/es-ES');
      expect(getTranslationBranchName('ar-SA')).toBe('translations/ar-SA');
    });

    it('should get source file path', () => {
      const path = getSourceFilePath(project, '01-broken-access-control.md');
      expect(path).toBe('/2_0_vulns/01-broken-access-control.md');
    });

    it('should get translation file path', () => {
      const path = getTranslationFilePath(
        project,
        'es-ES',
        '01-broken-access-control.md'
      );
      expect(path).toBe('/2_0_vulns/translations/es-ES/01-broken-access-control.md');
    });

    it('should get machine translation file path', () => {
      const path = getMachineTranslationFilePath(
        project,
        'es-ES',
        '01-broken-access-control.md'
      );
      expect(path).toBe(
        '/2_0_vulns/translations/es-ES/tmp/01-broken-access-control.md'
      );
    });

    it('should get translation metadata path', () => {
      const path = getTranslationMetadataPath(project, 'es-ES');
      expect(path).toBe('/2_0_vulns/translations/es-ES/translation.json');
    });

    it('should handle paths without double slashes', () => {
      const sourcePath = getSourceFilePath(project, 'test.md');
      expect(sourcePath).not.toContain('//');

      const transPath = getTranslationFilePath(project, 'es-ES', 'test.md');
      expect(transPath).not.toContain('//');
    });
  });

  describe('parseGitHubRepo', () => {
    it('should parse valid GitHub repo', () => {
      const result = parseGitHubRepo('OWASP/Top10');
      expect(result.owner).toBe('OWASP');
      expect(result.repo).toBe('Top10');
    });

    it('should parse another valid repo', () => {
      const result = parseGitHubRepo('octocat/Hello-World');
      expect(result.owner).toBe('octocat');
      expect(result.repo).toBe('Hello-World');
    });

    it('should throw error for invalid format', () => {
      expect(() => parseGitHubRepo('invalid-repo')).toThrow(ConfigError);
      expect(() => parseGitHubRepo('invalid-repo')).toThrow(
        'Invalid GitHub repo format'
      );
    });

    it('should throw error for empty parts', () => {
      expect(() => parseGitHubRepo('/repo')).toThrow(ConfigError);
      expect(() => parseGitHubRepo('owner/')).toThrow(ConfigError);
    });
  });

  describe('file pattern matching', () => {
    let project: ProjectConfig;

    beforeEach(() => {
      project = getProjectConfig('topten');
    });

    it('should match markdown files', () => {
      expect(matchesFilePattern(project, 'test.md')).toBe(true);
      expect(matchesFilePattern(project, '01-broken-access-control.md')).toBe(true);
    });

    it('should not match non-markdown files', () => {
      expect(matchesFilePattern(project, 'test.txt')).toBe(false);
      expect(matchesFilePattern(project, 'README.rst')).toBe(false);
      expect(matchesFilePattern(project, 'image.png')).toBe(false);
    });

    it('should match files with no extension', () => {
      expect(matchesFilePattern(project, 'README')).toBe(false);
    });
  });

  describe('priority file checking', () => {
    let project: ProjectConfig;

    beforeEach(() => {
      project = getProjectConfig('topten');
    });

    it('should identify priority files', () => {
      expect(isPriorityFile(project, '01-broken-access-control.md')).toBe(true);
      expect(isPriorityFile(project, '02-cryptographic-failures.md')).toBe(true);
      expect(isPriorityFile(project, '03-injection.md')).toBe(true);
    });

    it('should identify non-priority files', () => {
      expect(isPriorityFile(project, '10-logging-monitoring.md')).toBe(false);
      expect(isPriorityFile(project, 'README.md')).toBe(false);
    });
  });

  describe('language utilities', () => {
    let project: ProjectConfig;

    beforeEach(() => {
      project = getProjectConfig('topten');
    });

    it('should get language display name', () => {
      expect(getLanguageDisplayName(project, 'es-ES')).toBe('Spanish (Spain)');
      expect(getLanguageDisplayName(project, 'ar-SA')).toBe(
        'Arabic (Saudi Arabia)'
      );
      expect(getLanguageDisplayName(project, 'fr-FR')).toBe('French (France)');
    });

    it('should return language code for unknown language', () => {
      expect(getLanguageDisplayName(project, 'xx-XX')).toBe('xx-XX');
    });

    it('should get active languages', () => {
      const activeLanguages = getActiveLanguages(project);
      expect(Array.isArray(activeLanguages)).toBe(true);
      expect(activeLanguages.length).toBeGreaterThan(0);

      activeLanguages.forEach((lang) => {
        expect(lang.code).toBeDefined();
        expect(lang.config.status).toBe('active');
      });
    });

    it('should include Spanish in active languages', () => {
      const activeLanguages = getActiveLanguages(project);
      const spanish = activeLanguages.find((l) => l.code === 'es-ES');
      expect(spanish).toBeDefined();
      expect(spanish?.config.name).toBe('Spanish (Spain)');
    });
  });

  describe('ConfigError', () => {
    it('should create ConfigError instance', () => {
      const error = new ConfigError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConfigError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ConfigError');
    });
  });

  describe('project validation', () => {
    it('topten should have valid GitHub repo format', () => {
      const config = getProjectConfig('topten');
      expect(config.githubRepo).toMatch(/^[\w-]+\/[\w-]+$/);
    });

    it('asvs should have valid GitHub repo format', () => {
      const config = getProjectConfig('asvs');
      expect(config.githubRepo).toMatch(/^[\w-]+\/[\w-]+$/);
    });

    it('all projects should have priorityFiles array', () => {
      const configs = getAllProjectConfigs();
      configs.forEach((config) => {
        expect(Array.isArray(config.priorityFiles)).toBe(true);
      });
    });

    it('all projects should have at least one language', () => {
      const configs = getAllProjectConfigs();
      configs.forEach((config) => {
        expect(Object.keys(config.languages).length).toBeGreaterThan(0);
      });
    });
  });
});
