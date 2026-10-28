import { useMemo } from "react";
import { Lock, Crown, Star, Award, BadgeCheck, Flower2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Person } from "./types";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  meId: string;
  ancestorDepth: number;
  descendantDepth: number;
};

export function FamilyTree({
  people,
  selectedId,
  onSelect,
  meId,
  ancestorDepth,
  descendantDepth,
}: Props) {
  const { t } = useI18n();
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);

  const me = byId[meId];
  if (!me) return null;

  const ancestorsGen1 = [me.fatherId, me.motherId].filter(Boolean).map((id) => byId[id!]);
  const ancestorsGen2 = ancestorsGen1.flatMap((p) =>
    p ? [p.fatherId, p.motherId].filter(Boolean).map((id) => byId[id!]) : [],
  );
  const siblings = people.filter(
    (p) => p.id !== meId && (p.fatherId === me.fatherId || p.motherId === me.motherId) && (p.fatherId || p.motherId),
  );
  const meCouple = (me.spouseIds ?? []).map((id) => byId[id]).filter(Boolean);
  const meCoWives = (me.coWifeIds ?? []).map((id) => byId[id]).filter(Boolean);
  const children = people.filter((p) => p.fatherId === meId || p.motherId === meId);

  const showAncestors2 = ancestorDepth >= 2;
  const showAncestors1 = ancestorDepth >= 1;
  const showChildren = descendantDepth >= 1;

  return (
    <div className="flex flex-col items-stretch gap-2 pb-6">
      {showAncestors2 && ancestorsGen2.length > 0 && (
        <Generation label="Grands-parents" rail={ancestorsGen2.length > 1}>
          {ancestorsGen2.map((p) => (
            <Node key={p.id} p={p} selected={selectedId === p.id} onSelect={onSelect} small />
          ))}
        </Generation>
      )}
      {showAncestors2 && ancestorsGen2.length > 0 && <Connector label={t<string>("tree.relParent")} />}
      {showAncestors1 && ancestorsGen1.length > 0 && (
        <Generation label="Parents">
          <CoupleRow people={ancestorsGen1} selectedId={selectedId} onSelect={onSelect} />
        </Generation>
      )}
      {showAncestors1 && ancestorsGen1.length > 0 && <Connector label={t<string>("tree.relParent")} />}

      <Generation label="Toi & fratrie" tone="primary" rail={siblings.length > 0}>
        {siblings.map((p) => (
          <Node key={p.id} p={p} selected={selectedId === p.id} onSelect={onSelect} small />
        ))}
        <Node p={me} selected={selectedId === meId} onSelect={onSelect} highlight />
        {meCouple.map((sp) => (
          <div key={sp.id} className="flex shrink-0 snap-center items-end gap-2">
            <SpouseLink label={t<string>("tree.relSpouse")} />
            <Node p={sp} selected={selectedId === sp.id} onSelect={onSelect} small />
          </div>
        ))}
        {meCoWives.map((cw) => (
          <div key={cw.id} className="flex shrink-0 snap-center items-end gap-2">
            <SpouseLink label={t<string>("tree.relCoWife")} />
            <Node p={cw} selected={selectedId === cw.id} onSelect={onSelect} small />
          </div>
        ))}
      </Generation>

      {showChildren && children.length > 0 && <Connector label={t<string>("tree.relChild")} />}
      {showChildren && children.length > 0 && (
        <Generation label="Enfants" rail={children.length > 1}>
          {children.map((p) => (
            <Node key={p.id} p={p} selected={selectedId === p.id} onSelect={onSelect} small />
          ))}
          <AddNode label="Ajouter" onClick={() => onSelect("__add__")} />
        </Generation>
      )}
    </div>
  );
}

function Generation({
  children,
  label,
  tone = "muted",
  rail = false,
}: {
  children: React.ReactNode;
  label: string;
  tone?: "muted" | "primary";
  rail?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
          tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <div className="scrollbar-hide w-full snap-x overflow-x-auto overflow-y-hidden scroll-smooth">
        <div className="relative mx-auto flex w-max items-end gap-7 px-8 pt-4">
          {rail && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-12 top-0 h-[2px] rounded-full bg-primary/25"
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function CoupleRow({
  people,
  selectedId,
  onSelect,
}: {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 snap-center items-end gap-2">
      {people.map((p, i) => (
        <div key={p.id} className="flex items-end gap-2">
          {i > 0 && <SpouseLink label={t<string>("tree.relSpouse")} />}
          <Node p={p} selected={selectedId === p.id} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

/** Trait horizontal entre conjoints, avec libellé de lien. */
function SpouseLink({ label }: { label: string }) {
  return (
    <div className="mb-9 flex shrink-0 flex-col items-center" aria-hidden>
      <span className="whitespace-nowrap rounded-full border border-border bg-background px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
        {label}
      </span>
      <span className="mt-1 h-[2px] w-8 rounded-full bg-primary/30" />
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="relative flex h-14 items-center justify-center" aria-hidden>
      <div className="h-full w-[2px] rounded-full bg-gradient-to-b from-primary/10 via-primary/35 to-primary/10" />
      {label && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-primary/20 bg-background px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}

type Badge = { Icon: LucideIcon; tone: string; label: string };

/** Badges accrochés à la pastille : chef de famille, titre / statut social, vérification. */
function getBadges(p: Person): { topRight?: Badge; topLeft?: Badge; bottomLeft?: Badge } {
  const topRight: Badge | undefined = p.headOfFamily
    ? { Icon: Crown, tone: "bg-gold text-gold-foreground", label: "Chef de famille" }
    : p.verified
      ? { Icon: BadgeCheck, tone: "bg-primary text-primary-foreground", label: "Vérifié" }
      : undefined;

  const topLeft: Badge | undefined =
    p.title === "chief"
      ? { Icon: Award, tone: "bg-earth text-earth-foreground", label: "Chef traditionnel" }
      : p.title === "elder"
        ? { Icon: Star, tone: "bg-accent text-accent-foreground", label: "Ancien" }
        : p.title === "notable"
          ? { Icon: Star, tone: "bg-muted text-muted-foreground", label: "Notable" }
          : undefined;

  const bottomLeft: Badge | undefined = !p.verified
    ? { Icon: Lock, tone: "bg-card text-muted-foreground ring-1 ring-border", label: "Non vérifié" }
    : p.status === "deceased" || p.death
      ? { Icon: Flower2, tone: "bg-muted text-muted-foreground", label: "Décédé(e)" }
      : undefined;

  return { topRight, topLeft, bottomLeft };
}

function BadgeDot({ badge, position }: { badge: Badge; position: string }) {
  return (
    <span
      title={badge.label}
      aria-label={badge.label}
      className={`absolute ${position} flex h-5 w-5 items-center justify-center rounded-full border-2 border-background shadow-sm ${badge.tone}`}
    >
      <badge.Icon className="h-2.5 w-2.5" />
    </span>
  );
}

function Node({
  p,
  selected,
  onSelect,
  small,
  highlight,
}: {
  p: Person;
  selected: boolean;
  onSelect: (id: string) => void;
  small?: boolean;
  highlight?: boolean;
}) {
  const ring =
    p.status === "alive"
      ? "ring-vital-alive"
      : p.status === "deceased"
        ? "ring-vital-deceased"
        : "ring-vital-unknown";
  const dot =
    p.status === "alive"
      ? "bg-vital-alive"
      : p.status === "deceased"
        ? "bg-vital-deceased"
        : "bg-vital-unknown";
  const size = small ? "h-14 w-14 text-xs" : "h-20 w-20 text-base";
  const initials = p.name
    .replace(/[()]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isDeceased = p.status === "deceased" || Boolean(p.death);
  const { topRight, topLeft, bottomLeft } = getBadges(p);

  return (
    <button
      onClick={() => onSelect(p.id)}
      className="group flex shrink-0 snap-center flex-col items-center gap-1.5"
    >
      <span aria-hidden className="h-4 w-[2px] rounded-full bg-primary/25" />
      <div className="relative">
        <div
          className={`flex ${size} items-center justify-center overflow-hidden rounded-full font-display font-semibold ring-4 transition ${ring} ${
            isDeceased ? "grayscale" : ""
          } ${selected ? "scale-110 ring-offset-2 ring-offset-background" : ""} ${
            highlight && !p.photoUrl ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {topRight && <BadgeDot badge={topRight} position="-top-1 -right-1" />}
        {topLeft && <BadgeDot badge={topLeft} position="-top-1 -left-1" />}
        {bottomLeft && <BadgeDot badge={bottomLeft} position="-bottom-1 -left-1" />}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${dot}`}
          aria-label={p.status}
        />
      </div>
      <span className="max-w-[88px] truncate text-[11px] font-medium text-foreground">{p.name}</span>
      {(p.birth || p.death) && (
        <span className="text-[10px] text-muted-foreground">
          {p.birth ?? "?"}
          {p.death ? ` – ${p.death}` : ""}
        </span>
      )}
    </button>
  );
}

function AddNode({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 snap-center flex-col items-center gap-1.5 opacity-80 transition hover:opacity-100"
    >
      <span aria-hidden className="h-4 w-[2px] rounded-full bg-primary/25" />
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-card text-muted-foreground">
        +
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}
