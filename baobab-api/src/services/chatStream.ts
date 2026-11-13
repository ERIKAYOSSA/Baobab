import { randomBytes } from "crypto";
import type { Response } from "express";

/**
 * Envoi instantané des messages (Server-Sent Events) : chaque utilisateur connecté garde une
 * connexion ouverte et reçoit les nouveaux messages dès qu'ils sont enregistrés.
 * Les connexions sont gardées en mémoire : adapté à UNE instance du serveur.
 */
const clients = new Map<string, Set<Response>>();
const tickets = new Map<string, { personId: string; exp: number }>();
const MAX_PER_PERSON = 5;
const HEARTBEAT_MS = 25_000;

/** Ticket à usage unique (60 s) : évite de mettre le jeton de connexion dans l'adresse du flux. */
export function issueStreamTicket(personId: string): string {
  const now = Date.now();
  for (const [key, value] of tickets) if (value.exp < now) tickets.delete(key);
  const ticket = randomBytes(24).toString("hex");
  tickets.set(ticket, { personId, exp: now + 60_000 });
  return ticket;
}

export function consumeStreamTicket(ticket: string): string | null {
  const found = tickets.get(ticket);
  tickets.delete(ticket);
  if (!found || found.exp < Date.now()) return null;
  return found.personId;
}

export function registerStream(personId: string, res: Response): void {
  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  res.write("event: ready\ndata: {}\n\n");

  let set = clients.get(personId);
  if (!set) {
    set = new Set();
    clients.set(personId, set);
  }
  // Trop d'onglets ouverts : on ferme le plus ancien.
  if (set.size >= MAX_PER_PERSON) {
    const oldest = set.values().next().value as Response | undefined;
    if (oldest) {
      set.delete(oldest);
      oldest.end();
    }
  }
  set.add(res);

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  res.on("close", () => {
    clearInterval(heartbeat);
    const current = clients.get(personId);
    current?.delete(res);
    if (current && current.size === 0) clients.delete(personId);
  });
}

/** Envoie un événement à toutes les connexions ouvertes de ces personnes. */
export function pushToPeople(personIds: string[], event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const id of new Set(personIds)) {
    clients.get(id)?.forEach((res) => {
      try {
        res.write(payload);
      } catch {
        /* connexion fermée : elle sera nettoyée à la fermeture */
      }
    });
  }
}
