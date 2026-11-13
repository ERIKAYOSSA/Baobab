import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth/AuthProvider";
import { tr } from "../lib/i18n/I18nProvider";
import { subscribeChat } from "../lib/chatStream";
import {
  ApiError,
  createDirectChat,
  createGroupChat,
  getChatContacts,
  listConversations,
  type ChatConversation,
  type ChatPerson,
} from "../lib/api";

const initials = (p: { firstName?: string; lastName?: string }) =>
  `${p.firstName?.[0] ?? ""}${p.lastName?.[0] ?? ""}`.toUpperCase() || "?";

export function conversationTitle(c: ChatConversation, meId?: string): string {
  if (c.type === "group") return c.name || tr("Groupe");
  const other = c.members.find((m) => m.id !== meId);
  return other ? `${other.firstName} ${other.lastName}` : tr("Discussion");
}

function shortTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function preview(c: ChatConversation): string {
  if (!c.last) return tr("Aucun message pour l'instant.");
  if (c.last.kind === "call") return tr("📞 Appel");
  if (c.last.kind === "meeting") return `📅 ${c.last.text}`;
  return c.last.text;
}

export function ChatPage() {
  const navigate = useNavigate();
  const { isAuthenticated, useMocks, person } = useAuth();
  const [items, setItems] = useState<ChatConversation[] | null>(null);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    if (useMocks || !isAuthenticated) return;
    try {
      const res = await listConversations();
      setItems(res.data);
    } catch {
      setItems((cur) => cur ?? []);
    }
  }, [useMocks, isAuthenticated]);

  useEffect(() => {
    void load();
    // Temps réel : on recharge la liste dès qu'un message arrive. Le minuteur lent sert de filet.
    const unsubscribe = useMocks || !isAuthenticated ? () => undefined : subscribeChat(() => void load());
    const t = window.setInterval(() => void load(), 30_000);
    window.addEventListener("focus", load);
    return () => {
      unsubscribe();
      window.clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [load, useMocks, isAuthenticated]);

  if (useMocks || !isAuthenticated) {
    return (
      <div className="px-4 pt-[max(2rem,env(safe-area-inset-top,0px))]">
        <h1 className="font-display text-2xl text-foreground">{tr("Discussions")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{tr("Connecte-toi pour discuter avec ta famille.")}</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
        <h1 className="font-display text-2xl text-foreground">{tr("Discussions")}</h1>
        <button
          onClick={() => setSheet(true)}
          className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {tr("Nouvelle discussion")}
        </button>
      </header>

      {items === null && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {items?.length === 0 && (
        <p className="px-4 text-sm text-muted-foreground">
          {tr("Aucune discussion pour l'instant. Écris à un membre de ta famille.")}
        </p>
      )}

      <ul className="divide-y divide-border">
        {items?.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => navigate(`/chat/${c.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-primary/5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                {c.type === "group" ? <Users className="h-5 w-5" /> : initials(c.members.find((m) => m.id !== person?.id) ?? {})}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {conversationTitle(c, person?.id)}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{shortTime(c.last?.createdAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{preview(c)}</span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {sheet && <NewChatSheet onClose={() => setSheet(false)} onCreated={(id) => navigate(`/chat/${id}`)} />}
    </div>
  );
}

function NewChatSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [contacts, setContacts] = useState<ChatPerson[] | null>(null);
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getChatContacts()
      .then((r) => setContacts(r.data))
      .catch(() => setContacts([]));
  }, []);

  const shown = (contacts ?? []).filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : tr("Impossible de créer la discussion"));

  const openDirect = async (p: ChatPerson) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await createDirectChat(p.id);
      onCreated(r.data.id);
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  };

  const createGroup = async () => {
    if (busy) return;
    if (!name.trim()) return void toast.error(tr("Indique un nom de groupe"));
    if (picked.size === 0) return void toast.error(tr("Choisis au moins un membre"));
    setBusy(true);
    try {
      const r = await createGroupChat(name.trim(), [...picked]);
      onCreated(r.data.id);
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  };

  return createPortal(
    <div translate="no" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-display text-xl text-foreground">{tr("Nouvelle discussion")}</h2>
          <button onClick={onClose} aria-label={tr("Fermer")} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 px-5 pb-2">
          {(["direct", "group"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`h-10 rounded-xl border text-sm font-medium ${
                mode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
              }`}
            >
              {m === "direct" ? tr("Personne") : tr("Groupe")}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          {mode === "group" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("Nom du groupe (ex. Famille Mensah)")}
              className="mb-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
            />
          )}
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={tr("Chercher un membre de ma famille…")}
            className="mb-2 h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
          />
          {contacts === null && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-muted-foreground" />}
          {contacts?.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              {tr("Aucun membre de ta famille n'a encore de compte. Invite-les pour discuter.")}
            </p>
          )}
          <ul className="divide-y divide-border">
            {shown.map((p) => {
              const on = picked.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (mode === "direct") void openDirect(p);
                      else
                        setPicked((cur) => {
                          const next = new Set(cur);
                          if (on) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        });
                    }}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(p)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {p.firstName} {p.lastName}
                      </span>
                      {p.village && <span className="block truncate text-[11px] text-muted-foreground">{p.village}</span>}
                    </span>
                    {mode === "group" && (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {mode === "group" && (
            <button
              onClick={() => void createGroup()}
              disabled={busy}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {tr("Créer le groupe")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
