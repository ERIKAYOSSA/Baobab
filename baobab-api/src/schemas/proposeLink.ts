import { z } from "zod";
import { userRelationshipTypeSchema, type UserRelationshipType } from "./relationship";

export const proposeLinkSchema = z.object({
  type: userRelationshipTypeSchema,
  targetPersonId: z.string().uuid(),
  direction: z.enum(["parent_of_requester", "requester_is_parent", "peer"]).default("peer")
});

export type ProposeLinkInput = z.infer<typeof proposeLinkSchema>;

const PARENT_TYPES = new Set<UserRelationshipType>(["FATHER_OF", "MOTHER_OF", "PARENT_OF"]);

export function resolveProposedLink(
  type: UserRelationshipType,
  requesterId: string,
  targetPersonId: string,
  direction: ProposeLinkInput["direction"]
): { fromPersonId: string; toPersonId: string } {
  if (PARENT_TYPES.has(type)) {
    if (direction === "parent_of_requester") {
      return { fromPersonId: targetPersonId, toPersonId: requesterId };
    }
    if (direction === "requester_is_parent") {
      return { fromPersonId: requesterId, toPersonId: targetPersonId };
    }
  }
  return { fromPersonId: requesterId, toPersonId: targetPersonId };
}
