import { Link, useNavigate } from "react-router-dom";
import { Fingerprint } from "lucide-react";
import { useMemo, useState } from "react";
import { BaobabLogo } from "@/components/BaobabLogo";
import { landingLanguagesLine } from "@/lib/officialLanguages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logout } from "@/lib/api";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, person, useMocks, clearSession } = useAuth();
  const [planting, setPlanting] = useState(false);
  const languagesLine = useMemo(() => landingLanguagesLine(), []);

  const handleStart = () => {
    if (planting) return;
    setPlanting(true);
    window.setTimeout(() => {
      navigate("/onboarding");
    }, 1100);
  };

  const handleLogout = async () => {
    try {
      if (!useMocks) await logout();
    } catch {
      /* on déconnecte quand même localement */
    }
    clearSession();
  };

  return (
    <div translate="no" className="relative min-h-dvh overflow-hidden bg-background bg-grain">
      <style>{`
        @keyframes baobab-press { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(0.78); opacity: 0.9; } 100% { transform: scale(0.6); opacity: 0; } }
        @keyframes baobab-ring { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes baobab-grow { 0% { stroke-dashoffset: 60; opacity: 0; } 30% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes baobab-leaf { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .anim-press { animation: baobab-press 0.5s ease-in forwards; }
        .anim-ring { animation: baobab-ring 0.7s ease-out forwards; }
        .anim-branch { stroke-dasharray: 60; stroke-dashoffset: 60; animation: baobab-grow 0.7s ease-out 0.35s forwards; }
        .anim-leaf { transform-origin: center; opacity: 0; animation: baobab-leaf 0.4s ease-out forwards; }
      `}</style>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pt-[max(3rem,env(safe-area-inset-top,0px))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-[7.5rem] w-[7.5rem] items-center justify-center overflow-hidden rounded-full bg-[#f3ebe0] ring-1 ring-border">
            <BaobabLogo size={120} />
          </div>
          <h1 className="font-display text-[3rem] font-normal leading-none tracking-tight text-foreground">
            Baobab
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
            Ton arbre. Ta famille.
            <br />
            Ton héritage.
          </p>

          <div className="mt-9 grid w-full grid-cols-3 gap-2.5">
            {[
              { t: "Arbre", d: "vivant" },
              { t: "Liens", d: "retrouvés" },
              { t: "Culture", d: "préservée" },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-border bg-card/80 px-2 py-3 shadow-[0_1px_0_rgba(41,21,8,0.03)]"
              >
                <div className="font-display text-[15px] text-primary">{f.t}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{f.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pb-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/tree"
                className="flex h-14 w-full items-center justify-center rounded-[22px] bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(41,90,44,0.45)] active:scale-[0.98]"
              >
                Continuer vers mon arbre{person?.firstName ? ` · ${person.firstName}` : ""}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center rounded-[22px] border border-border bg-card text-[15px] font-medium text-foreground active:scale-[0.98]"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <>
          <button
            type="button"
            onClick={handleStart}
            disabled={planting}
            aria-label="Commencer — planter mon arbre"
            className="relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-[22px] bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_rgba(41,90,44,0.45)] transition active:scale-[0.98]"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Fingerprint className={`h-5 w-5 ${planting ? "anim-press" : ""}`} />
              {planting && (
                <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary-foreground/70 anim-ring" />
              )}
              {planting && (
                <svg
                  viewBox="0 0 40 40"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path className="anim-branch" d="M20 22 C 17 26, 14 28, 10 30" />
                  <path className="anim-branch" style={{ animationDelay: "0.45s" }} d="M20 22 C 23 26, 26 28, 30 30" />
                  <path className="anim-branch" style={{ animationDelay: "0.55s" }} d="M20 22 L 20 32" />
                  <path className="anim-branch" style={{ animationDelay: "0.5s" }} d="M20 18 C 16 14, 13 12, 10 11" />
                  <path className="anim-branch" style={{ animationDelay: "0.6s" }} d="M20 18 C 24 14, 27 12, 30 11" />
                  <circle className="anim-leaf" style={{ animationDelay: "0.9s" }} cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
                  <circle className="anim-leaf" style={{ animationDelay: "1s" }} cx="30" cy="10" r="1.6" fill="currentColor" stroke="none" />
                  <circle className="anim-leaf" style={{ animationDelay: "1.05s" }} cx="20" cy="8" r="1.6" fill="currentColor" stroke="none" />
                </svg>
              )}
            </span>
            <span className="text-[15px] font-semibold">{planting ? "On plante…" : "Commencer"}</span>
          </button>
          <Link
            to="/login"
            className="flex h-12 items-center justify-center rounded-[22px] border border-primary/30 bg-card text-[15px] font-semibold text-primary active:scale-[0.98]"
          >
            J'ai déjà un compte · Me connecter
          </Link>
          <Link
            to="/tree"
            className="flex h-12 items-center justify-center rounded-[22px] border border-border bg-card text-[15px] font-medium text-foreground active:scale-[0.98]"
          >
            Voir la démo
          </Link>
            </>
          )}
          <p className="pt-1 text-center text-[11px] text-muted-foreground">{languagesLine}</p>
        </div>
      </div>
    </div>
  );
}
