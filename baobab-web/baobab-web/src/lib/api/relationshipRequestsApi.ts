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
export function mapUiRelation(relation: string): {
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
    case "Oncle":
    case "Tante":
      return { type: "PARENT_OF", direction: "parent_of_requester" };
    case "Cousin·e":
      return { type: "SIBLING_OF", direction: "peer" };
    default:
      return null;
  }
}
