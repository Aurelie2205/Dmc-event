// ============================================================
// /core/finance/projection.js
// ------------------------------------------------------------
// Construit une trajectoire de trésorerie sur plusieurs mois à
// partir de données réellement enregistrées — jamais un récit
// inventé. Contrairement au prototype initial (qui simulait des
// hausses et des baisses "pour raconter une histoire"), les creux
// et les reprises viennent ici exclusivement des vraies charges
// fixes trimestrielles/annuelles de l'utilisateur : si sa TVA
// tombe réellement en septembre, la courbe creuse en septembre —
// sinon, elle ne creuse pas.
// ============================================================

import { sommeDuMois } from './calculs.js';

// Moyenne des montants sur les N derniers mois qui ont une donnée
// non nulle. Sans aucun historique, repli honnête sur le mois en
// cours plutôt qu'une moyenne calculée sur du vide.
export function moyenneMensuelle(items, reference = new Date(), nombreMoisHistorique = 3) {
  const totaux = [];
  for (let i = 1; i <= nombreMoisHistorique; i++) {
    const moisRef = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    totaux.push(sommeDuMois(items, moisRef));
  }
  const totauxNonNuls = totaux.filter((t) => t > 0);
  if (totauxNonNuls.length === 0) return sommeDuMois(items, reference);
  return totauxNonNuls.reduce((a, b) => a + b, 0) / totauxNonNuls.length;
}

// Une charge fixe est-elle due dans ce mois précis ? Basé sur le mois
// calendaire de sa prochaine échéance réelle, pas une supposition.
export function chargeEstDueDansLeMois(charge, dateDuMois) {
  const prochaine = new Date(charge.prochaine);
  const moisCible = dateDuMois.getMonth();
  if (charge.frequence === 'mensuel') return true;
  if (charge.frequence === 'annuel') return prochaine.getMonth() === moisCible;
  if (charge.frequence === 'trimestriel') {
    const diff = (moisCible - prochaine.getMonth() + 12) % 12;
    return diff % 3 === 0;
  }
  return false;
}

// Trajectoire sur `nombreMois` (le mois en cours + les suivants).
// Mois 0 = solde réellement constaté aujourd'hui, jamais recalculé.
// Mois 1+ = projection à partir des moyennes réelles de revenus et
// de dépenses ponctuelles, plus les charges fixes réellement dues
// ce mois-là selon leur fréquence.
export function projeterTrajectoire({
  soldeActuel,
  revenusMois, // total réel des revenus du mois en cours
  depensesMois, // total réel des dépenses du mois en cours (ponctuelles + charges)
  revenus,
  ponctuelles,
  chargesFixes,
  nombreMois = 6,
  reference = new Date(),
}) {
  const revenusMoyens = moyenneMensuelle(revenus, reference);
  const ponctuellesMoyennes = moyenneMensuelle(ponctuelles, reference);

  const resultats = [];
  let solde = soldeActuel;

  for (let i = 0; i < nombreMois; i++) {
    const dateDuMois = new Date(reference.getFullYear(), reference.getMonth() + i, 1);

    if (i === 0) {
      resultats.push({
        date: dateDuMois,
        solde,
        revenus: revenusMois,
        depenses: depensesMois,
        actuel: true,
        chargesDuMois: chargesFixes.filter((c) => chargeEstDueDansLeMois(c, dateDuMois)),
      });
      continue;
    }

    const chargesDuMois = chargesFixes.filter((c) => chargeEstDueDansLeMois(c, dateDuMois));
    const totalCharges = chargesDuMois.reduce((total, c) => total + c.montant, 0);
    const depensesProjetees = ponctuellesMoyennes + totalCharges;
    solde = solde + revenusMoyens - depensesProjetees;

    resultats.push({
      date: dateDuMois,
      solde,
      revenus: revenusMoyens,
      depenses: depensesProjetees,
      actuel: false,
      chargesDuMois,
    });
  }

  return resultats;
}
