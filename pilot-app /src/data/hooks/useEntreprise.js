// ============================================================
// /data/hooks/useEntreprise.js
// ------------------------------------------------------------
// Point d'entrée unique pour tout écran ayant besoin des données
// d'entreprise. Aucun écran ne doit importer /data/entreprise.js
// directement ni gérer son propre état local dupliqué.
//
// État PARTAGÉ (creerStorePartage) — dernier hook converti. Sept
// écrans appellent useEntreprise() ; chacun avait jusqu'ici SA
// propre copie de l'état. Modifier le taux de charges sociales dans
// Mon espace ne mettait donc pas à jour la carte "Réserve URSSAF"
// du Dashboard tant qu'on n'y renaviguait pas. Le contrat de retour
// est identique — aucun écran consommateur n'a été modifié.
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { getEntreprise, updateEntreprise, fusionnerProfond } from '../entreprise';
import { creerStorePartage } from './creerStorePartage';

const store = creerStorePartage({ entreprise: null, chargement: true, chargee: false });

async function chargerSiNecessaire() {
  if (store.getEtat().chargee) return;
  const e = await getEntreprise();
  store.definirEtat((s) => ({ ...s, entreprise: e, chargement: false, chargee: true }));
}

export function useEntreprise() {
  const etat = store.useStore();
  const demarre = useRef(false);

  useEffect(() => {
    if (!demarre.current) {
      demarre.current = true;
      chargerSiNecessaire();
    }
  }, []);

  // Mise à jour optimiste : l'écran reflète le changement immédiatement
  // (un switch doit réagir au doigt, pas après un aller-retour réseau),
  // la vraie écriture se fait en parallèle. En cas d'échec réel, on
  // resynchronise avec la donnée serveur plutôt que de laisser un état
  // optimiste faux affiché indéfiniment sans jamais le signaler.
  //
  // Le store étant partagé, TOUS les écrans montés voient la mise à
  // jour optimiste — et tous voient aussi la resynchronisation en cas
  // d'échec. Plus aucun écran ne peut afficher une valeur périmée.
  const mettreAJour = useCallback(async (patch) => {
    store.definirEtat((s) => ({
      ...s,
      entreprise: s.entreprise ? fusionnerProfond(s.entreprise, patch) : s.entreprise,
    }));
    try {
      const suivante = await updateEntreprise(patch);
      store.definirEtat((s) => ({ ...s, entreprise: suivante }));
      return suivante;
    } catch (err) {
      const reelle = await getEntreprise();
      store.definirEtat((s) => ({ ...s, entreprise: reelle }));
      throw err;
    }
  }, []);

  return { entreprise: etat.entreprise, chargement: etat.chargement, mettreAJour };
}
