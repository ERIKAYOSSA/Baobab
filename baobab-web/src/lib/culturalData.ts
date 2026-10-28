export type GenderForm = "f" | "m" | "x" | "";

export type Demonym = {
  country: string;
  m: string;
  f: string;
};

/** Gentilés FR — nationalité affichée (pas le nom du pays). */
export const DEMONYMS: Demonym[] = [
  { country: "Cameroun", m: "Camerounais", f: "Camerounaise" },
  { country: "Côte d'Ivoire", m: "Ivoirien", f: "Ivoirienne" },
  { country: "Sénégal", m: "Sénégalais", f: "Sénégalaise" },
  { country: "Mali", m: "Malien", f: "Malienne" },
  { country: "Burkina Faso", m: "Burkinabè", f: "Burkinabè" },
  { country: "Niger", m: "Nigérien", f: "Nigérienne" },
  { country: "Togo", m: "Togolais", f: "Togolaise" },
  { country: "Bénin", m: "Béninois", f: "Béninoise" },
  { country: "Guinée", m: "Guinéen", f: "Guinéenne" },
  { country: "Ghana", m: "Ghanéen", f: "Ghanéenne" },
  { country: "Nigéria", m: "Nigérian", f: "Nigériane" },
  { country: "Gabon", m: "Gabonais", f: "Gabonaise" },
  { country: "Congo", m: "Congolais", f: "Congolaise" },
  { country: "République démocratique du Congo", m: "Congolais", f: "Congolaise" },
  { country: "Centrafrique", m: "Centrafricain", f: "Centrafricaine" },
  { country: "Tchad", m: "Tchadien", f: "Tchadienne" },
  { country: "Kenya", m: "Kényan", f: "Kényane" },
  { country: "Tanzanie", m: "Tanzanien", f: "Tanzanienne" },
  { country: "Ouganda", m: "Ougandais", f: "Ougandaise" },
  { country: "Rwanda", m: "Rwandais", f: "Rwandaise" },
  { country: "Éthiopie", m: "Éthiopien", f: "Éthiopienne" },
  { country: "Afrique du Sud", m: "Sud-Africain", f: "Sud-Africaine" },
  { country: "Maroc", m: "Marocain", f: "Marocaine" },
  { country: "Algérie", m: "Algérien", f: "Algérienne" },
  { country: "Tunisie", m: "Tunisien", f: "Tunisienne" },
  { country: "Égypte", m: "Égyptien", f: "Égyptienne" },
  { country: "France", m: "Français", f: "Française" },
  { country: "Belgique", m: "Belge", f: "Belge" },
  { country: "Canada", m: "Canadien", f: "Canadienne" },
  { country: "États-Unis", m: "Américain", f: "Américaine" },
  { country: "Royaume-Uni", m: "Britannique", f: "Britannique" },
  { country: "Haïti", m: "Haïtien", f: "Haïtienne" },
  { country: "Madagascar", m: "Malgache", f: "Malgache" },
  { country: "Maurice", m: "Mauricien", f: "Mauricienne" },
  { country: "Angola", m: "Angolais", f: "Angolaise" },
  { country: "Mozambique", m: "Mozambicain", f: "Mozambicaine" },
  { country: "Namibie", m: "Namibien", f: "Namibienne" },
  { country: "Zambie", m: "Zambien", f: "Zambienne" },
  { country: "Zimbabwe", m: "Zimbabwéen", f: "Zimbabwéenne" },
  { country: "Somalie", m: "Somalien", f: "Somalienne" },
  { country: "Soudan", m: "Soudanais", f: "Soudanaise" },
  { country: "Soudan du Sud", m: "Sud-Soudanais", f: "Sud-Soudanaise" },
  { country: "Libéria", m: "Libérien", f: "Libérienne" },
  { country: "Sierra Leone", m: "Sierra-Léonais", f: "Sierra-Léonaise" },
  { country: "Gambie", m: "Gambien", f: "Gambienne" },
  { country: "Cap-Vert", m: "Cap-Verdien", f: "Cap-Verdienne" },
  { country: "Guinée-Bissau", m: "Bissau-Guinéen", f: "Bissau-Guinéenne" },
  { country: "Guinée équatoriale", m: "Équatoguinéen", f: "Équatoguinéenne" },
  { country: "São Tomé-et-Príncipe", m: "Santoméen", f: "Santoméenne" },
  { country: "Djibouti", m: "Djiboutien", f: "Djiboutienne" },
  { country: "Érythrée", m: "Érythréen", f: "Érythréenne" },
  { country: "Comores", m: "Comorien", f: "Comorienne" },
  { country: "Seychelles", m: "Seychellois", f: "Seychelloise" },
  { country: "Burundi", m: "Burundais", f: "Burundaise" },
  { country: "Malawi", m: "Malawite", f: "Malawite" },
  { country: "Botswana", m: "Botswanais", f: "Botswanaise" },
  { country: "Lesotho", m: "Mosotho", f: "Mosotho" },
  { country: "Eswatini", m: "Swazi", f: "Swazi" },
  { country: "Mauritanie", m: "Mauritanien", f: "Mauritanienne" },
  { country: "Libye", m: "Libyen", f: "Libyenne" },
  { country: "Portugal", m: "Portugais", f: "Portugaise" },
  { country: "Espagne", m: "Espagnol", f: "Espagnole" },
  { country: "Allemagne", m: "Allemand", f: "Allemande" },
  { country: "Italie", m: "Italien", f: "Italienne" },
  { country: "Suisse", m: "Suisse", f: "Suisse" },
  { country: "Jamaïque", m: "Jamaïcain", f: "Jamaïcaine" },
];

/** Ethnies / peuples par pays d’origine. */
export const ETHNICITIES_BY_COUNTRY: Record<string, string[]> = {
  Cameroun: [
    "Bamiléké", "Bassa", "Beti", "Ewondo", "Bulu", "Fang", "Duala", "Bakossi", "Baka", "Bagyeli",
    "Tikar", "Bamoun", "Nso", "Kom", "Maka", "Gbaya", "Fulbé", "Peul", "Haoussa", "Kanuri",
    "Arab Choa", "Moundang", "Tupuri", "Massa", "Musgum", "Kotoko", "Sara", "Kirdi",
  ],
  "Côte d'Ivoire": [
    "Baoulé", "Bété", "Sénoufo", "Malinké", "Dioula", "Agni", "Attié", "Guéré", "Yacouba", "Wobé",
    "Dida", "Abbey", "Ébrié", "Koulango", "Lobi", "Tagbana",
  ],
  Sénégal: ["Wolof", "Pulaar", "Sérère", "Diola", "Mandingue", "Soninké", "Bambara", "Manjak", "Mankagne"],
  Mali: ["Bambara", "Peul", "Soninké", "Malinké", "Songhaï", "Dogon", "Touareg", "Bobo", "Sénoufo", "Minianka"],
  "Burkina Faso": ["Mossi", "Peul", "Gourmantché", "Bobo", "Lobi", "Sénoufo", "Bissa", "Dagara", "Bwaba"],
  Niger: ["Haoussa", "Zarma", "Songhaï", "Touareg", "Peul", "Kanuri", "Toubou", "Arab"],
  Togo: ["Éwé", "Kabyè", "Tem", "Moba", "Kotokoli", "Fon", "Mina", "Akposso", "Bassar"],
  Bénin: ["Fon", "Adja", "Yoruba", "Bariba", "Dendi", "Peul", "Otamari", "Goun", "Mina"],
  Guinée: ["Peul", "Malinké", "Soussou", "Kissi", "Toma", "Guerzé", "Kpelle"],
  Ghana: ["Akan", "Ashanti", "Fanti", "Ewe", "Ga", "Dagomba", "Gonja", "Mole-Dagbani"],
  Nigéria: ["Yoruba", "Igbo", "Haoussa", "Fulani", "Ijaw", "Kanuri", "Tiv", "Ibibio", "Edo", "Nupe"],
  Gabon: ["Fang", "Punu", "Nzebi", "Mpongwe", "Teke", "Kota", "Myene"],
  Congo: ["Kongo", "Teke", "Mbochi", "Sangha", "Ubangi"],
  "République démocratique du Congo": [
    "Luba", "Kongo", "Mongo", "Mangbetu", "Zande", "Lunda", "Chokwe", "Tetela", "Hutu", "Tutsi",
  ],
  Centrafrique: ["Banda", "Gbaya", "Mandjia", "Sara", "Yakoma", "Ngbaka", "Zande"],
  Tchad: ["Sara", "Arabe", "Ouaddaï", "Kanembou", "Toubou", "Maba", "Massa", "Mousgoum"],
  Kenya: ["Kikuyu", "Luhya", "Luo", "Kalenjin", "Kamba", "Kisii", "Meru", "Maasaï", "Somali"],
  Tanzanie: ["Sukuma", "Chaga", "Haya", "Nyamwezi", "Makonde", "Maasaï", "Zaramo"],
  Ouganda: ["Baganda", "Banyankole", "Basoga", "Bakiga", "Iteso", "Langi", "Acholi"],
  Rwanda: ["Hutu", "Tutsi", "Twa"],
  Éthiopie: ["Oromo", "Amhara", "Tigré", "Somali", "Sidama", "Gurage", "Afar", "Wolayta"],
  "Afrique du Sud": ["Zulu", "Xhosa", "Afrikaner", "Sotho", "Tswana", "Venda", "Ndebele", "Tsonga", "Swazi"],
  Maroc: ["Arabe", "Amazigh", "Chleuh", "Riffain", "Sahraoui"],
  Algérie: ["Arabe", "Kabyle", "Chaoui", "Mozabite", "Touareg"],
  Tunisie: ["Arabe", "Berbère"],
  Égypte: ["Arabe", "Nubien", "Bedouin", "Copte"],
  France: ["Français", "Breton", "Corse", "Basque", "Alsacien", "Occitan", "Créole"],
  Haïti: ["Haïtien", "Créole"],
  Madagascar: ["Merina", "Betsimisaraka", "Betsileo", "Sakalava", "Antandroy", "Tsimihety"],
};

/** Langues ethniques / locales par pays. */
export const ETHNIC_LANGUAGES_BY_COUNTRY: Record<string, string[]> = {
  Cameroun: [
    "Ewondo", "Duala", "Bassa", "Fulfuldé", "Bamoun", "Bamiléké", "Bulú", "Fang", "Hausa", "Kanuri",
    "Maka", "Tupuri", "Mundang", "Pidgin camerounais",
  ],
  "Côte d'Ivoire": ["Baoulé", "Dioula", "Bété", "Sénoufo", "Agni", "Attié", "Yacouba", "Guéré"],
  Sénégal: ["Wolof", "Pulaar", "Sérère", "Diola", "Mandinka", "Soninké", "Bambara"],
  Mali: ["Bambara", "Fulfuldé", "Soninké", "Songhaï", "Tamasheq", "Dogon", "Malinké"],
  "Burkina Faso": ["Mooré", "Dioula", "Fulfuldé", "Gulmancéma", "Bobo", "Dagara"],
  Niger: ["Haoussa", "Zarma", "Tamasheq", "Fulfuldé", "Kanuri", "Arabe"],
  Togo: ["Éwé", "Kabyè", "Tem", "Mina", "Moba"],
  Bénin: ["Fon", "Yoruba", "Bariba", "Dendi", "Goun", "Mina"],
  Guinée: ["Peul (Pular)", "Malinké", "Soussou", "Kissi", "Guerzé"],
  Ghana: ["Twi", "Akan", "Ewe", "Ga", "Dagbani", "Fante"],
  Nigéria: ["Yoruba", "Igbo", "Haoussa", "Fulfuldé", "Pidgin nigérian", "Kanuri", "Ibibio", "Tiv"],
  Gabon: ["Fang", "Punu", "Nzebi", "Myene"],
  Congo: ["Kituba", "Lingala", "Teke", "Kongo"],
  "République démocratique du Congo": ["Lingala", "Swahili", "Kikongo", "Tshiluba", "Luba"],
  Kenya: ["Kikuyu", "Luo", "Kalenjin", "Kamba", "Maasaï", "Swahili"],
  Tanzanie: ["Swahili", "Sukuma", "Chaga", "Maasaï"],
  Rwanda: ["Kinyarwanda"],
  Éthiopie: ["Amharique", "Oromo", "Tigrinya", "Somali", "Sidamo"],
  "Afrique du Sud": ["Zoulou", "Xhosa", "Afrikaans", "Sotho", "Tswana", "Venda"],
  Maroc: ["Darija", "Tamazight", "Tachelhit", "Tarifit"],
  Algérie: ["Darija", "Kabyle", "Tamazight"],
  Tunisie: ["Darija", "Arabe tunisien"],
  Égypte: ["Arabe égyptien", "Nubien"],
  Madagascar: ["Malgache"],
  Haïti: ["Créole haïtien"],
};

/** Langues officielles / internationales courantes (toujours proposées). */
export const WORLD_OFFICIAL_LANGUAGES = [
  "Français", "Anglais", "Arabe", "Portugais", "Espagnol", "Swahili", "Chinois", "Hindi",
  "Russe", "Allemand", "Italien", "Néerlandais", "Turc", "Persan", "Japonais", "Coréen",
  "Indonésien", "Malais", "Bengali", "Ourdou", "Grec", "Hébreu", "Polonais", "Roumain",
  "Suédois", "Norvégien", "Danois", "Finnois", "Tchèque", "Hongrois", "Ukrainien", "Vietnamien",
  "Thaï", "Birman", "Tagalog", "Créole", "Latin",
];

export function demonymLabel(d: Demonym, gender: GenderForm): string {
  return gender === "f" ? d.f : d.m;
}

export function demonymOptions(gender: GenderForm): string[] {
  return DEMONYMS.map((d) => demonymLabel(d, gender));
}

export function countryFromDemonym(nationality: string): string | null {
  const n = nationality.trim().toLowerCase();
  const hit = DEMONYMS.find((d) => d.m.toLowerCase() === n || d.f.toLowerCase() === n);
  return hit?.country ?? null;
}

export function demonymForCountry(country: string, gender: GenderForm): string {
  const hit = DEMONYMS.find((d) => d.country.toLowerCase() === country.trim().toLowerCase());
  if (!hit) return country;
  return demonymLabel(hit, gender);
}

export function ethnicitiesForOrigin(originCountry: string): string[] {
  if (!originCountry.trim()) return [];
  const key = Object.keys(ETHNICITIES_BY_COUNTRY).find(
    (k) => k.toLowerCase() === originCountry.trim().toLowerCase(),
  );
  return key ? ETHNICITIES_BY_COUNTRY[key] : [];
}

export function languageSuggestionsForOrigin(originCountry: string): string[] {
  const key = Object.keys(ETHNIC_LANGUAGES_BY_COUNTRY).find(
    (k) => k.toLowerCase() === originCountry.trim().toLowerCase(),
  );
  const ethnic = key ? ETHNIC_LANGUAGES_BY_COUNTRY[key] : [];
  return Array.from(new Set([...ethnic, ...WORLD_OFFICIAL_LANGUAGES])).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}
