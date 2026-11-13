import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Loader2, LogOut, Phone, Send, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth/AuthProvider";
import { tr } from "../lib/i18n/I18nProvider";
import {
  ApiError,
  getMessages,
  leaveConversation,
  markConversationRead,
  listConversations,
  scheduleMeeting,
  sendMessage,
  startCall,
  type ChatConversation,
  type ChatMessage,
} from "../lib/api";
import { subscribeChat } from "../lib/chatStream";
import { conversationTitle } from "../pages/ChatPage";

const clock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

/** Ouvre la salle d'appel dans un nouvel onglet, avec mon nom et le mode audio si besoin. */
function joinCall(m: ChatMessage, myName: string) {
  if (!m.meta?.url) return;
  const hash = `#config.startAudioOnly=${m.meta.audioOnly ? "true" : "false"}&userInfo.displayName=${encodeURIComponent(
    JSON.stringify(myName),
  )}`;
  window.open(`${m.meta.url}${hash}`, "_blank", "noopener");
}

export function ConversationPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { person, isAuthenticated, useMocks } = useAuth();
  const [conv, setConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastAt = useRef<string | undefined>(undefined);
  const myName = person ? `${person.firstName} ${person.lastName}` : "";

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      return added.length ? [...cur, ...added] : cur;
    });
    lastAt.current = incoming[incoming.length - 1].createdAt;
  }, []);

  useEffect(() => {
    if (useMocks || !isAuthenticated || !id) return;
    let cancelled = false;
    listConversations()
      .then((r) => !cancelled && setConv(r.data.find((c) => c.id === id) ?? null))
      .catch(() => undefined);
    getMessages(id)
      .then((r) => {
        if (cancelled) return;
        merge(r.data);
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoaded(true);
          toast.error(e instanceof ApiError ? e.message : tr("Impossible de charger la discussion"));
        }
      });
    // Temps réel : le serveur envoie chaque message dès qu'il arrive.
    const unsubscribe = subscribeChat((event) => {
      if (cancelled) return;
      if (event.type === "message" && event.conversationId === id) {
        merge([event.message]);
        if (event.message.senderId !== person?.id) void markConversationRead(id).catch(() => undefined);
      } else if (event.type === "open") {
        // (Re)connexion : on rattrape ce qui a pu arriver entre-temps.
        getMessages(id, lastAt.current)
          .then((r) => !cancelled && merge(r.data))
          .catch(() => undefined);
      }
    });
    // Filet de sécurité si la connexion temps réel est bloquée par le réseau : vérification lente.
    const fallback = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      getMessages(id, lastAt.current)
        .then((r) => !cancelled && merge(r.data))
        .catch(() => undefined);
    }, 30_000);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(fallback);
    };
  }, [id, isAuthenticated, useMocks, merge, person?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await sendMessage(id, body);
      merge([r.data]);
      setText("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Message non envoyé"));
    } finally {
      setSending(false);
    }
  };

  const call = async (audioOnly: boolean) => {
    try {
      const r = await startCall(id, audioOnly);
      merge([r.data]);
      joinCall(r.data, myName);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Impossible de lancer l'appel"));
    }
  };

  const leave = async () => {
    if (!window.confirm(tr("Quitter cette discussion ?"))) return;
    try {
      await leaveConversation(id);
      toast.success(tr("Tu as quitté la discussion"));
      navigate("/chat", { replace: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Action impossible"));
    }
  };

  if (useMocks || !isAuthenticated) {
    return <p className="p-6 text-sm text-muted-foreground">{tr("Connecte-toi pour discuter avec ta famille.")}</p>;
  }

  const title = conv ? conversationTitle(conv, person?.id) : tr("Discussion");

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <button onClick={() => navigate("/chat")} aria-label={tr("Retour")} className="flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {conv?.type === "group" && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> {tr("{n} membres", { n: conv.members.length })}
            </p>
          )}
        </div>
        <button onClick={() => void call(true)} aria-label={tr("Appel audio")} className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-primary/10">
          <Phone className="h-5 w-5" />
        </button>
        <button onClick={() => void call(false)} aria-label={tr("Appel vidéo")} className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-primary/10">
          <Video className="h-5 w-5" />
        </button>
        <button onClick={() => setMeetingOpen(true)} aria-label={tr("Réunion de famille")} className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-primary/10">
          <CalendarPlus className="h-5 w-5" />
        </button>
        {conv?.type === "group" && (
          <button onClick={() => void leave()} aria-label={tr("Quitter la discussion")} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
        {!loaded && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
        {loaded && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{tr("Aucun message pour l'instant.")}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === person?.id;
          const who = mine ? tr("Tu") : m.senderName || tr("Un membre");
          if (m.kind === "call" || m.kind === "meeting") {
            const meeting = m.kind === "meeting";
            return (
              <div key={m.id} className="mx-auto w-[92%] rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {meeting
                    ? tr("{name} a planifié une réunion", { name: who })
                    : m.meta?.audioOnly
                      ? tr("{name} a lancé un appel audio", { name: who })
                      : tr("{name} a lancé un appel vidéo", { name: who })}
                </p>
                {meeting && (
                  <>
                    <p className="mt-1 text-sm font-semibold text-foreground">{m.meta?.title}</p>
                    <p className="text-xs text-foreground">
                      {m.meta?.startsAt
                        ? new Date(m.meta.startsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })
                        : ""}
                    </p>
                  </>
                )}
                <button
                  onClick={() => joinCall(m, myName)}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {m.meta?.audioOnly ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {tr("Rejoindre")}
                </button>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {tr("L'appel s'ouvre dans un nouvel onglet. Le premier à entrer peut devoir se connecter à son compte Google, GitHub ou Facebook (règle du service d'appel).")}
                </p>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card"
                }`}
              >
                {!mine && conv?.type === "group" && (
                  <p className="mb-0.5 text-[11px] font-semibold text-primary">{who}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {clock(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex shrink-0 items-end gap-2 border-t border-border bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={tr("Écris un message…")}
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label={tr("Envoyer")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {meetingOpen && (
        <MeetingSheet
          onClose={() => setMeetingOpen(false)}
          onCreate={async (title, whenLocal, audioOnly) => {
            const r = await scheduleMeeting(id, title, new Date(whenLocal).toISOString(), audioOnly);
            merge([r.data]);
            setMeetingOpen(false);
            toast.success(tr("Réunion planifiée"));
          }}
        />
      )}
    </div>
  );
}

function MeetingSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, whenLocal: string, audioOnly: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [audioOnly, setAudioOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return void toast.error(tr("Indique le sujet de la réunion"));
    if (!when || Number.isNaN(new Date(when).getTime())) return void toast.error(tr("Choisis une date et une heure"));
    setBusy(true);
    try {
      await onCreate(title.trim(), when, audioOnly);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Action impossible"));
      setBusy(false);
    }
  };

  return createPortal(
    <div translate="no" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">{tr("Planifier une réunion")}</h2>
          <button onClick={onClose} aria-label={tr("Fermer")} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr("Sujet (ex. Retrouvailles de décembre)")}
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
          />
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{tr("Date et heure")}</p>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={audioOnly} onChange={(e) => setAudioOnly(e.target.checked)} />
            {tr("Audio seulement")}
          </label>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {tr("Planifier")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
