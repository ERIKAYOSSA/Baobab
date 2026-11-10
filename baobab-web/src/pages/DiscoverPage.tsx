import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Mic,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Users,
  Send,
  HelpCircle,
  User,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  ApiError,
  getDiscover,
  proposeLink,
  searchPersons,
  suggestNames,
  type ApiPerson,
  type DiscoverItem,
  type DiscoverResult,
  type ProposeDirection,
  type UserRelationshipType,
} from "../lib/api";

import { tr } from "../lib/i18n/I18nProvider";
const MOCK_MEMBERS = [
  { n: "Akosua Owusu", r: "Cousine au 2e degré" },
  { n: "Komla Adjei", r: "Belle-famille" },
];

function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function locationOf(i: DiscoverItem): string {
  return [i.birthCity ?? i.village, i.birthCountry].filter(Boolean).join(", ");
}

function reasonsText(codes: string[]): string {
  const labels: Record<string, string> = {
    same_last_name: tr("Même nom de famille"),
    same_locality: tr("Même localité"),
    same_country: tr("Même pays de naissance"),
    same_ethnicity: tr("Même ethnie"),
    same_clan: tr("Même clan"),
  };
  return codes.map((c) => labels[c]).filter(Boolean).join(" · ");
}

type LinkChoice = { key: string; label: string; type: UserRelationshipType; direction: ProposeDirection };

/** Liens qu'on peut déclarer. Cousins, oncles et tantes se déduisent des liens parent / frère-sœur. */
function linkChoices(myGender?: string | null): LinkChoice[] {
  const childType: UserRelationshipType =
    myGender === "female" ? "MOTHER_OF" : myGender === "male" ? "FATHER_OF" : "PARENT_OF";
  return [
    { key: "father", label: "C'est mon père", type: "FATHER_OF", direction: "parent_of_requester" },
    { key: "mother", label: "C'est ma mère", type: "MOTHER_OF", direction: "parent_of_requester" },
    { key: "sibling", label: "C'est mon frère ou ma sœur", type: "SIBLING_OF", direction: "peer" },
    { key: "child", label: "C'est mon enfant", type: childType, direction: "requester_is_parent" },
    { key: "spouse", label: "C'est mon conjoint / ma conjointe", type: "MARRIED_TO", direction: "peer" },
  ];
}

/** Message compréhensible à partir de la réponse de l'API. */
function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.message === "A pending request already exists") return tr("Une demande est déjà en attente pour cette personne.");
    if (e.message === "Relationship already exists") return tr("Ce lien existe déjà.");
    if (e.message === "Relationship conflicts detected")
      return tr("Ce lien est incompatible avec les liens déjà présents dans l'arbre.");
    if (e.status === 404) return tr("Cette personne est introuvable.");
    if (e.status >= 400 && e.status < 500) return e.message;
  }
  return tr("Impossible d'envoyer la demande. Vérifie ta connexion et réessaie.");
}

function LinkSheet({
  target,
  myGender,
  sending,
  onSend,
  onClose,
}: {
  target: { firstName: string; lastName: string };
  myGender?: string | null;
  sending: boolean;
  onSend: (choice: LinkChoice) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string>("");
  const choices = linkChoices(myGender);
  const chosen = choices.find((c) => c.key === picked);
  return createPortal(
    <div translate="no" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={sending ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg text-foreground">
          {tr("Quel est ton lien avec {name} ?", { name: `${target.firstName} ${target.lastName}` })}
        </h2>
        <div className="mt-3 space-y-2">
          {choices.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={sending}
              onClick={() => setPicked(c.key)}
              className={`min-h-11 w-full rounded-xl border px-4 text-left text-sm font-medium ${
                picked === c.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
              }`}
            >
              {tr(c.label)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {tr("Les cousins, oncles et tantes se déduisent automatiquement à partir des liens parent, enfant et frère/sœur.")}
        </p>
        <button
          type="button"
          disabled={!chosen || sending}
          onClick={() => chosen && onSend(chosen)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {tr("Envoi…")}
            </>
          ) : (
            tr("Envoyer la demande")
          )}
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={onClose}
          className="mt-2 block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          {tr("Annuler")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function DiscoverPage() {
  const { useMocks, isAuthenticated, person: me } = useAuth();
  const [nameQuery, setNameQuery] = useState("");
  const [typeahead, setTypeahead] = useState<ApiPerson[]>([]);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [results, setResults] = useState<ApiPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [discover, setDiscover] = useState<DiscoverResult | null>(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [linkTarget, setLinkTarget] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [sending, setSending] = useState(false);

  const runSearch = async () => {
    const q = nameQuery.trim() || country.trim() || ethnicity.trim();
    if (!q) {
      toast.error(tr("Indique au moins un critère de recherche"));
      return;
    }
    if (useMocks) {
      setSearched(true);
      setResults([]);
      toast.message(tr("Mode démo"), { description: tr("Active l’API (VITE_USE_MOCKS=false) pour chercher en base.") });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchPersons(nameQuery.trim() || q, 30);
      const filtered = res.data.filter((p) => {
        const hay = `${p.village ?? ""}`.toLowerCase();
        if (country && !hay.includes(country.toLowerCase())) return false;
        if (ethnicity && !hay.includes(ethnicity.toLowerCase())) return false;
        return true;
      });
      setResults(filtered);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Recherche impossible"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Suggestions pendant la saisie du nom : « er » → les noms qui commencent par « er ».
  useEffect(() => {
    const q = nameQuery.trim();
    if (useMocks || q.length < 2) {
      setTypeahead([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      suggestNames(q, 6)
        .then((res) => {
          if (!cancelled) setTypeahead(res.data.filter((p) => p.id !== me?.id));
        })
        .catch(() => {
          if (!cancelled) setTypeahead([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [nameQuery, useMocks, me?.id]);

  // « Proposer un lien » ouvre d'abord le choix du lien.
  const onPropose = (person: { id: string; firstName: string; lastName: string }) => {
    if (!isAuthenticated) {
      toast.error(tr("Connecte-toi pour proposer un lien"));
      return;
    }
    setLinkTarget(person);
  };

  const sendProposal = async (choice: LinkChoice) => {
    if (!linkTarget || sending) return; // évite les envois en double
    setSending(true);
    try {
      await proposeLink({ type: choice.type, targetPersonId: linkTarget.id, direction: choice.direction });
      toast.success(tr("Demande envoyée"), {
        description: `${linkTarget.firstName} ${linkTarget.lastName} · ${tr(choice.label)}`,
      });
      const sentId = linkTarget.id;
      setDiscover((d) =>
        d
          ? {
              ...d,
              suggestions: d.suggestions.filter((i) => i.id !== sentId),
              potentialLinks: d.potentialLinks.filter((i) => i.id !== sentId),
            }
          : d,
      );
      setLinkTarget(null);
    } catch (e) {
      toast.error(friendlyError(e), { duration: 6000 });
    } finally {
      setSending(false);
    }
  };

  // Suggestions automatiques : membres qui ont activé « Apparaître dans les suggestions ».
  useEffect(() => {
    if (useMocks || !isAuthenticated) return;
    let cancelled = false;
    setDiscoverLoading(true);
    getDiscover()
      .then((res) => {
        if (!cancelled) setDiscover(res.data);
      })
      .catch(() => {
        if (!cancelled) setDiscover(null);
      })
      .finally(() => {
        if (!cancelled) setDiscoverLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useMocks, isAuthenticated]);

  const potential = (discover?.potentialLinks ?? []).filter((i) => !dismissed.has(i.id));
  const potentialIds = new Set(potential.map((i) => i.id));
  const others = (discover?.suggestions ?? []).filter((i) => !potentialIds.has(i.id) && !dismissed.has(i.id));

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-3 pt-5 backdrop-blur">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{tr("Découvrir")}</p>
        <h1 className="font-display text-2xl text-foreground">{tr("Retrouve ta famille")}</h1>
        <div className="mt-3 space-y-2">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  setTypeaheadOpen(true);
                }}
                onFocus={() => setTypeaheadOpen(true)}
                onBlur={() => window.setTimeout(() => setTypeaheadOpen(false), 200)}
                placeholder={tr("Nom complet de la personne")}
                autoComplete="off"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button aria-label={tr("Recherche vocale")} className="text-primary">
                <Mic className="h-4 w-4" />
              </button>
            </div>
            {typeaheadOpen && typeahead.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card shadow-lg">
                {typeahead.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      // onMouseDown : le clic est pris en compte avant que le champ perde le focus
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTypeaheadOpen(false);
                        onPropose(p);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-primary/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                        {initials(p.firstName, p.lastName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[p.village ?? p.birthCity, p.birthCountry].filter(Boolean).join(", ") || tr("Membre Baobab")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={tr("Pays d'origine")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <input
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder={tr("Ethnie ou région")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => void runSearch()}
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{tr("Rechercher")}
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["Tous", "Akan", "Yoruba", "Bantou", "Côte d'Ivoire", "Lagos", "Cousins"].map((chip, i) => (
            <button
              key={chip}
              onClick={() => {
                if (i === 0) {
                  setEthnicity("");
                  setCountry("");
                  setNameQuery("");
                  setSearched(false);
                  setResults([]);
                  return;
                }
                setEthnicity(chip);
              }}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                i === 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
              }`}
            >
              {i === 0 && <SlidersHorizontal className="h-3 w-3" />}
              {tr(chip)}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4 p-4">
        {searched && (
          <Card
            title={tr("Résultats")}
            subtitle={loading ? tr("Recherche…") : tr("{n} personne(s)", { n: results.length })}
            icon={Search}
          >
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />{tr("Chargement…")}
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="text-sm text-muted-foreground">{tr("Aucun membre trouvé pour ces critères.")}</p>
            )}
            <ul className="divide-y divide-border">
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[p.village ?? p.birthCity, p.birthCountry].filter(Boolean).join(" · ") || tr("Membre Baobab")}
                    </p>
                  </div>
                  <button
                    onClick={() => onPropose(p)}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                  >{tr("Proposer un lien")}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!searched && !useMocks && (
          <>
            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                {tr("Connecte-toi pour voir les suggestions de ta famille.")}
              </p>
            )}
            {isAuthenticated && potential.length > 0 && (
              <Card
                title={tr("Liens potentiels détectés")}
                subtitle={tr("{n} correspondance(s)", { n: potential.length })}
                icon={Sparkles}
                accent
              >
                <div className="-mx-4 flex gap-3 overflow-x-auto scrollbar-hide px-4">
                  {potential.map((m) => (
                    <div key={m.id} className="w-56 shrink-0 rounded-2xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/30 font-display text-sm font-semibold text-foreground">
                          {initials(m.firstName, m.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {m.firstName} {m.lastName}
                          </p>
                          {locationOf(m) && (
                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5" /> {locationOf(m)}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="mb-2 text-xs text-muted-foreground">{reasonsText(m.reasons)}</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onPropose(m)}
                          className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground"
                        >
                          {tr("Proposer un lien")}
                        </button>
                        <button
                          onClick={() => setDismissed((d) => new Set(d).add(m.id))}
                          className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium"
                        >
                          {tr("Ignorer")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {isAuthenticated && (
              <Card
                title={tr("Membres sur Baobab")}
                subtitle={tr("{n} personne(s)", { n: others.length })}
                icon={Users}
              >
                {discoverLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tr("Chargement…")}
                  </div>
                )}
                {!discoverLoading && others.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {tr("Aucun membre avec des points communs pour l'instant. Utilise la recherche pour trouver quelqu'un.")}
                  </p>
                )}
                <ul className="divide-y divide-border">
                  {others.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[locationOf(m), reasonsText(m.reasons)].filter(Boolean).join(" · ") || tr("Membre Baobab")}
                        </p>
                      </div>
                      <button
                        onClick={() => onPropose(m)}
                        className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {tr("Proposer un lien")}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
        {useMocks && (
          <>
            <Card title={tr("Liens potentiels détectés")} subtitle={tr("3 correspondances")} icon={Sparkles} accent>
              <div className="-mx-4 flex gap-3 overflow-x-auto scrollbar-hide px-4">
                {[
                  { name: "Yaa Boakye", ctx: "Même grand-père : Mzee Kofi", loc: "Kumasi" },
                  { name: "Kofi Mensah Jr.", ctx: "Cousin probable (Akan)", loc: "Abidjan" },
                  { name: "Adjoa N.", ctx: "Belle-famille via Adjoa", loc: "Lomé" },
                ].map((s) => (
                  <div key={s.name} className="w-56 shrink-0 rounded-2xl border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/30 font-display text-sm font-semibold text-foreground">
                        {s.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" /> {s.loc}
                        </p>
                      </div>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{s.ctx}</p>
                    <div className="flex gap-1.5">
                      <button className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground">{tr("Voir")}
                      </button>
                      <button className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium">{tr("Ignorer")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={tr("Complète ton arbre")} subtitle={tr("62 % renseigné")}>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: "62%" }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Suggestion>{tr("Ajoute ta grand-mère paternelle")}</Suggestion>
                <Suggestion>{tr("Renseigne l'ethnie de Yaw")}</Suggestion>
              </div>
            </Card>

            <Card title={tr("Membres déjà présents")} subtitle={tr("dans ton réseau")} icon={Users}>
              <ul className="divide-y divide-border">
                {MOCK_MEMBERS.map((m) => (
                  <li key={m.n} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{m.n}</p>
                      <p className="text-xs text-muted-foreground">{m.r}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">{tr("Voir le lien")}
                      </button>
                      <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{tr("Ajouter")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <Card title={tr("Inviter un proche")} subtitle={tr("par téléphone ou lien")} icon={Send}>
          <div className="flex gap-2">
            <input
              placeholder="+237 …"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">{tr("Inviter")}</button>
          </div>
        </Card>
      </div>

      <button
        aria-label={tr("Assistant guidé")}
        className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40 active:scale-95"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
      {linkTarget && (
        <LinkSheet
          target={linkTarget}
          myGender={me?.gender}
          sending={sending}
          onSend={(c) => void sendProposal(c)}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Sparkles;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-3xl border p-4 ${
        accent ? "border-accent/40 bg-accent/10" : "border-border bg-card"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <div>
          <h2 className="font-display text-base text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Suggestion({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-xl border border-dashed border-border bg-background p-2 text-left text-xs">
      {children}
    </button>
  );
}
