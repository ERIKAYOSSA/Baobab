export type DialCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

/** Indicatifs fréquents (Afrique + diaspora) — défaut Cameroun. */
export const DIAL_COUNTRIES: DialCountry[] = [
  { iso: "CM", name: "Cameroun", dial: "237", flag: "🇨🇲" },
  { iso: "CI", name: "Côte d'Ivoire", dial: "225", flag: "🇨🇮" },
  { iso: "SN", name: "Sénégal", dial: "221", flag: "🇸🇳" },
  { iso: "ML", name: "Mali", dial: "223", flag: "🇲🇱" },
  { iso: "BF", name: "Burkina Faso", dial: "226", flag: "🇧🇫" },
  { iso: "NE", name: "Niger", dial: "227", flag: "🇳🇪" },
  { iso: "TG", name: "Togo", dial: "228", flag: "🇹🇬" },
  { iso: "BJ", name: "Bénin", dial: "229", flag: "🇧🇯" },
  { iso: "GN", name: "Guinée", dial: "224", flag: "🇬🇳" },
  { iso: "GH", name: "Ghana", dial: "233", flag: "🇬🇭" },
  { iso: "NG", name: "Nigéria", dial: "234", flag: "🇳🇬" },
  { iso: "GA", name: "Gabon", dial: "241", flag: "🇬🇦" },
  { iso: "CG", name: "Congo", dial: "242", flag: "🇨🇬" },
  { iso: "CD", name: "RDC", dial: "243", flag: "🇨🇩" },
  { iso: "CF", name: "Centrafrique", dial: "236", flag: "🇨🇫" },
  { iso: "TD", name: "Tchad", dial: "235", flag: "🇹🇩" },
  { iso: "KE", name: "Kenya", dial: "254", flag: "🇰🇪" },
  { iso: "TZ", name: "Tanzanie", dial: "255", flag: "🇹🇿" },
  { iso: "UG", name: "Ouganda", dial: "256", flag: "🇺🇬" },
  { iso: "RW", name: "Rwanda", dial: "250", flag: "🇷🇼" },
  { iso: "ET", name: "Éthiopie", dial: "251", flag: "🇪🇹" },
  { iso: "ZA", name: "Afrique du Sud", dial: "27", flag: "🇿🇦" },
  { iso: "MA", name: "Maroc", dial: "212", flag: "🇲🇦" },
  { iso: "DZ", name: "Algérie", dial: "213", flag: "🇩🇿" },
  { iso: "TN", name: "Tunisie", dial: "216", flag: "🇹🇳" },
  { iso: "EG", name: "Égypte", dial: "20", flag: "🇪🇬" },
  { iso: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { iso: "BE", name: "Belgique", dial: "32", flag: "🇧🇪" },
  { iso: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { iso: "US", name: "États-Unis", dial: "1", flag: "🇺🇸" },
  { iso: "GB", name: "Royaume-Uni", dial: "44", flag: "🇬🇧" },
];

const TZ_TO_ISO: Record<string, string> = {
  "Africa/Douala": "CM",
  "Africa/Yaounde": "CM",
  "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN",
  "Africa/Bamako": "ML",
  "Africa/Ouagadougou": "BF",
  "Africa/Niamey": "NE",
  "Africa/Lome": "TG",
  "Africa/Porto-Novo": "BJ",
  "Africa/Conakry": "GN",
  "Africa/Accra": "GH",
  "Africa/Lagos": "NG",
  "Africa/Libreville": "GA",
  "Africa/Brazzaville": "CG",
  "Africa/Kinshasa": "CD",
  "Africa/Lubumbashi": "CD",
  "Africa/Bangui": "CF",
  "Africa/Ndjamena": "TD",
  "Africa/Nairobi": "KE",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kampala": "UG",
  "Africa/Kigali": "RW",
  "Africa/Addis_Ababa": "ET",
  "Africa/Johannesburg": "ZA",
  "Africa/Casablanca": "MA",
  "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN",
  "Africa/Cairo": "EG",
  "Europe/Paris": "FR",
  "Europe/Brussels": "BE",
  "Europe/London": "GB",
  "America/Toronto": "CA",
  "America/Montreal": "CA",
  "America/New_York": "US",
};

const DEFAULT_DIAL = "237";

/** Détecte l’indicatif local (fuseau / locale navigateur). Défaut : Cameroun 237. */
export function detectDefaultDial(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isoFromTz = tz ? TZ_TO_ISO[tz] : undefined;
    if (isoFromTz) {
      const match = DIAL_COUNTRIES.find((c) => c.iso === isoFromTz);
      if (match) return match.dial;
    }

    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    const region = lang.includes("-") ? lang.split("-")[1]?.toUpperCase() : undefined;
    if (region) {
      const match = DIAL_COUNTRIES.find((c) => c.iso === region);
      if (match) return match.dial;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DIAL;
}

export function buildE164(dial: string, national: string): string {
  const d = dial.replace(/\D/g, "");
  let n = national.replace(/\D/g, "");
  // évite +237237… si l’utilisateur recolle l’indicatif
  if (n.startsWith(d)) n = n.slice(d.length);
  if (n.startsWith("0")) n = n.slice(1);
  return `+${d}${n}`;
}

export function countryByDial(dial: string): DialCountry | undefined {
  return DIAL_COUNTRIES.find((c) => c.dial === dial);
}
