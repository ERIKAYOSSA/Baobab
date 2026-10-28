import { Router } from "express";
import type { Session } from "neo4j-driver";
import bcrypt from "bcryptjs";
import { getDriver } from "../db/neo4j";
import {
  loginSchema,
  setPinSchema,
  changePinSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema
} from "../schemas/auth";
import {
  signAccessToken,
  signRefreshToken,
  requireAuth,
  publicPerson,
  hashToken,
  verifyRefreshToken,
  type AuthenticatedRequest
} from "../middleware/auth";
import { issueOtp, normalizePhone, signPhoneVerifiedToken, checkOtpCode, consumeOtp } from "../services/otp";
import { env } from "../config/env";

const authRouter = Router();

async function persistRefresh(
  session: Session,
  personId: string,
  refresh: { hash: string; jti: string }
): Promise<void> {
  await session.run(
    `
    MATCH (p:Person {id: $personId})
    SET p.refreshTokenHash = $hash, p.refreshTokenJti = $jti, p.refreshIssuedAt = datetime()
    `,
    { personId, hash: refresh.hash, jti: refresh.jti }
  );
}

async function issueSession(session: Session, person: Record<string, unknown>) {
  const personId = person.id as string;
  const accessToken = signAccessToken(personId);
  const refresh = signRefreshToken(personId);
  await persistRefresh(session, personId, refresh);
  return {
    token: accessToken,
    accessToken,
    refreshToken: refresh.token,
    person: { ...publicPerson(person), hasPin: Boolean(person.pinHash) },
    pinRequired: Boolean(person.pinHash)
  };
}

async function loginPerson(
  person: Record<string, unknown>,
  pin?: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const pinHash = person.pinHash as string | undefined;

  if (pinHash) {
    if (!pin) {
      return { error: "PIN required for this account", status: 401 };
    }
    const valid = await bcrypt.compare(pin, pinHash);
    if (!valid) {
      return { error: "Invalid PIN", status: 401 };
    }
  }

  return { ok: true };
}

authRouter.post("/send-otp", async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const phone = normalizePhone(parsed.data.phone);
  const { code, expiresInSec } = issueOtp(phone);

  res.json({
    ok: true,
    message: "Verification code sent",
    data: {
      phone,
      expiresInSec,
      ...(env.OTP_LOG ? { devCode: code } : {})
    }
  });
});

authRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { phone: rawPhone, code, pin } = parsed.data;
  const phone = normalizePhone(rawPhone);

  if (!checkOtpCode(phone, code)) {
    return res.status(401).json({ ok: false, message: "Invalid or expired verification code" });
  }

  const session = getDriver().session();

  try {
    const result = await session.run(`MATCH (p:Person {phone: $phone}) RETURN p`, { phone });

    if (result.records.length === 0) {
      consumeOtp(phone);
      const phoneVerifiedToken = signPhoneVerifiedToken(phone);
      return res.json({
        ok: true,
        message: "Phone verified. Complete signup.",
        data: { signupRequired: true, phone, phoneVerifiedToken }
      });
    }

    const person = result.records[0].get("p").properties as Record<string, unknown>;
    if (person.vitalStatus === "deceased") {
      return res.status(403).json({ ok: false, message: "Deceased profiles cannot sign in" });
    }
    const pinHash = person.pinHash as string | undefined;

    if (pinHash && !pin) {
      return res.json({
        ok: true,
        message: "PIN required",
        data: { pinRequired: true, phone }
      });
    }

    const loginResult = await loginPerson(person, pin);
    if ("error" in loginResult) {
      return res.status(loginResult.status).json({ ok: false, message: loginResult.error });
    }

    consumeOtp(phone);
    const data = await issueSession(session, person);

    res.json({
      ok: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "OTP verification failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { personId, phone: rawPhone, pin } = parsed.data;
  const session = getDriver().session();

  try {
    const result = personId
      ? await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId })
      : await session.run(`MATCH (p:Person {phone: $phone}) RETURN p`, { phone: normalizePhone(rawPhone!) });

    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const person = result.records[0].get("p").properties as Record<string, unknown>;

    if (person.vitalStatus === "deceased") {
      return res.status(403).json({ ok: false, message: "Deceased profiles cannot sign in" });
    }

    // Invited / unclaimed living stubs cannot log in until they claim via invite link.
    if (person.accountStatus === "invited" || person.accountStatus === "unclaimed") {
      return res.status(403).json({
        ok: false,
        message: "This profile must be claimed via the invite link before login"
      });
    }

    const loginResult = await loginPerson(person, pin);
    if ("error" in loginResult) {
      return res.status(loginResult.status).json({ ok: false, message: loginResult.error });
    }

    const data = await issueSession(session, person);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Login failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const session = getDriver().session();
  try {
    let payload;
    try {
      payload = verifyRefreshToken(parsed.data.refreshToken);
    } catch {
      return res.status(401).json({ ok: false, message: "Invalid or expired refresh token" });
    }

    const result = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, {
      personId: payload.personId
    });
    if (result.records.length === 0) {
      return res.status(401).json({ ok: false, message: "Invalid refresh token" });
    }

    const person = result.records[0].get("p").properties as Record<string, unknown>;
    const storedHash = person.refreshTokenHash as string | undefined;
    const storedJti = person.refreshTokenJti as string | undefined;
    const incomingHash = hashToken(parsed.data.refreshToken);

    if (!storedHash || storedHash !== incomingHash || storedJti !== payload.jti) {
      return res.status(401).json({ ok: false, message: "Refresh token revoked or reused" });
    }

    const data = await issueSession(session, person);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to refresh session",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.post("/logout", requireAuth, async (req: AuthenticatedRequest, res) => {
  const personId = req.auth!.personId;
  const session = getDriver().session();
  try {
    await session.run(
      `
      MATCH (p:Person {id: $personId})
      REMOVE p.refreshTokenHash, p.refreshTokenJti, p.refreshIssuedAt
      `,
      { personId }
    );
    res.json({ ok: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Logout failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.post("/set-pin", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = setPinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const personId = req.auth!.personId;
  if (parsed.data.personId && parsed.data.personId !== personId) {
    return res.status(403).json({ ok: false, message: "You can only set your own PIN" });
  }

  const { pin } = parsed.data;
  const session = getDriver().session();

  try {
    const existing = await session.run(
      `MATCH (p:Person {id: $personId}) RETURN p`,
      { personId }
    );

    if (existing.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const person = existing.records[0].get("p").properties as Record<string, unknown>;
    if (person.pinHash) {
      return res.status(409).json({ ok: false, message: "PIN already set. Use /auth/change-pin." });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    await session.run(`MATCH (p:Person {id: $personId}) SET p.pinHash = $pinHash`, {
      personId,
      pinHash
    });

    const refreshed = { ...person, pinHash };
    const data = await issueSession(session, refreshed);
    res.status(201).json({
      ok: true,
      message: "PIN configured",
      data: { ...data, personId }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to set PIN",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.post("/change-pin", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = changePinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const personId = req.auth!.personId;
  const { currentPin, newPin } = parsed.data;
  const session = getDriver().session();

  try {
    const result = await session.run(
      `MATCH (p:Person {id: $personId}) RETURN p.pinHash AS pinHash`,
      { personId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const pinHash = result.records[0].get("pinHash") as string | null;
    if (!pinHash) {
      return res.status(400).json({ ok: false, message: "No PIN configured yet. Use /auth/set-pin first." });
    }

    const valid = await bcrypt.compare(currentPin, pinHash);
    if (!valid) {
      return res.status(401).json({ ok: false, message: "Current PIN is incorrect" });
    }

    const newPinHash = await bcrypt.hash(newPin, 10);
    await session.run(`MATCH (p:Person {id: $personId}) SET p.pinHash = $pinHash`, {
      personId,
      pinHash: newPinHash
    });

    res.json({ ok: true, message: "PIN updated successfully" });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to change PIN",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const personId = req.auth!.personId;
  const session = getDriver().session();

  try {
    const result = await session.run(`MATCH (p:Person {id: $personId}) RETURN p`, { personId });
    if (result.records.length === 0) {
      return res.status(404).json({ ok: false, message: "Person not found" });
    }

    const person = result.records[0].get("p").properties as Record<string, unknown>;

    const pending = await session.run(
      `
      MATCH (p:Person {id: $personId})-[a:MUST_APPROVE {status:'pending'}]->(req:RelationshipRequest {status:'pending'})
      RETURN count(req) AS pendingCount
      `,
      { personId }
    );

    const pendingCount = pending.records[0]?.get("pendingCount");
    const pendingApprovals =
      typeof pendingCount === "object" && pendingCount !== null && "low" in pendingCount
        ? pendingCount.low
        : Number(pendingCount ?? 0);

    res.json({
      ok: true,
      data: {
        person: { ...publicPerson(person), hasPin: Boolean(person.pinHash) },
        pendingApprovals
      }
    });  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await session.close();
  }
});

export { authRouter };
