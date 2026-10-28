import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { BaobabLogo } from "@/components/BaobabLogo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, sendOtp, verifyOtp } from "@/lib/api";
import { buildE164, countryByDial, detectDefaultDial, DIAL_COUNTRIES } from "@/lib/phoneCountries";

export function LoginPage() {
  const navigate = useNavigate();
  const { useMocks, setSession, isAuthenticated } = useAuth();

  const [dialCode, setDialCode] = useState(detectDefaultDial);
  const [nationalNumber, setNationalNumber] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const selectedCountry = countryByDial(dialCode) ?? DIAL_COUNTRIES[0];

  // Déjà connecté : direction l'arbre
  useEffect(() => {
    if (isAuthenticated) navigate("/tree", { replace: true });
  }, [isAuthenticated, navigate]);

  const resetOtp = () => {
    setOtpSent(false);
    setCode("");
    setPin("");
    setPinRequired(false);
    setNotRegistered(false);
  };

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

  const handleSubmit = async () => {
    if (useMocks) {
      navigate("/tree");
      return;
    }

    const national = nationalNumber.replace(/\D/g, "");
    if (national.length < 6) {
      toast.error("Indique un numéro valide", {
        description: `Ex. ${selectedCountry.flag} +${dialCode} 6XX XXX XXX`,
      });
      return;
    }
    const phone = buildE164(dialCode, nationalNumber);

    setBusy(true);
    try {
      // Étape 1 : envoyer le code
      if (!otpSent) {
        const res = await sendOtp(phone);
        setOtpSent(true);
        toast.success("Code envoyé", {
          description: res.data.devCode ? `Mode dev — code : ${res.data.devCode}` : "Vérifie tes SMS.",
        });
        window.setTimeout(() => focusOtp(0), 50);
        return;
      }

      // Étape 2 : vérifier le code (+ PIN si demandé)
      if (code.length < 6) {
        toast.error("Entre les 6 chiffres du code");
        return;
      }
      if (pinRequired && pin.length < 4) {
        toast.error("Entre ton PIN (4 chiffres minimum)");
        return;
      }

      const res = await verifyOtp(phone, code, pinRequired ? pin : undefined);
      const data = res.data;

      if ("signupRequired" in data && data.signupRequired) {
        setNotRegistered(true);
        toast.error("Aucun compte avec ce numéro", {
          description: "Crée ton compte pour rejoindre ta famille.",
        });
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
        navigate("/tree", { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Connexion impossible. Vérifie que l'API est lancée.");
    } finally {
      setBusy(false);
    }
  };

  const buttonLabel = !otpSent
    ? "Recevoir le code"
    : pinRequired
      ? "Se connecter"
      : "Vérifier le code";

  return (
    <div translate="no" className="relative min-h-dvh overflow-hidden bg-background bg-grain">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card ring-1 ring-border"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#f3ebe0] ring-1 ring-border">
              <BaobabLogo size={96} />
            </div>
            <h1 className="font-display text-3xl text-foreground">Content de te revoir</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connecte-toi avec le numéro de ton compte Baobab.
            </p>
          </div>

          <div className="space-y-3">
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
                    resetOtp();
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
                  setNationalNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                  resetOtp();
                }}
                placeholder="6XX XXX XXX"
                inputMode="tel"
                autoComplete="tel-national"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
              />
            </div>

            {otpSent && (
              <div className="pt-2">
                <p className="mb-1 text-xs text-muted-foreground">Code reçu par SMS (6 chiffres)</p>
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
            )}

            {pinRequired && (
              <div className="pt-1">
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

            {notRegistered && (
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                <p className="text-foreground">Ce numéro n'a pas encore de compte.</p>
                <Link to="/onboarding" className="mt-1 inline-block font-semibold text-primary">
                  Créer mon compte →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-primary font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(41,90,44,0.45)] transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Patiente…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {buttonLabel}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
          {otpSent && !busy && (
            <button
              type="button"
              onClick={resetOtp}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              Changer de numéro / renvoyer le code
            </button>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/onboarding" className="font-semibold text-primary">
              Créer mon arbre
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
