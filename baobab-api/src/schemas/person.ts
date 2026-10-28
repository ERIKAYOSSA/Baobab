import { z } from "zod";

const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^\+?[\d\s-]+$/, "Invalid phone format");

const maritalStatusSchema = z.enum(["single", "married", "widowed", "divorced", "unknown"]);
const socialTitleSchema = z.enum(["chief", "elder", "notable"]);

/** Profile photo: https URL or compressed data:image/* URI (set from "Moi"). */
const photoUrlSchema = z
  .string()
  .max(1_500_000)
  .refine(
    (value) =>
      value.startsWith("https://") ||
      value.startsWith("http://") ||
      /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value),
    { message: "photoUrl must be an http(s) URL or a data:image URI" }
  );

const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);

/** Optional profile / cultural fields shared by create & update. */
const profileFieldsSchema = z.object({
  photoUrl: photoUrlSchema.nullable().optional(),
  nickname: z.string().trim().max(80).nullable().optional(),
  honorifics: stringList(10, 80).nullable().optional(),
  socialTitle: socialTitleSchema.nullable().optional(),
  headOfFamily: z.boolean().nullable().optional(),
  maritalStatus: maritalStatusSchema.nullable().optional(),
  residence: z.string().trim().max(200).nullable().optional(),
  burialPlace: z.string().trim().max(200).nullable().optional(),
  ethnicity: z.string().trim().max(120).nullable().optional(),
  clan: z.string().trim().max(120).nullable().optional(),
  totem: z.string().trim().max(120).nullable().optional(),
  languages: stringList(10, 80).nullable().optional(),
  nationalities: stringList(5, 80).nullable().optional(),
  religion: z.string().trim().max(120).nullable().optional(),
  initiations: z.string().trim().max(500).nullable().optional(),
  oralHistory: z.string().trim().max(4000).nullable().optional(),
  birthCountry: z.string().trim().max(120).nullable().optional(),
  birthCity: z.string().trim().max(120).nullable().optional(),
  birthQuarter: z.string().trim().max(120).nullable().optional()
});

const personFieldsSchema = z
  .object({
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    gender: z.enum(["male", "female", "other"]).optional(),
    birthDate: z.string().optional(),
    deathDate: z.string().optional(),
    village: z.string().max(120).optional(),
    phone: phoneSchema.optional(),
    phoneVerifiedToken: z.string().optional(),
    /** Deceased relatives have a profile but cannot sign in. */
    vitalStatus: z.enum(["deceased"]).optional()
  })
  .merge(profileFieldsSchema);

export const createPersonSchema = personFieldsSchema
  .refine((data) => !data.phone || Boolean(data.phoneVerifiedToken), {
    message: "phoneVerifiedToken required when phone is provided",
    path: ["phoneVerifiedToken"]
  })
  .refine((data) => data.vitalStatus !== "deceased" || !data.phone, {
    message: "A deceased profile cannot have a phone login",
    path: ["phone"]
  });

export const updatePersonSchema = personFieldsSchema
  .omit({ phoneVerifiedToken: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  });

export const personSearchQuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export type CreatePersonInput = z.infer<typeof personFieldsSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type MaritalStatus = z.infer<typeof maritalStatusSchema>;
export type SocialTitle = z.infer<typeof socialTitleSchema>;
