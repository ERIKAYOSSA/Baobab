import {
  X,
  Tag,
  Award,
  Calendar,
  Flower2,
  Heart,
  Home,
  Landmark,
  Sparkles,
  BadgeCheck,
  Crown,
  Plus,
  Sprout,
  Scroll,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MARITAL_LABELS, TITLE_LABELS, type Person } from "./types";

type Props = {
  person: Person;
  onClose: () => void;
  onEnrich?: () => void;
  onLegacy?: () => void;
  onAdd?: () => void;
};

function formatDate(full?: string, year?: string): string | undefined {
  if (full) {
    const d = new Date(full);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  return year;
}

export function PersonPanel({ person, onClose, onEnrich, onLegacy, onAdd }: Props) {
  const initials = person.name
    .replace(/[()]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const born = formatDate(person.birthDate, person.birth);
  const died = formatDate(person.deathDate, person.death);
  const isDeceased = person.status === "deceased" || Boolean(person.death);
  const ring =
    person.status === "alive"
      ? "ring-vital-alive"
      : person.status === "deceased"
        ? "ring-vital-deceased"
        : "ring-vital-unknown";

  const rows: { icon: LucideIcon; label: string; value?: string }[] = [
    { icon: Tag, label: "Surnom", value: person.nickname },
    { icon: Award, label: "Titres honorifiques", value: person.honorifics?.join(" · ") },
    {
      icon: Crown,
      label: "Statut social",
      value: [person.headOfFamily ? "Chef de famille" : null, person.title ? TITLE_LABELS[person.title] : null]
        .filter(Boolean)
        .join(" · "),
    },
    { icon: Calendar, label: "Naissance", value: born },
    { icon: Flower2, label: "Décès", value: died },
    {
      icon: Heart,
      label: "Statut marital",
      value: person.maritalStatus ? MARITAL_LABELS[person.maritalStatus] : undefined,
    },
    { icon: Home, label: "Lieu d'habitation", value: person.residence },
    { icon: Landmark, label: "Sépulture", value: person.burialPlace },
    { icon: Sparkles, label: "Ethnie", value: person.ethnicity },
  ].filter((r) => Boolean(r.value));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="pointer-events-auto max-h-[58dvh] overflow-y-auto rounded-2xl border border-border bg-card/97 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3 px-4 pt-3">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl font-display text-xl font-semibold ring-4 ${ring} ${
            isDeceased ? "bg-muted text-muted-foreground grayscale" : person.photoUrl ? "bg-card" : "bg-primary text-primary-foreground"
          }`}
        >
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-lg leading-tight text-foreground">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {person.birth ?? "?"}
                  {person.death ? ` – ${person.death}` : isDeceased ? " – ?" : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer la fiche"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {person.verified ? (
                <Pill tone="primary" icon={BadgeCheck}>
                  Vérifié
                </Pill>
              ) : (
                <Pill tone="muted">Non vérifié</Pill>
              )}
              {person.headOfFamily && (
                <Pill tone="gold" icon={Crown}>
                  Chef de famille
                </Pill>
              )}
              {person.title && <Pill tone="accent">{TITLE_LABELS[person.title]}</Pill>}
            </div>
          </div>
        </div>

        <dl className="mt-3 divide-y divide-border border-t border-border">
          {rows.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              Aucune information détaillée pour l'instant. Enrichis cette fiche pour renforcer les liens familiaux.
            </p>
          )}
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 px-4 py-2.5">
              <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd className="min-w-0 flex-1 text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card px-4 py-3">
          <ActionBtn icon={Sprout} label="Enrichir mon arbre" onClick={onEnrich} />
          <ActionBtn icon={Scroll} label="Mon héritage" onClick={onLegacy} />
          <button
            onClick={onAdd}
            aria-label="Ajouter un proche"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone: "primary" | "muted" | "gold" | "accent";
  icon?: LucideIcon;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "gold"
        ? "bg-gold/20 text-gold-foreground"
        : tone === "accent"
          ? "bg-accent/20 text-accent-foreground"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {children}
    </span>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-foreground"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </button>
  );
}
