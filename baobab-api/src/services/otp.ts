import jwt from "jsonwebtoken";
import { env } from "../config/env";

type OtpEntry = { code: string; expiresAt: number };

const otpStore = new Map<string, OtpEntry>();

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (phone.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function issueOtp(phone: string): { code: string; expiresInSec: number } {
  const normalized = normalizePhone(phone);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresInSec = 600;
  otpStore.set(normalized, { code, expiresAt: Date.now() + expiresInSec * 1000 });

  if (env.OTP_LOG) {
    console.log(`[Baobab OTP] ${normalized} -> ${code}`);
  }

  return { code, expiresInSec };
}

export function checkOtpCode(phone: string, code: string): boolean {
  const normalized = normalizePhone(phone);
  const entry = otpStore.get(normalized);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    return false;
  }
  return entry.code === code;
}

export function consumeOtp(phone: string): void {
  otpStore.delete(normalizePhone(phone));
}

/** @deprecated use checkOtpCode + consumeOtp */
export function verifyOtpCode(phone: string, code: string): boolean {
  if (!checkOtpCode(phone, code)) return false;
  consumeOtp(phone);
  return true;
}

export function signPhoneVerifiedToken(phone: string): string {
  return jwt.sign({ phone: normalizePhone(phone), purpose: "phone_verified" }, env.JWT_SECRET, {
    expiresIn: "30m"
  });
}

export function verifyPhoneVerifiedToken(token: string, phone: string): boolean {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { phone?: string; purpose?: string };
    return payload.purpose === "phone_verified" && payload.phone === normalizePhone(phone);
  } catch {
    return false;
  }
}
