import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALES, TRANSLATIONS, type Locale } from "./translations";
import { EN_PHRASES } from "./phrases_en";

const STORAGE_KEY = "baobab.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: <T = string>(path: string, vars?: Record<string, string | number>) => T;
};

const I18nContext = createContext<Ctx | null>(null);

// Langue courante, lue par tr() au moment du rendu (mise à jour par le Provider).
let currentLocale: Locale = "fr";

/**
 * Traduit un texte écrit en français : en anglais, renvoie la version de EN_PHRASES ;
 * dans les autres langues (ou si la phrase n'est pas encore traduite), renvoie le français.
 * Les variables s'écrivent {nom} : tr("Bonjour {nom}", { nom: "Awa" }).
 */
export function tr(fr: string, vars?: Record<string, string | number>): string {
  const text = currentLocale === "en" ? (EN_PHRASES[fr] ?? fr) : fr;
  return vars ? format(text, vars) : text;
}

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

  currentLocale = locale;
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  // key={locale} : toute l'interface se redessine quand la langue change.
  return (
    <I18nContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
