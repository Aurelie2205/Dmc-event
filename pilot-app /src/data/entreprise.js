// ============================================================
// /data/entreprise.js
// ------------------------------------------------------------
// Même contrat qu'avant (getEntreprise / updateEntreprise) — c'est
// exactement la promesse de l'Architecture Core : aucun écran n'a
// besoin de changer parce que la persistance change. Seule cette
// implémentation change : elle parle maintenant à la table Supabase
// `profils_entreprise`, protégée par RLS (chacun ne voit que sa
// propre ligne, garantie côté serveur, pas seulement côté code).
// ============================================================

import { supabase, utilisateurCourant } from '../lib/supabaseClient';
import { TRESORERIE_MOIS_PAR_DEFAUT } from '../core/finance/constantes';

// Structure par défaut — honnêtement vide tant qu'aucune ligne
// n'existe encore pour cet utilisateur (première connexion).
const ENTREPRISE_PAR_DEFAUT = {
  identite: {
    nomComplet: '',
    email: '',
    entrepriseNom: '',
    siren: '',
    formeJuridique: '',
    regimeFiscal: '',
    regimeSocial: '',
    activitePrincipale: '',
    tva: '',
    dateCloture: '',
    codeApe: '',
  },
  preferences: {
    niveauPrudence: 'equilibre',
    tresorerieSecuriteMois: TRESORERIE_MOIS_PAR_DEFAUT,
    consentementMemoire: false,
    notifications: true,
    soldeInitial: null,
    soldeInitialDate: null,
    // Estimation ajustable, jamais un taux officiel figé — les vraies
    // charges sociales TNS dépendent du statut exact, des seuils de
    // revenus, d'une éventuelle ACRE, etc. 45% est un point de départ
    // usuel pour un TNS en activité de service, à corriger par
    // l'utilisatrice si son taux réel diffère.
    tauxChargesSociales: 45,
  },
  photoUrl: null,
};

function fusionnerProfond(base, patch) {
  const resultat = { ...base };
  for (const cle of Object.keys(patch)) {
    const valeur = patch[cle];
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      resultat[cle] = fusionnerProfond(base[cle] || {}, valeur);
    } else {
      resultat[cle] = valeur;
    }
  }
  return resultat;
}

// Ligne Supabase (colonnes plates, snake_case) → forme utilisée par
// l'app (imbriquée, camelCase). Cette traduction vit ici, une seule
// fois — aucun écran ne doit connaître le nom des colonnes SQL.
function ligneVersEntreprise(ligne) {
  if (!ligne) return ENTREPRISE_PAR_DEFAUT;
  return {
    identite: {
      nomComplet: ligne.nom_complet || '',
      email: ligne.email || '',
      entrepriseNom: ligne.entreprise_nom || '',
      siren: ligne.siren || '',
      formeJuridique: ligne.forme_juridique || '',
      regimeFiscal: ligne.regime_fiscal || '',
      regimeSocial: ligne.regime_social || '',
      activitePrincipale: ligne.activite_principale || '',
      tva: ligne.tva || '',
      dateCloture: ligne.date_cloture || '',
      codeApe: ligne.code_ape || '',
    },
    preferences: {
      niveauPrudence: ligne.niveau_prudence,
      tresorerieSecuriteMois: ligne.tresorerie_securite_mois,
      consentementMemoire: ligne.consentement_memoire,
      notifications: ligne.notifications,
      soldeInitial: ligne.solde_initial,
      soldeInitialDate: ligne.solde_initial_date,
      tauxChargesSociales: ligne.taux_charges_sociales ?? 45,
    },
    photoUrl: ligne.photo_url,
  };
}

function entrepriseVersLigne(entreprise, userId) {
  return {
    user_id: userId,
    nom_complet: entreprise.identite.nomComplet || null,
    email: entreprise.identite.email || null,
    entreprise_nom: entreprise.identite.entrepriseNom || null,
    siren: entreprise.identite.siren || null,
    forme_juridique: entreprise.identite.formeJuridique || null,
    regime_fiscal: entreprise.identite.regimeFiscal || null,
    regime_social: entreprise.identite.regimeSocial || null,
    activite_principale: entreprise.identite.activitePrincipale || null,
    tva: entreprise.identite.tva || null,
    date_cloture: entreprise.identite.dateCloture || null,
    code_ape: entreprise.identite.codeApe || null,
    niveau_prudence: entreprise.preferences.niveauPrudence,
    tresorerie_securite_mois: entreprise.preferences.tresorerieSecuriteMois,
    consentement_memoire: entreprise.preferences.consentementMemoire,
    notifications: entreprise.preferences.notifications,
    solde_initial: entreprise.preferences.soldeInitial,
    solde_initial_date: entreprise.preferences.soldeInitialDate,
    taux_charges_sociales: entreprise.preferences.tauxChargesSociales,
    photo_url: entreprise.photoUrl,
    updated_at: new Date().toISOString(),
  };
}

export async function getEntreprise() {
  const user = await utilisateurCourant();
  if (!user) return ENTREPRISE_PAR_DEFAUT; // pas connecté = rien à lire, jamais une erreur bruyante ici

  const { data, error } = await supabase
    .from('profils_entreprise')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return ligneVersEntreprise(data);
}

export async function updateEntreprise(patch) {
  const user = await utilisateurCourant();
  if (!user) throw new Error('Impossible de mettre à jour Mon espace : aucun utilisateur connecté.');

  const actuelle = await getEntreprise();
  const suivante = fusionnerProfond(actuelle, patch);
  const ligne = entrepriseVersLigne(suivante, user.id);

  // upsert sur user_id : crée la ligne si c'est la première fois,
  // la met à jour sinon — jamais besoin de savoir laquelle des deux
  // situations on est en train de traiter.
  const { error } = await supabase
    .from('profils_entreprise')
    .upsert(ligne, { onConflict: 'user_id' });

  if (error) throw error;
  return suivante;
}

export { ENTREPRISE_PAR_DEFAUT, fusionnerProfond };
