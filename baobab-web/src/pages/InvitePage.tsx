import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { redeemInvite, type TesterSession } from "../lib/testerAccess";

import { tr } from "../lib/i18n/I18nProvider";
export function InvitePage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready" }
    | { kind: "success"; session: TesterSession }
    | { kind: "error"; reason: "not_found" | "expired" }
  >({ kind: "loading" });

  useEffect(() => {
    const t = setTimeout(() => setState({ kind: "ready" }), 400);
    return () => clearTimeout(t);
  }, []);

  const accept = () => {
    const res = redeemInvite(code);
    if (res.ok) {
      setState({ kind: "success", session: res.session });
      setTimeout(() => navigate("/tree"), 1400);
    } else {
      setState({ kind: "error", reason: res.reason });
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background bg-grain px-5 pb-8 pt-12">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5">
        <Sparkles className="h-7 w-7" />
      </div>
      <h1 className="text-center font-display text-3xl text-foreground">{tr("Tu es invité·e")}</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">{tr("Quelqu'un t'a invité·e à tester")}{" "}<span className="font-semibold text-foreground">{tr("Baobab")}</span>{tr(". Aucun compte requis — un accès tester temporaire sera activé sur cet appareil.")}
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{tr("Code d'invitation")}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">{code}</p>
      </div>

      {state.kind === "loading" && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />{tr("Vérification du code…")}
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <ul className="mt-5 space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{tr("Accès limité dans le temps, sans création de compte.")}</span>
            </li>
            <li className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{tr("Tu navigueras sous un alias anonyme — tes retours restent privés.")}</span>
            </li>
          </ul>
          <div className="mt-auto pt-6">
            <button
              onClick={accept}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4" />{tr("Activer l'accès testeur")}
            </button>
            <Link
              to="/"
              className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card text-sm text-foreground"
            >{tr("Plus tard")}
            </Link>
          </div>
        </>
      )}

      {state.kind === "success" && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="font-semibold">{tr("Accès activé — Bienvenue,")}{" "}{state.session.alias}</p>
          </div>
          <p className="mt-1 text-xs text-foreground/80">{tr("Redirection vers l'arbre de démo…")}</p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="font-semibold">
              {state.reason === "expired" ? tr("Ce lien d'invitation a expiré.") : tr("Code introuvable ou révoqué.")}
            </p>
          </div>
          <p className="mt-1 text-xs text-foreground/80">{tr("Demande à la personne qui t'a invité·e de te renvoyer un nouveau lien.")}
          </p>
          <Link
            to="/"
            className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card text-sm"
          >{tr("Retour à l'accueil")}
          </Link>
        </div>
      )}
    </div>
  );
}
