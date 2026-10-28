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
import { useLinkRequests, resolveLinkRequest, statusLabel, type LinkStatus } from "@/lib/linkRequests";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, decideRequest, getNotifications, type NotificationsPayload } from "@/lib/api";

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

  const load = async () => {
    if (useMocks || !isAuthenticated) {
      setPayload(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getNotifications();
      setPayload(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible de charger les notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [useMocks, isAuthenticated]);

  const onDecide = async (requestId: string, decision: "approved" | "rejected") => {
    if (!person) return;
    try {
      await decideRequest(requestId, decision);
      toast.success(decision === "approved" ? "Demande acceptée" : "Demande refusée");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action impossible");
    }
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-3 pt-5 backdrop-blur">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notifications</p>
        <h1 className="font-display text-2xl text-foreground">Activité familiale</h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      )}

      {payload && (
        <>
          {payload.pendingApprovals.length > 0 && (
            <section className="px-3 pt-3">
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                À approuver ({payload.summary.pendingApprovalsCount})
              </h2>
              <ul className="space-y-2">
                {payload.pendingApprovals.map((item) => {
                  const requester = item.requester as { firstName?: string; lastName?: string };
                  const name = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || "Quelqu’un";
                  return (
                    <li key={item.requestId} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-snug text-foreground">
                          <span className="font-semibold">{name}</span> demande un lien{" "}
                          <span className="font-semibold">{item.requestType}</span>
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void onDecide(item.requestId, "approved")}
                            className="min-h-11 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => void onDecide(item.requestId, "rejected")}
                            className="min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium"
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {payload.myRequests.length > 0 && (
            <section className="px-3 pt-3">
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mes demandes
              </h2>
              <ul className="space-y-2">
                {payload.myRequests.map((r) => (
                  <li key={r.requestId} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Send className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-snug text-foreground">
                        Demande <span className="font-semibold">{r.relationshipType}</span> —{" "}
                        <span className="font-semibold">{statusLabelFr(r.status)}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Votes {r.approvedVotes}/{r.totalVotes} (en attente {r.pendingVotes})
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {linkRequests.length > 0 && (
        <section className="px-3 pt-3">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mes demandes de lien (local)
          </h2>
          <ul className="space-y-2">
            {linkRequests.map((r) => (
              <li key={r.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-snug text-foreground">
                    Demande envoyée à <span className="font-semibold">{r.targetName}</span> en tant que{" "}
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
                      >
                        Simuler acceptation
                      </button>
                      <button
                        onClick={() => resolveLinkRequest(r.id, "rejected")}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        Simuler refus
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
            <li className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              Connecte-toi pour voir les demandes de lien à approuver.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function statusLabelFr(status: string): string {
  if (status === "pending") return "en attente des votes";
  if (status === "approved") return "acceptée";
  if (status === "rejected") return "refusée par tous";
  if (status === "contested") return "procédure — chaque parti garde son appellation";
  return status;
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
