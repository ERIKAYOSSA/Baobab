type LogoProps = {
  size?: number;
  className?: string;
};

/** Logo officiel Lovable (PNG) — utilisé sur la landing */
export function BaobabLogo({ size = 112, className = "" }: LogoProps) {
  return (
    <img
      src="/baobab-logo-sm.png"
      alt="Baobab"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

export function TreeRingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
