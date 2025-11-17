import * as deepl from 'deepl-node';

export class TranslationError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TranslationError';
  }
}

export type SupportedLanguage =
  | 'es-ES'
  | 'ar-SA'
  | 'fr-FR'
  | 'de-DE'
  | 'zh-CN'
  | 'ja-JP'
  | 'pt-BR'
  | 'he-IL'
  | 'it-IT'
  | 'ko-KR'
  | 'nl-NL'
  | 'pl-PL'
  | 'ru-RU'
  | 'tr-TR';

// Map language codes to DeepL target language codes
const LANGUAGE_MAP: Record<string, string> = {
  'es-ES': 'ES',
  'ar-SA': 'AR',
  'fr-FR': 'FR',
  'de-DE': 'DE',
  'zh-CN': 'ZH',
  'ja-JP': 'JA',
  'pt-BR': 'PT-BR',
  'he-IL': 'HE',
  'it-IT': 'IT',
  'ko-KR': 'KO',
  'nl-NL': 'NL',
  'pl-PL': 'PL',
  'ru-RU': 'RU',
  'tr-TR': 'TR',
};

export class TranslationService {
  private translator: deepl.Translator | null = null;

  constructor() {
    const apiKey = process.env.DEEPL_API_KEY;
    if (apiKey) {
      this.translator = new deepl.Translator(apiKey);
    }
  }

  private ensureTranslator(): deepl.Translator {
    if (!this.translator) {
      throw new TranslationError(
        'DeepL API key not configured. Please set DEEPL_API_KEY environment variable.'
      );
    }
    return this.translator;
  }

  /**
   * Get DeepL target language code from our language code
   */
  private getTargetLanguage(languageCode: string): string {
    const deeplLang = LANGUAGE_MAP[languageCode];
    if (!deeplLang) {
      throw new TranslationError(`Unsupported language: ${languageCode}`);
    }
    return deeplLang;
  }

  /**
   * Translate text from English to target language
   */
  async translateText(
    text: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      const translator = this.ensureTranslator();
      const deeplLang = this.getTargetLanguage(targetLanguage);

      const result = await translator.translateText(
        text,
        'en',
        deeplLang as deepl.TargetLanguageCode
      );

      return result.text;
    } catch (error: any) {
      console.error('Translation error:', error);
      throw new TranslationError(
        `Failed to translate text: ${error.message}`,
        error
      );
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string
  ): Promise<string[]> {
    try {
      const translator = this.ensureTranslator();
      const deeplLang = this.getTargetLanguage(targetLanguage);

      const results = await translator.translateText(
        texts,
        'en',
        deeplLang as deepl.TargetLanguageCode
      );

      return Array.isArray(results)
        ? results.map((r) => r.text)
        : [results.text];
    } catch (error: any) {
      console.error('Batch translation error:', error);
      throw new TranslationError(
        `Failed to translate batch: ${error.message}`,
        error
      );
    }
  }

  /**
   * Translate markdown content while preserving formatting
   * Splits by paragraphs to maintain structure
   */
  async translateMarkdown(
    markdown: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      // Split markdown into sections to preserve code blocks and formatting
      const sections = this.splitMarkdownSections(markdown);

      const translatedSections = await Promise.all(
        sections.map(async (section) => {
          // Don't translate code blocks, URLs, or special syntax
          if (this.shouldSkipTranslation(section.content)) {
            return section.content;
          }

          // Translate the section
          return await this.translateText(section.content, targetLanguage);
        })
      );

      return translatedSections.join('');
    } catch (error: any) {
      console.error('Markdown translation error:', error);
      throw new TranslationError(
        `Failed to translate markdown: ${error.message}`,
        error
      );
    }
  }

  /**
   * Split markdown into translatable sections
   */
  private splitMarkdownSections(markdown: string): Array<{ content: string }> {
    const sections: Array<{ content: string }> = [];
    const lines = markdown.split('\n');
    let currentSection = '';
    let inCodeBlock = false;

    for (const line of lines) {
      // Check for code block markers
      if (line.trim().startsWith('```')) {
        if (currentSection) {
          sections.push({ content: currentSection });
          currentSection = '';
        }
        inCodeBlock = !inCodeBlock;
        currentSection += line + '\n';
        if (!inCodeBlock) {
          sections.push({ content: currentSection });
          currentSection = '';
        }
        continue;
      }

      if (inCodeBlock) {
        currentSection += line + '\n';
      } else {
        // Regular content - accumulate until we have enough for translation
        currentSection += line + '\n';

        // Push section if it's a heading or empty line (paragraph break)
        if (line.trim() === '' || line.trim().startsWith('#')) {
          if (currentSection.trim()) {
            sections.push({ content: currentSection });
            currentSection = '';
          }
        }
      }
    }

    // Push remaining content
    if (currentSection.trim()) {
      sections.push({ content: currentSection });
    }

    return sections;
  }

  /**
   * Check if a section should skip translation
   */
  private shouldSkipTranslation(content: string): boolean {
    const trimmed = content.trim();

    // Skip code blocks
    if (trimmed.startsWith('```') || trimmed.includes('```')) {
      return true;
    }

    // Skip if it's mostly code or URLs
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return true;
    }

    // Skip if it's empty or just whitespace
    if (!trimmed) {
      return true;
    }

    // Skip if it's just punctuation or special characters
    if (!/[a-zA-Z]{3,}/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Get usage statistics from DeepL
   */
  async getUsage(): Promise<{
    characterCount: number;
    characterLimit: number;
    percentage: number;
  }> {
    try {
      const translator = this.ensureTranslator();
      const usage = await translator.getUsage();

      const count = usage.character?.count || 0;
      const limit = usage.character?.limit || 0;
      const percentage = limit > 0 ? (count / limit) * 100 : 0;

      return {
        characterCount: count,
        characterLimit: limit,
        percentage,
      };
    } catch (error: any) {
      console.error('Failed to get usage:', error);
      return {
        characterCount: 0,
        characterLimit: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Check if translation service is available
   */
  isAvailable(): boolean {
    return this.translator !== null;
  }
}

// Singleton instance
let translationService: TranslationService | null = null;

export function getTranslationService(): TranslationService {
  if (!translationService) {
    translationService = new TranslationService();
  }
  return translationService;
}
