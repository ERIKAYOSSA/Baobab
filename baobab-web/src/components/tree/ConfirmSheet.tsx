import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { tr } from "../../lib/i18n/I18nProvider";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Fenêtre de confirmation avant une action qu'on ne peut pas annuler. */
export function ConfirmSheet({ title, message, confirmLabel, busy, onConfirm, onCancel }: Props) {
  return createPortal(
    <div
      translate="no"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destructive font-semibold text-destructive-foreground disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {tr("Suppression…")}
            </>
          ) : (
            confirmLabel
          )}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="mt-2 block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          {tr("Annuler")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
