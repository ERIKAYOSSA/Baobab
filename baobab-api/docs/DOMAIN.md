# Baobab — Règles métier (DOMAIN)

## Objectif

Application de généalogie africaine avec validation communautaire et consanguinité explicite.

## Inscription d'une personne

1. Création via `POST /persons` (profil de base + champs culturels optionnels).
2. La personne déclare un lien vers un membre existant via `POST /relationship-requests`.
3. Tous les membres de la famille connectée, inscrits **avant** elle (`createdAt` plus ancien), doivent approuver.
4. Une fois confirmée, elle peut approuver les personnes inscrites après elle.

## Profil (page Moi)

La photo de profil (`photoUrl`) et les champs d'identité (surnom, titres honorifiques, statut social, statut marital, résidence, sépulture, données culturelles) se renseignent via `PUT /persons/:id`.
La photo affichée dans **Mon Arbre** est toujours celle du profil (`photoUrl`), distincte de l'enrôlement facial local.

## Liens déclarés (soumis à validation)


| Lien         | Sens                  | Notes                                   |
| ------------ | --------------------- | --------------------------------------- |
| `FATHER_OF`  | père → enfant         | ligne paternelle                        |
| `MOTHER_OF`  | mère → enfant         | ligne maternelle                        |
| `WIFE_OF`    | épouse → mari         | polygamie : plusieurs épouses possibles |
| `HUSBAND_OF` | mari → épouse         |                                         |
| `CO_WIFE_OF` | co-épouse ↔ co-épouse |                                         |
| `SIBLING_OF` | frère/sœur déclaré    | en attente de confirmation              |




## Liens dérivés (automatiques, sans vote)


| Lien              | Règle                                                     |
| ----------------- | --------------------------------------------------------- |
| `FULL_SIBLING_OF` | même père ET même mère                                    |
| `HALF_SIBLING_OF` | un parent en commun (`sharedLine`: paternal / maternal)   |
| `COUSIN_OF`       | parents frères/sœurs (`line`: paternal / maternal / both) |




## Polygamie

- Un homme peut avoir plusieurs `WIFE_OF` (pas de conflit « double mari »).
- Les co-épouses sont liées par `CO_WIFE_OF` (personne de genre `female`).
- Les enfants de mères différentes mais du même père → `HALF_SIBLING_OF` (ligne paternelle).
- Dans l’arbre : conjoints (`WIFE_OF` / `HUSBAND_OF`) et co-épouses (`CO_WIFE_OF`) sont affichés séparément.



## Qui vote

1. Votent les **membres inscrits** de la famille (compte actif, vivant). Un défunt ne vote pas et ne se connecte pas.
2. Le graphe familial est l’union des familles du demandeur et de l’ancre.
3. S’il n’y a aucun membre inscrit à consulter → la demande sans désaccord est **auto-approuvée**.
4. Un refus **ne ferme pas** la demande. On attend tous les votes.
5. Tous acceptent → le lien officiel est créé.
6. Tous refusent → demande `rejected`, pas de lien.
7. Mixte (des oui et au moins un non) → statut `contested`. Le lien officiel n’est pas créé et l’existant n’est pas écrasé. Procédure : chaque parti garde une appellation (« Père selon Amina »). L’autre parti dépose sa version sous son nom.

## Défunt

- `vitalStatus=deceased` : pas de téléphone, pas de login (`403`).
- Sa fiche peut être créée par un membre connecté, puis complétée par :
  - la personne qui a créé la fiche ;
  - un parent, un enfant, une sœur ou un frère (y compris demi-frères / demi-sœurs).
- Un cousin, un conjoint ou un inconnu ne modifie pas cette fiche.

## Conflits entre partis

- Impossible (reste un refus `409`) : auto-lien, mauvais genre, cycle parent/enfant, frère qui est déjà parent.
- Désaccord (deux pères, deux mères, demandes contraires) : pas de refus sec. La version du déclarant devient une **appellation de parti**. Le lien officiel déjà là reste. L’arbre affiche « Père selon … » sans remplacer le père officiel.

## Test familial (produit figé)

Ce n’est pas une app store. C’est un essai web, dans la même maison.

1. Neo4j démarré, API sur le PC (`npm run dev` dans `baobab-api`), site sur `http://localhost:5173`.
2. Chaque personne utilise **son** numéro. Le SMS n’est pas encore un opérateur : le code à 6 chiffres s’affiche dans le terminal de l’API. L’hôte le lit et l’envoie par WhatsApp.
3. Les téléphones doivent être sur le **même Wi-Fi** que le PC, sinon `localhost` n’existe que sur ce PC.
4. Premier inscrit crée l’arbre. Les suivants demandent un lien. Les membres déjà inscrits votent. Un seul non n’annule pas.
5. Un défunt est une fiche sans connexion, complétée par un parent, un enfant ou la fratrie.



## Cas limites

- Une personne ne peut pas se lier à elle-même.
- Un lien déjà existant ou une demande `pending` identique est refusée (409).
- Conflits impossibles (`409`) : `GENDER_MISMATCH`, `ANCESTRY_CYCLE`, `SIBLING_PARENT_CONFLICT`.
- Désaccords de partis (`contested` + appellation) : `DUPLICATE_FATHER`, `DUPLICATE_MOTHER`, `DUPLICATE_UNION`, `OPPOSITE_PENDING_REQUEST`, `CONTRADICTORY_PENDING`.
- `DELETE /persons/:id` supprime la personne et ses demandes associées.



## Sprint 2 — Auth, conflits, arbre enrichi

- JWT (`/auth/login`, `/auth/me`, `/auth/set-pin`)
- Détection de conflits sur demandes de liens (`409` + `conflicts[]`)
- Arbre familial avec `generation`, `roles`, `ui.group`, `meta.counts`



## Auth (renforcée)



### Session

1. OTP téléphone → si compte existant : JWT **access** + **refresh** (PIN si configuré).
2. Si nouveau : `phoneVerifiedToken` → `POST /persons` → `POST /auth/login`.
3. Access token court (`JWT_ACCESS_EXPIRES_IN`, défaut 2h) ; refresh long (`JWT_REFRESH_EXPIRES_IN`, 30j), hash stocké sur `Person`.
4. `POST /auth/refresh` renouvelle la paire ; `POST /auth/logout` révoque le refresh.
5. Écritures protégées : `PUT/DELETE /persons/:id` = soi uniquement ; relations / votes = soi ; admin = authentifié.



### PIN

- `POST /auth/set-pin` (JWT) première fois ; `POST /auth/change-pin` ensuite.
- Affiché / géré depuis la page **Moi**.



### Préparation « ajouter un proche » (prochaine feature)


| Cas           | Auth                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vivant invité | Créer `Person` (`vitalStatus=alive`, `accountStatus=invited`) + JWT `purpose=invite` (déjà prévu dans le middleware). L’invité ouvre le lien → OTP → **claim** du profil pré-rempli → `accountStatus=active`. |
| Décédé        | Pas de login. Fiche complétée par le créateur, un parent, un enfant ou la fratrie. Les désaccords deviennent des appellations de parti, pas un lien officiel écrasé. |


Champs réservés (pas modifiables via `PUT` profil self) : `phone`, `vitalStatus`, `accountStatus`, secrets auth.

## Priorité backend (suite)

1. Invites vivants (lien personnalisé + claim)
2. Contributions sur profils décédés (questions + multi-validation)
3. Tests e2e auth + refresh

