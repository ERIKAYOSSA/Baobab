import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALES, TRANSLATIONS, type Locale } from "./translations";

const STORAGE_KEY = "baobab.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: <T = string>(path: string, vars?: Record<string, string | number>) => T;
};

const I18nContext = createContext<Ctx | null>(null);

function isLocale(v: string | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

function detectInitial(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (isLocale(nav)) return nav;
  return "fr";
}

function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(detectInitial());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback<Ctx["t"]>(
    (path, vars) => {
      const dict = TRANSLATIONS[locale];
      const value = resolve(dict, path);
      if (typeof value === "string") return format(value, vars) as never;
      return (value ?? path) as never;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
