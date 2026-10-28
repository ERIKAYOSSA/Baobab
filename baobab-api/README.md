# Baobab API

Backend Node.js + TypeScript for the Baobab African genealogy app, connected to Neo4j Desktop.

## 1) Install dependencies

```bash
npm install
```

## 2) Create environment file

Copy `.env.example` to `.env` and update credentials:

```env
PORT=3000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

## 3) Start API in development

```bash
npm run dev
```

## 4) Test endpoints

- `GET /health` -> API health check
- `GET /db-check` -> Neo4j connection test
- `GET /persons` -> list persons (max 200)
- `GET /persons/search?q=` -> search by name or village
- `GET /persons/:personId` -> get one person
- `PUT /persons/:personId` -> update person
- `DELETE /persons/:personId` -> delete person
- `GET /persons/:personId/family-tree?depth=2` -> family tree for UI
- `GET /persons/:personId/pending-approvals` -> approvals waiting for this person
- `GET /admin/diagnostics` -> database diagnostics
- `POST /admin/sync-consanguinity` -> recompute derived family links
- `POST /auth/login` -> login with personId (+ pin if set)
- `POST /auth/set-pin` -> set first PIN for a person
- `GET /auth/me` -> authenticated profile (Bearer token)
- `POST /persons` -> create a person
- `GET /persons/:personId/relationships` -> family tree links for one person
- `GET /relationships` -> list relationships (optional `?type=PARENT_OF`)
- `POST /relationships` -> create a relationship (with family approval if needed)
- `POST /relationship-requests` -> submit a relationship claim explicitly
- `GET /relationship-requests/:requestId` -> request status + approvals
- `GET /relationship-requests/pending/:approverId` -> approvals waiting for one person
- `POST /relationship-requests/:requestId/decide` -> approve or reject
- `DELETE /relationships?type=...&fromPersonId=...&toPersonId=...` -> delete a relationship

Example payload for `POST /persons`:

```json
{
  "firstName": "Amina",
  "lastName": "Diallo",
  "gender": "female",
  "birthDate": "1995-06-01",
  "village": "Bobo-Dioulasso"
}
```

## 5) Family relationships

### Declared links (approval required)

| Type | Meaning | Direction |
|------|---------|-----------|
| `FATHER_OF` | Père biologique / social | père → enfant |
| `MOTHER_OF` | Mère biologique / social | mère → enfant |
| `PARENT_OF` | Lien parent générique (legacy) | parent → enfant |
| `HUSBAND_OF` | Époux | mari → épouse |
| `WIFE_OF` | Épouse (polygamie possible) | épouse → mari |
| `MARRIED_TO` | Union (legacy) | libre |
| `CO_WIFE_OF` | Co-épouses du même mari | entre épouses |
| `SIBLING_OF` | Fratrie déclarée | à confirmer |

### Liens dérivés automatiquement (consanguinité explicite)

| Type | Signification |
|------|----------------|
| `FULL_SIBLING_OF` | Germains (même père **et** même mère) |
| `HALF_SIBLING_OF` | Demi-frères/sœurs (`sharedLine`: `paternal` ou `maternal`) |
| `COUSIN_OF` | Cousin(e) 1er degré (`line`: `paternal`, `maternal`, `both`) |

`GET /persons/:personId/consanguinity` retourne la vue structurée (père, mère, co-épouses, demi-fratrie, cousins par lignée).

Direction rules:
- `PARENT_OF`: `fromPersonId` = parent, `toPersonId` = child
- `MARRIED_TO` / `SIBLING_OF`: one direction is stored; queries return both directions

Example `POST /relationships`:

```json
{
  "type": "PARENT_OF",
  "fromPersonId": "parent-uuid",
  "toPersonId": "child-uuid"
}
```

Example `GET /persons/{id}/relationships` response:

```json
{
  "ok": true,
  "personId": "...",
  "data": {
    "parents": [],
    "children": [],
    "spouses": [],
    "siblings": [],
    "cousins": []
  }
}
```

## 6) Consanguinité et polygamie

Après chaque lien familial confirmé, l’API synchronise la consanguinité :

- Migration automatique `PARENT_OF` → `FATHER_OF` / `MOTHER_OF` selon le genre.
- Calcul des **germains** vs **demi-frères/sœurs** (ligne paternelle ou maternelle).
- Calcul des **cousins** par lignée (`paternal`, `maternal`, `both`).
- Support de plusieurs épouses via `WIFE_OF` + `CO_WIFE_OF`.

Exemple polygamique : Moussa `HUSBAND_OF` → Aissata, `HUSBAND_OF` → Fatoumata ; Aissata `CO_WIFE_OF` Fatoumata.
Les enfants de chaque mère partagent le père : demi-fratrie `HALF_SIBLING_OF` avec `sharedLine: paternal`.

## 7) Family approval workflow

When a person joins and claims a family link (ex: "Ibrahim is my brother"), the API:

1. Finds the family cluster connected to the target person.
2. Requires approval from every member registered **before** the requester (`createdAt` older).
3. Creates the relationship only after all required approvals.
4. Once confirmed, that person can approve future members who join after them.

Example claim:

```json
POST /relationship-requests
{
  "type": "SIBLING_OF",
  "requesterId": "new-person-uuid",
  "fromPersonId": "new-person-uuid",
  "toPersonId": "ibrahim-uuid"
}
```

Approve:

```json
POST /relationship-requests/{requestId}/decide
{
  "approverId": "amina-uuid",
  "decision": "approved"
}
```

## 8) Suggested next steps

1. Add auth (JWT)
2. Add validation and tests
3. Connect frontend Lovable to this API URL
