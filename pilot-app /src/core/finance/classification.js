// ============================================================
// /core/finance/classification.js
// ------------------------------------------------------------
// Composant obligatoire n°1 de l'Architecture Core.
// Remplace les quatre implémentations divergentes trouvées dans
// les prototypes (Dashboard, Prévisions, Trésorerie de sécurité,
// NEXA) — chacune avait ses propres bornes et sa propre unité.
//
// Une seule unité d'entrée : les MOIS de trésorerie. Tout écran qui
// raisonne en euros ou en ratio doit convertir vers les mois avant
// d'appeler cette fonction — jamais réinventer ses propres seuils.
// ============================================================

export function classifierSante(moisDeTresorerie) {
  if (moisDeTresorerie >= 4) return 'ok';
  if (moisDeTresorerie >= 2) return 'prudence';
  return 'danger';
}

// Convertit un montant disponible (qui peut être négatif) en mois
// équivalents, pour les écrans qui ne raisonnent naturellement
// qu'en euros (Simulation, NEXA) — permet à ces écrans d'appeler
// classifierSante() sans dupliquer leur propre logique de seuils.
export function moisEquivalents(montantDisponibleBrut, depensesMensuellesMoyennes) {
  if (!depensesMensuellesMoyennes) return 0;
  return montantDisponibleBrut / depensesMensuellesMoyennes;
}

export const STATUT_COULEUR_KEY = {
  ok: 'green',
  prudence: 'orange',
  danger: 'red',
};
