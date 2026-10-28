import { z } from "zod";

const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^\+?[\d\s-]+$/, "Invalid phone format");

export const loginSchema = z
  .object({
    personId: z.string().uuid().optional(),
    phone: phoneSchema.optional(),
    pin: z.string().min(4).max(32).optional()
  })
  .refine((data) => Boolean(data.personId || data.phone), {
    message: "personId or phone is required"
  });

export const sendOtpSchema = z.object({
  phone: phoneSchema
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  pin: z.string().min(4).max(32).optional()
});

/** Set PIN for the authenticated user (personId taken from JWT). */
export const setPinSchema = z.object({
  pin: z.string().min(4).max(32),
  /** @deprecated ignored when Authorization present — kept for older clients */
  personId: z.string().uuid().optional()
});

export const changePinSchema = z.object({
  currentPin: z.string().min(4).max(32),
  newPin: z.string().min(4).max(32)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
