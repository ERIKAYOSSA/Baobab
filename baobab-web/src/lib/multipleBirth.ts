import { tr } from "../lib/i18n/I18nProvider";

export type MultipleBirth = "twin" | "triplet" | "quadruplet" | "quintuplet";

export const MULTIPLE_BIRTH_TYPES: MultipleBirth[] = ["twin", "triplet", "quadruplet", "quintuplet"];

/** Libellé accordé au genre : Jumeau / Jumelle, Triplé / Triplée… */
export function multipleBirthLabel(type: MultipleBirth, gender?: string | null): string {
  const female = gender === "female" || gender === "f";
  const male = gender === "male" || gender === "m";
  switch (type) {
    case "twin":
      return male ? tr("Jumeau") : female ? tr("Jumelle") : tr("Jumeau·elle");
    case "triplet":
      return male ? tr("Triplé") : female ? tr("Triplée") : tr("Triplé·e");
    case "quadruplet":
      return male ? tr("Quadruplé") : female ? tr("Quadruplée") : tr("Quadruplé·e");
    default:
      return male ? tr("Quintuplé") : female ? tr("Quintuplée") : tr("Quintuplé·e");
  }
}

/** Texte court pour la pastille de l'arbre : « Jumelle · n°1 ». */
export function multipleBirthPill(p: { multipleBirth?: MultipleBirth; birthRank?: number; gender?: string }): string {
  if (!p.multipleBirth) return "";
  const label = multipleBirthLabel(p.multipleBirth, p.gender);
  return p.birthRank ? `${label} · ${tr("n°{n}", { n: p.birthRank })}` : label;
}

/** Texte complet pour la fiche : « Jumelle — née en position 1 ». */
export function multipleBirthSummary(p: { multipleBirth?: MultipleBirth; birthRank?: number; gender?: string }): string {
  if (!p.multipleBirth) return "";
  const label = multipleBirthLabel(p.multipleBirth, p.gender);
  return p.birthRank ? `${label} — ${tr("rang de naissance : {n}", { n: p.birthRank })}` : label;
}

/** Tri naissance : date de naissance, puis rang de naissance (le premier né d'abord). */
export function byBirthOrder(
  a: { birthDate?: string; birthRank?: number },
  b: { birthDate?: string; birthRank?: number },
): number {
  if (a.birthDate && b.birthDate && a.birthDate !== b.birthDate) return a.birthDate < b.birthDate ? -1 : 1;
  return (a.birthRank ?? 99) - (b.birthRank ?? 99);
}
