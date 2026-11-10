import { apiRequest } from "./client";
import type { ApiPerson, DiscoverResult, FamilyTreeResult, PersonProfileUpdate } from "./types";

type Ok<T> = { ok: true; count?: number; data: T };

export type CreatePersonInput = {
  firstName: string;
  lastName: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;
  village?: string;
  phone?: string;
  phoneVerifiedToken?: string;
  ethnicity?: string;
  languages?: string[];
  nationalities?: string[];
  birthCountry?: string;
  birthCity?: string;
  birthQuarter?: string;
  nickname?: string;
  residence?: string;
};

export async function createPerson(input: CreatePersonInput) {
  return apiRequest<Ok<ApiPerson>>("/persons", {
    method: "POST",
    body: input,
  });
}

export async function searchPersons(q: string, limit = 20) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiRequest<Ok<ApiPerson[]>>(`/persons/search?${params}`);
}

/** Suggestions pendant la saisie : membres dont le nom commence par ce qui est tapé. */
export async function suggestNames(q: string, limit = 6) {
  const params = new URLSearchParams({ q, limit: String(limit), prefix: "true" });
  return apiRequest<Ok<ApiPerson[]>>(`/persons/search?${params}`);
}

export async function getFamilyTree(personId: string, depth = 2) {
  return apiRequest<{ ok: true; personId: string; data: FamilyTreeResult }>(
    `/persons/${personId}/family-tree?depth=${depth}`,
    { auth: true },
  );
}

export async function updatePerson(personId: string, fields: PersonProfileUpdate) {
  return apiRequest<Ok<ApiPerson>>(`/persons/${personId}`, {
    method: "PUT",
    auth: true,
    body: fields,
  });
}

export type CreateRelativeInput = {
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  birthDate?: string;
  deathDate?: string;
  village?: string;
  /** Numéro (format international) d'un proche vivant sans compte : il récupère son profil en s'inscrivant. */
  claimPhone?: string;
  /** "deceased" pour un proche décédé ; omis pour un enfant mineur vivant. */
  vitalStatus?: "deceased";
};

/** Ajoute un proche sans compte (enfant mineur ou défunt) — nécessite d'être connecté. */
export async function createRelative(input: CreateRelativeInput) {
  return apiRequest<Ok<ApiPerson>>("/persons", {
    method: "POST",
    auth: true,
    body: input,
  });
}

/** Membres qui ont activé « Apparaître dans les suggestions » + liens potentiels (connecté). */
export async function getDiscover() {
  return apiRequest<{ ok: true; data: DiscoverResult }>("/persons/discover", { auth: true });
}

/** Supprime un proche que j'ai ajouté et qui n'a pas de compte (profil et liens). */
export async function deleteRelative(personId: string) {
  return apiRequest<{ ok: true; message: string; personId: string }>(`/persons/${personId}/relative`, {
    method: "DELETE",
    auth: true,
  });
}
