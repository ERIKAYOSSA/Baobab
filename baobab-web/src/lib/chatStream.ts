import { API_URL } from "../lib/api/config";
import { getChatStreamTicket, type ChatMessage } from "../lib/api";

/**
 * Connexion temps réel unique, partagée par toute l'application.
 * « open » = (re)connecté : les écrans en profitent pour rattraper les messages manqués.
 */
export type ChatStreamEvent =
  | { type: "open" }
  | { type: "message"; conversationId: string; message: ChatMessage };

type Listener = (event: ChatStreamEvent) => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;
let retryTimer: number | undefined;
let running = false;

function emit(event: ChatStreamEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* un écran qui plante ne doit pas bloquer les autres */
    }
  });
}

function schedule(ms: number) {
  if (!running) return;
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void connect(), ms);
}

function closeSource() {
  source?.close();
  source = null;
}

async function connect() {
  if (!running || source) return;
  try {
    const res = await getChatStreamTicket();
    if (!running || source) return;
    const es = new EventSource(`${API_URL}/chat/stream?ticket=${encodeURIComponent(res.data.ticket)}`);
    source = es;
    es.addEventListener("ready", () => emit({ type: "open" }));
    es.addEventListener("chat", (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent<string>).data) as {
          conversationId: string;
          message: ChatMessage;
        };
        emit({ type: "message", conversationId: payload.conversationId, message: payload.message });
      } catch {
        /* message illisible : ignoré */
      }
    });
    es.onerror = () => {
      // Le ticket est à usage unique : on repart avec un nouveau.
      closeSource();
      schedule(3000);
    };
  } catch {
    schedule(5000);
  }
}

// Au retour sur l'application (téléphone sorti de veille), on repart sur une connexion neuve.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && running) {
      closeSource();
      void connect();
    }
  });
}

/** S'abonne aux messages en temps réel. Renvoie la fonction pour se désabonner. */
export function subscribeChat(listener: Listener): () => void {
  listeners.add(listener);
  if (!running) {
    running = true;
    void connect();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      running = false;
      window.clearTimeout(retryTimer);
      closeSource();
    }
  };
}
