import { useEffect, useState } from "react";
import { Settings2, Globe, Loader2 } from "lucide-react";
import { FamilyTree } from "../components/tree/FamilyTree";
import { PersonPanel } from "../components/tree/PersonPanel";
import { AddRelativeSheet } from "../components/tree/AddRelativeSheet";
import { ConfirmSheet } from "../components/tree/ConfirmSheet";
import { toast } from "sonner";
import { SAMPLE_PEOPLE, type Person } from "../components/tree/types";
import { useI18n, tr } from "../lib/i18n/I18nProvider";
import { useAuth } from "../lib/auth/AuthProvider";
import { ApiError, deleteRelative, getFamilyTree, mapFamilyTreeToPeople, removeLinksWith } from "../lib/api";
import { subscribeChat } from "../lib/chatStream";

export function TreePage() {
  const [depth, setDepth] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>(SAMPLE_PEOPLE);
  const [meId, setMeId] = useState("me");
  const [familyName, setFamilyName] = useState("Famille Mensah");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "link" | "relative">(null);
  const [removing, setRemoving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { t, locale } = useI18n();
  const { person, isAuthenticated, useMocks } = useAuth();

  useEffect(() => {
    if (useMocks || !isAuthenticated || !person) {
      setPeople(SAMPLE_PEOPLE);
      setMeId("me");
      setFamilyName("Famille Mensah");
      setSelectedId(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const apiDepth = Math.max(1, Math.abs(depth) || 1);

    (async () => {
      try {
        const res = await getFamilyTree(person.id, Math.min(5, apiDepth));
        if (cancelled) return;
        const mapped = mapFamilyTreeToPeople(res.data);
        setPeople(mapped.people);
        setMeId(mapped.meId);
        setFamilyName(mapped.familyName);
        setSelectedId((prev) => (prev && mapped.people.some((p) => p.id === prev) ? prev : null));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible de charger l’arbre");
          setPeople([
            {
              id: person.id,
              name: `Toi (${person.firstName})`,
              birth: person.birthDate?.slice(0, 4),
              status: "alive",
              verified: Boolean(person.phone),
              gender: person.gender === "female" ? "f" : "m",
            },
          ]);
          setMeId(person.id);
          setFamilyName(person.lastName || "Ma famille");
          setSelectedId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [person, isAuthenticated, useMocks, depth, reloadKey]);

  const selected = selectedId ? (people.find((p) => p.id === selectedId) ?? null) : null;

  const ancestorDepth = Math.max(0, -depth);
  const descendantDepth = Math.max(0, depth);
  const depthLabel = depth === 0 ? "Moi" : depth < 0 ? `N${depth}` : `N+${depth}`;

  // Temps réel : quand un lien change d'état, l'arbre se recharge.
  useEffect(() => {
    if (useMocks || !isAuthenticated) return;
    return subscribeChat((event) => {
      if (event.type === "notify" && event.kind === "request_updated") setReloadKey((k) => k + 1);
    });
  }, [useMocks, isAuthenticated]);

  const openAdd = () => {
    if (useMocks || !isAuthenticated || !person) {
      toast.error(tr("Connecte-toi pour enrichir ton arbre"));
      return;
    }
    setAddOpen(true);
  };

  const meNode = people.find((p) => p.id === meId);
  // Lien direct entre moi et la personne ouverte (parent, enfant, conjoint, fratrie).
  const hasDirectLink =
    !!selected &&
    !!meNode &&
    selected.id !== meId &&
    (meNode.fatherId === selected.id ||
      meNode.motherId === selected.id ||
      selected.fatherId === meId ||
      selected.motherId === meId ||
      Boolean(meNode.spouseIds?.includes(selected.id)) ||
      Boolean(meNode.coWifeIds?.includes(selected.id)) ||
      Boolean(meNode.siblingIds?.includes(selected.id)) ||
      Boolean(selected.siblingIds?.includes(meId)));
  const canDeleteRelative =
    !!selected && selected.id !== meId && Boolean(selected.unclaimed) && selected.createdBy === meId;
  const canEdit = !useMocks && isAuthenticated;

  const doRemove = async () => {
    if (!selected || !confirm || removing) return;
    setRemoving(true);
    try {
      if (confirm === "relative") await deleteRelative(selected.id);
      else await removeLinksWith(selected.id);
      toast.success(confirm === "relative" ? tr("Proche supprimé") : tr("Lien retiré"), {
        description: tr("{name} n'est plus dans ta famille.", { name: selected.name }),
      });
      setConfirm(null);
      setSelectedId(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : tr("Impossible de retirer ce lien."), { duration: 6000 });
    } finally {
      setRemoving(false);
    }
  };

  const onSelect = (id: string) => {
    if (id === "__add__") return;
    setSelectedId(id);
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-lg text-foreground">{familyName}</h1>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("tree.eyebrow")}
            </span>
          </div>
          <button
            aria-label={t<string>("tree.settings")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">{tr("N-5")}</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={-5}
              max={5}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              aria-label={tr("Profondeur de l’arbre")}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">{tr("N+5")}</span>
          <span className="flex min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {depthLabel}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3" /> {locale.toUpperCase()}
          </span>
        </div>
        <Legend />
      </header>

      <div className="bg-grain pt-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />{tr("Chargement de l’arbre…")}
          </div>
        )}
        {error && !loading && (
          <p className="px-4 pb-2 text-center text-xs text-muted-foreground">{error}</p>
        )}
        {!loading && people.length > 0 && (
          <FamilyTree
            people={people}
            selectedId={selectedId ?? ""}
            onSelect={onSelect}
            meId={meId}
            ancestorDepth={ancestorDepth}
            descendantDepth={descendantDepth}
          />
        )}
        {!loading && !selected && (
          <p className="px-6 pb-2 text-center text-[11px] text-muted-foreground">{tr("Touche une pastille pour ouvrir la fiche de la personne.")}
          </p>
        )}
      </div>

      {selected && (
        <>
          <div aria-hidden className="h-[45dvh]" />
          <PersonPanel
            person={selected}
            onClose={() => setSelectedId(null)}
            onEnrich={openAdd}
            onAdd={openAdd}
            onRemoveLink={canEdit && hasDirectLink ? () => setConfirm("link") : undefined}
            onDeleteRelative={canEdit && canDeleteRelative ? () => setConfirm("relative") : undefined}
          />
        </>
      )}
      {confirm && selected && (
        <ConfirmSheet
          title={
            confirm === "relative"
              ? tr("Supprimer {name} ?", { name: selected.name })
              : tr("Retirer {name} de ta famille ?", { name: selected.name })
          }
          message={
            confirm === "relative"
              ? tr("Ce profil, que tu as ajouté, sera supprimé définitivement ainsi que tous ses liens.")
              : tr("Les liens directs entre vous seront supprimés. Tu pourras les redéclarer plus tard. Le reste de l'arbre n'est pas modifié.")
          }
          confirmLabel={confirm === "relative" ? tr("Supprimer ce proche") : tr("Retirer de ma famille")}
          busy={removing}
          onConfirm={() => void doRemove()}
          onCancel={() => setConfirm(null)}
        />
      )}
      {addOpen && person && (
        <AddRelativeSheet
          me={person}
          people={people}
          meId={meId}
          onClose={() => setAddOpen(false)}
          onDone={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary" />{tr("Vérifié")}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{tr("Non vérifié")}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-accent" />{tr("Décédé")}
      </span>
    </div>
  );
}

