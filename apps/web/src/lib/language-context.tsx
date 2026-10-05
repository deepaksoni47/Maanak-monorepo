"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, TranslationKeys } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isHindi: boolean;
  t: (path: string, fallback?: string) => string;
  dict: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "maanak_language_preference";

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (savedLang === "en" || savedLang === "hi") {
        setLanguageState(savedLang);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Helper to safely fetch nested translation key e.g. "nav.home"
  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    const currentDict = translations[language] || translations.en;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = currentDict;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English if missing in Hindi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallbackVal: any = translations.en;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            return fallback || path;
          }
        }
        return typeof fallbackVal === "string" ? fallbackVal : (fallback || path);
      }
    }
    return typeof current === "string" ? current : (fallback || path);
  };

  const isHindi = language === "hi";
  const dict = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isHindi, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a default fallback if used outside provider
    return {
      language: "en",
      setLanguage: () => {},
      isHindi: false,
      t: (path: string, fallback?: string) => fallback || path,
      dict: translations.en,
    };
  }
  return context;
};
