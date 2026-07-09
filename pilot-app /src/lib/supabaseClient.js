// ============================================================
// /src/lib/supabaseClient.js
// ------------------------------------------------------------
// Le seul endroit du code où le client Supabase est créé. Toute la
// couche /data l'importe d'ici — jamais une seconde instance créée
// ailleurs avec des clés recopiées.
//
// La clé utilisée ici (VITE_SUPABASE_PUBLISHABLE_KEY, l'ancienne
// "anon public") est conçue pour vivre côté client : ce n'est pas
// elle qui protège les données, c'est le RLS activé sur chaque
// table côté Supabase. La clé "secret" (service_role) ne doit
// JAMAIS apparaître dans ce projet, ni ici ni ailleurs.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes. Vérifie que .env.local existe et contient VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    // Explicite plutôt qu'implicite : la session survit à la fermeture
    // de l'app (stockée dans le localStorage du navigateur/PWA), et le
    // jeton se renouvelle automatiquement en arrière-plan — c'est ce
    // qui permet de rester connectée sur iPhone sans se reconnecter
    // à chaque ouverture, jusqu'à une déconnexion volontaire.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Petit utilitaire partagé : la plupart des fonctions /data ont
// besoin de l'utilisateur courant avant toute lecture/écriture.
// Centralisé ici pour ne pas répéter cet appel dans chaque fichier.
//
// Supabase ne renvoie pas simplement `null` quand personne n'est
// connecté : getUser() rejette avec AuthSessionMissingError. Ce
// n'est pas une vraie erreur applicative — c'est l'état normal et
// honnête "personne n'est connecté", donc on le traite comme tel
// plutôt que de laisser planter tout écran qui en dépend.
export async function utilisateurCourant() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (err) {
    if (err?.name === 'AuthSessionMissingError' || err?.message?.includes('Auth session missing')) {
      return null;
    }
    throw err;
  }
}
