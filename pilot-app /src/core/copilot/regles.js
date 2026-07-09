// ============================================================
// /core/copilot/regles.js
// ------------------------------------------------------------
// Génère les cartes de conseil de NEXA à partir d'un contexte
// entièrement réel (voir la forme attendue dans `screens/Nexa.jsx`).
// Chaque règle déclare son `tier` (voir hierarchie.js) et passe par
// verifierGardeFou() avant d'être retenue — aucune carte n'atteint
// l'écran sans avoir traversé les deux.
// ============================================================

import { formatEUR } from '../finance/calculs.js';
import { margePrecaution } from '../finance/constantes.js';
import { TIERS, trierParHierarchie } from './hierarchie.js';
import { verifierGardeFou } from '../nexa/garde-fou.js';

export function genererConseils(ctx) {
  const brutes = [];

  // ------------------------------------------------------------
  // Tier SÉCURITÉ — données manquantes qui empêchent une vraie
  // évaluation. Toujours en tête : ne pas savoir est un risque en soi.
  // ------------------------------------------------------------
  if (ctx.solde == null) {
    brutes.push({
      id: 'solde-non-configure',
      categorie: 'Donnée manquante',
      tier: TIERS.SECURITE,
      priorite: 100,
      accentKey: 'neutre',
      message: "Je ne peux pas encore évaluer ta situation : le solde de ton compte société n'est pas renseigné. Ajoute-le dans Mon espace pour activer mes recommandations.",
      manquant: true,
    });
  } else if (ctx.chargesFixes.length === 0) {
    brutes.push({
      id: 'charges-non-configurees',
      categorie: 'Donnée manquante',
      tier: TIERS.SECURITE,
      priorite: 90,
      accentKey: 'neutre',
      message: "Je ne peux pas encore affiner mes conseils sur ta trésorerie long terme car aucune charge fixe n'est configurée. Ajoute-les dans Dépenses pour des recommandations plus précises.",
      manquant: true,
    });
  } else if (!ctx.identiteComplete) {
    brutes.push({
      id: 'identite-incomplete',
      categorie: 'Donnée manquante',
      tier: TIERS.SECURITE,
      priorite: 80,
      accentKey: 'neutre',
      message: "Il manque encore la forme juridique, le régime fiscal, le régime social ou la TVA dans Mon espace — les compléter améliore la précision de mes recommandations sur ton statut.",
      manquant: true,
    });
  } else if (ctx.reserveUrssaf > 0 && ctx.argentPrudent != null && ctx.argentPrudent < 0) {
    // Le disponible (après seuil de sécurité) ne couvre plus la
    // réserve URSSAF estimée — signalé avant tout conseil
    // d'optimisation, jamais après.
    brutes.push({
      id: 'reserve-urssaf-insuffisante',
      categorie: 'Vigilance',
      tier: TIERS.SECURITE,
      priorite: 95,
      accentKey: 'rouge',
      message: `Ton disponible ne couvre plus ta réserve URSSAF estimée (${formatEUR(ctx.reserveUrssaf)}, à ${ctx.tauxChargesSociales}% de tes revenus moyens). Je te déconseille un nouveau versement avant d'avoir reconstitué cette réserve.`,
      detail: {
        steps: [
          { label: 'Réserve URSSAF estimée', value: formatEUR(ctx.reserveUrssaf) },
          { label: 'Argent réellement prudent', value: formatEUR(ctx.argentPrudent) },
        ],
        conclusion: "Cette estimation dépend du taux renseigné dans Mon espace — à ajuster si ta situation réelle diffère.",
      },
    });
  }

  // ------------------------------------------------------------
  // Tier OBJECTIFS DE VIE
  // ------------------------------------------------------------
  const o = ctx.objectifPrioritaire;
  if (o) {
    const objectifCalculable = o.calc.monthlyEquiv > 0 && isFinite(o.calc.moisRestants) && !o.calc.termine;
    if (!objectifCalculable && !o.calc.termine) {
      brutes.push({
        id: 'objectif-non-configure',
        categorie: 'Donnée manquante',
        tier: TIERS.OBJECTIFS_DE_VIE,
        priorite: 70,
        accentKey: 'neutre',
        message: `Ton objectif "${o.nom}" n'a pas encore de rythme d'épargne exploitable — je ne peux pas estimer de date d'atteinte ni te faire de recommandation le concernant.`,
        manquant: true,
      });
    } else if (objectifCalculable) {
      const complement = 50; // palier d'illustration simple, affiché tel quel — pas une valeur cachée
      // Réutilise exactement calculerObjectif() — jamais un second calcul de mois restants.
      const moisAvecComplement = Math.round(o.calc.reste / (o.calc.monthlyEquiv + complement));
      const moisActuels = Math.round(o.calc.moisRestants);
      const gainMois = moisActuels - moisAvecComplement;
      if (gainMois >= 1) {
        brutes.push({
          id: 'objectifs',
          categorie: 'Objectifs',
          tier: TIERS.OBJECTIFS_DE_VIE,
          priorite: 60,
          accentKey: 'or',
          message: `En mettant ${formatEUR(complement)} supplémentaires de côté chaque mois, ton objectif "${o.nom}" serait atteint environ ${gainMois} mois plus tôt.`,
          detail: {
            steps: [
              { label: 'Épargne actuelle', value: `${formatEUR(o.calc.monthlyEquiv)} / mois équivalent` },
              { label: 'Mois restants au rythme actuel', value: `${moisActuels} mois` },
              { label: `Avec +${formatEUR(complement)}/mois`, value: `${moisAvecComplement} mois` },
            ],
            conclusion: `Gain estimé : ${gainMois} mois d'avance sur ton objectif "${o.nom}".`,
          },
        });
      }
    }
  }

  // ------------------------------------------------------------
  // Tier OPTIMISATION — bloqué par le garde-fou si la sécurité
  // n'est pas assurée, indépendamment de sa priorité d'affichage.
  // ------------------------------------------------------------
  if (ctx.solde != null && ctx.seuil != null) {
    const marge = ctx.solde - ctx.seuil;
    const precaution = margePrecaution(ctx.niveauPrudence);
    const reserve = ctx.reserveUrssaf || 0;
    const remunerationSuggeree = Math.max(Math.round((marge - precaution - reserve) / 50) * 50, 0);
    if (remunerationSuggeree >= 100) {
      brutes.push({
        id: 'optimisation',
        categorie: 'Optimisation',
        tier: TIERS.OPTIMISATION,
        priorite: 55,
        accentKey: 'vert',
        message: `Tu pourrais augmenter ta rémunération de ${formatEUR(remunerationSuggeree)}/mois tout en gardant ta trésorerie au-dessus de ton seuil de sécurité et ta réserve URSSAF estimée.`,
        detail: {
          steps: [
            { label: `Seuil de sécurité (${ctx.tresorerieSecuriteMois} mois)`, value: formatEUR(ctx.seuil) },
            { label: 'Marge actuelle au-dessus du seuil', value: formatEUR(marge) },
            { label: `Marge de précaution (${ctx.niveauPrudence})`, value: formatEUR(precaution) },
            { label: 'Réserve URSSAF estimée', value: formatEUR(reserve) },
          ],
          conclusion: `Il reste ${formatEUR(remunerationSuggeree)} que tu peux allouer à ta rémunération sans fragiliser ta trésorerie de sécurité ni ta réserve URSSAF.`,
        },
      });
    }
  }

  if (ctx.depensesVariablesMoyenne > 0) {
    const ecartPct = Math.round(((ctx.depensesVariablesMoyenne - ctx.depensesVariablesMoisCourant) / ctx.depensesVariablesMoyenne) * 100);
    if (ecartPct >= 5) {
      brutes.push({
        id: 'analyse',
        categorie: 'Analyse',
        tier: TIERS.OPTIMISATION,
        priorite: 50,
        accentKey: 'vert',
        message: `Tes dépenses variables sont inférieures de ${ecartPct}% à ta moyenne habituelle. Continue sur cette dynamique.`,
        detail: {
          steps: [
            { label: 'Moyenne habituelle', value: formatEUR(ctx.depensesVariablesMoyenne) },
            { label: 'Ce mois-ci', value: formatEUR(ctx.depensesVariablesMoisCourant) },
            { label: 'Écart', value: `− ${ecartPct}%` },
          ],
          conclusion: "Une baisse durable des dépenses variables renforce directement ta trésorerie de sécurité.",
        },
      });
    }
  }

  // ------------------------------------------------------------
  // Le garde-fou d'abord (peut éliminer une carte entièrement),
  // la hiérarchie ensuite (ordonne ce qui reste), la limite d'affichage
  // en dernier — jamais l'inverse.
  // ------------------------------------------------------------
  const valides = brutes.filter((c) => verifierGardeFou(c, { statutSecurite: ctx.statutSecurite }).valide);
  return trierParHierarchie(valides).slice(0, 3);
}
