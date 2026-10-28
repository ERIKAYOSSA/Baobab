export type MaritalStatus = "single" | "married" | "widowed" | "divorced" | "unknown";

export type Person = {
  id: string;
  name: string;
  nickname?: string;
  honorifics?: string[];
  birth?: string;
  birthDate?: string;
  death?: string;
  deathDate?: string;
  status: "alive" | "deceased" | "unknown";
  verified: boolean;
  gender: "f" | "m";
  ethnicity?: string;
  title?: "chief" | "elder" | "notable";
  headOfFamily?: boolean;
  maritalStatus?: MaritalStatus;
  residence?: string;
  burialPlace?: string;
  /** Profile photo from API (Moi → Mon Arbre). */
  photoUrl?: string;
  parentIds?: string[];
  spouseIds?: string[];
  /** Co-épouses (CO_WIFE_OF), distinctes des conjoints. */
  coWifeIds?: string[];
  motherId?: string;
  fatherId?: string;
};

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: "Célibataire",
  married: "Marié(e)",
  widowed: "Veuf / Veuve",
  divorced: "Divorcé(e)",
  unknown: "Non renseigné",
};

export const TITLE_LABELS: Record<NonNullable<Person["title"]>, string> = {
  chief: "Chef traditionnel",
  elder: "Notable / Ancien",
  notable: "Notable",
};

export const SAMPLE_PEOPLE: Person[] = [
  {
    id: "gp1",
    name: "Mzee Kofi",
    nickname: "Mzee",
    honorifics: ["Nana", "Chef de canton"],
    birth: "1928",
    birthDate: "1928-04-12",
    death: "2001",
    deathDate: "2001-11-03",
    status: "deceased",
    verified: true,
    gender: "m",
    title: "chief",
    headOfFamily: true,
    maritalStatus: "married",
    residence: "Kumasi, Ghana",
    burialPlace: "Cimetière royal, Kumasi",
  },
  {
    id: "gp2",
    name: "Ama Serwaa",
    birth: "1932",
    death: "2018",
    status: "deceased",
    verified: true,
    gender: "f",
    spouseIds: ["gp1"],
    title: "elder",
    maritalStatus: "widowed",
    residence: "Kumasi, Ghana",
    burialPlace: "Cimetière royal, Kumasi",
  },
  {
    id: "gp3",
    name: "Baba Yao",
    birth: "1925",
    death: "1999",
    status: "deceased",
    verified: false,
    gender: "m",
    maritalStatus: "married",
    burialPlace: "Bouaké, Côte d'Ivoire",
  },
  {
    id: "gp4",
    name: "Akua Mansa",
    birth: "1930",
    status: "alive",
    verified: true,
    gender: "f",
    spouseIds: ["gp3"],
    title: "elder",
    maritalStatus: "widowed",
    residence: "Abidjan, Côte d'Ivoire",
  },
  {
    id: "p1",
    name: "Kwame Mensah",
    nickname: "Papa Kwame",
    honorifics: ["Doyen de la lignée"],
    birth: "1958",
    birthDate: "1958-07-21",
    status: "alive",
    verified: true,
    gender: "m",
    fatherId: "gp1",
    motherId: "gp2",
    spouseIds: ["p2", "p2b"],
    headOfFamily: true,
    maritalStatus: "married",
    residence: "Douala, Cameroun",
  },
  {
    id: "p2",
    name: "Adjoa Mensah",
    birth: "1962",
    status: "alive",
    verified: true,
    gender: "f",
    fatherId: "gp3",
    motherId: "gp4",
    spouseIds: ["p1"],
    coWifeIds: ["p2b"],
    maritalStatus: "married",
    residence: "Douala, Cameroun",
  },
  {
    id: "p2b",
    name: "Efua N.",
    birth: "1968",
    status: "alive",
    verified: false,
    gender: "f",
    spouseIds: ["p1"],
    coWifeIds: ["p2"],
    maritalStatus: "married",
    residence: "Kumasi, Ghana",
  },
  {
    id: "me",
    name: "Toi (Kojo)",
    nickname: "Kojo",
    birth: "1992",
    birthDate: "1992-02-14",
    status: "alive",
    verified: true,
    gender: "m",
    fatherId: "p1",
    motherId: "p2",
    maritalStatus: "single",
    residence: "Yaoundé, Cameroun",
  },
  {
    id: "sib1",
    name: "Ama",
    birth: "1989",
    status: "alive",
    verified: true,
    gender: "f",
    fatherId: "p1",
    motherId: "p2",
    maritalStatus: "married",
    residence: "Douala, Cameroun",
  },
  {
    id: "sib2",
    name: "Yaw",
    birth: "1996",
    status: "alive",
    verified: false,
    gender: "m",
    fatherId: "p1",
    motherId: "p2",
    maritalStatus: "single",
  },
  {
    id: "sib3",
    name: "Esi",
    birth: "2002",
    status: "unknown",
    verified: false,
    gender: "f",
    fatherId: "p1",
    motherId: "p2b",
  },
  {
    id: "ch1",
    name: "Akosua",
    birth: "2020",
    status: "alive",
    verified: true,
    gender: "f",
    fatherId: "me",
    residence: "Yaoundé, Cameroun",
  },
];
