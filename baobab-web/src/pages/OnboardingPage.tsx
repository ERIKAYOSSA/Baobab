import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  ShieldCheck,
  IdCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Send,
  Loader2,
  PartyPopper,
  Clock,
  X,
  Plus,
  Globe,
  Languages,
  ChevronDown,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { sendLinkRequest, useLinkRequest, statusLabel } from "@/lib/linkRequests";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  ApiError,
  createPerson,
  login,
  mapUiRelation,
  proposeLink,
  searchPersons,
  sendOtp,
  splitFullName,
  verifyOtp,
  type ApiPerson,
} from "@/lib/api";
import { buildE164, detectDefaultDial, DIAL_COUNTRIES, countryByDial } from "@/lib/phoneCountries";
import { detectCountryIso } from "@/lib/officialLanguages";
import { citiesForCountry, searchCities } from "@/lib/citiesData";
import { saveFacialEnrollment } from "@/lib/facialEnrollment";
import { FacialEnrollment } from "@/components/onboarding/FacialEnrollment";
import {
  countryFromDemonym,
  demonymForCountry,
  demonymOptions,
  ethnicitiesForOrigin,
  languageSuggestionsForOrigin,
} from "@/lib/culturalData";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type RelativeHit = {
  id: string;
  n: string;
  c: string;
  tree: number;
  reason?: string;
  createdAtMs?: number;
};

function createdAtToMs(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? undefined : t;
  }
  if (typeof value === "object" && value !== null) {
    const o = value as { year?: number; month?: number; day?: number; hour?: number; minute?: number };
    if (o.year != null) {
      return Date.UTC(o.year, (o.month ?? 1) - 1, o.day ?? 1, o.hour ?? 0, o.minute ?? 0);
    }
  }
  return undefined;
}

function personToRelativeHit(p: ApiPerson): RelativeHit {
  return {
    id: p.id,
    n: `${p.firstName} ${p.lastName}`.trim(),
    c: [p.village, p.phone].filter(Boolean).join(" · ") || "Membre Baobab",
    tree: 0,
    createdAtMs: createdAtToMs(p.createdAt),
  };
}

function formatRecent(ms: number): string {
  const hours = Math.max(1, Math.floor((Date.now() - ms) / (1000 * 60 * 60)));
  if (hours < 24) return `inscrit il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "inscrit hier";
  if (days < 14) return `inscrit il y a ${days} j`;
  return "inscrit récemment";
}

const COUNTRIES = [
  "Afrique du Sud", "Algérie", "Allemagne", "Angola", "Bénin", "Belgique", "Botswana",
  "Burkina Faso", "Burundi", "Cameroun", "Canada", "Cap-Vert", "Centrafrique", "Comores",
  "Congo", "Côte d'Ivoire", "Djibouti", "Égypte", "Érythrée", "Espagne", "Eswatini",
  "États-Unis", "Éthiopie", "France", "Gabon", "Gambie", "Ghana", "Guinée",
  "Guinée-Bissau", "Guinée équatoriale", "Haïti", "Italie", "Jamaïque", "Kenya",
  "Lesotho", "Libéria", "Libye", "Madagascar", "Malawi", "Mali", "Maroc", "Maurice",
  "Mauritanie", "Mozambique", "Namibie", "Niger", "Nigéria", "Ouganda", "Portugal",
  "République démocratique du Congo", "Royaume-Uni", "Rwanda", "São Tomé-et-Príncipe",
  "Sénégal", "Seychelles", "Sierra Leone", "Somalie", "Soudan", "Soudan du Sud",
  "Suisse", "Tanzanie", "Tchad", "Togo", "Tunisie", "Zambie", "Zimbabwe",
];

const SAMPLE_RELATIVES: RelativeHit[] = [
  { id: "p1", n: "Kwame Mensah", c: "Akan · Abidjan", tree: 42 },
  { id: "p2", n: "Adjoa Mensah", c: "Akan · Kumasi", tree: 28 },
  { id: "p3", n: "Yaa Owusu", c: "Akan · Accra", tree: 17 },
  { id: "p4", n: "Kojo Boateng", c: "Akan · Lomé", tree: 9 },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { useMocks, setSession, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [dialCode, setDialCode] = useState(detectDefaultDial);
  const [nationalNumber, setNationalNumber] = useState("");
  const [e164Phone, setE164Phone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerifiedToken, setPhoneVerifiedToken] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const selectedCountry = countryByDial(dialCode) ?? DIAL_COUNTRIES[0];
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [birthCountry, setBirthCountry] = useState(() => {
    const iso = detectCountryIso();
    return DIAL_COUNTRIES.find((c) => c.iso === iso)?.name ?? "Cameroun";
  });
  const [birthCity, setBirthCity] = useState("");

  // Si le pays change et que la ville n'appartient plus à ce pays, on la vide.
  useEffect(() => {
    const list = citiesForCountry(birthCountry);
    if (birthCity && list.length > 0 && !list.some((c) => c.toLowerCase() === birthCity.toLowerCase())) {
      setBirthCity("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthCountry]);
  const [birthQuarter, setBirthQuarter] = useState("");
  const [gender, setGender] = useState<"f" | "m" | "">("");
  const [hasId, setHasId] = useState<null | boolean>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [facialEnrollment, setFacialEnrollment] = useState<string | null>(null);
  const [showIdAlert, setShowIdAlert] = useState(false);
  const idFileRef = useRef<HTMLInputElement>(null);
  const [ethnicity, setEthnicity] = useState("");
  const [nationalities, setNationalities] = useState<string[]>(() => [
    demonymForCountry(
      DIAL_COUNTRIES.find((c) => c.iso === detectCountryIso())?.name ?? "Cameroun",
      "",
    ),
  ]);
  const [countryOfOrigin, setCountryOfOrigin] = useState(() => {
    return DIAL_COUNTRIES.find((c) => c.iso === detectCountryIso())?.name ?? "Cameroun";
  });
  const [languages, setLanguages] = useState<string[]>([""]);
  const [knowsRelative, setKnowsRelative] = useState<null | boolean>(null);
  const [search, setSearch] = useState("");
  const [chosenRelative, setChosenRelative] = useState<string | null>(null);
  const [relation, setRelation] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [step15Search, setStep15Search] = useState("");
  const [step15Chosen, setStep15Chosen] = useState<string | null>(null);
  const [apiRelatives, setApiRelatives] = useState<RelativeHit[]>([]);
  const [suggestedRelatives, setSuggestedRelatives] = useState<RelativeHit[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchingRelatives, setSearchingRelatives] = useState(false);
  const liveRequest = useLinkRequest(requestId);

  const total = 6;
  /** Affichage progression style Lovable (5 jalons UI) — l'étape 2 est l'écran 1.5 */
  const displayTotal = 5;
  const displayStep = step === 1 ? 1 : Math.min(step - 1, displayTotal);
  const next = () => setStep((s) => Math.min(s + 1, total));
  const back = () => (step === 1 ? navigate("/") : setStep((s) => s - 1));

  useEffect(() => {
    if (isAuthenticated && !useMocks) navigate("/tree", { replace: true });
  }, [isAuthenticated, useMocks, navigate]);

  const relativeQuery = step === 2 ? step15Search : search;
  useEffect(() => {
    if (useMocks) return;
    const q = relativeQuery.trim();
    if (q.length < 2) {
      setApiRelatives([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearchingRelatives(true);
      try {
        const res = await searchPersons(q, 12);
        if (cancelled) return;
        setApiRelatives(res.data.map((p) => personToRelativeHit(p)));
      } catch {
        if (!cancelled) setApiRelatives([]);
      } finally {
        if (!cancelled) setSearchingRelatives(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [relativeQuery, useMocks]);

  /** Suggestions : même localité de naissance ou même nom, inscriptions récentes */
  useEffect(() => {
    if (step !== 6) return;
    let cancelled = false;
    const { firstName, lastName } = splitFullName(name);
    const localityTokens = [birthQuarter, birthCity, birthCountry].map((s) => s.trim()).filter((s) => s.length >= 2);
    const nameTokens = [lastName, firstName].filter((s) => s.length >= 2);

    (async () => {
      setLoadingSuggestions(true);
      try {
        if (useMocks) {
          const locality = [birthQuarter, birthCity, birthCountry].filter(Boolean).join(", ") || "Douala";
          const mock: RelativeHit[] = [
            {
              id: "sug1",
              n: lastName ? `${firstName || "Awa"} ${lastName}` : "Awa Mensah",
              c: locality,
              tree: 12,
              reason: "Même nom de famille",
              createdAtMs: Date.now() - 1000 * 60 * 60 * 5,
            },
            {
              id: "sug2",
              n: "Kofi Ndjock",
              c: locality,
              tree: 8,
              reason: "Même localité",
              createdAtMs: Date.now() - 1000 * 60 * 60 * 26,
            },
            {
              id: "sug3",
              n: "Esther Mballa",
              c: birthCity || "Yaoundé",
              tree: 21,
              reason: "Même localité",
              createdAtMs: Date.now() - 1000 * 60 * 60 * 48,
            },
          ];
          if (!cancelled) setSuggestedRelatives(mock);
          return;
        }

        const queries = [...new Set([...localityTokens, ...nameTokens])].slice(0, 5);
        if (queries.length === 0) {
          if (!cancelled) setSuggestedRelatives([]);
          return;
        }
        const batches = await Promise.all(queries.map((q) => searchPersons(q, 20).catch(() => null)));
        const byId = new Map<string, RelativeHit>();
        for (const batch of batches) {
          if (!batch) continue;
          for (const p of batch.data) {
            const hit = personToRelativeHit(p);
            const village = (p.village ?? "").toLowerCase();
            const sameLocality = localityTokens.some((t) => village.includes(t.toLowerCase()));
            const sameName =
              (lastName.length >= 2 && p.lastName?.toLowerCase().includes(lastName.toLowerCase())) ||
              (firstName.length >= 2 && p.firstName?.toLowerCase().includes(firstName.toLowerCase()));
            if (!sameLocality && !sameName) continue;
            hit.reason = sameLocality && sameName ? "Même localité · même nom" : sameLocality ? "Même localité" : "Même nom";
            const prev = byId.get(hit.id);
            if (!prev || (hit.createdAtMs ?? 0) > (prev.createdAtMs ?? 0)) byId.set(hit.id, hit);
          }
        }
        const sorted = [...byId.values()].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)).slice(0, 20);
        if (!cancelled) setSuggestedRelatives(sorted);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, name, birthCity, birthQuarter, birthCountry, useMocks]);

  const relativesList = useMemo(() => {
    if (step === 6) {
      if (search.trim().length >= 2) {
        return useMocks
          ? SAMPLE_RELATIVES.filter((p) => p.n.toLowerCase().includes(search.toLowerCase()))
          : apiRelatives;
      }
      return suggestedRelatives;
    }
    return useMocks ? SAMPLE_RELATIVES : apiRelatives;
  }, [step, search, useMocks, apiRelatives, suggestedRelatives]);

  const originCountry =
    countryOfOrigin.trim() ||
    countryFromDemonym(nationalities[0] ?? "") ||
    birthCountry;

  const ethnicitySuggestions = useMemo(
    () => ethnicitiesForOrigin(originCountry),
    [originCountry],
  );
  const languageSuggestions = useMemo(
    () => languageSuggestionsForOrigin(originCountry),
    [originCountry],
  );
  const nationalitySuggestions = useMemo(() => demonymOptions(gender), [gender]);

  useEffect(() => {
    setNationalities((prev) =>
      prev.map((n) => {
        const country = countryFromDemonym(n);
        return country ? demonymForCountry(country, gender) : n;
      }),
    );
  }, [gender]);

  const step5Ready = Boolean(nationalities[0]?.trim());
  const step6Ready =
    knowsRelative === false ||
    (knowsRelative === true && !!chosenRelative && !!relation);

  const fullPhone = e164Phone || buildE164(dialCode, nationalNumber);

  const focusOtp = (index: number) => {
    otpRefs.current[index]?.focus();
    otpRefs.current[index]?.select();
  };

  const handleOtpChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setCode((c) => c.substring(0, index) + c.substring(index + 1));
      return;
    }
    if (digits.length > 1) {
      const chunk = digits.slice(0, 6 - index);
      setCode((c) => (c.substring(0, index) + chunk + c.substring(index + chunk.length)).slice(0, 6));
      focusOtp(Math.min(5, index + chunk.length - 1));
      return;
    }
    setCode((c) => (c.substring(0, index) + digits + c.substring(index + 1)).slice(0, 6));
    if (index < 5) focusOtp(index + 1);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (code[index]) {
        setCode((c) => c.substring(0, index) + c.substring(index + 1));
        return;
      }
      if (index > 0) {
        e.preventDefault();
        setCode((c) => c.substring(0, index - 1) + c.substring(index));
        focusOtp(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusOtp(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      focusOtp(index + 1);
    }
  };

  const handlePhoneContinue = async () => {
    if (useMocks) {
      next();
      return;
    }
    const national = nationalNumber.replace(/\D/g, "");
    if (national.length < 6) {
      toast.error("Indique un numéro valide", {
        description: `Ex. ${selectedCountry.flag} +${dialCode} 6XX XXX XXX`,
      });
      return;
    }
    const trimmed = buildE164(dialCode, nationalNumber);
    setAuthBusy(true);
    try {
      if (!otpSent || code.length < 6) {
        const res = await sendOtp(trimmed);
        setOtpSent(true);
        setE164Phone(res.data.phone);
        toast.success("Code envoyé", {
          description: res.data.devCode
            ? `Mode dev — code : ${res.data.devCode}`
            : "Vérifie tes SMS.",
        });
        focusOtp(0);
        return;
      }
      const res = await verifyOtp(trimmed, code, pinRequired ? pin : undefined);
      const data = res.data;
      if ("signupRequired" in data && data.signupRequired) {
        setPhoneVerifiedToken(data.phoneVerifiedToken);
        setE164Phone(data.phone);
        toast.success("Téléphone vérifié");
        next();
        return;
      }
      if ("pinRequired" in data && data.pinRequired && !("token" in data)) {
        setPinRequired(true);
        toast.message("PIN requis", { description: "Entre le PIN de ton compte." });
        return;
      }
      if ("token" in data && data.token) {
        setSession(data.token, data.person, data.refreshToken);
        toast.success("Connexion réussie");
        navigate("/tree");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Échec de la vérification");
    } finally {
      setAuthBusy(false);
    }
  };

  const finish = async () => {
    if (liveRequest && liveRequest.status !== "pending") {
      navigate("/tree");
      return;
    }

    if (useMocks) {
      if (knowsRelative === true && chosenRelative && relation) {
        const target = SAMPLE_RELATIVES.find((p) => p.id === chosenRelative);
        if (!target) return;
        setSending(true);
        try {
          const req = await sendLinkRequest({
            targetId: target.id,
            targetName: target.n,
            relation,
          });
          setRequestId(req.id);
          toast.success("Demande envoyée", {
            description: `${target.n} doit confirmer le lien « ${relation} ».`,
          });
        } catch {
          toast.error("Échec de l'envoi. Réessaie.");
        } finally {
          setSending(false);
        }
        return;
      }
      toast.success("Bienvenue sur Baobab", {
        description: "Commence par ajouter tes parents à ton arbre.",
      });
      navigate("/tree");
      return;
    }

    if (!phoneVerifiedToken) {
      toast.error("Session expirée", { description: "Recommence la vérification SMS." });
      setStep(1);
      return;
    }
    if (!name.trim()) {
      toast.error("Indique ton nom");
      setStep(3);
      return;
    }

    setSending(true);
    try {
      const { firstName, lastName } = splitFullName(name);
      const genderApi =
        gender === "f" ? "female" : gender === "m" ? "male" : undefined;
      const birthPlace = [birthQuarter, birthCity, birthCountry].map((s) => s.trim()).filter(Boolean).join(", ");
      const created = await createPerson({
        firstName,
        lastName,
        gender: genderApi,
        birthDate: dob || undefined,
        village: birthPlace || countryOfOrigin || ethnicity || undefined,
        phone: fullPhone,
        phoneVerifiedToken,
        ethnicity: ethnicity.trim() || undefined,
        languages: languages.map((l) => l.trim()).filter(Boolean),
        nationalities: nationalities.map((n) => n.trim()).filter(Boolean),
        birthCountry: birthCountry.trim() || undefined,
        birthCity: birthCity.trim() || undefined,
        birthQuarter: birthQuarter.trim() || undefined,
        residence: birthPlace || undefined,
      });
      const person = created.data as ApiPerson;
      const loginRes = await login({ phone: fullPhone });
      setSession(loginRes.data.token, loginRes.data.person ?? person, loginRes.data.refreshToken);
      if (facialEnrollment) saveFacialEnrollment(facialEnrollment);

      if (knowsRelative === true && chosenRelative && relation) {
        const mapped = mapUiRelation(relation);
        const target = relativesList.find((p) => p.id === chosenRelative);
        if (mapped && target) {
          try {
            await proposeLink({
              type: mapped.type,
              targetPersonId: chosenRelative,
              direction: mapped.direction,
            });
            toast.success("Demande de lien envoyée", {
              description: `${target.n} · ${relation}`,
            });
          } catch (e) {
            toast.message("Compte créé", {
              description:
                e instanceof ApiError
                  ? `Lien non envoyé : ${e.message}`
                  : "Tu pourras proposer le lien plus tard.",
            });
          }
        }
      } else {
        toast.success("Bienvenue sur Baobab", {
          description: "Commence par ajouter tes parents à ton arbre.",
        });
      }
      navigate("/tree");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Impossible de créer le compte");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
        <button
          onClick={back}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card ring-1 ring-border"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(displayStep / displayTotal) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {displayStep}/{displayTotal}
        </span>
      </div>

      <div className="flex-1 px-5 pt-4">
        {step === 1 && (
          <Step icon={Phone} title="Ton numéro" subtitle="On t'envoie un code par SMS pour créer et te lier à ce compte.">
            <div className="flex gap-2">
              <label className="relative shrink-0">
                <span className="sr-only">Indicatif pays</span>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
                <select
                  value={dialCode}
                  onChange={(e) => {
                    setDialCode(e.target.value);
                    setOtpSent(false);
                    setCode("");
                    setE164Phone("");
                    setPhoneVerifiedToken(null);
                    setPinRequired(false);
                  }}
                  className="h-12 appearance-none rounded-2xl border border-border bg-card py-0 pl-3 pr-8 text-sm font-medium outline-none focus:border-primary"
                  aria-label="Indicatif pays"
                >
                  {DIAL_COUNTRIES.map((c) => (
                    <option key={`${c.iso}-${c.dial}`} value={c.dial}>
                      {c.flag} +{c.dial}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={nationalNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setNationalNumber(digits);
                  setOtpSent(false);
                  setCode("");
                  setE164Phone("");
                  setPhoneVerifiedToken(null);
                  setPinRequired(false);
                }}
                placeholder="6XX XXX XXX"
                inputMode="tel"
                autoComplete="tel-national"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectedCountry.name} · +{dialCode}
              {nationalNumber ? ` ${nationalNumber}` : ""}
            </p>
            <div className="mt-3">
              <p className="mb-1 text-xs text-muted-foreground">
                Code reçu par SMS{otpSent ? " (6 chiffres)" : " — envoie d’abord le code"}
              </p>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    maxLength={1}
                    value={code[i] ?? ""}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    onPaste={(e) => {
                      e.preventDefault();
                      handleOtpChange(i, e.clipboardData.getData("text"));
                    }}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    className="h-12 w-10 shrink-0 rounded-xl border border-border bg-card text-center text-lg font-semibold outline-none focus:border-primary"
                  />
                ))}
              </div>
            </div>
            {pinRequired && (
              <div className="mt-3">
                <p className="mb-1 text-xs text-muted-foreground">PIN du compte</p>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••"
                  className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-center text-lg tracking-[0.4em] outline-none focus:border-primary"
                />
              </div>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step
            icon={Search}
            title="Connais-tu déjà un membre ?"
            subtitle="Recherche un proche avant de déclarer tes parents."
          >
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={step15Search}
                onChange={(e) => setStep15Search(e.target.value)}
                placeholder="Nom de ton proche…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {searchingRelatives && (
                <li className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche…
                </li>
              )}
              {(useMocks
                ? SAMPLE_RELATIVES.filter(
                    (p) => !step15Search || p.n.toLowerCase().includes(step15Search.toLowerCase()),
                  )
                : relativesList
              ).map((p) => (
                <li
                  key={p.id}
                  onClick={() => setStep15Chosen(p.id)}
                  className={`flex cursor-pointer items-center gap-3 p-3 ${step15Chosen === p.id ? "bg-primary/5" : ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/30 font-display font-semibold">
                    {p.n
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.n}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.c}
                      {p.tree ? ` · ${p.tree} membres` : ""}
                    </p>
                  </div>
                  {step15Chosen === p.id && <Check className="h-5 w-5 text-primary" />}
                </li>
              ))}
              {!useMocks && !searchingRelatives && step15Search.trim().length >= 2 && relativesList.length === 0 && (
                <li className="p-3 text-xs text-muted-foreground">Aucun résultat pour « {step15Search} »</li>
              )}
            </ul>
            <button
              onClick={() => {
                setStep15Chosen(null);
                next();
              }}
              className="mt-2 w-full rounded-2xl border border-dashed border-border bg-card py-3 text-sm text-muted-foreground"
            >
              Personne trouvée — continuer
            </button>
          </Step>
        )}

        {step === 3 && (
          <Step icon={ShieldCheck} title="Qui es-tu ?" subtitle="Ces infos restent privées par défaut.">
            <Field label="Nom complet">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. erika nga"
                className="h-12 w-full rounded-2xl border border-border bg-card px-4 outline-none focus:border-primary"
              />
            </Field>
            <Field label="Date de naissance">
              <input
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                type="date"
                className="h-12 w-full rounded-2xl border border-border bg-card px-4 outline-none focus:border-primary"
              />
            </Field>
            <div className="rounded-2xl border border-border bg-card/60 p-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground">Lieu de naissance</p>
                <p className="text-[11px] text-muted-foreground">
                  Pays · ville · quartier — crucial pour rapprocher les liens familiaux.
                </p>
              </div>
              <Field label="Pays">
                <CountryAutocomplete
                  value={birthCountry}
                  onChange={setBirthCountry}
                  placeholder="Ex. Cameroun"
                />
              </Field>
              <Field label="Ville">
                <CityAutocomplete
                  country={birthCountry}
                  value={birthCity}
                  onChange={setBirthCity}
                />
              </Field>
              <Field label="Quartier">
                <input
                  value={birthQuarter}
                  onChange={(e) => setBirthQuarter(e.target.value)}
                  placeholder="Ex. Akwa, Bastos, Bonamoussadi…"
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 outline-none focus:border-primary"
                />
              </Field>
            </div>
            <Field label="Genre">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "f", l: "Femme" },
                  { v: "m", l: "Homme" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setGender(o.v as never)}
                    className={`h-11 rounded-xl border text-sm font-medium ${
                      gender === o.v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
          </Step>
        )}

        {step === 4 && (
          <Step
            icon={Camera}
            title="Identité"
            subtitle="Enrôlement facial pour t’enregistrer, puis pièce d’identité (exigée en version finale)."
          >
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Enrôlement facial</p>
                  <p className="text-[11px] text-muted-foreground">
                    Capture biométrique du visage — distincte de ta photo de profil.
                  </p>
                </div>
              </div>
              <FacialEnrollment
                value={facialEnrollment}
                onCapture={(dataUrl) => {
                  setFacialEnrollment(dataUrl);
                  saveFacialEnrollment(dataUrl);
                }}
                onClear={() => setFacialEnrollment(null)}
              />
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Pièce d’identité</p>
              <button
                type="button"
                onClick={() => idFileRef.current?.click()}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                  hasId === true ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IdCard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{hasId ? "Pièce ajoutée" : "Téléverser ma pièce"}</p>
                  <p className="text-xs text-muted-foreground">CNI, passeport, permis</p>
                </div>
                {hasId === true && <Check className="h-5 w-5 text-primary" />}
              </button>
              <input
                ref={idFileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setHasId(true);
                  if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") setIdPreview(reader.result);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setIdPreview(null);
                  }
                }}
              />
              {idPreview && (
                <img
                  src={idPreview}
                  alt="Aperçu pièce d’identité"
                  className="max-h-36 w-full rounded-2xl border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setShowIdAlert(true)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                  hasId === false ? "border-accent bg-accent/10" : "border-border bg-card"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  …
                </div>
                <div className="flex-1">
                  <p className="font-medium">Passer pour les tests</p>
                  <p className="text-xs text-muted-foreground">
                    En version finale, la pièce sera obligatoire
                  </p>
                </div>
              </button>
              {hasId === false && (
                <div className="flex gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Mode testeur : tu continues sans pièce. La vérification d’identité sera exigée en
                  production.
                </div>
              )}
            </div>

            <AlertDialog open={showIdAlert} onOpenChange={setShowIdAlert}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent-foreground" />
                    Mode testeur
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Pour l’instant tu peux continuer sans pièce d’identité. En version finale, elle
                    sera obligatoire pour débloquer les fonctionnalités sensibles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction
                    onClick={() => {
                      setHasId(false);
                      setIdPreview(null);
                      setShowIdAlert(false);
                      next();
                    }}
                  >
                    Continuer sans pièce
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Step>
        )}

        {step === 5 && (
          <Step
            icon={Globe}
            title="Identité culturelle"
            subtitle="Ces informations enrichissent ton arbre et t'aident à découvrir des liens."
          >
            <Field label="Nationalité" required>
              <p className="mb-2 text-xs text-muted-foreground">
                Ex. Camerounaise{gender === "m" ? " / Camerounais" : ""} — pas le nom du pays.
              </p>
              {nationalities.map((nat, idx) => (
                <div key={idx} className="mb-2">
                  <SuggestionAutocomplete
                    value={nat}
                    onChange={(v) => {
                      const copy = [...nationalities];
                      copy[idx] = v;
                      setNationalities(copy);
                      if (idx === 0) {
                        const country = countryFromDemonym(v);
                        if (country) setCountryOfOrigin((prev) => prev || country);
                      }
                    }}
                    onRemove={idx > 0 ? () => setNationalities(nationalities.filter((_, i) => i !== idx)) : undefined}
                    suggestions={nationalitySuggestions}
                    placeholder="Tape les premières lettres… (ex. Came)"
                    mode="single"
                  />
                </div>
              ))}
              {nationalities.length < 3 && (
                <button
                  onClick={() => setNationalities([...nationalities, ""])}
                  className="mt-1 flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter une autre nationalité légale
                </button>
              )}
            </Field>
            <Field label="Pays d'origine">
              <p className="mb-2 text-xs text-muted-foreground">
                Par défaut = pays de ta nationalité. Sert à filtrer les ethnies.
              </p>
              <CountryAutocomplete
                value={countryOfOrigin}
                onChange={setCountryOfOrigin}
                placeholder="Tape les premières lettres…"
              />
            </Field>
            <Field label="Origine / Ethnie">
              <SuggestionAutocomplete
                value={ethnicity}
                onChange={setEthnicity}
                suggestions={ethnicitySuggestions}
                placeholder={`Premières lettres… (${originCountry || "choisis un pays d’origine"})`}
                mode="single"
              />
            </Field>
            <Field label="Langue(s) parlée(s)">
              <p className="mb-2 text-xs text-muted-foreground">
                Langues ethniques du pays d’origine + langues officielles du monde.
              </p>
              {languages.map((lang, idx) => (
                <div key={idx} className="mb-2">
                  <SuggestionAutocomplete
                    value={lang}
                    onChange={(v) => {
                      const copy = [...languages];
                      copy[idx] = v;
                      setLanguages(copy);
                    }}
                    onRemove={idx > 0 ? () => setLanguages(languages.filter((_, i) => i !== idx)) : undefined}
                    suggestions={languageSuggestions}
                    placeholder="Premières lettres…"
                    mode="single"
                    icon={<Languages className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              ))}
              {languages.length < 5 && (
                <button
                  onClick={() => setLanguages([...languages, ""])}
                  className="mt-1 flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter une autre langue parlée
                </button>
              )}
            </Field>
          </Step>
        )}

        {step === 6 && (
          <Step
            icon={Search}
            title="Un proche déjà sur Baobab ?"
            subtitle="Personnes nées dans ta localité ou portant le même nom, inscrites récemment."
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setKnowsRelative(true)}
                className={`h-12 rounded-2xl border text-sm font-medium ${
                  knowsRelative === true ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                Oui
              </button>
              <button
                onClick={() => {
                  setKnowsRelative(false);
                  setChosenRelative(null);
                }}
                className={`h-12 rounded-2xl border text-sm font-medium ${
                  knowsRelative === false ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                Non
              </button>
            </div>
            {knowsRelative === true && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Affiner par nom…"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {search.trim().length >= 2 ? "Résultats de recherche" : "Suggestions pour toi"}
                </p>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {(loadingSuggestions || searchingRelatives) && (
                    <li className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…
                    </li>
                  )}
                  {relativesList.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => setChosenRelative(p.id)}
                      className={`flex cursor-pointer items-center gap-3 p-3 ${chosenRelative === p.id ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/30 font-display font-semibold">
                        {p.n
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.n}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.c}
                          {p.reason ? ` · ${p.reason}` : ""}
                          {p.createdAtMs ? ` · ${formatRecent(p.createdAtMs)}` : ""}
                        </p>
                      </div>
                      {chosenRelative === p.id && <Check className="h-5 w-5 text-primary" />}
                    </li>
                  ))}
                  {!loadingSuggestions &&
                    !searchingRelatives &&
                    relativesList.length === 0 && (
                      <li className="p-3 text-xs text-muted-foreground">
                        Aucune personne trouvée pour ta localité ou ton nom. Essayez une recherche.
                      </li>
                    )}
                </ul>
                {chosenRelative && (
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Quel est ton lien ?</p>
                    <div className="flex flex-wrap gap-2">
                      {["Père", "Mère", "Frère", "Sœur", "Oncle", "Tante", "Cousin·e"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRelation(r)}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            relation === r ? "bg-primary text-primary-foreground" : "border border-border bg-card"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {liveRequest && <StatusCard request={liveRequest} />}
              </div>
            )}
            {knowsRelative === false && (
              <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
                Pas de souci. Tu vas créer ton arbre en commençant par tes parents ou tes enfants.
              </p>
            )}
          </Step>
        )}
      </div>

      <div className="sticky bottom-0 mt-4 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur">
        {step < total ? (
          <button
            onClick={() => {
              if (step === 1) {
                void handlePhoneContinue();
                return;
              }
              if (step === 5 && !step5Ready) {
                toast.error("Nationalité requise", {
                  description: "Indique ta nationalité (ex. Camerounaise) pour continuer.",
                });
                return;
              }
              if (step === 4 && !facialEnrollment) {
                toast.message("Enrôlement recommandé", {
                  description: "L’enrôlement facial sert à t’enregistrer. Tu peux continuer pour les tests.",
                });
              }
              next();
            }}
            disabled={authBusy || (step === 5 && !step5Ready)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground active:scale-[0.99] disabled:opacity-50"
          >
            {authBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Patiente…
              </>
            ) : step === 1 && !useMocks && !otpSent ? (
              <>
                Recevoir le code <ChevronRight className="h-4 w-4" />
              </>
            ) : step === 1 && !useMocks && code.length < 6 ? (
              <>
                Renvoyer le code <ChevronRight className="h-4 w-4" />
              </>
            ) : step === 1 && !useMocks && pinRequired ? (
              <>
                Se connecter <ChevronRight className="h-4 w-4" />
              </>
            ) : step === 1 && !useMocks ? (
              <>
                Vérifier le code <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Continuer <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={!step6Ready || sending || liveRequest?.status === "pending"}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Envoi de la demande…
              </>
            ) : liveRequest?.status === "pending" ? (
              <>
                <Clock className="h-4 w-4" /> En attente de confirmation…
              </>
            ) : liveRequest?.status === "accepted" ? (
              <>
                <PartyPopper className="h-4 w-4" /> Ouvrir mon arbre fusionné
              </>
            ) : liveRequest?.status === "rejected" ? (
              <>
                <ChevronRight className="h-4 w-4" /> Continuer sans lien
              </>
            ) : knowsRelative === true ? (
              <>
                <Send className="h-4 w-4" /> Envoyer la demande
              </>
            ) : (
              <>
                Créer mon arbre <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusCard({ request }: { request: NonNullable<ReturnType<typeof useLinkRequest>> }) {
  const tone =
    request.status === "pending"
      ? "border-accent/40 bg-accent/10 text-accent-foreground"
      : request.status === "accepted"
        ? "border-primary/30 bg-primary/10 text-foreground"
        : "border-destructive/30 bg-destructive/10 text-foreground";
  const Icon = request.status === "pending" ? Clock : request.status === "accepted" ? Check : X;
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-[12px] ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Demande {statusLabel(request.status).toLowerCase()}</p>
        <p className="mt-0.5 text-foreground/80">
          {request.status === "pending" && <>En attente de la confirmation de {request.targetName}…</>}
          {request.status === "accepted" && (
            <>
              {request.targetName} a confirmé le lien « {request.relation} ». Vos arbres seront fusionnés.
            </>
          )}
          {request.status === "rejected" && <>{request.targetName} n'a pas confirmé. Tu peux continuer sans lien.</>}
        </p>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Phone;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function CountryAutocomplete({
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const matches = value
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="h-12 flex-1 bg-transparent text-sm outline-none"
        />
        {onRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-lg">
          {matches.map((c) => (
            <li
              key={c}
              onMouseDown={() => {
                onChange(c);
                setOpen(false);
              }}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/5"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CityAutocomplete({
  country,
  value,
  onChange,
}: {
  country: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasList = citiesForCountry(country).length > 0;
  const matches = searchCities(country, value);
  const example = citiesForCountry(country).slice(0, 2).join(", ");
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={hasList ? `Ex. ${example}…` : "Nom de la ville"}
          className="h-12 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-lg">
          {matches.map((c) => (
            <li
              key={c}
              onMouseDown={() => {
                onChange(c);
                setOpen(false);
              }}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/5"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  icon,
  onRemove,
  mode = "single",
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
  mode?: "single" | "multi";
}) {
  const [open, setOpen] = useState(false);
  const query =
    mode === "multi" ? (value.split(",").pop()?.trim() ?? "") : value.trim();
  const matches = query
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().startsWith(query.toLowerCase()) &&
            s.toLowerCase() !== query.toLowerCase(),
        )
        .slice(0, 10)
    : [];
  const pick = (s: string) => {
    if (mode === "multi") {
      const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
      parts[parts.length > 0 ? parts.length - 1 : 0] = s;
      onChange(parts.join(", "));
    } else {
      onChange(s);
    }
    setOpen(false);
  };
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3">
        {icon ?? <Search className="h-4 w-4 text-muted-foreground" />}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="h-12 flex-1 bg-transparent text-sm outline-none"
        />
        {onRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Retirer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-lg">
          {matches.map((s) => (
            <li
              key={s}
              onMouseDown={() => pick(s)}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/5"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
