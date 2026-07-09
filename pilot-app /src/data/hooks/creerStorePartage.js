// ============================================================
// /src/data/hooks/creerStorePartage.js
// ------------------------------------------------------------
// Résout la cause racine des incohérences de synchronisation entre
// écrans : jusqu'ici, chaque appel à useDepenses()/useRevenus()/etc.
// créait sa PROPRE copie de l'état. Ajouter une charge fixe dans
// l'écran Dépenses ne mettait à jour que l'instance de cet écran —
// le Dashboard, la Trésorerie et NEXA gardaient leur ancienne copie
// jusqu'à ce qu'on y renavigue (ce qui remontait le composant).
//
// Ce store expose un état unique par domaine, partagé par toutes les
// instances. Une mutation notifie immédiatement TOUS les abonnés :
// la synchronisation devient instantanée sur tous les écrans montés,
// sans rechargement ni navigation.
//
// Volontairement minimal (pas de dépendance externe type Redux/Zustand) :
// un état, un jeu d'abonnés, une notification. useSyncExternalStore est
// l'API React officielle prévue exactement pour ça.
// ============================================================

import { useSyncExternalStore } from 'react';

// ------------------------------------------------------------
// Registre des stores — indispensable, pas décoratif.
//
// Un store vit au niveau du MODULE : il survit donc au démontage des
// écrans, et donc à une déconnexion. Sans remise à zéro, le compte
// suivant qui se connecte hériterait des données financières du
// précédent (le drapeau `chargee` restant à true, le rechargement
// serait purement et simplement sauté).
//
// Chaque store créé s'inscrit ici automatiquement. Impossible d'en
// oublier un en ajoutant un nouveau domaine plus tard.
// ------------------------------------------------------------
const registre = new Set();

export function reinitialiserTousLesStores() {
  registre.forEach((store) => store.reinitialiser());
}

export function creerStorePartage(etatInitial) {
  let etat = etatInitial;
  const abonnes = new Set();

  function getEtat() {
    return etat;
  }

  function definirEtat(maj) {
    // maj peut être une valeur ou une fonction (comme setState de React)
    etat = typeof maj === 'function' ? maj(etat) : maj;
    abonnes.forEach((cb) => cb());
  }

  function sAbonner(cb) {
    abonnes.add(cb);
    return () => abonnes.delete(cb);
  }

  function useStore() {
    return useSyncExternalStore(sAbonner, getEtat, getEtat);
  }

  // Revient à l'état initial exact (chargement: true, chargee: false),
  // ce qui force un vrai rechargement depuis Supabase à la prochaine
  // connexion, et notifie les écrans éventuellement encore montés.
  function reinitialiser() {
    definirEtat(etatInitial);
  }

  const store = { getEtat, definirEtat, sAbonner, useStore, reinitialiser };
  registre.add(store);
  return store;
}
