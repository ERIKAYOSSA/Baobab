import { detectDefaultDial, DIAL_COUNTRIES } from "@/lib/phoneCountries";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/translations";

/** Langues d’UI proposées selon le pays (indicatif / fuseau). Affinage ultérieur possible. */
const OFFICIAL_UI_BY_ISO: Record<string, Locale[]> = {
  CM: ["fr", "en"],
  CI: ["fr"],
  SN: ["fr"],
  ML: ["fr"],
  BF: ["fr"],
  NE: ["fr"],
  TG: ["fr"],
  BJ: ["fr"],
  GN: ["fr"],
  GA: ["fr"],
  CG: ["fr"],
  CD: ["fr"],
  CF: ["fr"],
  TD: ["fr"],
  MA: ["fr"],
  DZ: ["fr"],
  TN: ["fr"],
  FR: ["fr"],
  BE: ["fr", "en"],
  GH: ["en"],
  NG: ["en"],
  KE: ["en", "sw"],
  TZ: ["en", "sw"],
  UG: ["en"],
  RW: ["en", "fr"],
  ZA: ["en"],
  EG: ["en"],
  ET: ["en"],
  US: ["en"],
  CA: ["en", "fr"],
  GB: ["en"],
};

export function detectCountryIso(): string {
  const dial = detectDefaultDial();
  return DIAL_COUNTRIES.find((c) => c.dial === dial)?.iso ?? "CM";
}

/** Langues UI à mettre en avant sur l’écran d’accueil pour le pays détecté. */
export function officialUiLocalesForDevice(): Locale[] {
  const iso = detectCountryIso();
  const preferred = OFFICIAL_UI_BY_ISO[iso] ?? ["fr", "en"];
  return preferred.filter((l) => (LOCALES as readonly string[]).includes(l));
}

export function officialLanguageLabelsForDevice(): string[] {
  return officialUiLocalesForDevice().map((l) => LOCALE_LABELS[l]);
}

/** Libellé compact pour le pied de landing. */
export function landingLanguagesLine(): string {
  const labels = officialLanguageLabelsForDevice();
  if (labels.length === 0) return "Français · English";
  return `Disponible en ${labels.join(" · ")}`;
}
