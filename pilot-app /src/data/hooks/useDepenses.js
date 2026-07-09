// ============================================================
// /data/hooks/useDepenses.js
// ------------------------------------------------------------
// Point d'entrée unique pour toute donnée de dépense — Dashboard,
// Trésorerie de sécurité, Prévisions, NEXA et Dépenses lisent tous
// depuis ce même hook.
//
// L'état est maintenant PARTAGÉ (creerStorePartage) : une charge fixe
// ajoutée dans l'écran Dépenses apparaît instantanément partout, sans
// renavigation. Le contrat de retour est identique à l'ancienne
// version — aucun écran consommateur n'a eu besoin d'être modifié.
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import {
  getPonctuelles, ajouterPonctuelle, supprimerPonctuelle,
  getChargesFixes, ajouterChargeFixe, desactiverChargeFixe,
} from '../depenses';
import { creerStorePartage } from './creerStorePartage';

const store = creerStorePartage({ ponctuelles: [], chargesFixes: [], chargement: true, chargee: false });

async function chargerSiNecessaire() {
  if (store.getEtat().chargee) return;
  const [p, c] = await Promise.all([getPonctuelles(), getChargesFixes()]);
  store.definirEtat((e) => ({ ...e, ponctuelles: p, chargesFixes: c, chargement: false, chargee: true }));
}

export function useDepenses() {
  const etat = store.useStore();
  const demarre = useRef(false);

  useEffect(() => {
    if (!demarre.current) {
      demarre.current = true;
      chargerSiNecessaire();
    }
  }, []);

  const ajouterUnePonctuelle = useCallback(async (nouvelle) => {
    const suivantes = await ajouterPonctuelle(nouvelle);
    store.definirEtat((e) => ({ ...e, ponctuelles: suivantes }));
    return suivantes;
  }, []);

  const supprimerUnePonctuelle = useCallback(async (id) => {
    const suivantes = await supprimerPonctuelle(id);
    store.definirEtat((e) => ({ ...e, ponctuelles: suivantes }));
    return suivantes;
  }, []);

  const ajouterUneChargeFixe = useCallback(async (nouvelle) => {
    const suivantes = await ajouterChargeFixe(nouvelle);
    store.definirEtat((e) => ({ ...e, chargesFixes: suivantes }));
    return suivantes;
  }, []);

  const desactiverUneChargeFixe = useCallback(async (id) => {
    const suivantes = await desactiverChargeFixe(id);
    store.definirEtat((e) => ({ ...e, chargesFixes: suivantes }));
    return suivantes;
  }, []);

  return {
    ponctuelles: etat.ponctuelles,
    chargesFixes: etat.chargesFixes,
    chargement: etat.chargement,
    ajouterUnePonctuelle,
    supprimerUnePonctuelle,
    ajouterUneChargeFixe,
    desactiverUneChargeFixe,
  };
}
