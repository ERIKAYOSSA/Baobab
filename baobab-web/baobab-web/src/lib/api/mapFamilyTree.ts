import type { Person } from "@/components/tree/types";
import type { ApiPerson, FamilyTreeEdge, FamilyTreeNode, FamilyTreeResult, MaritalStatus } from "./types";

const PARENT_TYPES = new Set(["PARENT_OF", "FATHER_OF", "MOTHER_OF"]);
const SPOUSE_TYPES = new Set(["HUSBAND_OF", "WIFE_OF", "MARRIED_TO"]);
const CO_WIFE_TYPES = new Set(["CO_WIFE_OF"]);

function yearOf(date?: string | null): string | undefined {
  if (!date) return undefined;
  const m = String(date).match(/^(\d{4})/);
  return m?.[1];
}

function toGender(g?: string | null): "f" | "m" {
  return g === "female" ? "f" : "m";
}

function uniqueIds(ids: string[]): string[] {
  return ids.filter((id, i, arr) => arr.indexOf(id) === i);
}

function displayName(p: Pick<ApiPerson, "firstName" | "lastName">): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Sans nom";
}

function mapProfileFields(p: ApiPerson): Partial<Person> {
  return {
    nickname: p.nickname ?? undefined,
    honorifics: p.honorifics?.length ? [...p.honorifics] : undefined,
    title: p.socialTitle ?? undefined,
    headOfFamily: p.headOfFamily ?? undefined,
    maritalStatus: (p.maritalStatus as MaritalStatus | null | undefined) ?? undefined,
    residence: p.residence ?? p.village ?? undefined,
    burialPlace: p.burialPlace ?? undefined,
    ethnicity: p.ethnicity ?? undefined,
    photoUrl: p.photoUrl ?? undefined,
  };
}

export function personFromApi(p: ApiPerson, extras: Partial<Person> = {}): Person {
  const birth = yearOf(p.birthDate);
  const death = yearOf(p.deathDate);
  return {
    id: p.id,
    name: displayName(p),
    birth,
    birthDate: p.birthDate ?? undefined,
    death,
    deathDate: p.deathDate ?? undefined,
    status: death ? "deceased" : "alive",
    verified: Boolean(p.phone),
    gender: toGender(p.gender),
    ...mapProfileFields(p),
    ...extras,
  };
}

export function mapFamilyTreeToPeople(tree: FamilyTreeResult): {
  people: Person[];
  meId: string;
  familyName: string;
} {
  const meId = String(tree.root.id);
  const edges = tree.edges ?? [];
  const nodes = tree.nodes?.length ? tree.nodes : [tree.root];

  const people = nodes.map((node) => mapNode(node, edges, meId));
  const familyName = tree.root.lastName?.trim() || "Ma famille";

  return { people, meId, familyName };
}

function mapNode(node: FamilyTreeNode, edges: FamilyTreeEdge[], meId: string): Person {
  const id = String(node.id);
  let fatherId: string | undefined;
  let motherId: string | undefined;

  for (const e of edges) {
    if (!PARENT_TYPES.has(e.type) || e.toPersonId !== id || e.official === false) continue;
    if (e.type === "FATHER_OF") fatherId = e.fromPersonId;
    else if (e.type === "MOTHER_OF") motherId = e.fromPersonId;
    else if (!fatherId) fatherId = e.fromPersonId;
    else if (!motherId && e.fromPersonId !== fatherId) motherId = e.fromPersonId;
  }

  const spouseIds = uniqueIds(
    edges
      .filter((e) => SPOUSE_TYPES.has(e.type) && (e.fromPersonId === id || e.toPersonId === id))
      .map((e) => (e.fromPersonId === id ? e.toPersonId : e.fromPersonId)),
  );
  const coWifeIds = uniqueIds(
    edges
      .filter((e) => CO_WIFE_TYPES.has(e.type) && (e.fromPersonId === id || e.toPersonId === id))
      .map((e) => (e.fromPersonId === id ? e.toPersonId : e.fromPersonId)),
  );

  const birth = yearOf(node.birthDate);
  const death = yearOf(node.deathDate);
  const profile = mapProfileFields(node);

  return {
    id,
    name: id === meId ? `Toi (${displayName(node)})` : displayName(node),
    birth,
    birthDate: node.birthDate ?? undefined,
    death,
    deathDate: node.deathDate ?? undefined,
    status: death ? "deceased" : "alive",
    verified: Boolean(node.phone),
    gender: toGender(node.gender),
    fatherId,
    motherId,
    spouseIds: spouseIds.length ? spouseIds : undefined,
    coWifeIds: coWifeIds.length ? coWifeIds : undefined,
    ...profile,
    maritalStatus: profile.maritalStatus ?? (spouseIds.length ? "married" : undefined),
  };
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Utilisateur", lastName: "Baobab" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
