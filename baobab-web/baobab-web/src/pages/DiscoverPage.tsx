import { useEffect, useState } from "react";
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
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, mapUiRelation, proposeLink, searchPersons, type ApiPerson } from "@/lib/api";

const MOCK_MEMBERS = [
  { n: "Akosua Owusu", r: "Cousine au 2e degré" },
  { n: "Komla Adjei", r: "Belle-famille" },
];

export function DiscoverPage() {
  const { useMocks, isAuthenticated } = useAuth();
  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [results, setResults] = useState<ApiPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const q = nameQuery.trim() || country.trim() || ethnicity.trim();
    if (!q) {
      toast.error("Indique au moins un critère de recherche");
      return;
    }
    if (useMocks) {
      setSearched(true);
      setResults([]);
      toast.message("Mode démo", { description: "Active l’API (VITE_USE_MOCKS=false) pour chercher en base." });
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
      toast.error(e instanceof ApiError ? e.message : "Recherche impossible");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onPropose = async (person: ApiPerson) => {
    if (!isAuthenticated) {
      toast.error("Connecte-toi pour proposer un lien");
      return;
    }
    const mapped = mapUiRelation("Cousin·e");
    if (!mapped) return;
    try {
      await proposeLink({
        type: mapped.type,
        targetPersonId: person.id,
        direction: mapped.direction,
      });
      toast.success("Demande envoyée", {
        description: `${person.firstName} ${person.lastName}`,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Échec de la demande");
    }
  };

  useEffect(() => {
    // keep empty until user searches
  }, []);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-3 pt-5 backdrop-blur">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Découvrir</p>
        <h1 className="font-display text-2xl text-foreground">Retrouve ta famille</h1>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Nom complet de la personne"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button aria-label="Recherche vocale" className="text-primary">
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Pays d'origine"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <input
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder="Ethnie ou région"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => void runSearch()}
            disabled={loading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Rechercher
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["Tous", "Akan", "Yoruba", "Bantou", "Côte d'Ivoire", "Lagos", "Cousins"].map((t, i) => (
            <button
              key={t}
              onClick={() => {
                if (i === 0) return;
                setEthnicity(t);
              }}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                i === 0 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
              }`}
            >
              {i === 0 && <SlidersHorizontal className="h-3 w-3" />}
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4 p-4">
        {searched && (
          <Card
            title="Résultats"
            subtitle={loading ? "Recherche…" : `${results.length} personne(s)`}
            icon={Search}
          >
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre trouvé pour ces critères.</p>
            )}
            <ul className="divide-y divide-border">
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[p.village, p.phone].filter(Boolean).join(" · ") || "Membre Baobab"}
                    </p>
                  </div>
                  <button
                    onClick={() => void onPropose(p)}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    Proposer un lien
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {useMocks && (
          <>
            <Card title="Liens potentiels détectés" subtitle="3 correspondances" icon={Sparkles} accent>
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
                      <button className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground">
                        Voir
                      </button>
                      <button className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium">
                        Ignorer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Complète ton arbre" subtitle="62 % renseigné">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: "62%" }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Suggestion>Ajoute ta grand-mère paternelle</Suggestion>
                <Suggestion>Renseigne l'ethnie de Yaw</Suggestion>
              </div>
            </Card>

            <Card title="Membres déjà présents" subtitle="dans ton réseau" icon={Users}>
              <ul className="divide-y divide-border">
                {MOCK_MEMBERS.map((m) => (
                  <li key={m.n} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{m.n}</p>
                      <p className="text-xs text-muted-foreground">{m.r}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
                        Voir le lien
                      </button>
                      <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                        Ajouter
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <Card title="Inviter un proche" subtitle="par téléphone ou lien" icon={Send}>
          <div className="flex gap-2">
            <input
              placeholder="+237 …"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Inviter</button>
          </div>
        </Card>
      </div>

      <button
        aria-label="Assistant guidé"
        className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40 active:scale-95"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
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
