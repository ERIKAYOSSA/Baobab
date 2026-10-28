const KEY = "baobab_facial_enrollment";

export function saveFacialEnrollment(dataUrl: string) {
  try {
    localStorage.setItem(KEY, dataUrl);
  } catch {
    /* ignore */
  }
}

export function loadFacialEnrollment(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearFacialEnrollment() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
