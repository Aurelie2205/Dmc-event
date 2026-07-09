// ============================================================
// /core/finance/objectifs.js
// ------------------------------------------------------------
// Toute la logique de calcul d'un objectif financier vit ici, une
// seule fois. NEXA en aura besoin dès qu'il sera reconnecté aux
// vraies données (sa règle "Objectifs" fera exactement le même
// calcul) — l'extraire maintenant évite de la dupliquer plus tard.
// ============================================================

import { equivalentMensuel, estimerDateDansNMois, moisEntreDates } from './calculs.js';

// Calcule tout ce qu'un écran a besoin d'afficher pour un objectif :
// reste à épargner, rythme mensuel équivalent, date estimée,
// progression, statut (atteint/dépassé/en retard), et l'écart par
// rapport à une date souhaitée le cas échéant.
export function calculerObjectif(objectif, reference = new Date()) {
  const reste = Math.max(objectif.cible - objectif.dejaDisponible, 0);
  const monthlyEquiv = equivalentMensuel(objectif.montant, objectif.frequence);
  const moisRestants = monthlyEquiv > 0 ? reste / monthlyEquiv : Infinity;
  const dateEstimee = isFinite(moisRestants) ? estimerDateDansNMois(moisRestants, reference) : null;

  const progressionBrute = objectif.cible > 0 ? objectif.dejaDisponible / objectif.cible : 0;
  const termine = progressionBrute >= 1;
  const depasse = objectif.dejaDisponible > objectif.cible;
  // Léger dépassement visuel autorisé (108%) sans casser la mise en page d'une barre de progression.
  const progression = Math.min(progressionBrute, 1.08);
  const enRetard = !termine && objectif.dateSouhaitee && reference > new Date(objectif.dateSouhaitee);

  let ecart = null;
  if (objectif.dateSouhaitee && !termine) {
    const moisDispo = moisEntreDates(new Date(objectif.dateSouhaitee), reference);
    const diffMois = Math.round(moisRestants - moisDispo);
    if (diffMois > 0) {
      const requisMensuel = moisDispo > 0 ? reste / moisDispo : reste;
      const complement = Math.max(Math.round((requisMensuel - monthlyEquiv) / 10) * 10, 0);
      ecart = { enAvance: false, mois: diffMois, complement };
    } else if (diffMois < 0) {
      ecart = { enAvance: true, mois: Math.abs(diffMois) };
    }
  }

  return { reste, monthlyEquiv, moisRestants, dateEstimee, progression, termine, depasse, enRetard, ecart };
}

// Niveau de priorité d'affichage : en retard d'abord (0), en cours
// ensuite (1, trié par proximité de l'objectif), terminés en dernier (2).
function tierDe(calc) {
  if (calc.termine) return 2;
  return calc.enRetard ? 0 : 1;
}

// Un seul objectif épinglé à la fois — épingler en désépingle
// automatiquement un autre, jamais deux en même temps.
export function basculerEpinglage(liste, id) {
  return liste.map((o) => ({ ...o, epingle: o.id === id ? !o.epingle : false }));
}

export function trierObjectifs(liste, reference = new Date()) {
  const epingle = liste.find((o) => o.epingle);
  const reste = liste
    .filter((o) => !o.epingle)
    .map((o) => ({ o, calc: calculerObjectif(o, reference) }));

  reste.sort((a, b) => {
    const ta = tierDe(a.calc);
    const tb = tierDe(b.calc);
    if (ta !== tb) return ta - tb;
    if (ta === 1) return b.calc.progression - a.calc.progression;
    return 0;
  });

  const triee = reste.map((x) => x.o);
  return epingle ? [epingle, ...triee] : triee;
}
