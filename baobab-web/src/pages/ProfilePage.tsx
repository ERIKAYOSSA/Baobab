import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Crown,
  Settings,
  Camera,
  UserPlus,
  Copy,
  Trash2,
  Share2,
  Clock,
  CheckCircle2,
  Printer,
  Download,
  X,
  Loader2,
  Save,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/translations";
import {
  createInvite,
  revokeInvite,
  inviteLink,
  useTesterInvites,
  useTesterSession,
  endTesterSession,
  formatRemaining,
} from "@/lib/testerAccess";
import { SAMPLE_PEOPLE } from "@/components/tree/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updatePerson, setPin, changePin, logout, type MaritalStatus, type SocialTitle } from "@/lib/api";
import { compressImageToDataUrl } from "@/lib/compressImage";

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Célibataire" },
  { value: "married", label: "Marié(e)" },
  { value: "widowed", label: "Veuf / Veuve" },
  { value: "divorced", label: "Divorcé(e)" },
  { value: "unknown", label: "Non renseigné" },
];

const TITLE_OPTIONS: { value: SocialTitle | ""; label: string }[] = [
  { value: "", label: "Aucun" },
  { value: "chief", label: "Chef traditionnel" },
  { value: "elder", label: "Ancien / Notable" },
  { value: "notable", label: "Notable" },
];

type ProfileForm = {
  nickname: string;
  honorifics: string;
  socialTitle: SocialTitle | "";
  headOfFamily: boolean;
  maritalStatus: MaritalStatus;
  residence: string;
  burialPlace: string;
  ethnicity: string;
  clan: string;
  totem: string;
  languages: string;
  nationalities: string;
  religion: string;
  initiations: string;
  oralHistory: string;
  birthCountry: string;
  birthCity: string;
  birthQuarter: string;
};

function formFromPerson(person: NonNullable<ReturnType<typeof useAuth>["person"]> | null): ProfileForm {
  return {
    nickname: person?.nickname ?? "",
    honorifics: (person?.honorifics ?? []).join(", "),
    socialTitle: person?.socialTitle ?? "",
    headOfFamily: Boolean(person?.headOfFamily),
    maritalStatus: person?.maritalStatus ?? "unknown",
    residence: person?.residence ?? "",
    burialPlace: person?.burialPlace ?? "",
    ethnicity: person?.ethnicity ?? "",
    clan: person?.clan ?? "",
    totem: person?.totem ?? "",
    languages: (person?.languages ?? []).join(", "),
    nationalities: (person?.nationalities ?? []).join(", "),
    religion: person?.religion ?? "",
    initiations: person?.initiations ?? "",
    oralHistory: person?.oralHistory ?? "",
    birthCountry: person?.birthCountry ?? "",
    birthCity: person?.birthCity ?? "",
    birthQuarter: person?.birthQuarter ?? "",
  };
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,;·|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const { person, isAuthenticated, useMocks, clearSession, updateLocalPerson, setSession } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [form, setForm] = useState<ProfileForm>(() => formFromPerson(person));
  const hasPin = Boolean(person?.hasPin);

  useEffect(() => {
    setForm(formFromPerson(person));
  }, [person]);

  const displayName = person
    ? `${person.firstName} ${person.lastName}`.trim()
    : "Kojo Mensah";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "K";
  const year = person?.birthDate?.slice(2, 4) || "92";
  const verifiedLabel = t<string>("tree.verified");
  const meta = t<string>("common.profileMeta", { year, verifiedLabel });
  const photoUrl = person?.photoUrl ?? null;

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file || !person) {
      if (!person) toast.message("Connecte-toi pour enregistrer ta photo de profil");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image");
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (useMocks) {
        updateLocalPerson({ ...person, photoUrl: dataUrl });
        toast.success("Photo mise à jour (mode démo)");
        return;
      }
      const res = await updatePerson(person.id, { photoUrl: dataUrl });
      updateLocalPerson(res.data);
      toast.success("Photo de profil enregistrée", {
        description: "Elle s’affiche maintenant dans Mon Arbre.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d’enregistrer la photo");
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const onSaveProfile = async () => {
    if (!person) {
      toast.message("Connecte-toi pour enregistrer ton profil");
      return;
    }
    const payload = {
      nickname: form.nickname.trim() || null,
      honorifics: splitList(form.honorifics),
      socialTitle: (form.socialTitle || null) as SocialTitle | null,
      headOfFamily: form.headOfFamily,
      maritalStatus: form.maritalStatus,
      residence: form.residence.trim() || null,
      burialPlace: form.burialPlace.trim() || null,
      ethnicity: form.ethnicity.trim() || null,
      clan: form.clan.trim() || null,
      totem: form.totem.trim() || null,
      languages: splitList(form.languages),
      nationalities: splitList(form.nationalities),
      religion: form.religion.trim() || null,
      initiations: form.initiations.trim() || null,
      oralHistory: form.oralHistory.trim() || null,
      birthCountry: form.birthCountry.trim() || null,
      birthCity: form.birthCity.trim() || null,
      birthQuarter: form.birthQuarter.trim() || null,
    };

    setSaving(true);
    try {
      if (useMocks) {
        updateLocalPerson({ ...person, ...payload });
        toast.success("Profil mis à jour (mode démo)");
        return;
      }
      const res = await updatePerson(person.id, payload);
      updateLocalPerson(res.data);
      toast.success("Profil enregistré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d’enregistrer le profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <header className="relative bg-grain px-4 pb-6 pt-8">
        <div className="absolute right-4 top-5">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-border">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground ring-4 ring-card">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-3xl font-semibold">{initials}</span>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              aria-label="Changer la photo"
              disabled={photoBusy}
              onClick={() => photoInputRef.current?.click()}
              className="absolute -bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-background disabled:opacity-60"
            >
              {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          <h1 className="mt-3 font-display text-2xl text-foreground">{displayName}</h1>
          {person?.nickname && (
            <p className="text-sm text-muted-foreground">« {person.nickname} »</p>
          )}
          <p className="text-xs text-muted-foreground">
            {person?.phone ? `${person.phone} · ` : ""}
            {meta}
          </p>
          <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
            La photo de profil se règle ici et s’affiche dans Mon Arbre (distincte de l’enrôlement facial).
          </p>
          {isAuthenticated && (
            <button
              onClick={async () => {
                try {
                  if (!useMocks) await logout();
                } catch {
                  /* ignore */
                }
                clearSession();
                toast.success("Déconnecté");
                navigate("/onboarding");
              }}
              className="mt-3 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
            >
              Se déconnecter
            </button>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <section className="mx-3 -mt-2 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base">Sécurité — PIN</h2>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            {hasPin
              ? "Change ton PIN pour protéger la reconnexion après le code SMS."
              : "Définis un PIN (4 chiffres min.) demandé après le SMS si ton compte existe déjà."}
          </p>
          {hasPin && (
            <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="PIN actuel"
              className="mb-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          )}
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder={hasPin ? "Nouveau PIN" : "Choisir un PIN"}
            className="mb-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Confirmer le PIN"
            className="mb-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={pinBusy || newPin.length < 4 || newPin !== confirmPin || (hasPin && currentPin.length < 4)}
            onClick={async () => {
              if (!person || useMocks) {
                toast.message(useMocks ? "Mode démo" : "Connecte-toi d’abord");
                return;
              }
              setPinBusy(true);
              try {
                if (hasPin) {
                  await changePin(currentPin, newPin);
                  toast.success("PIN mis à jour");
                } else {
                  const res = await setPin(newPin);
                  setSession(res.data.token, { ...res.data.person, hasPin: true }, res.data.refreshToken);
                  toast.success("PIN configuré");
                }
                setNewPin("");
                setConfirmPin("");
                setCurrentPin("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Échec PIN");
              } finally {
                setPinBusy(false);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {hasPin ? "Changer le PIN" : "Enregistrer le PIN"}
          </button>
        </section>
      )}

      <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base">Identité & titres</h2>
          </div>
          <button
            type="button"
            onClick={() => void onSaveProfile()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Surnom" value={form.nickname} onChange={(v) => setField("nickname", v)} />
          <Field
            label="Titres honorifiques"
            hint="Séparés par des virgules"
            value={form.honorifics}
            onChange={(v) => setField("honorifics", v)}
            placeholder="Nana, Chef de canton…"
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Statut social
            </label>
            <select
              value={form.socialTitle}
              onChange={(e) => setField("socialTitle", e.target.value as SocialTitle | "")}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {TITLE_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">Chef de famille</span>
            <input
              type="checkbox"
              checked={form.headOfFamily}
              onChange={(e) => setField("headOfFamily", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Statut marital
            </label>
            <select
              value={form.maritalStatus}
              onChange={(e) => setField("maritalStatus", e.target.value as MaritalStatus)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {MARITAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Lieu d'habitation"
            value={form.residence}
            onChange={(v) => setField("residence", v)}
            placeholder="Ville, pays"
          />
          <Field
            label="Sépulture"
            hint="Si décédé(e)"
            value={form.burialPlace}
            onChange={(v) => setField("burialPlace", v)}
          />
        </div>
      </section>

      <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base">{t("me.language")}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-medium transition ${
                locale === l
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {LOCALE_LABELS[l as Locale]}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4">
        <h2 className="mb-2 font-display text-base">{t("me.culturalData")}</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Ces informations enrichissent ta fiche et aident au rapprochement familial. Elles apparaissent dans Mon
          Arbre quand elles sont renseignées.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Pays de naissance" value={form.birthCountry} onChange={(v) => setField("birthCountry", v)} />
            <Field label="Ville" value={form.birthCity} onChange={(v) => setField("birthCity", v)} />
          </div>
          <Field label="Quartier" value={form.birthQuarter} onChange={(v) => setField("birthQuarter", v)} />
          <Field label="Ethnie" value={form.ethnicity} onChange={(v) => setField("ethnicity", v)} />
          <Field label="Clan" value={form.clan} onChange={(v) => setField("clan", v)} />
          <Field label="Totem" value={form.totem} onChange={(v) => setField("totem", v)} />
          <Field
            label="Nationalités"
            hint="Séparées par des virgules"
            value={form.nationalities}
            onChange={(v) => setField("nationalities", v)}
          />
          <Field
            label="Langues"
            hint="Séparées par des virgules"
            value={form.languages}
            onChange={(v) => setField("languages", v)}
          />
          <Field label="Religion" value={form.religion} onChange={(v) => setField("religion", v)} />
          <Field label="Initiations" value={form.initiations} onChange={(v) => setField("initiations", v)} />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Histoire orale
            </label>
            <textarea
              value={form.oralHistory}
              onChange={(e) => setField("oralHistory", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => void onSaveProfile()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer le profil
          </button>
        </div>
      </section>

      <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-base">{t("me.discoveryPrefs")}</h2>
        <Toggle label={t<string>("me.appearInSuggestions")} defaultOn />
        <Toggle label={t<string>("me.detectLinks")} defaultOn />
        <Toggle label={t<string>("me.receiveInvites")} />
      </section>

      <TesterInvitesSection />

      <ExportSection />

      <div className="h-6" />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-[10px] opacity-80">{hint}</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

type ExportSide = "paternelle" | "maternelle" | "both";
type ExportFormat = "pdf" | "jpeg" | "png";
type PageFormat = "A4" | "Letter";

function ExportSection() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Mon arbre - Famille Mensah");
  const [side, setSide] = useState<ExportSide>("both");
  const [generations, setGenerations] = useState(3);
  const [includeSpouses, setIncludeSpouses] = useState(true);
  const [includeDeceased, setIncludeDeceased] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [pageFormat, setPageFormat] = useState<PageFormat>("A4");
  const [output, setOutput] = useState<ExportFormat>("pdf");

  const runExport = () => {
    const sideLabel =
      side === "paternelle" ? "Lignée paternelle" : side === "maternelle" ? "Lignée maternelle" : "Les deux lignées";
    const rows = SAMPLE_PEOPLE.filter((p) => {
      if (!includeDeceased && (p.status === "deceased" || p.death)) return false;
      return true;
    });
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
@page { size: ${pageFormat}; margin: 18mm; }
body { font-family: Georgia, 'Libre Baskerville', serif; color: #291508; background: #fffdf9; padding: 24px; }
h1 { font-size: 22px; margin: 0 0 4px; }
.meta { color: #6f5947; font-size: 12px; margin-bottom: 18px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border-bottom: 1px solid #e1d6c6; padding: 8px 6px; text-align: left; }
th { color: #6f5947; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
.photo { width: 28px; height: 28px; border: 1px dashed #e1d6c6; border-radius: 50%; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">${sideLabel} · N ± ${generations}${includeSpouses ? " · conjoints" : ""}${includeDeceased ? " · décédés" : ""}</p>
<table><thead><tr>
${includePhotos ? "<th></th>" : ""}
<th>Nom</th><th>Années</th><th>Statut</th><th>Vérifié</th>
</tr></thead><tbody>
${rows
  .map((p) => {
    const years = `${p.birth ?? "?"}${p.death ? ` – ${p.death}` : ""}`;
    const status = p.status === "deceased" ? "Décédé·e" : p.status === "alive" ? "Vivant·e" : "—";
    return `<tr>${includePhotos ? '<td><div class="photo"></div></td>' : ""}<td><strong>${escapeHtml(p.name)}</strong></td><td>${years}</td><td>${status}</td><td>${p.verified ? "✓" : ""}</td></tr>`;
  })
  .join("")}
</tbody></table></body></html>`;

    if (output === "pdf") {
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Autorise les pop-ups pour imprimer");
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
      toast.success("Document prêt à imprimer");
    } else {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.${output === "jpeg" ? "html" : "html"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Fichier ${output.toUpperCase()} généré`, {
        description: "Aperçu HTML téléchargé (rendu image côté navigateur).",
      });
    }
    setOpen(false);
  };

  return (
    <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Printer className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base">Imprimer / Exporter</h2>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Génère un document de ton arbre en PDF, JPEG ou PNG. Choisis la lignée, le nombre de générations et les options
        avant d'exporter.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground active:scale-[0.99]"
      >
        <Download className="h-4 w-4" /> Configurer et exporter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg">Paramètres d'impression</h3>
                <p className="text-[11px] text-muted-foreground">
                  Configure la lignée, les options et le format de sortie (PDF, JPEG ou PNG).
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Titre du document
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Lignée</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: "paternelle", label: "Paternelle" },
                      { v: "maternelle", label: "Maternelle" },
                      { v: "both", label: "Les deux" },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => setSide(d.v)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                        side === d.v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Générations</p>
                  <span className="text-xs font-semibold">N ± {generations}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={generations}
                  onChange={(e) => setGenerations(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Format de page
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["A4", "Letter"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPageFormat(d)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                        pageFormat === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Format de sortie
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: "pdf", label: "PDF" },
                      { v: "jpeg", label: "JPEG" },
                      { v: "png", label: "PNG" },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => setOutput(d.v)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                        output === d.v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <CheckRow label="Inclure les conjoints" checked={includeSpouses} onChange={setIncludeSpouses} />
                <CheckRow label="Inclure les personnes décédées" checked={includeDeceased} onChange={setIncludeDeceased} />
                <CheckRow label="Emplacements pour photos" checked={includePhotos} onChange={setIncludePhotos} />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={runExport}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {output === "pdf" ? (
                  <>
                    <Printer className="h-4 w-4" /> Imprimer PDF
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Télécharger {output.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function TesterInvitesSection() {
  const invites = useTesterInvites();
  const session = useTesterSession();
  const [label, setLabel] = useState("");

  const handleCreate = () => {
    const inv = createInvite(label || undefined);
    setLabel("");
    toast.success("Invitation créée", {
      description: `Code ${inv.code} · valide 7 jours.`,
    });
  };

  const copy = async (code: string) => {
    const url = inviteLink(code);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié", { description: url });
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const share = async (code: string) => {
    const url = inviteLink(code);
    const text = `Tu es invité·e à tester Baobab. Active ton accès ici : ${url}`;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: "Invitation Baobab", text, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy(code);
  };

  return (
    <section className="mx-3 mt-3 rounded-3xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base">Inviter des testeurs</h2>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Génère un lien à usage limité. Tes testeurs y accèdent sans créer de compte — l'accès expire
        automatiquement après 7 jours.
      </p>

      {session && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-[12px]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Tu utilises Baobab en mode testeur ({session.alias})
            </p>
            <p className="text-foreground/80">
              {formatRemaining(session.expiresAt - Date.now())} · code {session.code}
            </p>
          </div>
          <button
            onClick={() => {
              endTesterSession();
              toast.success("Session testeur terminée");
            }}
            className="rounded-lg border border-border bg-card px-2 py-1 text-[11px]"
          >
            Quitter
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom du testeur (optionnel)"
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleCreate}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" /> Créer
        </button>
      </div>

      {invites.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Aucune invitation pour l'instant.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {invites.map((inv) => {
            const remaining = inv.expiresAt - Date.now();
            const expired = remaining <= 0;
            const used = !!inv.redeemedAt;
            return (
              <li key={inv.code} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold tracking-widest">{inv.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        expired
                          ? "bg-muted text-muted-foreground"
                          : used
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/20 text-accent-foreground"
                      }`}
                    >
                      {expired ? "Expiré" : used ? "Activé" : "En attente"}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {inv.label}
                    {used && inv.redeemedBy ? ` · par ${inv.redeemedBy}` : ""}
                    {!expired && (
                      <>
                        {" · "}
                        <Clock className="-mt-0.5 inline h-3 w-3" /> {formatRemaining(remaining)}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => copy(inv.code)}
                  disabled={expired}
                  aria-label="Copier le lien"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-40"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => share(inv.code)}
                  disabled={expired}
                  aria-label="Partager le lien"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-40"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    revokeInvite(inv.code);
                    toast.success("Invitation révoquée");
                  }}
                  aria-label="Révoquer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button onClick={() => setOn(!on)} className="flex w-full items-center justify-between py-2.5 text-left">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-10 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
