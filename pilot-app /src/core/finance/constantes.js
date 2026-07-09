// ============================================================
// /core/finance/constantes.js
// ------------------------------------------------------------
// Composant obligatoire n°2 de l'Architecture Core.
// Valeurs de configuration par défaut — jamais les données réelles
// de l'utilisateur (qui vivent dans /data), seulement les réglages
// qui donnent un point de départ avant que l'utilisateur ne les
// personnalise dans Mon espace.
// ============================================================

// Utilisé tant que l'utilisateur n'a pas renseigné son propre
// objectif dans Mon espace > Préférences NEXA.
export const TRESORERIE_MOIS_PAR_DEFAUT = 6;

// Marge de précaution que NEXA conserve avant de suggérer une
// optimisation (ex: augmenter la rémunération), selon le niveau
// de prudence choisi dans Mon espace. Remplace le chiffre "2000"
// qui était figé en dur dans le prototype NEXA.
export const MARGE_PRECAUTION_PAR_NIVEAU = {
  prudent: 3000,
  equilibre: 2000,
  ambitieux: 1000,
};

export function margePrecaution(niveauPrudence) {
  return MARGE_PRECAUTION_PAR_NIVEAU[niveauPrudence] ?? MARGE_PRECAUTION_PAR_NIVEAU.equilibre;
}
