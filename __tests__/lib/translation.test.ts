import {
  TranslationService,
  TranslationError,
  getTranslationService,
} from '@/lib/translation';

// Mock deepl-node
jest.mock('deepl-node', () => {
  return {
    Translator: jest.fn().mockImplementation(() => ({
      translateText: jest.fn(),
      getUsage: jest.fn(),
    })),
  };
});

describe('TranslationService', () => {
  let service: TranslationService;
  let mockTranslator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TranslationService();
    mockTranslator = (service as any).translator;
  });

  describe('constructor', () => {
    it('should create service with API key', () => {
      expect(service).toBeInstanceOf(TranslationService);
    });

    it('should be available when API key is set', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('translateText', () => {
    beforeEach(() => {
      mockTranslator.translateText.mockResolvedValue({
        text: 'Hola mundo',
      });
    });

    it('should translate English to Spanish', async () => {
      const result = await service.translateText('Hello world', 'es-ES');
      expect(result).toBe('Hola mundo');
      expect(mockTranslator.translateText).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'ES'
      );
    });

    it('should translate English to French', async () => {
      mockTranslator.translateText.mockResolvedValue({
        text: 'Bonjour le monde',
      });

      const result = await service.translateText('Hello world', 'fr-FR');
      expect(result).toBe('Bonjour le monde');
      expect(mockTranslator.translateText).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'FR'
      );
    });

    it('should translate English to Arabic', async () => {
      mockTranslator.translateText.mockResolvedValue({
        text: 'مرحبا بالعالم',
      });

      const result = await service.translateText('Hello world', 'ar-SA');
      expect(result).toBe('مرحبا بالعالم');
      expect(mockTranslator.translateText).toHaveBeenCalledWith(
        'Hello world',
        'en',
        'AR'
      );
    });

    it('should throw error for unsupported language', async () => {
      await expect(
        service.translateText('Hello world', 'xx-XX')
      ).rejects.toThrow(TranslationError);
      await expect(
        service.translateText('Hello world', 'xx-XX')
      ).rejects.toThrow('Unsupported language: xx-XX');
    });

    it('should handle API errors', async () => {
      mockTranslator.translateText.mockRejectedValue(
        new Error('API quota exceeded')
      );

      await expect(
        service.translateText('Hello world', 'es-ES')
      ).rejects.toThrow(TranslationError);
      await expect(
        service.translateText('Hello world', 'es-ES')
      ).rejects.toThrow('Failed to translate text');
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      mockTranslator.translateText.mockResolvedValue([
        { text: 'Hola' },
        { text: 'Mundo' },
        { text: 'Adiós' },
      ]);

      const result = await service.translateBatch(
        ['Hello', 'World', 'Goodbye'],
        'es-ES'
      );

      expect(result).toEqual(['Hola', 'Mundo', 'Adiós']);
      expect(mockTranslator.translateText).toHaveBeenCalledWith(
        ['Hello', 'World', 'Goodbye'],
        'en',
        'ES'
      );
    });

    it('should handle single result as array', async () => {
      mockTranslator.translateText.mockResolvedValue({
        text: 'Hola',
      });

      const result = await service.translateBatch(['Hello'], 'es-ES');
      expect(result).toEqual(['Hola']);
    });

    it('should throw error on batch failure', async () => {
      mockTranslator.translateText.mockRejectedValue(
        new Error('Batch failed')
      );

      await expect(
        service.translateBatch(['Hello', 'World'], 'es-ES')
      ).rejects.toThrow(TranslationError);
    });
  });

  describe('translateMarkdown', () => {
    it('should translate simple markdown', async () => {
      mockTranslator.translateText.mockResolvedValue({
        text: '# Hola mundo',
      });

      const result = await service.translateMarkdown('# Hello world', 'es-ES');
      expect(result).toContain('Hola mundo');
    });

    it('should preserve code blocks', async () => {
      const markdown = `
# Hello

\`\`\`javascript
const hello = "world";
\`\`\`

Some text
`;

      mockTranslator.translateText
        .mockResolvedValueOnce({ text: '# Hola\n' })
        .mockResolvedValueOnce({ text: '\nAlgún texto\n' });

      const result = await service.translateMarkdown(markdown, 'es-ES');

      // Should contain the code block unchanged
      expect(result).toContain('const hello = "world"');
      expect(result).toContain('```javascript');
    });

    it('should skip URLs', async () => {
      const markdown = 'Visit https://example.com for more info';

      // URL section should be skipped
      const result = await service.translateMarkdown(markdown, 'es-ES');
      expect(mockTranslator.translateText).toHaveBeenCalled();
    });

    it('should handle multiple sections', async () => {
      const markdown = `# Title

First paragraph.

Second paragraph.`;

      mockTranslator.translateText
        .mockResolvedValueOnce({ text: '# Título\n' })
        .mockResolvedValueOnce({ text: '\nPrimer párrafo.\n' })
        .mockResolvedValueOnce({ text: '\nSegundo párrafo.' });

      const result = await service.translateMarkdown(markdown, 'es-ES');
      expect(result).toContain('Título');
    });

    it('should handle translation errors', async () => {
      mockTranslator.translateText.mockRejectedValue(
        new Error('Translation failed')
      );

      await expect(
        service.translateMarkdown('# Hello', 'es-ES')
      ).rejects.toThrow(TranslationError);
    });
  });

  describe('getUsage', () => {
    it('should return usage statistics', async () => {
      mockTranslator.getUsage.mockResolvedValue({
        character: {
          count: 50000,
          limit: 500000,
        },
      });

      const result = await service.getUsage();
      expect(result.characterCount).toBe(50000);
      expect(result.characterLimit).toBe(500000);
      expect(result.percentage).toBe(10);
    });

    it('should handle zero limit', async () => {
      mockTranslator.getUsage.mockResolvedValue({
        character: {
          count: 0,
          limit: 0,
        },
      });

      const result = await service.getUsage();
      expect(result.characterCount).toBe(0);
      expect(result.characterLimit).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle missing usage data', async () => {
      mockTranslator.getUsage.mockResolvedValue({});

      const result = await service.getUsage();
      expect(result.characterCount).toBe(0);
      expect(result.characterLimit).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle usage errors gracefully', async () => {
      mockTranslator.getUsage.mockRejectedValue(new Error('Failed'));

      const result = await service.getUsage();
      expect(result.characterCount).toBe(0);
      expect(result.characterLimit).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe('markdown section splitting', () => {
    it('should identify code blocks correctly', () => {
      const service = new TranslationService();
      const shouldSkip = (service as any).shouldSkipTranslation;

      expect(shouldSkip('```javascript\ncode\n```')).toBe(true);
      expect(shouldSkip('```\ncode\n```')).toBe(true);
      expect(shouldSkip('Regular text')).toBe(false);
    });

    it('should skip URLs', () => {
      const service = new TranslationService();
      const shouldSkip = (service as any).shouldSkipTranslation;

      expect(shouldSkip('http://example.com')).toBe(true);
      expect(shouldSkip('https://example.com')).toBe(true);
      expect(shouldSkip('Regular text')).toBe(false);
    });

    it('should skip empty or whitespace content', () => {
      const service = new TranslationService();
      const shouldSkip = (service as any).shouldSkipTranslation;

      expect(shouldSkip('')).toBe(true);
      expect(shouldSkip('   ')).toBe(true);
      expect(shouldSkip('\n\n')).toBe(true);
      expect(shouldSkip('text')).toBe(false);
    });

    it('should skip content without enough text', () => {
      const service = new TranslationService();
      const shouldSkip = (service as any).shouldSkipTranslation;

      expect(shouldSkip('!@#')).toBe(true);
      expect(shouldSkip('123')).toBe(true);
      expect(shouldSkip('Hello world')).toBe(false);
    });
  });

  describe('language code mapping', () => {
    it('should map all supported languages', async () => {
      mockTranslator.translateText.mockResolvedValue({ text: 'test' });

      const languages = [
        'es-ES',
        'ar-SA',
        'fr-FR',
        'de-DE',
        'zh-CN',
        'ja-JP',
        'pt-BR',
        'he-IL',
        'it-IT',
        'ko-KR',
        'nl-NL',
        'pl-PL',
        'ru-RU',
        'tr-TR',
      ];

      for (const lang of languages) {
        await expect(
          service.translateText('test', lang)
        ).resolves.toBeDefined();
      }
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const service1 = getTranslationService();
      const service2 = getTranslationService();
      expect(service1).toBe(service2);
    });
  });

  describe('TranslationError', () => {
    it('should create error with message', () => {
      const error = new TranslationError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TranslationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TranslationError');
    });

    it('should store cause', () => {
      const cause = new Error('Original error');
      const error = new TranslationError('Wrapped error', cause);
      expect(error.cause).toBe(cause);
    });
  });
});

describe('TranslationService without API key', () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.DEEPL_API_KEY;
    delete process.env.DEEPL_API_KEY;
  });

  afterAll(() => {
    if (originalKey) {
      process.env.DEEPL_API_KEY = originalKey;
    }
  });

  it('should not be available without API key', () => {
    const service = new TranslationService();
    expect(service.isAvailable()).toBe(false);
  });

  it('should throw error when translating without API key', async () => {
    const service = new TranslationService();
    await expect(
      service.translateText('Hello', 'es-ES')
    ).rejects.toThrow('DeepL API key not configured');
  });
});
