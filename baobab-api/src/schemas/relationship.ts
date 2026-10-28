import { z } from "zod";

/** Declared by users (approval workflow). Supports polygyny and explicit parent roles. */
export const userRelationshipTypes = [
  "FATHER_OF",
  "MOTHER_OF",
  "PARENT_OF",
  "HUSBAND_OF",
  "WIFE_OF",
  "MARRIED_TO",
  "CO_WIFE_OF",
  "SIBLING_OF"
] as const;

/** Derived automatically from explicit blood and union links. */
export const autoRelationshipTypes = ["FULL_SIBLING_OF", "HALF_SIBLING_OF", "COUSIN_OF"] as const;

export const relationshipTypes = [...userRelationshipTypes, ...autoRelationshipTypes] as const;

export const consanguinityLineages = ["paternal", "maternal", "both"] as const;

export type UserRelationshipType = (typeof userRelationshipTypes)[number];
export type AutoRelationshipType = (typeof autoRelationshipTypes)[number];
export type RelationshipType = (typeof relationshipTypes)[number];
export type ConsanguinityLineage = (typeof consanguinityLineages)[number];

export const userRelationshipTypeSchema = z.enum(userRelationshipTypes);
export const relationshipTypeSchema = z.enum(relationshipTypes);
export const consanguinityLineageSchema = z.enum(consanguinityLineages);

export const createRelationshipSchema = z
  .object({
    type: userRelationshipTypeSchema,
    fromPersonId: z.string().uuid(),
    toPersonId: z.string().uuid()
  })
  .refine((data) => data.fromPersonId !== data.toPersonId, {
    message: "A person cannot be related to themselves",
    path: ["toPersonId"]
  });

export const deleteRelationshipQuerySchema = z.object({
  type: userRelationshipTypeSchema,
  fromPersonId: z.string().uuid(),
  toPersonId: z.string().uuid()
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
