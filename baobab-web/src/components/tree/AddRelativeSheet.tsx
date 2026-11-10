import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Baby, Flower2, Loader2, MessageCircle, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  createLinkRequest,
  createRelative,
  proposeLink,
  type ApiPerson,
  type UserRelationshipType,
} from "../../lib/api";
import type { Person } from "./types";

import { tr } from "../../lib/i18n/I18nProvider";
import { buildE164, countryByDial, detectDefaultDial, DIAL_COUNTRIES } from "../../lib/phoneCountries";

type Kind = "child_minor" | "child_deceased" | "parent_living" | "parent_deceased" | "grandparent_deceased";

const KINDS: { id: Kind; label: string; hint: string; icon: typeof Baby }[] = [
  { id: "child_minor", label: "Enfant mineur", hint: "Moins de 18 ans, vivant", icon: Baby },
  { id: "child_deceased", label: "Enfant décédé", hint: "Un enfant que tu as perdu", icon: Flower2 },
  { id: "parent_living", label: "Père / mère vivant·e", hint: "Avec son numéro de téléphone", icon: UserPlus },
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
  const [dialCode, setDialCode] = useState(detectDefaultDial);
  const [phoneNational, setPhoneNational] = useState("");
  const [done, setDone] = useState<{ name: string; phone: string } | null>(null);

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

  const isDeceased = kind === "child_deceased" || kind === "parent_deceased" || kind === "grandparent_deceased";
  const needsGender = kind !== null;
  const selectedCountry = countryByDial(dialCode) ?? DIAL_COUNTRIES[0];
  const genderLabels =
    kind === "parent_deceased" || kind === "parent_living"
      ? { male: tr("Père"), female: tr("Mère") }
      : kind === "grandparent_deceased"
        ? { male: tr("Grand-père"), female: tr("Grand-mère") }
        : { male: tr("Garçon"), female: tr("Fille") };

  const submit = async () => {
    if (!kind) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(tr("Indique le prénom et le nom"));
      return;
    }
    if (needsGender && !gender) {
      toast.error(tr("Indique le genre"));
      return;
    }
    if (kind === "child_minor") {
      if (!birthDate) {
        toast.error(tr("Indique la date de naissance de l'enfant"));
        return;
      }
      if (birthDate < eighteenYearsAgo() || birthDate > today()) {
        toast.error(tr("Un enfant mineur doit avoir moins de 18 ans"));
        return;
      }
    }
    if (kind === "parent_living" && phoneNational.replace(/\D/g, "").length < 6) {
      toast.error(tr("Indique un numéro de téléphone valide"));
      return;
    }
    if (kind === "grandparent_deceased") {
      if (!side) {
        toast.error(tr("Choisis le côté : père ou mère"));
        return;
      }
      if ((side === "father" && !fatherId) || (side === "mother" && !motherId)) {
        toast.error(
          side === "father" ? tr("Ajoute d'abord ton père dans l'arbre") : tr("Ajoute d'abord ta mère dans l'arbre"),
          { description: tr("Un grand-parent se rattache à un de tes parents.") },
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
        ...(kind === "parent_living" ? { claimPhone: buildE164(dialCode, phoneNational) } : {}),
        ...(isDeceased ? { vitalStatus: "deceased" as const } : {}),
      });
      const newId = created.data.id;

      let message = tr("Proche ajouté");
      if (kind === "child_minor" || kind === "child_deceased") {
        const type: UserRelationshipType =
          me.gender === "female" ? "MOTHER_OF" : me.gender === "male" ? "FATHER_OF" : "PARENT_OF";
        const res = await proposeLink({ type, targetPersonId: newId, direction: "requester_is_parent" });
        message = res.message;
      } else if (kind === "parent_deceased" || kind === "parent_living") {
        const type: UserRelationshipType = gender === "female" ? "MOTHER_OF" : "FATHER_OF";
        const res = await proposeLink({ type, targetPersonId: newId, direction: "parent_of_requester" });
        message = res.message;
      } else {
        const parentId = side === "father" ? fatherId! : motherId!;
        const type: UserRelationshipType = gender === "female" ? "MOTHER_OF" : "FATHER_OF";
        const res = await createLinkRequest({ type, fromPersonId: newId, toPersonId: parentId });
        message = res.message;
      }

      toast.success(tr("{name} ajouté·e", { name: firstName.trim() }), { description: message });
      onDone();
      if (kind === "parent_living") {
        // On reste ouvert pour proposer l'invitation WhatsApp.
        setDone({ name: firstName.trim(), phone: buildE164(dialCode, phoneNational) });
      } else {
        onClose();
      }
    } catch (e) {
      const apiMsg =
        e instanceof ApiError && e.message === "Phone number already registered"
          ? tr("Ce numéro a déjà un compte. Cherche cette personne dans Découvrir et propose un lien.")
          : e instanceof ApiError && e.message === "A profile is already waiting for this phone number"
            ? tr("Un profil est déjà en attente avec ce numéro.")
            : e instanceof ApiError
              ? e.message
              : tr("Ajout impossible");
      toast.error(apiMsg, {
        description: tr("Si le profil a été créé mais pas le lien, réessaie depuis l'arbre."),
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
            {done ? tr("Profil créé") : kind ? tr(KINDS.find((k) => k.id === kind)?.label ?? "") : tr("Enrichir mon arbre")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr("Fermer")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {done && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {tr("{name} pourra récupérer ce profil en s'inscrivant avec ce numéro. Invite-le·la sur WhatsApp pour qu'il·elle te rejoigne.", { name: done.name })}
            </p>
            <a
              href={`https://wa.me/${done.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                tr("Bonjour {name}, je t'ai ajouté·e à notre arbre familial sur Baobab. Inscris-toi avec ce numéro pour récupérer ton profil : {url}", {
                  name: done.name,
                  url: window.location.origin,
                }),
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {tr("Inviter sur WhatsApp")}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              {tr("Terminer")}
            </button>
          </div>
        )}

        {!kind && !done && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{tr("Qui veux-tu ajouter ?")}</p>
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
                  <span className="block text-sm font-semibold text-foreground">{tr(k.label)}</span>
                  <span className="block text-xs text-muted-foreground">{tr(k.hint)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {kind && !done && (
          <div className="space-y-3">
            {kind === "grandparent_deceased" && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{tr("Parent de ton côté")}</p>
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
                      {s === "father" ? tr("Côté de mon père") : tr("Côté de ma mère")}
                    </button>
                  ))}
                </div>
                {side === "father" && !fatherId && (
                  <p className="mt-1 text-[11px] text-destructive">{tr("Ton père n'est pas encore dans l'arbre.")}</p>
                )}
                {side === "mother" && !motherId && (
                  <p className="mt-1 text-[11px] text-destructive">{tr("Ta mère n'est pas encore dans l'arbre.")}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={tr("Prénom")} />
              <input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={tr("Nom")} />
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

            {kind === "parent_living" && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{tr("Numéro de téléphone du parent")}</p>
                <div className="flex gap-2">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="h-12 shrink-0 rounded-2xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    aria-label={tr("Indicatif pays")}
                  >
                    {DIAL_COUNTRIES.map((c) => (
                      <option key={`${c.iso}-${c.dial}`} value={c.dial}>
                        {c.flag} +{c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    className={input}
                    value={phoneNational}
                    onChange={(e) => setPhoneNational(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    inputMode="tel"
                    placeholder="6XX XXX XXX"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {selectedCountry.flag} {tr("Il·elle récupérera son profil en s'inscrivant avec ce numéro.")}
                </p>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs text-muted-foreground">{tr("Date de naissance")}{kind === "child_minor" ? "" : tr(" (si connue)")}
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
                <p className="mb-1 text-xs text-muted-foreground">{tr("Date de décès (si connue)")}</p>
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
              placeholder={tr("Village ou ville d'origine (facultatif)")}
            />

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{tr("Ajout…")}
                </>
              ) : (
                tr("Ajouter à mon arbre")
              )}
            </button>
            <button
              type="button"
              onClick={() => setKind(null)}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >{tr("Changer de type")}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
