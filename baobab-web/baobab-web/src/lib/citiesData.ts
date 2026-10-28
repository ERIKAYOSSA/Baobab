/**
 * Villes principales par pays (noms de pays = ceux de la liste COUNTRIES de l'onboarding).
 * L'utilisateur peut toujours saisir une localité qui n'est pas dans la liste.
 */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Cameroun: [
    "Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam", "Ngaoundéré", "Bertoua",
    "Loum", "Kumba", "Nkongsamba", "Buea", "Limbé", "Édéa", "Kribi", "Ebolowa", "Dschang",
    "Foumban", "Mbouda", "Bafang", "Bafia", "Sangmélima", "Mbalmayo", "Kumbo", "Tiko", "Guider",
    "Kousséri", "Mora", "Yagoua", "Meiganga", "Bangangté", "Mbanga", "Mamfé", "Wum", "Fundong",
    "Batouri", "Abong-Mbang", "Yokadouma", "Eséka", "Mokolo", "Tibati", "Foumbot", "Banyo",
    "Nanga-Eboko", "Obala", "Akonolinga", "Kékem", "Penja", "Melong", "Bafut", "Ndop", "Mutengene",
  ],
  "Côte d'Ivoire": [
    "Abidjan", "Yamoussoukro", "Bouaké", "Daloa", "San-Pédro", "Korhogo", "Man", "Gagnoa", "Abengourou",
    "Divo", "Soubré", "Agboville", "Grand-Bassam", "Odienné", "Bondoukou", "Ferkessédougou",
  ],
  Sénégal: [
    "Dakar", "Thiès", "Touba", "Saint-Louis", "Kaolack", "Ziguinchor", "Mbour", "Rufisque",
    "Diourbel", "Louga", "Tambacounda", "Kolda", "Pikine", "Guédiawaye",
  ],
  Mali: ["Bamako", "Sikasso", "Ségou", "Mopti", "Koutiala", "Kayes", "Gao", "Tombouctou", "Kidal", "Kati"],
  "Burkina Faso": [
    "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya", "Pouytenga", "Dédougou",
    "Fada N'Gourma", "Kaya", "Tenkodogo", "Dori",
  ],
  Niger: ["Niamey", "Zinder", "Maradi", "Agadez", "Tahoua", "Dosso", "Tillabéri", "Diffa"],
  Togo: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé", "Dapaong", "Tsévié", "Aného", "Bassar"],
  Bénin: [
    "Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Djougou", "Bohicon", "Kandi", "Ouidah",
    "Abomey", "Natitingou", "Lokossa",
  ],
  Guinée: ["Conakry", "Nzérékoré", "Kankan", "Kindia", "Labé", "Siguiri", "Mamou", "Boké", "Faranah"],
  "Guinée-Bissau": ["Bissau", "Bafatá", "Gabú", "Bissorã", "Bolama", "Cacheu"],
  "Guinée équatoriale": ["Malabo", "Bata", "Ebebiyín", "Aconibe", "Mongomo", "Luba"],
  Ghana: ["Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast", "Sunyani", "Ho", "Koforidua", "Tema", "Bolgatanga"],
  Nigéria: [
    "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu", "Onitsha",
    "Owerri", "Calabar", "Jos", "Abeokuta", "Maiduguri", "Warri", "Aba",
  ],
  Gabon: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda", "Lambaréné", "Mouila", "Tchibanga"],
  Congo: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Ouesso", "Impfondo", "Owando"],
  "République démocratique du Congo": [
    "Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani", "Goma", "Bukavu", "Kananga", "Likasi",
    "Kolwezi", "Tshikapa", "Matadi", "Mbandaka", "Bunia", "Uvira",
  ],
  Centrafrique: ["Bangui", "Bimbo", "Berbérati", "Bambari", "Bouar", "Bossangoa", "Carnot"],
  Tchad: ["N'Djamena", "Moundou", "Sarh", "Abéché", "Doba", "Kélo", "Koumra", "Pala"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale", "Garissa"],
  Tanzanie: ["Dar es Salaam", "Dodoma", "Mwanza", "Arusha", "Zanzibar", "Mbeya", "Morogoro", "Tanga", "Moshi"],
  Ouganda: ["Kampala", "Gulu", "Lira", "Mbarara", "Jinja", "Entebbe", "Mbale", "Masaka"],
  Rwanda: ["Kigali", "Butare", "Gisenyi", "Ruhengeri", "Gitarama", "Byumba", "Cyangugu"],
  Burundi: ["Gitega", "Bujumbura", "Ngozi", "Muyinga", "Ruyigi", "Kayanza", "Bururi"],
  Éthiopie: ["Addis-Abeba", "Dire Dawa", "Mekele", "Gondar", "Bahir Dar", "Hawassa", "Jimma", "Adama"],
  Érythrée: ["Asmara", "Keren", "Massawa", "Assab", "Mendefera"],
  Djibouti: ["Djibouti", "Ali Sabieh", "Tadjourah", "Obock", "Dikhil"],
  Somalie: ["Mogadiscio", "Hargeisa", "Berbera", "Kismayo", "Baidoa", "Garoowe"],
  Soudan: ["Khartoum", "Omdourman", "Port-Soudan", "Kassala", "El-Obeid", "Nyala"],
  "Soudan du Sud": ["Djouba", "Wau", "Malakal", "Yei", "Bor"],
  Égypte: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Assouan", "Port-Saïd", "Suez", "Mansourah"],
  Libye: ["Tripoli", "Benghazi", "Misrata", "Syrte", "Sebha", "Tobrouk"],
  Tunisie: ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Monastir", "Djerba"],
  Algérie: ["Alger", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif", "Tlemcen", "Béjaïa", "Tizi Ouzou"],
  Maroc: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda", "Tétouan", "Laâyoune"],
  Mauritanie: ["Nouakchott", "Nouadhibou", "Rosso", "Kaédi", "Zouérat", "Atar"],
  Gambie: ["Banjul", "Serekunda", "Brikama", "Bakau", "Farafenni", "Basse"],
  "Sierra Leone": ["Freetown", "Bo", "Kenema", "Makeni", "Koidu", "Lunsar"],
  Libéria: ["Monrovia", "Gbarnga", "Buchanan", "Kakata", "Harper", "Voinjama"],
  "Cap-Vert": ["Praia", "Mindelo", "Assomada", "Espargos", "Tarrafal"],
  "São Tomé-et-Príncipe": ["São Tomé", "Santo António", "Trindade", "Neves"],
  Angola: ["Luanda", "Huambo", "Lobito", "Benguela", "Lubango", "Malanje", "Cabinda", "Uíge"],
  Mozambique: ["Maputo", "Matola", "Beira", "Nampula", "Quelimane", "Tete", "Chimoio", "Pemba"],
  Zambie: ["Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chipata"],
  Zimbabwe: ["Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo", "Kwekwe"],
  Malawi: ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu"],
  Botswana: ["Gaborone", "Francistown", "Maun", "Molepolole", "Serowe"],
  Namibie: ["Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu"],
  "Afrique du Sud": [
    "Johannesburg", "Le Cap", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London",
    "Polokwane", "Soweto",
  ],
  Lesotho: ["Maseru", "Teyateyaneng", "Mafeteng", "Hlotse"],
  Eswatini: ["Mbabane", "Manzini", "Lobamba", "Siteki"],
  Madagascar: [
    "Antananarivo", "Toamasina", "Antsirabe", "Mahajanga", "Fianarantsoa", "Toliara", "Antsiranana",
  ],
  Maurice: ["Port-Louis", "Curepipe", "Vacoas-Phoenix", "Quatre Bornes", "Beau Bassin-Rose Hill"],
  Seychelles: ["Victoria", "Anse Boileau", "Beau Vallon", "Praslin"],
  Comores: ["Moroni", "Mutsamudu", "Fomboni", "Domoni"],
  // Diaspora
  France: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Bordeaux", "Lille", "Nantes", "Strasbourg", "Montpellier",
    "Nice", "Rennes", "Grenoble", "Saint-Denis", "Créteil", "Évry", "Nanterre",
  ],
  Belgique: ["Bruxelles", "Anvers", "Liège", "Gand", "Charleroi", "Namur", "Louvain", "Bruges"],
  Suisse: ["Genève", "Zurich", "Lausanne", "Berne", "Bâle", "Fribourg", "Lugano"],
  Allemagne: ["Berlin", "Hambourg", "Munich", "Cologne", "Francfort", "Stuttgart", "Düsseldorf", "Leipzig"],
  Italie: ["Rome", "Milan", "Naples", "Turin", "Bologne", "Florence", "Gênes", "Palerme"],
  Espagne: ["Madrid", "Barcelone", "Valence", "Séville", "Saragosse", "Malaga", "Bilbao"],
  Portugal: ["Lisbonne", "Porto", "Amadora", "Braga", "Coimbra", "Faro"],
  "Royaume-Uni": ["Londres", "Manchester", "Birmingham", "Liverpool", "Leeds", "Glasgow", "Bristol", "Sheffield"],
  Canada: ["Montréal", "Toronto", "Ottawa", "Québec", "Gatineau", "Calgary", "Vancouver", "Sherbrooke", "Edmonton"],
  "États-Unis": [
    "New York", "Washington", "Atlanta", "Houston", "Chicago", "Los Angeles", "Boston", "Dallas",
    "Philadelphie", "Miami", "Minneapolis", "Seattle",
  ],
  Haïti: ["Port-au-Prince", "Cap-Haïtien", "Gonaïves", "Les Cayes", "Jacmel", "Jérémie"],
  Jamaïque: ["Kingston", "Montego Bay", "Spanish Town", "Mandeville", "Portmore"],
};

/** Alias : nom court (indicatifs téléphoniques) → nom utilisé dans la liste de pays. */
const COUNTRY_ALIASES: Record<string, string> = {
  RDC: "République démocratique du Congo",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Retourne les villes du pays (ou [] si le pays n'est pas reconnu). */
export function citiesForCountry(country: string): string[] {
  const name = COUNTRY_ALIASES[country.trim()] ?? country.trim();
  if (CITIES_BY_COUNTRY[name]) return CITIES_BY_COUNTRY[name];
  const target = normalize(name);
  const key = Object.keys(CITIES_BY_COUNTRY).find((k) => normalize(k) === target);
  return key ? CITIES_BY_COUNTRY[key] : [];
}

/** Filtre les villes d'un pays selon la saisie (sans tenir compte des accents). */
export function searchCities(country: string, query: string, limit = 8): string[] {
  const list = citiesForCountry(country);
  const q = normalize(query);
  if (!q) return list.slice(0, limit);
  const starts = list.filter((c) => normalize(c).startsWith(q));
  const contains = list.filter((c) => !normalize(c).startsWith(q) && normalize(c).includes(q));
  return [...starts, ...contains].slice(0, limit);
}
