# PILOT — V1

## Prérequis

- [Node.js](https://nodejs.org) version 18 ou supérieure installée sur ton ordinateur.

## Installation

Dans un terminal, à la racine de ce dossier :

```bash
npm install
```

## Lancer PILOT

```bash
npm run dev
```

Le terminal affiche une adresse (généralement `http://localhost:5173`) — ouvre-la dans ton navigateur. L'application se recharge automatiquement à chaque modification de code.

Sur ton téléphone : si ton ordinateur et ton téléphone sont sur le même réseau Wi-Fi, tu peux aussi accéder à PILOT depuis ton téléphone en utilisant l'adresse réseau que Vite affiche dans le terminal (relance avec `npm run dev -- --host` si elle n'apparaît pas).

## Ce que tu vas voir au premier lancement

Tout est honnêtement vide — c'est voulu. PILOT n'est plus une démonstration, donc :

1. Commence par **Mon espace** (accessible via le rond doré en haut à droite du Dashboard) pour renseigner ton nom, le nom de MÉLYSMÉE, et surtout le **solde de ton compte société** — sans lui, la plupart des écrans resteront en attente de configuration.
2. Ajoute quelques **Revenus** et **Dépenses** réels.
3. Reviens sur le **Dashboard** : tout se recalcule automatiquement à partir de ce que tu as saisi.

## Où vivent tes données

Tant que Supabase n'est pas branché, tes données sont stockées dans le `localStorage` de ton navigateur — réellement persistantes d'une session à l'autre sur le même appareil et le même navigateur, mais pas encore synchronisées entre appareils, et pas sauvegardées ailleurs. C'est la seule pièce qui changera quand on connectera Supabase : voir `/src/data/adapters/memoryAdapter.js`, dont le contrat (`get`/`set`) sera repris à l'identique par le futur adaptateur Supabase — aucun écran n'aura besoin d'être modifié à ce moment-là.

## Structure du projet

```
src/
  App.jsx              — assemble les écrans, navigation
  design-system.js     — la seule source de tokens visuels
  core/
    finance/            — calculs, classification, projections, objectifs
    copilot/             — moteur de conseils et de conversation de NEXA
    nexa/                 — garde-fou constitutionnel
  data/                 — lecture/écriture, une seule source de vérité
  screens/              — les 9 écrans de PILOT
```

## Build pour un vrai déploiement (plus tard)

```bash
npm run build
```

Génère un dossier `dist/` prêt à héberger (Netlify, Vercel, etc.) — utile quand tu voudras que PILOT soit accessible sans que ton ordinateur tourne.
