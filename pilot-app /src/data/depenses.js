// ============================================================
// /data/depenses.js
// ------------------------------------------------------------
// Même contrat que la version mémoire. Deux tables Supabase
// distinctes (depenses_ponctuelles, charges_fixes), toutes deux
// protégées par RLS.
// ============================================================

import { supabase, utilisateurCourant } from '../lib/supabaseClient';

function ligneVersPonctuelle(ligne) {
  return { id: ligne.id, montant: Number(ligne.montant), categorie: ligne.categorie, date: ligne.date };
}
function ligneVersChargeFixe(ligne) {
  return { id: ligne.id, nom: ligne.nom, montant: Number(ligne.montant), frequence: ligne.frequence, prochaine: ligne.prochaine };
}

export async function getPonctuelles() {
  const user = await utilisateurCourant();
  if (!user) return [];
  const { data, error } = await supabase
    .from('depenses_ponctuelles')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(ligneVersPonctuelle);
}

export async function ajouterPonctuelle(nouvelle) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible d'ajouter une dépense : aucun utilisateur connecté.");
  const { error } = await supabase.from('depenses_ponctuelles').insert({
    user_id: user.id,
    montant: nouvelle.montant,
    categorie: nouvelle.categorie,
    date: nouvelle.date,
  });
  if (error) throw error;
  return getPonctuelles();
}

export async function supprimerPonctuelle(id) {
  const user = await utilisateurCourant();
  if (!user) throw new Error('Impossible de supprimer cette dépense : aucun utilisateur connecté.');
  const { error } = await supabase.from('depenses_ponctuelles').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  return getPonctuelles();
}

export async function getChargesFixes() {
  const user = await utilisateurCourant();
  if (!user) return [];
  const { data, error } = await supabase
    .from('charges_fixes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(ligneVersChargeFixe);
}

export async function ajouterChargeFixe(nouvelle) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible d'ajouter une charge fixe : aucun utilisateur connecté.");
  const { error } = await supabase.from('charges_fixes').insert({
    user_id: user.id,
    nom: nouvelle.nom,
    montant: nouvelle.montant,
    frequence: nouvelle.frequence,
    prochaine: nouvelle.prochaine,
  });
  if (error) throw error;
  return getChargesFixes();
}

export async function desactiverChargeFixe(id) {
  const user = await utilisateurCourant();
  if (!user) throw new Error('Impossible de désactiver cette charge : aucun utilisateur connecté.');
  const { error } = await supabase.from('charges_fixes').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  return getChargesFixes();
}
