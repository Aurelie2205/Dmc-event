// ============================================================
// /core/copilot/hierarchie.js
// ------------------------------------------------------------
// Composant obligatoire n°4 de l'Architecture Core.
// Remplace le tri par nombres de priorité choisis à la main, qui
// reflétait la hiérarchie de la Constitution sans qu'aucune
// structure ne l'impose. Ici, le tri par tier prime TOUJOURS sur
// la priorité — une règle de tier 4 ne peut jamais apparaître
// au-dessus d'une règle de tier 1, 2 ou 3, quelle que soit sa
// priorité numérique.
// ============================================================

export const TIERS = {
  SECURITE: 1,
  BIEN_ETRE: 2,
  OBJECTIFS_DE_VIE: 3,
  OPTIMISATION: 4,
};

// Chaque règle doit déclarer `tier` — ce n'est pas optionnel.
// `priorite` ne sert qu'à départager deux règles du même tier.
export function trierParHierarchie(regles) {
  return [...regles].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (b.priorite ?? 0) - (a.priorite ?? 0);
  });
}
