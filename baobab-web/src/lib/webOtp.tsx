/**
 * Remplissage automatique du code reçu par SMS (WebOTP, Chrome sur Android, site en HTTPS).
 * Le navigateur propose le code reçu et l'envoie à l'application : l'utilisateur n'a qu'à valider.
 * Pour que ça marche, la dernière ligne du SMS doit être de la forme : « @www.our-baobab.app #123456 ».
 * Ailleurs (iPhone, ordinateur), la fonction ne fait rien : le champ « one-time-code » prend le relais.
 * Renvoie une fonction pour arrêter l'écoute.
 */
export function listenForSmsCode(onCode: (code: string) => void): () => void {
  if (typeof window === "undefined" || !("OTPCredential" in window) || !navigator.credentials) {
    return () => undefined;
  }
  const controller = new AbortController();
  navigator.credentials
    .get({ otp: { transport: ["sms"] }, signal: controller.signal } as unknown as CredentialRequestOptions)
    .then((credential) => {
      const code = (credential as { code?: string } | null)?.code;
      const digits = code?.replace(/\D/g, "").slice(0, 6);
      if (digits) onCode(digits);
    })
    .catch(() => undefined);
  return () => controller.abort();
}
