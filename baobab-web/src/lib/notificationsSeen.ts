import type { NotificationsPayload } from "../lib/api";

export type MyRequest = NotificationsPayload["myRequests"][number];

const SEEN_KEY = "baobab.seenReplies.v1";

export function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function writeSeen(keys: string[]) {
  try {
    const all = readSeen();
    keys.forEach((k) => all.add(k));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...all].slice(-200)));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/** Au moins un membre a répondu (ou la demande est close). */
export function hasReply(r: MyRequest): boolean {
  return r.totalVotes > 0 && (r.totalVotes - r.pendingVotes > 0 || r.status !== "pending");
}

/** Change quand une nouvelle réponse arrive : c'est ce qui déclenche le badge « Nouveau ». */
export function replyKey(r: MyRequest): string {
  return `${r.requestId}:${r.status}:${r.totalVotes - r.pendingVotes}`;
}

/** Nombre de réponses à mes demandes que je n'ai pas encore vues. */
export function countUnseenReplies(requests: MyRequest[]): number {
  const seen = readSeen();
  return requests.filter(hasReply).filter((r) => !seen.has(replyKey(r))).length;
}
