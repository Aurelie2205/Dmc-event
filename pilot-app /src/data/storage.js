// ============================================================
// /src/data/storage.js
// ------------------------------------------------------------
// Upload réel vers le bucket Supabase Storage `documents` (privé —
// voir Architecture Core, composant 7). On ne stocke jamais une URL
// permanente : seulement le CHEMIN du fichier dans la base, et une
// URL signée à durée limitée est régénérée à chaque lecture.
// ============================================================

import { supabase, utilisateurCourant } from '../lib/supabaseClient';

const BUCKET = 'documents';
const DUREE_SIGNATURE_SECONDES = 60 * 60 * 24 * 30; // 30 jours

export async function uploaderPhotoProfil(file) {
  const user = await utilisateurCourant();
  if (!user) throw new Error("Impossible d'envoyer la photo : aucun utilisateur connecté.");

  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  // Un seul chemin par utilisateur (upsert) — une nouvelle photo
  // remplace l'ancienne plutôt que d'en accumuler indéfiniment.
  const chemin = `${user.id}/photo-profil.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(chemin, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;
  return chemin;
}

// Ne bloque jamais l'écran : si la photo n'existe pas encore ou que
// la signature échoue, retourne simplement `null` (état honnête
// "pas de photo"), jamais une exception qui casserait Mon espace.
export async function urlSigneePhoto(chemin) {
  if (!chemin) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, DUREE_SIGNATURE_SECONDES);
  if (error) return null;
  return data.signedUrl;
}
