import { useEffect, useState } from "react";

export type TesterInvite = {
  code: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  redeemedAt?: number;
  redeemedBy?: string;
};

export type TesterSession = {
  code: string;
  label: string;
  activatedAt: number;
  expiresAt: number;
  alias: string;
};

const INVITES_KEY = "baobab.testerInvites.v1";
const SESSION_KEY = "baobab.testerSession.v1";
const DEFAULT_DAYS = 7;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function readInvites(): TesterInvite[] {
  try {
    return JSON.parse(localStorage.getItem(INVITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeInvites(items: TesterInvite[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(items));
  emit();
}

function readSession(): TesterSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TesterSession;
    if (s.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function writeSession(s: TesterSession | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
  emit();
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function randomAlias(): string {
  const animals = ["Lion", "Baobab", "Faucon", "Panthère", "Zèbre", "Antilope", "Aigle", "Tortue"];
  const n = 100 + Math.floor(Math.random() * 900);
  return `Testeur ${animals[Math.floor(Math.random() * animals.length)]} ${n}`;
}

export function createInvite(label?: string, days = DEFAULT_DAYS): TesterInvite {
  const now = Date.now();
  const invite: TesterInvite = {
    code: randomCode(),
    label: label?.trim() || "Testeur",
    createdAt: now,
    expiresAt: now + days * 86400_000,
  };
  writeInvites([invite, ...readInvites()]);
  return invite;
}

export function getInvites(): TesterInvite[] {
  return readInvites().sort((a, b) => b.createdAt - a.createdAt);
}

export function revokeInvite(code: string) {
  writeInvites(readInvites().filter((i) => i.code !== code));
}

export function findInvite(code: string): TesterInvite | undefined {
  return readInvites().find((i) => i.code.toUpperCase() === code.toUpperCase());
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/invite/${code}`;
}

export type RedeemResult =
  | { ok: true; session: TesterSession }
  | { ok: false; reason: "not_found" | "expired" };

export function redeemInvite(code: string): RedeemResult {
  const invite = findInvite(code);
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.expiresAt < Date.now()) return { ok: false, reason: "expired" };

  const alias = randomAlias();
  const session: TesterSession = {
    code: invite.code,
    label: invite.label,
    activatedAt: Date.now(),
    expiresAt: invite.expiresAt,
    alias,
  };
  writeSession(session);

  const items = readInvites().map((i) =>
    i.code === invite.code && !i.redeemedAt
      ? { ...i, redeemedAt: Date.now(), redeemedBy: alias }
      : i,
  );
  writeInvites(items);

  return { ok: true, session };
}

export function getTesterSession(): TesterSession | null {
  return readSession();
}

export function endTesterSession() {
  writeSession(null);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTesterInvites(): TesterInvite[] {
  const [items, setItems] = useState<TesterInvite[]>(() => getInvites());
  useEffect(() => {
    const update = () => setItems(getInvites());
    update();
    const off = subscribe(update);
    const onStorage = (e: StorageEvent) => {
      if (e.key === INVITES_KEY) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return items;
}

export function useTesterSession(): TesterSession | null {
  const [s, setS] = useState<TesterSession | null>(() => getTesterSession());
  useEffect(() => {
    const update = () => setS(getTesterSession());
    update();
    const off = subscribe(update);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return s;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "expiré";
  const days = Math.floor(ms / 86400_000);
  if (days >= 1) return `${days} j restants`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} h restantes`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins} min restantes`;
}
