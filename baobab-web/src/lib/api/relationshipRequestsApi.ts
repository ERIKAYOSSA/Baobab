import { apiRequest } from "./client";
import type { ProposeDirection, UserRelationshipType } from "./types";

export async function proposeLink(input: {
  type: UserRelationshipType;
  targetPersonId: string;
  direction?: ProposeDirection;
}) {
  return apiRequest<{ ok: true; message: string; data: unknown }>("/relationship-requests/propose", {
    method: "POST",
    auth: true,
    body: {
      type: input.type,
      targetPersonId: input.targetPersonId,
      direction: input.direction ?? "peer",
    },
  });
}

/** Lien explicite entre deux personnes (le demandeur doit être l'une d'elles ou avoir créé l'une d'elles). */
export async function createLinkRequest(input: {
  type: UserRelationshipType;
  fromPersonId: string;
  toPersonId: string;
}) {
  return apiRequest<{ ok: true; message: string; data: unknown }>("/relationship-requests", {
    method: "POST",
    auth: true,
    body: input,
  });
}

export async function decideRequest(requestId: string, decision: "approved" | "rejected") {
  return apiRequest<{ ok: true; message?: string; data?: unknown }>(
    `/relationship-requests/${requestId}/decide`,
    {
      method: "POST",
      auth: true,
      body: { decision },
    },
  );
}

/** Map UI French labels → API relationship type + direction */
/**
 * Lien choisi dans l'interface → lien enregistré. « relation » dit ce que la personne trouvée est pour moi.
 * Seuls les liens déclarables sont proposés : les cousins, oncles et tantes se déduisent des liens
 * parent / enfant / frère-sœur (ils ne peuvent pas être déclarés directement).
 */
export function mapUiRelation(
  relation: string,
  myGender?: "male" | "female" | null,
): {
  type: UserRelationshipType;
  direction: ProposeDirection;
} | null {
  switch (relation) {
    case "Père":
      return { type: "FATHER_OF", direction: "parent_of_requester" };
    case "Mère":
      return { type: "MOTHER_OF", direction: "parent_of_requester" };
    case "Frère":
    case "Sœur":
      return { type: "SIBLING_OF", direction: "peer" };
    case "Enfant":
      return {
        type: myGender === "female" ? "MOTHER_OF" : myGender === "male" ? "FATHER_OF" : "PARENT_OF",
        direction: "requester_is_parent",
      };
    case "Conjoint·e":
      return { type: "MARRIED_TO", direction: "peer" };
    default:
      return null;
  }
}

/** Retire une personne de ma famille : supprime tous les liens directs entre elle et moi. */
export async function removeLinksWith(personId: string) {
  return apiRequest<{ ok: true; data: { removed: number } }>(`/relationships/with/${personId}`, {
    method: "DELETE",
    auth: true,
  });
}
