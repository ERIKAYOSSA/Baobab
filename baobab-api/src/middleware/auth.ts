import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/** Token purposes used by Baobab auth (invite/claim reserved for living-member invites). */
export type TokenPurpose = "access" | "refresh" | "phone_verified" | "invite" | "claim";

export type AuthPayload = {
  personId: string;
  purpose: "access";
};

export type RefreshPayload = {
  personId: string;
  purpose: "refresh";
  jti: string;
};

/** Future: personalized invite link for a pre-created living relative. */
export type InvitePayload = {
  personId: string;
  purpose: "invite";
  inviterId: string;
  jti: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthPayload;
};

export function publicPerson(person: Record<string, unknown>): Record<string, unknown> {
  const {
    pinHash: _p,
    refreshTokenHash: _r,
    refreshTokenJti: _j,
    ...safe
  } = person;
  return safe;
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function signAccessToken(personId: string): string {
  return jwt.sign({ personId, purpose: "access" satisfies TokenPurpose }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

/** @deprecated use signAccessToken — kept for older call sites during migration */
export function signToken(personId: string): string {
  return signAccessToken(personId);
}

export function signRefreshToken(personId: string): { token: string; jti: string; hash: string } {
  const jti = randomBytes(16).toString("hex");
  const token = jwt.sign(
    { personId, purpose: "refresh" satisfies TokenPurpose, jti },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
  return { token, jti, hash: hashToken(token) };
}

/** Reserved for future living-member invite links (not wired to routes yet). */
export function signInviteToken(personId: string, inviterId: string): { token: string; jti: string } {
  const jti = randomBytes(16).toString("hex");
  const token = jwt.sign(
    { personId, inviterId, purpose: "invite" satisfies TokenPurpose, jti },
    env.JWT_SECRET,
    { expiresIn: env.JWT_INVITE_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
  return { token, jti };
}

export function verifyAccessToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("personId" in decoded) ||
    (decoded as { purpose?: string }).purpose !== "access"
  ) {
    // Backward-compat: tokens issued before purpose field
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "personId" in decoded &&
      !("purpose" in decoded)
    ) {
      return { personId: String((decoded as { personId: unknown }).personId), purpose: "access" };
    }
    throw new Error("INVALID_TOKEN");
  }
  return { personId: String((decoded as AuthPayload).personId), purpose: "access" };
}

export function verifyToken(token: string): AuthPayload {
  return verifyAccessToken(token);
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    (decoded as { purpose?: string }).purpose !== "refresh" ||
    !("personId" in decoded) ||
    !("jti" in decoded)
  ) {
    throw new Error("INVALID_REFRESH");
  }
  return {
    personId: String((decoded as RefreshPayload).personId),
    purpose: "refresh",
    jti: String((decoded as RefreshPayload).jti)
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, message: "Authentication required" });
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}

/** Authenticated user must match `:personId` (or given param name). */
export function requireSelf(paramName = "personId") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const targetId = req.params[paramName];
    if (!req.auth?.personId) {
      res.status(401).json({ ok: false, message: "Authentication required" });
      return;
    }
    if (req.auth.personId !== targetId) {
      res.status(403).json({ ok: false, message: "You can only act on your own profile" });
      return;
    }
    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = verifyAccessToken(header.slice("Bearer ".length));
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}
