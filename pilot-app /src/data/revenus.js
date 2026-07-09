// ============================================================
// /data/revenus.js
// ------------------------------------------------------------
// Même contrat que la version mémoire (getRevenus / ajouterRevenu /
// supprimerRevenu), désormais adossé à la table Supabase `revenus`,
// protégée par RLS — chacun ne lit et n'écrit que ses propres lignes.
// ============================================================

import { supabase, utilisateurCourant } from '../lib/supabaseClient';

function ligneVersRevenu(ligne) {
  return {
    id: ligne.id,
    montant: Number(ligne.montant),
    categorie: ligne.categorie,
    date: ligne.date,
  };
}

export async function getRevenus() {
  const user = await utilisateurCourant();
  if (!user) return [];

  const { data, error } = await supabase
    .from('revenus')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(ligneVersRevenu);
}

export async function ajouterRevenu(nouveau) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible d'ajouter un revenu : aucun utilisateur connecté.");

  const { error } = await supabase.from('revenus').insert({
    user_id: user.id,
    montant: nouveau.montant,
    categorie: nouveau.categorie,
    date: nouveau.date,
  });

  if (error) throw error;
  return getRevenus();
}

export async function supprimerRevenu(id) {
  const user = await utilisateurCourant();
  if (!user) throw new Error('Impossible de supprimer ce revenu : aucun utilisateur connecté.');

  const { error } = await supabase.from('revenus').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  return getRevenus();
}
