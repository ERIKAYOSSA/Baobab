export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
export const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? "false") === "true";

export const TOKEN_KEY = "baobab_token";
export const REFRESH_TOKEN_KEY = "baobab_refresh_token";
export const PERSON_KEY = "baobab_person";
