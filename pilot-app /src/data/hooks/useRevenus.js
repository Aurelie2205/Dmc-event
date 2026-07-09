// ============================================================
// /data/hooks/useRevenus.js
// ------------------------------------------------------------
// Point d'entrée unique pour les revenus — Dashboard, Trésorerie,
// Prévisions, NEXA et Revenus lisent tous depuis ce même hook.
//
// État PARTAGÉ (creerStorePartage) : un revenu enregistré apparaît
// instantanément sur tous les écrans montés, sans renavigation.
// Contrat de retour identique à l'ancienne version.
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { getRevenus, ajouterRevenu, supprimerRevenu } from '../revenus';
import { creerStorePartage } from './creerStorePartage';

const store = creerStorePartage({ revenus: [], chargement: true, chargee: false });

async function chargerSiNecessaire() {
  if (store.getEtat().chargee) return;
  const r = await getRevenus();
  store.definirEtat((e) => ({ ...e, revenus: r, chargement: false, chargee: true }));
}

export function useRevenus() {
  const etat = store.useStore();
  const demarre = useRef(false);

  useEffect(() => {
    if (!demarre.current) {
      demarre.current = true;
      chargerSiNecessaire();
    }
  }, []);

  const ajouter = useCallback(async (nouveau) => {
    const suivants = await ajouterRevenu(nouveau);
    store.definirEtat((e) => ({ ...e, revenus: suivants }));
    return suivants;
  }, []);

  const supprimer = useCallback(async (id) => {
    const suivants = await supprimerRevenu(id);
    store.definirEtat((e) => ({ ...e, revenus: suivants }));
    return suivants;
  }, []);

  return { revenus: etat.revenus, chargement: etat.chargement, ajouter, supprimer };
}
