# Formation Builder — WOOSBY

Mini app privée pour créer des formations en ligne avec l'aide de l'IA (Claude).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Supabase** — Auth email/password + PostgreSQL + Storage
- **Anthropic** — Claude Haiku pour l'assistant pédagogique
- **Netlify** — déploiement auto depuis GitHub

---

## Setup (première installation)

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit)
2. Dans **SQL Editor**, copier-coller le contenu de `supabase/schema.sql` et exécuter
3. Dans **Storage**, créer un bucket `knowledge-base` (Private)
4. Récupérer dans **Settings > API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Dans **Authentication > Users**, créer votre compte manuellement

### 2. Anthropic

1. Récupérer votre clé API sur [console.anthropic.com](https://console.anthropic.com)
2. La copier dans `.env.local` → `ANTHROPIC_API_KEY`

### 3. Variables d'environnement

Copier `.env.local` et remplir les valeurs :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Lancer en local

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Déploiement Netlify

1. Pusher ce dossier sur un repo GitHub
2. Sur [netlify.com](https://netlify.com), **New site from Git**
3. Sélectionner le repo → Netlify détecte automatiquement Next.js
4. Dans **Site settings > Environment variables**, ajouter les 3 variables de `.env.local`
5. Déclencher un deploy → URL publique disponible

---

## Structure

```
app/
  login/          → Page de connexion
  formations/     → Dashboard + liste des formations
  formations/[id] → Éditeur formation (tabs: Plan / Modules / Ressources / IA)
  formations/[id]/modules/[moduleId]/courses/[courseId]
                  → Éditeur de cours + texte prompteur

api/
  ai/chat/        → Chat Claude avec contexte formation
  knowledge-base/ → Upload PDF + extraction texte

lib/
  supabase/       → Clients browser et server
  types.ts        → Types TypeScript
  utils.ts        → cn(), estimateDuration()

supabase/
  schema.sql      → Tables + RLS + triggers
```

---

## Fonctionnalités

- Login / logout sécurisé (Supabase Auth)
- Création et gestion de formations (titre, objectifs, public cible, statut)
- Modules et cours organisés et ordonnés
- **Éditeur de cours avec texte prompteur** : calcul automatique de la durée (130 mots/min), mode lecture plein écran
- **Sauvegarde automatique** du cours (debounce 1.5s)
- Ressources partagées par formation (liens, textes)
- **Base de connaissances IA** : texte libre ou PDF uploadé (texte extrait automatiquement)
- **Chat Claude** contextualisé par formation : connaît le plan, les modules, les cours et la base de connaissances
- Bouton "Générer avec IA" dans l'éditeur de cours
