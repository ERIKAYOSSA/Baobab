import { apiRequest } from "./client";
import type { ApiPerson, VerifyOtpResult } from "./types";

type Ok<T> = { ok: true; message?: string; data: T };

export type AuthSession = {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  person: ApiPerson;
  pinRequired?: boolean;
  personId?: string;
};

export async function sendOtp(phone: string) {
  return apiRequest<Ok<{ phone: string; expiresInSec: number; devCode?: string }>>("/auth/send-otp", {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string, pin?: string) {
  return apiRequest<Ok<VerifyOtpResult>>("/auth/verify-otp", {
    method: "POST",
    body: { phone, code, ...(pin ? { pin } : {}) },
  });
}

export async function login(params: { phone?: string; personId?: string; pin?: string }) {
  return apiRequest<Ok<AuthSession>>("/auth/login", {
    method: "POST",
    body: params,
  });
}

export async function refreshSession(refreshToken: string) {
  return apiRequest<Ok<AuthSession>>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipRefresh: true,
  });
}

export async function logout() {
  return apiRequest<{ ok: true; message?: string }>("/auth/logout", {
    method: "POST",
    auth: true,
  });
}

export async function setPin(pin: string) {
  return apiRequest<Ok<AuthSession & { personId: string }>>("/auth/set-pin", {
    method: "POST",
    auth: true,
    body: { pin },
  });
}

export async function changePin(currentPin: string, newPin: string) {
  return apiRequest<{ ok: true; message?: string }>("/auth/change-pin", {
    method: "POST",
    auth: true,
    body: { currentPin, newPin },
  });
}

export async function getMe(token?: string) {
  return apiRequest<Ok<{ person: ApiPerson; pendingApprovals: number }>>("/auth/me", {
    auth: true,
    token,
  });
}
