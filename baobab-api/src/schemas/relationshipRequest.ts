import { z } from "zod";
import { userRelationshipTypeSchema } from "./relationship";

export const createRelationshipRequestSchema = z
  .object({
    type: userRelationshipTypeSchema,
    /** Ignored when Authorization is present — requester comes from JWT. */
    requesterId: z.string().uuid().optional(),
    fromPersonId: z.string().uuid(),
    toPersonId: z.string().uuid()
  })
  .refine((data) => data.fromPersonId !== data.toPersonId, {
    message: "A person cannot be related to themselves",
    path: ["toPersonId"]
  });

export const decideRelationshipRequestSchema = z.object({
  /** Ignored when Authorization is present — approver comes from JWT. */
  approverId: z.string().uuid().optional(),
  decision: z.enum(["approved", "rejected"])
});

export type CreateRelationshipRequestInput = z.infer<typeof createRelationshipRequestSchema>;
