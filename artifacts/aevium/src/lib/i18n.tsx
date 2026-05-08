import React, { createContext, useContext, useState } from 'react';
import enTranslations from '../locales/en/common.json';
import esTranslations from '../locales/es/common.json';

type Language = 'en' | 'es';

type TranslationKey = keyof typeof enTranslations;

const translationMap: Record<Language, Record<string, string>> = {
  en: enTranslations as Record<string, string>,
  es: esTranslations as Record<string, string>,
};

type I18nContextType = {
  t: (key: TranslationKey) => string;
  lang: Language;
  setLang: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('aevium-lang');
    return (saved === 'es' || saved === 'en') ? saved : 'es';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('aevium-lang', newLang);
  };

  const t = (key: TranslationKey): string => {
    return translationMap[lang][key] ?? translationMap['en'][key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
