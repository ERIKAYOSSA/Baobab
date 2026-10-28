export const LOCALES = ["fr", "en", "sw"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  sw: "Kiswahili",
};

type Dict = {
  nav: { tree: string; discover: string; notifications: string; me: string };
  tree: {
    eyebrow: string;
    settings: string;
    legendAlive: string;
    legendDeceased: string;
    legendUnknown: string;
    verified: string;
    notVerified: string;
    viewProfile: string;
    proposeEdit: string;
    addChild: string;
    requestLink: string;
    addPerson: string;
    enrichTree: string;
    legacy: string;
    relParent: string;
    relSpouse: string;
    relCoWife: string;
    relChild: string;
  };
  me: {
    headOfFamily: string;
    change: string;
    culturalData: string;
    culturalHint: string;
    discoveryPrefs: string;
    appearInSuggestions: string;
    detectLinks: string;
    receiveInvites: string;
    visPublic: string;
    visFamily: string;
    visPrivate: string;
    language: string;
  };
  common: {
    profileMeta: string;
  };
};

export const TRANSLATIONS: Record<Locale, Dict> = {
  fr: {
    nav: { tree: "Mon Arbre", discover: "Découvrir", notifications: "Notif.", me: "Moi" },
    tree: {
      eyebrow: "Mon arbre",
      settings: "Paramètres",
      legendAlive: "Vivant",
      legendDeceased: "Décédé",
      legendUnknown: "Non renseigné",
      verified: "Vérifié ✓",
      notVerified: "Non vérifié",
      viewProfile: "Voir profil",
      proposeEdit: "Proposer modif.",
      addChild: "Ajouter enfant",
      requestLink: "Demander lien",
      addPerson: "Ajouter une personne",
      enrichTree: "Enrichir mon arbre",
      legacy: "Mon héritage",
      relParent: "Enfant de",
      relSpouse: "Marié·e",
      relCoWife: "Co-épouse",
      relChild: "Parent de",
    },
    me: {
      headOfFamily: "Mon chef de famille",
      change: "Changer",
      culturalData: "Données culturelles",
      culturalHint: "Touche l'icône à droite pour changer la visibilité de chaque champ.",
      discoveryPrefs: "Préférences de découverte",
      appearInSuggestions: "Apparaître dans les suggestions",
      detectLinks: "Détecter mes liens potentiels",
      receiveInvites: "Recevoir des invitations d'inconnus",
      visPublic: "Public",
      visFamily: "Famille",
      visPrivate: "Privé",
      language: "Langue",
    },
    common: { profileMeta: "{year} — {verifiedLabel}" },
  },
  en: {
    nav: { tree: "My Tree", discover: "Discover", notifications: "Alerts", me: "Me" },
    tree: {
      eyebrow: "My tree",
      settings: "Settings",
      legendAlive: "Alive",
      legendDeceased: "Deceased",
      legendUnknown: "Unknown",
      verified: "Verified ✓",
      notVerified: "Unverified",
      viewProfile: "View profile",
      proposeEdit: "Propose edit",
      addChild: "Add child",
      requestLink: "Request link",
      addPerson: "Add a person",
      enrichTree: "Enrich my tree",
      legacy: "My legacy",
      relParent: "Child of",
      relSpouse: "Married to",
      relCoWife: "Co-wife",
      relChild: "Parent of",
    },
    me: {
      headOfFamily: "My family head",
      change: "Change",
      culturalData: "Cultural data",
      culturalHint: "Tap the icon on the right to change visibility of each field.",
      discoveryPrefs: "Discovery preferences",
      appearInSuggestions: "Appear in suggestions",
      detectLinks: "Detect my potential links",
      receiveInvites: "Receive invites from strangers",
      visPublic: "Public",
      visFamily: "Family",
      visPrivate: "Private",
      language: "Language",
    },
    common: { profileMeta: "{year} — {verifiedLabel}" },
  },
  sw: {
    nav: { tree: "Mti Wangu", discover: "Gundua", notifications: "Arifa", me: "Mimi" },
    tree: {
      eyebrow: "Mti wangu",
      settings: "Mipangilio",
      legendAlive: "Hai",
      legendDeceased: "Marehemu",
      legendUnknown: "Haijulikani",
      verified: "Imethibitishwa ✓",
      notVerified: "Haijathibitishwa",
      viewProfile: "Tazama wasifu",
      proposeEdit: "Pendekeza marekebisho",
      addChild: "Ongeza mtoto",
      requestLink: "Omba kiungo",
      addPerson: "Ongeza mtu",
      enrichTree: "Boresha mti wangu",
      legacy: "Urithi wangu",
      relParent: "Mtoto wa",
      relSpouse: "Ameolewa na",
      relCoWife: "Mke mwenza",
      relChild: "Mzazi wa",
    },
    me: {
      headOfFamily: "Mkuu wa familia yangu",
      change: "Badilisha",
      culturalData: "Taarifa za kitamaduni",
      culturalHint: "Bonyeza aikoni upande wa kulia kubadilisha mwonekano wa kila uga.",
      discoveryPrefs: "Mapendeleo ya ugunduzi",
      appearInSuggestions: "Onekana katika mapendekezo",
      detectLinks: "Tambua viungo vyangu vinavyowezekana",
      receiveInvites: "Pokea mialiko kutoka kwa wageni",
      visPublic: "Umma",
      visFamily: "Familia",
      visPrivate: "Faragha",
      language: "Lugha",
    },
    common: { profileMeta: "{year} — {verifiedLabel}" },
  },
};
