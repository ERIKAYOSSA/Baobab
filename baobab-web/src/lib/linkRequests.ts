import { useEffect, useState } from "react";

export type LinkStatus = "pending" | "accepted" | "rejected";

export type LinkRequest = {
  id: string;
  targetId: string;
  targetName: string;
  relation: string;
  createdAt: number;
  status: LinkStatus;
  resolvedAt?: number;
  direction: "outgoing" | "incoming";
};

const KEY = "baobab.linkRequests.v1";
const listeners = new Set<() => void>();

function read(): LinkRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: LinkRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export function getLinkRequests(): LinkRequest[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function sendLinkRequest(input: {
  targetId: string;
  targetName: string;
  relation: string;
}): Promise<LinkRequest> {
  await new Promise((r) => setTimeout(r, 700));
  const req: LinkRequest = {
    id: `lr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    targetId: input.targetId,
    targetName: input.targetName,
    relation: input.relation,
    createdAt: Date.now(),
    status: "pending",
    direction: "outgoing",
  };
  write([req, ...read()]);

  const delay = 6000 + Math.random() * 6000;
  const accepted = Math.random() > 0.25;
  setTimeout(() => {
    const items = read().map((r) =>
      r.id === req.id && r.status === "pending"
        ? { ...r, status: accepted ? "accepted" : ("rejected" as LinkStatus), resolvedAt: Date.now() }
        : r,
    );
    write(items);
  }, delay);

  return req;
}

export function resolveLinkRequest(id: string, status: "accepted" | "rejected") {
  const items = read().map((r) => (r.id === id ? { ...r, status, resolvedAt: Date.now() } : r));
  write(items);
}

export function useLinkRequests(): LinkRequest[] {
  const [items, setItems] = useState<LinkRequest[]>(() => getLinkRequests());
  useEffect(() => {
    const update = () => setItems(getLinkRequests());
    update();
    const off = subscribe(update);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return items;
}

export function useLinkRequest(id: string | null): LinkRequest | undefined {
  const all = useLinkRequests();
  if (!id) return undefined;
  return all.find((r) => r.id === id);
}

export function statusLabel(s: LinkStatus): string {
  return s === "pending" ? "En attente" : s === "accepted" ? "Acceptée" : "Refusée";
}
