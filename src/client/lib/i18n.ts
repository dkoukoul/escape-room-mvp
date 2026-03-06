// ============================================================
// Internationalization Service
// ============================================================

export type Language = "en" | "el";
export type TranslationKey = string;

interface Translations {
  [key: string]: string | Translations;
}

class I18nService {
  private currentLang: Language = "en";
  private translations: Record<Language, Translations> = {
    en: {},
    el: {},
  };
  private fallbackLang: Language = "en";

  /**
   * Initialize the i18n service
   * @param defaultLang Default language to use
   */
  async init(defaultLang?: Language): Promise<void> {
    // Detect language from localStorage, URL param, or browser
    const detectedLang = this.detectLanguage(defaultLang);
    this.currentLang = detectedLang;
    
    // Load translations
    await this.loadTranslations(detectedLang);
    
    // Save preference
    this.saveLanguagePreference(detectedLang);
  }

  /**
   * Change the current language
   */
  async changeLanguage(lang: Language): Promise<void> {
    if (lang === this.currentLang) return;
    
    this.currentLang = lang;
    await this.loadTranslations(lang);
    this.saveLanguagePreference(lang);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
  }

  /**
   * Get translated string
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: string | Translations | undefined = this.translations[this.currentLang];

    // Navigate through nested keys
    for (const k of keys) {
      if (typeof value === "object" && value !== null && k in value) {
        value = (value as Translations)[k];
      } else {
        // Fallback to English
        value = this.translations[this.fallbackLang];
        for (const fk of keys) {
          if (typeof value === "object" && value !== null && fk in value) {
            value = (value as Translations)[fk];
          } else {
            return `[MISSING: ${key}]`;
          }
        }
        break;
      }
    }

    if (typeof value !== "string") {
      return `[INVALID: ${key}]`;
    }

    // Replace parameters
    if (params) {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramValue));
      }
      return result;
    }

    return value;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLang;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): Language[] {
    return Object.keys(this.translations) as Language[];
  }

  /**
   * Detect preferred language
   */
  private detectLanguage(defaultLang?: Language): Language {
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    if (urlLang && (urlLang === "en" || urlLang === "el")) {
      return urlLang as Language;
    }

    // 2. Check localStorage
    const savedLang = localStorage.getItem("odyssey_language");
    if (savedLang && (savedLang === "en" || savedLang === "el")) {
      return savedLang as Language;
    }

    // 3. Check default parameter
    if (defaultLang) {
      return defaultLang;
    }

    // 4. Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("el")) {
      return "el";
    }

    // 5. Default to English
    return "en";
  }

  /**
   * Load translation file
   */
  private async loadTranslations(lang: Language): Promise<void> {
    try {
      const module = await import(`../locales/${lang}.ts`);
      this.translations[lang] = module.default;
    } catch (error) {
      console.warn(`Failed to load translations for ${lang}:`, error);
      // Initialize with empty object if loading fails
      this.translations[lang] = {};
    }
  }

  /**
   * Save language preference to localStorage
   */
  private saveLanguagePreference(lang: Language): void {
    localStorage.setItem("odyssey_language", lang);
  }
}

// Export singleton instance
export const i18n = new I18nService();

// Convenience function for templates
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}