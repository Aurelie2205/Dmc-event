// ============================================================
// /core/nexa/garde-fou.js
// ------------------------------------------------------------
// Composant obligatoire n°3 de l'Architecture Core.
// TOUTE sortie visible de NEXA — carte de conseil ou réponse de
// conversation — doit passer par verifierGardeFou() avant d'être
// affichée. Aucune exception, aucun contournement.
//
// Honnêteté sur ce qui est réellement vérifié aujourd'hui :
// les six questions de la Constitution (III.3) ne sont pas toutes
// vérifiables par du code de la même façon. Ce module vérifie
// STRUCTURELLEMENT ce qui peut l'être ; le reste reste une
// discipline de conception documentée, pas encore une garantie
// automatique — dire le contraire serait exactement le genre
// d'excès de confiance que ce garde-fou existe pour éviter.
// ============================================================

import { TIERS } from '../copilot/hierarchie.js';

export function verifierGardeFou(reponseProposee, contexte = {}) {
  // 1. Fondée sur des données vérifiables ?
  // 5. Explique toujours son raisonnement ?
  // → Vérifiables ensemble : une sortie doit soit expliquer son calcul
  //   (detail.steps), soit admettre explicitement qu'il lui manque une
  //   donnée (manquant: true). Une sortie qui ne fait ni l'un ni l'autre
  //   est un jugement sans preuve — refusée, quel que soit son contenu.
  const expliqueSonRaisonnement =
    reponseProposee.manquant === true ||
    (Array.isArray(reponseProposee.detail?.steps) && reponseProposee.detail.steps.length > 0);
  if (!expliqueSonRaisonnement) {
    return { valide: false, raisonRefus: "Aucune trace de calcul ni aveu explicite de donnée manquante — ne peut pas être affichée telle quelle." };
  }

  // 2. Protège l'entreprise avant tout ?
  // → Vérifiable structurellement : une suggestion de tier OPTIMISATION
  //   ne peut jamais être affichée si la sécurité réelle n'est pas 'ok'.
  //   Ce n'est pas une question de priorité d'affichage (ça, c'est le
  //   rôle de trierParHierarchie) — une carte bloquée ici ne s'affiche
  //   JAMAIS, même en dernière position.
  if (reponseProposee.tier === TIERS.OPTIMISATION && contexte.statutSecurite && contexte.statutSecurite !== 'ok') {
    return { valide: false, raisonRefus: "Une recommandation d'optimisation ne peut pas être affichée tant que la sécurité de trésorerie n'est pas assurée." };
  }

  // 3. Protège le dirigeant (bien-être) ?
  // 4. Respecte les objectifs de vie définis ?
  // 6. Évite toute influence ou manipulation ?
  // → Non vérifiables automatiquement aujourd'hui : aucune donnée de
  //   bien-être n'existe encore dans /data (le Profil de vie doit se
  //   construire par la conversation, pas un formulaire — voir
  //   Constitution IV), et la détection de manipulation reste une
  //   discipline de revue de code, pas un test exécutable. On ne les
  //   simule pas ici pour "cocher la case" — on les laisse passer,
  //   honnêtement documentées comme non automatisées.

  return { valide: true, raisonRefus: null };
}
