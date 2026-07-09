// ============================================================
// /data/hooks/useObjectifs.js
// ------------------------------------------------------------
// État PARTAGÉ (creerStorePartage) : un objectif ajouté, supprimé ou
// épinglé se reflète instantanément partout (NEXA lit le même state
// pour son objectif prioritaire). Contrat de retour inchangé.
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { getObjectifs, ajouterObjectif, supprimerObjectif, remplacerObjectifs } from '../objectifs';
import { basculerEpinglage } from '../../core/finance/objectifs';
import { creerStorePartage } from './creerStorePartage';

const store = creerStorePartage({ objectifs: [], chargement: true, chargee: false });

async function chargerSiNecessaire() {
  if (store.getEtat().chargee) return;
  const o = await getObjectifs();
  store.definirEtat((e) => ({ ...e, objectifs: o, chargement: false, chargee: true }));
}

export function useObjectifs() {
  const etat = store.useStore();
  const demarre = useRef(false);

  useEffect(() => {
    if (!demarre.current) {
      demarre.current = true;
      chargerSiNecessaire();
    }
  }, []);

  const ajouter = useCallback(async (nouveau) => {
    const suivants = await ajouterObjectif(nouveau);
    store.definirEtat((e) => ({ ...e, objectifs: suivants }));
    return suivants;
  }, []);

  const supprimer = useCallback(async (id) => {
    const suivants = await supprimerObjectif(id);
    store.definirEtat((e) => ({ ...e, objectifs: suivants }));
    return suivants;
  }, []);

  const togglePin = useCallback(async (id) => {
    const actuels = store.getEtat().objectifs;
    const suivants = basculerEpinglage(actuels, id);
    await remplacerObjectifs(suivants);
    store.definirEtat((e) => ({ ...e, objectifs: suivants }));
    return suivants;
  }, []);

  return { objectifs: etat.objectifs, chargement: etat.chargement, ajouter, supprimer, togglePin };
}
