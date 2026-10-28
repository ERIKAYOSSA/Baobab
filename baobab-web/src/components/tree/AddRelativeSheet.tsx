import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Baby, Flower2, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  createLinkRequest,
  createRelative,
  proposeLink,
  type ApiPerson,
  type UserRelationshipType,
} from "@/lib/api";
import type { Person } from "./types";

type Kind = "child_minor" | "child_deceased" | "parent_deceased" | "grandparent_deceased";

const KINDS: { id: Kind; label: string; hint: string; icon: typeof Baby }[] = [
  { id: "child_minor", label: "Enfant mineur", hint: "Moins de 18 ans, vivant", icon: Baby },
  { id: "child_deceased", label: "Enfant décédé", hint: "Un enfant que tu as perdu", icon: Flower2 },
  { id: "parent_deceased", label: "Père / mère décédé·e", hint: "Un de tes parents disparu", icon: Flower2 },
  { id: "grandparent_deceased", label: "Grand-parent décédé", hint: "Du côté de ton père ou de ta mère", icon: Users },
];

type Props = {
  me: ApiPerson;
  /** Personnes actuellement affichées dans l'arbre (pour retrouver père/mère). */
  people: Person[];
  meId: string;
  onClose: () => void;
  onDone: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const eighteenYearsAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

export function AddRelativeSheet({ me, people, meId, onClose, onDone }: Props) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState(me.lastName ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [side, setSide] = useState<"father" | "mother" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [village, setVillage] = useState("");
  const [busy, setBusy] = useState(false);

  // Bloque le défilement de la page derrière la fenêtre pendant qu'elle est ouverte.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const meNode = useMemo(() => people.find((p) => p.id === meId), [people, meId]);
  const fatherId = meNode?.fatherId;
  const motherId = meNode?.motherId;

  const isDeceased = kind !== "child_minor";
  const needsGender = kind === "child_minor" || kind === "child_deceased" || kind === "parent_deceased" || kind === "grandparent_deceased";
  const genderLabels =
    kind === "parent_deceased"
      ? { male: "Père", female: "Mère" }
      : kind === "grandparent_deceased"
        ? { male: "Grand-père", female: "Grand-mère" }
        : { male: "Garçon", female: "Fille" };

  const submit = async () => {
    if (!kind) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Indique le prénom et le nom");
      return;
    }
    if (needsGender && !gender) {
      toast.error("Indique le genre");
      return;
    }
    if (kind === "child_minor") {
      if (!birthDate) {
        toast.error("Indique la date de naissance de l'enfant");
        return;
      }
      if (birthDate < eighteenYearsAgo() || birthDate > today()) {
        toast.error("Un enfant mineur doit avoir moins de 18 ans");
        return;
      }
    }
    if (kind === "grandparent_deceased") {
      if (!side) {
        toast.error("Choisis le côté : père ou mère");
        return;
      }
      if ((side === "father" && !fatherId) || (side === "mother" && !motherId)) {
        toast.error(
          side === "father" ? "Ajoute d'abord ton père dans l'arbre" : "Ajoute d'abord ta mère dans l'arbre",
          { description: "Un grand-parent se rattache à un de tes parents." },
        );
        return;
      }
    }

    setBusy(true);
    try {
      const created = await createRelative({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender as "male" | "female",
        birthDate: birthDate || undefined,
        deathDate: isDeceased ? deathDate || undefined : undefined,
        village: village.trim() || undefined,
        ...(isDeceased ? { vitalStatus: "deceased" as const } : {}),
      });
      const newId = created.data.id;

      let message = "Proche ajouté";
      if (kind === "child_minor" || kind === "child_deceased") {
        const type: UserRelationshipType =
          me.gender === "female" ? "MOTHER_OF" : me.gender === "male" ? "FATHER_OF" : "PARENT_OF";
        const res = await proposeLink({ type, targetPersonId: newId, direction: "requester_is_parent" });
        message = res.message;
      } else if (kind === "parent_deceased") {
        const type: UserRelationshipType = gender === "female" ? "MOTHER_OF" : "FATHER_OF";
        const res = await proposeLink({ type, targetPersonId: newId, direction: "parent_of_requester" });
        message = res.message;
      } else {
        const parentId = side === "father" ? fatherId! : motherId!;
        const type: UserRelationshipType = gender === "female" ? "MOTHER_OF" : "FATHER_OF";
        const res = await createLinkRequest({ type, fromPersonId: newId, toPersonId: parentId });
        message = res.message;
      }

      toast.success(`${firstName.trim()} ajouté·e`, { description: message });
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ajout impossible", {
        description: "Si le profil a été créé mais pas le lien, réessaie depuis l'arbre.",
      });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary";

  return createPortal(
    <div translate="no" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4">
          <h2 className="font-display text-xl text-foreground">
            {kind ? KINDS.find((k) => k.id === kind)?.label : "Enrichir mon arbre"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {!kind && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Qui veux-tu ajouter ?</p>
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <k.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{k.label}</span>
                  <span className="block text-xs text-muted-foreground">{k.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {kind && (
          <div className="space-y-3">
            {kind === "grandparent_deceased" && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Parent de ton côté</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["father", "mother"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`h-11 rounded-xl border text-sm font-medium ${
                        side === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                      }`}
                    >
                      {s === "father" ? "Côté de mon père" : "Côté de ma mère"}
                    </button>
                  ))}
                </div>
                {side === "father" && !fatherId && (
                  <p className="mt-1 text-[11px] text-destructive">Ton père n'est pas encore dans l'arbre.</p>
                )}
                {side === "mother" && !motherId && (
                  <p className="mt-1 text-[11px] text-destructive">Ta mère n'est pas encore dans l'arbre.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
              <input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`h-11 rounded-xl border text-sm font-medium ${
                    gender === g ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                  }`}
                >
                  {genderLabels[g]}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Date de naissance{kind === "child_minor" ? "" : " (si connue)"}
              </p>
              <input
                type="date"
                className={input}
                value={birthDate}
                min={kind === "child_minor" ? eighteenYearsAgo() : undefined}
                max={today()}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            {isDeceased && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Date de décès (si connue)</p>
                <input
                  type="date"
                  className={input}
                  value={deathDate}
                  max={today()}
                  onChange={(e) => setDeathDate(e.target.value)}
                />
              </div>
            )}

            <input
              className={input}
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village ou ville d'origine (facultatif)"
            />

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Ajout…
                </>
              ) : (
                "Ajouter à mon arbre"
              )}
            </button>
            <button
              type="button"
              onClick={() => setKind(null)}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              Changer de type
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
