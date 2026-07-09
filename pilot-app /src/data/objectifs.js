// ============================================================
// /data/objectifs.js
// ------------------------------------------------------------
// Même contrat que la version mémoire. La règle "un seul objectif
// épinglé à la fois" reste dans /core/finance/objectifs.js
// (basculerEpinglage) — ce fichier ne fait que persister le
// résultat, jamais la logique elle-même.
// ============================================================

import { supabase, utilisateurCourant } from '../lib/supabaseClient';

function ligneVersObjectif(ligne) {
  return {
    id: ligne.id,
    type: ligne.type,
    nom: ligne.nom,
    cible: Number(ligne.cible),
    dejaDisponible: Number(ligne.deja_disponible),
    frequence: ligne.frequence,
    montant: Number(ligne.montant),
    dateSouhaitee: ligne.date_souhaitee,
    epingle: ligne.epingle,
  };
}

export async function getObjectifs() {
  const user = await utilisateurCourant();
  if (!user) return [];
  const { data, error } = await supabase
    .from('objectifs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(ligneVersObjectif);
}

export async function ajouterObjectif(nouveau) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible d'ajouter un objectif : aucun utilisateur connecté.");
  const { error } = await supabase.from('objectifs').insert({
    user_id: user.id,
    type: nouveau.type,
    nom: nouveau.nom,
    cible: nouveau.cible,
    deja_disponible: nouveau.dejaDisponible,
    frequence: nouveau.frequence,
    montant: nouveau.montant,
    date_souhaitee: nouveau.dateSouhaitee,
    epingle: false,
  });
  if (error) throw error;
  return getObjectifs();
}

export async function supprimerObjectif(id) {
  const user = await utilisateurCourant();
  if (!user) throw new Error('Impossible de supprimer cet objectif : aucun utilisateur connecté.');
  const { error } = await supabase.from('objectifs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  return getObjectifs();
}

// Persiste le résultat de basculerEpinglage() — ne réécrit que le
// champ `epingle` de chaque ligne concernée, jamais la table entière.
export async function remplacerObjectifs(liste) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible de mettre à jour l'épinglage : aucun utilisateur connecté.");

  await Promise.all(
    liste.map((o) =>
      supabase.from('objectifs').update({ epingle: o.epingle }).eq('id', o.id).eq('user_id', user.id)
    )
  );
  return getObjectifs();
}
