# Déploiement Baobab

## Essai familial — plusieurs jours

Le site reste en ligne même si le PC est éteint. Trois comptes gratuits :

1. **Neo4j Aura** (base) — https://neo4j.com/cloud/aura-free/
   - Créer une instance Free.
   - Copier l’URI (`neo4j+s://…`), l’utilisateur `neo4j` et le mot de passe. Il n’est affiché qu’une fois.
2. **Render** (API) — https://render.com
   - New → Blueprint, dépôt `baobab-api` (fichier `render.yaml`).
   - Renseigner `NEO4J_URI` et `NEO4J_PASSWORD`.
   - L’URL ressemble à `https://baobab-api.onrender.com`. Le premier appel après une pause peut prendre 30 secondes.
3. **Cloudflare Pages** (site) — https://pages.cloudflare.com
   - Projet `baobab-web`, commande `npm run build`, dossier `dist`.
   - Variables de build : `VITE_API_URL` = l’URL Render, `VITE_USE_MOCKS` = `false`.
   - Envoyer aux proches le lien Pages (`https://….pages.dev`).

`OTP_LOG=true` (déjà dans `render.yaml`) : le code à 6 chiffres s’affiche sur le téléphone, le temps de l’essai. Le passer à `false` ensuite.

Le code de cette branche doit être poussé sur GitHub avant que Render et Pages puissent le construire.

## Architecture V1

```
[Navigateur] → baobab-web (React static) → baobab-api (Express) → Neo4j
```

## Option A — Développement local (recommandé)

1. **Neo4j Desktop** : démarrer la base
2. **API** :
   ```powershell
   cd baobab-api
   npm install
   copy .env.example .env
   npm run dev
   ```
3. **Frontend** :
   ```powershell
   cd baobab-web
   npm install
   copy .env.example .env
   npm run dev
   ```
4. Ouvrir `http://localhost:5173`

## Option B — Docker (API + Neo4j)

```powershell
cd baobab-api
docker compose up -d
```

L'API sera sur `http://localhost:3000`. Neo4j Browser : `http://localhost:7474`.

> Le frontend reste lancé avec `npm run dev` ou build static (Option C).

## Option C — Frontend en production (build static)

```powershell
cd baobab-web
# .env : VITE_API_URL=https://votre-api.example.com
npm run build
```

Servir le dossier `dist/` avec nginx, Caddy, ou :

```powershell
npm run preview
```

### Exemple nginx (frontend)

```nginx
server {
  listen 80;
  root /var/www/baobab-web/dist;
  index index.html;
  location / { try_files $uri /index.html; }
}
```

## Variables d'environnement

### API (`baobab-api/.env`)
| Variable | Exemple |
|----------|---------|
| PORT | 3000 |
| NEO4J_URI | bolt://localhost:7687 |
| NEO4J_USER | neo4j |
| NEO4J_PASSWORD | *** |
| JWT_SECRET | long-random-string |
| JWT_EXPIRES_IN | 7d |

### Frontend (`baobab-web/.env`)
| Variable | Exemple |
|----------|---------|
| VITE_API_URL | http://localhost:3000 |

## Checklist avant mise en production

- [ ] Changer `JWT_SECRET` et mots de passe Neo4j
- [ ] HTTPS sur API et frontend
- [ ] CORS restreint au domaine frontend
- [ ] Sauvegardes Neo4j régulières
- [ ] `npm test` OK sur l'API

## État des sprints

| Sprint | Statut |
|--------|--------|
| 1 — API de base | ✅ Terminé |
| 2 — Auth, conflits, tests | ✅ Terminé |
| 3 — Notifications, export, front base | ✅ Terminé |
| 4 — Arbre graphique, rejoindre, polling, déploiement | ✅ Terminé |

**Backend : terminé pour V1.**  
**Frontend : V1 fonctionnelle — prête pour design/UX avancée.**
