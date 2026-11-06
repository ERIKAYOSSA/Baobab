import { useEffect, useState } from "react";
import {
  GitBranch,
  ShieldCheck,
  HelpCircle,
  Pencil,
  Mail,
  Bell,
  Clock,
  Check,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useLinkRequests, resolveLinkRequest, statusLabel, type LinkStatus } from "../lib/linkRequests";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  ApiError,
  decideRequest,
  getNotifications,
  type NotificationPerson,
  type NotificationsPayload,
} from "../lib/api";

import { tr } from "../lib/i18n/I18nProvider";
const demoItems = [
  {
    type: "link",
    icon: GitBranch,
    title: "Yaa Boakye veut t'ajouter comme cousine",
    when: "il y a 2 h",
    actions: ["Accepter", "Refuser"],
    color: "bg-primary/10 text-primary",
  },
  {
    type: "cert",
    icon: ShieldCheck,
    title: "Demande de certification de Kwame Mensah",
    when: "hier",
    actions: ["Certifier", "Plus tard"],
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    type: "unknown",
    icon: HelpCircle,
    title: "Lien inconnu détecté avec « Adjei »",
    when: "il y a 3 j",
    actions: ["Examiner"],
    color: "bg-earth/15 text-earth",
  },
  {
    type: "edit",
    icon: Pencil,
    title: "Proposition de modif. : date de naissance d'Ama",
    when: "il y a 4 j",
    actions: ["Accepter", "Refuser"],
    color: "bg-muted text-foreground",
  },
  {
    type: "invite",
    icon: Mail,
    title: "Invitation reçue de Komla Adjei",
    when: "la semaine dernière",
    actions: ["Voir"],
    color: "bg-primary/10 text-primary",
  },
  {
    type: "remind",
    icon: Bell,
    title: "Complète l'ethnie de 3 membres de ta famille",
    when: "rappel",
    actions: ["Compléter"],
    color: "bg-accent/20 text-accent-foreground",
  },
];

export function NotificationsPage() {
  const linkRequests = useLinkRequests();
  const { useMocks, isAuthenticated, person } = useAuth();
  const [payload, setPayload] = useState<NotificationsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  // Réponses reçues pas encore vues (badge « Nouveau »).
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  const load = async () => {
    if (useMocks || !isAuthenticated) {
      setPayload(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getNotifications();
      setPayload(res.data);
      const seen = readSeen();
      setNewKeys(new Set(res.data.myRequests.filter(hasReply).map(replyKey).filter((k) => !seen.has(k))));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Impossible de charger les notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [useMocks, isAuthenticated]);

  // Les réponses affichées sont marquées comme vues après quelques secondes (ou en quittant la page).
  useEffect(() => {
    if (!payload) return;
    const mark = () => writeSeen(payload.myRequests.filter(hasReply).map(replyKey));
    const t = window.setTimeout(mark, 4000);
    return () => {
      window.clearTimeout(t);
      mark();
    };
  }, [payload]);

  const myRequests = payload
    ? [...payload.myRequests].sort(
        (a, b) => Number(newKeys.has(replyKey(b))) - Number(newKeys.has(replyKey(a))),
      )
    : [];

  const onDecide = async (requestId: string, decision: "approved" | "rejected") => {
    if (!person) return;
    try {
      await decideRequest(requestId, decision);
      toast.success(decision === "approved" ? tr("Demande acceptée") : tr("Demande refusée"));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Action impossible"));
    }
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-3 pt-5 backdrop-blur">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{tr("Notifications")}</p>
        <h1 className="font-display text-2xl text-foreground">{tr("Activité familiale")}</h1>
        {newKeys.size > 0 && (
          <p className="mt-1 text-xs font-medium text-primary">
            {tr("{n} nouvelle(s) réponse(s) à tes demandes", { n: newKeys.size })}
          </p>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />{tr("Chargement…")}
        </div>
      )}

      {payload && (
        <>
          {payload.pendingApprovals.length > 0 && (
            <section className="px-3 pt-3">
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("À approuver (")}
                {payload.summary.pendingApprovalsCount})
              </h2>
              <ul className="space-y-3">
                {payload.pendingApprovals.map((item) => {
                  const requesterName = fullName(item.requester) || tr("Quelqu’un");
                  const place = placeOf(item.requester);
                  return (
                    <li key={item.requestId} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <PersonAvatar person={item.requester} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {tr("Demande de lien familial")}
                          </p>
                          <p className="truncate text-sm font-semibold text-foreground">
                            {tr("De la part de {name}", { name: requesterName })}
                          </p>
                          {place && <p className="truncate text-[11px] text-muted-foreground">{place}</p>}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatWhen(item.createdAt)}</span>
                      </div>

                      <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {tr("Lien demandé")}
                        </p>
                        <p className="mt-1 text-sm leading-snug text-foreground">
                          {relationSentence(item.requestType, item.from, item.to, person?.id)}
                        </p>
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {tr("En acceptant, tu confirmes ce lien dans l'arbre familial.")}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => void onDecide(item.requestId, "approved")}
                          className="min-h-11 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                        >
                          {tr("Accepter")}
                        </button>
                        <button
                          onClick={() => void onDecide(item.requestId, "rejected")}
                          className="min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium"
                        >
                          {tr("Refuser")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {myRequests.length > 0 && (
            <section className="px-3 pt-3">
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("Mes demandes")}
              </h2>
              <ul className="space-y-2">
                {myRequests.map((r) => {
                  const isNew = newKeys.has(replyKey(r));
                  const Icon =
                    r.status === "approved" ? Check : r.status === "rejected" ? X : r.status === "contested" ? HelpCircle : Clock;
                  const tone =
                    r.status === "approved"
                      ? "bg-primary/10 text-primary"
                      : r.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : r.status === "contested"
                          ? "bg-accent/20 text-accent-foreground"
                          : "bg-muted text-muted-foreground";
                  return (
                    <li
                      key={r.requestId}
                      className={`flex gap-3 rounded-2xl border bg-card p-3 ${isNew ? "border-primary/50" : "border-border"}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {replyHeadline(r.status)}
                          </p>
                          {isNew && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              {tr("Nouveau")}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm leading-snug text-foreground">
                          {relationSentence(r.relationshipType, r.from, r.to, person?.id)}
                        </p>
                        {r.votes.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {r.votes.map((v) => (
                              <li key={v.id} className="flex items-start gap-1.5 text-xs text-foreground">
                                {v.status === "approved" ? (
                                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                ) : v.status === "rejected" ? (
                                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                                ) : (
                                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span>
                                  {voteText(v)}
                                  {v.decidedAt ? ` · ${formatWhen(v.decidedAt)}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {r.createdAt && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {tr("Envoyée le {date}", { date: formatWhen(r.createdAt) })}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {linkRequests.length > 0 && (
        <section className="px-3 pt-3">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{tr("Mes demandes de lien (local)")}
          </h2>
          <ul className="space-y-2">
            {linkRequests.map((r) => (
              <li key={r.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-snug text-foreground">{tr("Demande envoyée à")}{" "}<span className="font-semibold">{r.targetName}</span>{tr("en tant que")}{" "}
                    <span className="font-semibold">{r.relation.toLowerCase()}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={r.status} />
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(r.resolvedAt ?? r.createdAt)}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => resolveLinkRequest(r.id, "accepted")}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >{tr("Simuler acceptation")}
                      </button>
                      <button
                        onClick={() => resolveLinkRequest(r.id, "rejected")}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >{tr("Simuler refus")}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(useMocks || !isAuthenticated) && !payload && !loading && (
        <ul className="space-y-2 p-3">
          {useMocks ? (
            demoItems.map((n, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${n.color}`}>
                  <n.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-snug text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.when}</p>
                  <div className="mt-2 flex gap-2">
                    {n.actions.map((a, idx) => (
                      <button
                        key={a}
                        className={`min-h-11 rounded-lg px-3 text-xs font-medium ${
                          idx === 0
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-foreground"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">{tr("Connecte-toi pour voir les demandes de lien à approuver.")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: LinkStatus }) {
  const cfg =
    status === "pending"
      ? { Icon: Clock, cls: "bg-accent/20 text-accent-foreground" }
      : status === "accepted"
        ? { Icon: Check, cls: "bg-primary/15 text-primary" }
        : { Icon: X, cls: "bg-destructive/15 text-destructive" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
      <cfg.Icon className="h-3 w-3" />
      {statusLabel(status)}
    </span>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

const fullName = (p: NotificationPerson | null | undefined): string =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "";

const placeOf = (p: NotificationPerson | null | undefined): string =>
  p ? [p.birthCity ?? p.village, p.birthCountry].filter(Boolean).join(", ") : "";

function nameFor(p: NotificationPerson | null | undefined, meId?: string): string {
  const name = fullName(p) || tr("une personne");
  return p && meId && p.id === meId ? `${name}${tr(" (toi)")}` : name;
}

/** Phrase claire : « Kofi Mensah est le père de Ama Mensah ». */
function relationSentence(
  type: string,
  from: NotificationPerson | null | undefined,
  to: NotificationPerson | null | undefined,
  meId?: string,
): string {
  const vars = { from: nameFor(from, meId), to: nameFor(to, meId) };
  switch (type) {
    case "FATHER_OF":
      return tr("{from} est le père de {to}", vars);
    case "MOTHER_OF":
      return tr("{from} est la mère de {to}", vars);
    case "PARENT_OF":
      return tr("{from} est un parent de {to}", vars);
    case "HUSBAND_OF":
      return tr("{from} est le mari de {to}", vars);
    case "WIFE_OF":
      return tr("{from} est l'épouse de {to}", vars);
    case "MARRIED_TO":
      return tr("{from} est marié(e) avec {to}", vars);
    case "CO_WIFE_OF":
      return tr("{from} est la co-épouse de {to}", vars);
    case "SIBLING_OF":
      return tr("{from} est le frère ou la sœur de {to}", vars);
    default:
      return tr("{from} est lié(e) à {to} ({type})", { ...vars, type });
  }
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function PersonAvatar({ person }: { person: NotificationPerson | null | undefined }) {
  if (person?.photoUrl) {
    return <img src={person.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  const letters = `${person?.firstName?.[0] ?? ""}${person?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
      {letters}
    </div>
  );
}

type MyRequest = NotificationsPayload["myRequests"][number];

const SEEN_KEY = "baobab.seenReplies.v1";

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(keys: string[]) {
  try {
    const all = readSeen();
    keys.forEach((k) => all.add(k));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...all].slice(-200)));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/** Au moins un membre a répondu (ou la demande est close). */
function hasReply(r: MyRequest): boolean {
  return r.totalVotes > 0 && (r.totalVotes - r.pendingVotes > 0 || r.status !== "pending");
}

/** Change quand une nouvelle réponse arrive : c'est ce qui déclenche le badge « Nouveau ». */
function replyKey(r: MyRequest): string {
  return `${r.requestId}:${r.status}:${r.totalVotes - r.pendingVotes}`;
}

function replyHeadline(status: string): string {
  switch (status) {
    case "approved":
      return tr("Ta demande a été acceptée");
    case "rejected":
      return tr("Ta demande a été refusée");
    case "contested":
      return tr("Ta demande est contestée");
    default:
      return tr("Ta demande est en cours");
  }
}

function voteText(v: MyRequest["votes"][number]): string {
  const name = [v.firstName, v.lastName].filter(Boolean).join(" ") || tr("une personne");
  if (v.status === "approved") return tr("{name} a accepté", { name });
  if (v.status === "rejected") return tr("{name} a refusé", { name });
  return tr("{name} n'a pas encore répondu", { name });
}
