import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLanguage, LANGUAGES, translate, type Language, type MessageKey } from "./strings";

const STORAGE_KEY = "goldlands-presentation-language";

interface LanguageContextValue {
  language: Language;
  dir: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : "he";
  } catch {
    return "he";
  }
}

export function LanguageProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => initial ?? readStoredLanguage());
  const dir = LANGUAGES.find((item) => item.id === language)?.dir ?? "rtl";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [dir, language]);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      if (initial) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable: the choice lasts for this visit only
      }
    },
    [initial],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, dir, setLanguage, t: (key, params) => translate(language, key, params) }),
    [dir, language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}
