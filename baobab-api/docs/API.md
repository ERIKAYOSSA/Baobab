# Baobab API Reference

Base URL (dev): `http://localhost:3000`

Toutes les réponses suivent `{ ok: boolean, ... }`.

## Santé
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Santé API |
| GET | `/db-check` | Connexion Neo4j |

## Personnes
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/persons` | Liste (max 200) |
| GET | `/persons/search?q=&limit=` | Recherche nom/village |
| GET | `/persons/:id` | Fiche personne |
| POST | `/persons` | Créer |
| PUT | `/persons/:id` | Modifier (champs partiels) |
| DELETE | `/persons/:id` | Supprimer |
| GET | `/persons/:id/relationships` | Liens directs |
| GET | `/persons/:id/consanguinity` | Vue structurée (père, mère, co-épouses, demi-frères, cousins) |
| GET | `/persons/:id/family-tree?depth=2` | Arbre nodes/edges pour UI |
| GET | `/persons/:id/pending-approvals` | Demandes à valider pour cette personne |

## Relations
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/relationships?type=` | Liste des liens |
| POST | `/relationships` | Déclarer (workflow approbation) |
| DELETE | `/relationships?type=&fromPersonId=&toPersonId=` | Supprimer |

## Demandes d'approbation
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/relationship-requests` | Soumettre une demande |
| GET | `/relationship-requests/:id` | Détail + votes |
| GET | `/relationship-requests/pending/:approverId` | File d'attente |
| POST | `/relationship-requests/:id/decide` | Approuver / refuser |

## Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/send-otp` | Envoyer OTP |
| POST | `/auth/verify-otp` | Vérifier OTP → signup ou session (access + refresh) |
| POST | `/auth/login` | Login phone/personId (+ PIN si défini) |
| POST | `/auth/refresh` | Renouveler access + refresh |
| POST | `/auth/logout` | Révoquer refresh (Bearer) |
| GET | `/auth/me` | Profil connecté |
| POST | `/auth/set-pin` | Définir PIN (Bearer, une fois) |
| POST | `/auth/change-pin` | Changer PIN (Bearer) |

`PUT` / `DELETE /persons/:id` exigent un JWT **et** que `:id` soit soi-même.


## Export arbre
| GET | `/persons/:id/family-tree/export?format=svg\|html\|json` | Export fichier |

## Admin
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/diagnostics` | Compteurs, demandes pending, breakdown |
| POST | `/admin/sync-consanguinity` | Recalcul germains / demi-frères / cousins |

## Exemples

### Créer une personne
```json
POST /persons
{
  "firstName": "Amina",
  "lastName": "Diallo",
  "gender": "female",
  "birthDate": "1995-06-01",
  "village": "Bobo-Dioulasso",
  "ethnicity": "Dioula",
  "languages": ["Dioula", "Français"],
  "birthCountry": "Burkina Faso",
  "birthCity": "Bobo-Dioulasso"
}
```

### Mettre à jour le profil (page Moi) — photo + identité
```json
PUT /persons/:id
{
  "photoUrl": "data:image/jpeg;base64,...",
  "nickname": "Ami",
  "honorifics": ["Nana"],
  "socialTitle": "elder",
  "headOfFamily": false,
  "maritalStatus": "married",
  "residence": "Ouagadougou",
  "burialPlace": null,
  "ethnicity": "Mossi",
  "clan": "Nakombgo",
  "totem": "Le Lion",
  "languages": ["Mooré", "Français"],
  "nationalities": ["Burkinabè"],
  "religion": "Islam",
  "initiations": null,
  "oralHistory": "…",
  "birthCountry": "Burkina Faso",
  "birthCity": "Ouagadougou",
  "birthQuarter": "Dassasgho"
}
```

Champs profil optionnels sur `Person` :
| Champ | Type | Usage |
|-------|------|-------|
| `photoUrl` | string (URL ou data:image) | Photo de profil (page Moi → Mon Arbre) |
| `nickname` | string | Surnom |
| `honorifics` | string[] | Titres honorifiques |
| `socialTitle` | `chief` \| `elder` \| `notable` | Statut social |
| `headOfFamily` | boolean | Chef de famille |
| `maritalStatus` | `single` \| `married` \| `widowed` \| `divorced` \| `unknown` | Statut marital |
| `residence` | string | Lieu d'habitation actuel |
| `burialPlace` | string | Sépulture (si décédé) |
| `ethnicity` / `clan` / `totem` | string | Identité culturelle |
| `languages` / `nationalities` | string[] | Langues / nationalités |
| `religion` / `initiations` / `oralHistory` | string | Données culturelles |
| `birthCountry` / `birthCity` / `birthQuarter` | string | Lieu de naissance détaillé |

### Déclarer un lien fraternel
```json
POST /relationship-requests
{
  "type": "SIBLING_OF",
  "requesterId": "<nouveau-id>",
  "fromPersonId": "<nouveau-id>",
  "toPersonId": "<ibrahim-id>"
}
```

### Approuver
```json
POST /relationship-requests/<requestId>/decide
{
  "approverId": "<amina-id>",
  "decision": "approved"
}
```
