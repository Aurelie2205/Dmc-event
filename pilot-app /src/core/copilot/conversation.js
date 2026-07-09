// ============================================================
// /core/copilot/conversation.js
// ------------------------------------------------------------
// Architecture en deux étages, inchangée dans son principe depuis
// la Constitution : interpreteMotsCles() fait de la reconnaissance
// par mots-clés (remplaçable demain par un moteur sémantique, puis
// un LLM contraint), genererReponse() ne change pas — c'est elle
// qui garantit qu'aucune réponse n'est donnée sans donnée réelle
// derrière, et qui fait maintenant passer chaque réponse par le
// garde-fou avant de la rendre publique.
// ============================================================

import { formatEUR } from '../finance/calculs.js';
import { margePrecaution } from '../finance/constantes.js';
import { TIERS } from './hierarchie.js';
import { verifierGardeFou } from '../nexa/garde-fou.js';
import { genererConseils } from './regles.js';

export const INTENTS = {
  AUGMENTER_REMUNERATION: 'AUGMENTER_REMUNERATION',
  ACHETER_OBJECTIF: 'ACHETER_OBJECTIF',
  SIMULATION_BAISSE_REVENUS: 'SIMULATION_BAISSE_REVENUS',
  MONTANT_DISPONIBLE: 'MONTANT_DISPONIBLE',
  TRESORERIE_SUFFISANTE: 'TRESORERIE_SUFFISANTE',
  AMELIORER_SITUATION: 'AMELIORER_SITUATION',
  COMPARAISON_SECTEUR: 'COMPARAISON_SECTEUR',
  INCONNU: 'INCONNU',
};

export function interpreteMotsCles(question) {
  const q = question.toLowerCase();
  if ((q.includes('augmenter') && q.includes('salaire')) || q.includes('rémunération')) return { intent: INTENTS.AUGMENTER_REMUNERATION };
  if (q.includes('acheter') || q.includes('voiture')) return { intent: INTENTS.ACHETER_OBJECTIF };
  if (q.includes('baissent') || (q.includes('revenus') && q.includes('baiss'))) return { intent: INTENTS.SIMULATION_BAISSE_REVENUS, params: { pourcentage: 20 } };
  if (q.includes('investir')) return { intent: INTENTS.MONTANT_DISPONIBLE };
  if (q.includes('trésorerie') && q.includes('suffis')) return { intent: INTENTS.TRESORERIE_SUFFISANTE };
  if (q.includes('améliorer') || q.includes('situation financière')) return { intent: INTENTS.AMELIORER_SITUATION };
  if (q.includes('secteur') || q.includes('autres entrepreneurs') || q.includes('comparé')) return { intent: INTENTS.COMPARAISON_SECTEUR };
  return { intent: INTENTS.INCONNU };
}

function donneesManquantes(intent, ctx) {
  if (intent === INTENTS.COMPARAISON_SECTEUR) return "des données de comparaison sectorielle (non disponibles en V1)";
  if (intent === INTENTS.ACHETER_OBJECTIF && !ctx.objectifPrioritaire) return "un objectif défini dans Objectifs";
  if ((intent === INTENTS.AUGMENTER_REMUNERATION || intent === INTENTS.MONTANT_DISPONIBLE || intent === INTENTS.TRESORERIE_SUFFISANTE) && ctx.solde == null) {
    return "le solde de ton compte société (à renseigner dans Mon espace)";
  }
  if ((intent === INTENTS.AUGMENTER_REMUNERATION || intent === INTENTS.MONTANT_DISPONIBLE) && ctx.seuil == null) {
    return "au moins une dépense ou une charge fixe enregistrée (pour calculer ton seuil de sécurité)";
  }
  if (intent === INTENTS.TRESORERIE_SUFFISANTE && !(ctx.depensesMensuellesMoyennes > 0)) {
    return "au moins une dépense ou une charge fixe enregistrée (pour calculer ta couverture en mois)";
  }
  return null;
}

// Construit la réponse — chaque cas fixe un `tier` qui reflète la
// NATURE de la réponse (un refus protecteur reste tier SÉCURITÉ même
// si la question portait sur l'optimisation), pas seulement son thème.
// C'est ce qui permet au garde-fou de bloquer une suggestion
// d'optimisation sans jamais bloquer un refus prudent.
function construireReponse(intentResult, ctx) {
  const { intent, params } = intentResult;

  switch (intent) {
    case INTENTS.AUGMENTER_REMUNERATION: {
      const marge = ctx.solde - ctx.seuil;
      const precaution = margePrecaution(ctx.niveauPrudence);
      const reserve = ctx.reserveUrssaf || 0;
      const suggestion = Math.max(Math.round((marge - precaution - reserve) / 50) * 50, 0);
      if (suggestion <= 0) {
        const causeReserve = marge > precaution && reserve > 0;
        return {
          tier: TIERS.SECURITE,
          texte: causeReserve
            ? `Pas pour le moment. Ta marge au-dessus du seuil de sécurité existe, mais elle est absorbée par ta réserve URSSAF estimée (${formatEUR(reserve)}, à ${ctx.tauxChargesSociales}% de tes revenus moyens). Mieux vaut la préserver avant d'augmenter ta rémunération.`
            : `Pas pour le moment. Ta trésorerie (${formatEUR(ctx.solde)}) est actuellement sous ton seuil de sécurité calculé (${formatEUR(ctx.seuil)}, soit ${ctx.tresorerieSecuriteMois} mois de dépenses). Mieux vaut la laisser se reconstituer avant d'augmenter ta rémunération.`,
          detail: { steps: [{ label: 'Solde actuel', value: formatEUR(ctx.solde) }, { label: 'Seuil de sécurité', value: formatEUR(ctx.seuil) }, { label: 'Réserve URSSAF estimée', value: formatEUR(reserve) }] },
        };
      }
      return {
        tier: TIERS.OPTIMISATION,
        texte: `Oui, tu as une marge d'environ ${formatEUR(suggestion)}/mois au-dessus de ton seuil de sécurité et de ta réserve URSSAF estimée (${formatEUR(reserve)}). Tu peux augmenter ta rémunération de ce montant tout en gardant ces deux coussins intacts.`,
        detail: { steps: [{ label: 'Marge au-dessus du seuil', value: formatEUR(marge) }, { label: 'Marge de précaution', value: formatEUR(precaution) }, { label: 'Réserve URSSAF estimée', value: formatEUR(reserve) }] },
      };
    }

    case INTENTS.ACHETER_OBJECTIF: {
      const o = ctx.objectifPrioritaire;
      const moisBruts = o?.calc?.moisRestants;

      // Sans contribution mensuelle, moisRestants vaut Infinity — et
      // Math.round(Infinity) vaut encore Infinity. C'est ainsi que NEXA
      // a réellement affiché "environ Infinity mois". On ne devine pas
      // une échéance : on dit qu'on ne peut pas la calculer.
      if (!Number.isFinite(moisBruts)) {
        return {
          tier: TIERS.SECURITE,
          manquant: true,
          texte: `Il te reste ${formatEUR(o?.calc?.reste ?? 0)} à épargner sur ton objectif "${o?.nom ?? ''}". Comme aucune contribution régulière n'est définie, je ne peux pas estimer quand tu l'atteindras — ajoute un montant d'épargne dans Objectifs.`,
        };
      }

      const moisRestants = Math.round(moisBruts);
      return {
        tier: TIERS.SECURITE,
        texte: `Il te reste ${formatEUR(o.calc.reste)} à épargner sur ton objectif "${o.nom}" (${formatEUR(o.cible)} au total). Au rythme actuel, tu l'atteindras dans environ ${moisRestants} mois. Tu pourrais l'acheter maintenant en puisant dans ta trésorerie, mais cela ferait probablement passer ta trésorerie de sécurité sous ton seuil recommandé — je te le déconseille avant d'avoir atteint l'objectif.`,
        detail: { steps: [{ label: 'Reste à épargner', value: formatEUR(o.calc.reste) }, { label: 'Mois restants au rythme actuel', value: `${moisRestants} mois` }] },
      };
    }

    case INTENTS.SIMULATION_BAISSE_REVENUS: {
      const perte = Math.round(ctx.revenusMois * (params.pourcentage / 100));
      return {
        tier: TIERS.SECURITE,
        texte: `Une baisse de ${params.pourcentage}% de tes revenus représenterait environ ${formatEUR(perte)}/mois en moins. Regarde l'écran Prévisions pour voir précisément comment ta trajectoire de trésorerie en serait affectée sur plusieurs mois.`,
        detail: { steps: [{ label: 'Revenus de ce mois', value: formatEUR(ctx.revenusMois) }, { label: 'Perte simulée', value: `− ${formatEUR(perte)}` }] },
      };
    }

    case INTENTS.MONTANT_DISPONIBLE: {
      const reserve = ctx.reserveUrssaf || 0;
      const disponible = Math.max(ctx.solde - ctx.seuil - reserve, 0);
      if (disponible <= 0) {
        return {
          tier: TIERS.SECURITE,
          texte: `Rien pour le moment — une fois ton seuil de sécurité (${formatEUR(ctx.seuil)}) et ta réserve URSSAF estimée (${formatEUR(reserve)}) mis de côté, il ne reste pas de marge prudente. Utilise Simulation pour tester un montant précis et voir l'effet exact.`,
          detail: { steps: [{ label: 'Solde actuel', value: formatEUR(ctx.solde) }, { label: 'Seuil de sécurité', value: formatEUR(ctx.seuil) }, { label: 'Réserve URSSAF estimée', value: formatEUR(reserve) }] },
        };
      }
      return {
        tier: TIERS.OPTIMISATION,
        texte: `En te basant sur ta trésorerie actuelle, tu peux mobiliser environ ${formatEUR(disponible)} sans descendre sous ton seuil de sécurité ni entamer ta réserve URSSAF estimée (${formatEUR(reserve)}). Utilise Simulation pour tester un montant précis.`,
        detail: { steps: [{ label: 'Solde actuel', value: formatEUR(ctx.solde) }, { label: 'Réserve URSSAF estimée', value: formatEUR(reserve) }, { label: 'Disponible prudent', value: formatEUR(disponible) }] },
      };
    }

    case INTENTS.TRESORERIE_SUFFISANTE: {
      const mois = ctx.solde / ctx.depensesMensuellesMoyennes;
      return {
        tier: TIERS.SECURITE,
        texte: `Ta trésorerie couvre environ ${mois.toFixed(1).replace('.', ',')} mois de dépenses — ${mois >= ctx.tresorerieSecuriteMois ? "au-dessus" : "en dessous"} de ton objectif de ${ctx.tresorerieSecuriteMois} mois.`,
        detail: { steps: [{ label: 'Mois de trésorerie', value: `${mois.toFixed(1).replace('.', ',')} mois` }, { label: 'Objectif configuré', value: `${ctx.tresorerieSecuriteMois} mois` }] },
      };
    }

    case INTENTS.AMELIORER_SITUATION: {
      const cartes = genererConseils(ctx);
      if (cartes.length === 0) {
        return {
          tier: TIERS.SECURITE,
          manquant: true,
          texte: "Je n'ai pas encore assez de données pour te proposer un plan d'amélioration concret. Complète Mon espace, Revenus et Dépenses pour que je puisse analyser ta situation.",
        };
      }
      return {
        tier: TIERS.SECURITE,
        texte: cartes.map((c) => c.message).join(' '),
        detail: { steps: cartes.map((c) => ({ label: c.categorie, value: c.id })) },
      };
    }

    default:
      return {
        tier: TIERS.SECURITE,
        manquant: true,
        texte: "Je ne peux pas encore répondre précisément à cette question — pose-moi plutôt quelque chose sur ta trésorerie, tes objectifs, ta rémunération ou tes revenus.",
      };
  }
}

export function genererReponse(intentResult, ctx) {
  const manquant = donneesManquantes(intentResult.intent, ctx);
  if (manquant) {
    return { texte: `Je ne peux pas encore répondre à cette question car il me manque ${manquant}.` };
  }

  const proposee = construireReponse(intentResult, ctx);
  const verdict = verifierGardeFou(proposee, { statutSecurite: ctx.statutSecurite });
  if (!verdict.valide) {
    return { texte: "Je préfère ne pas répondre à cette question maintenant — cela risquerait de fragiliser ta sécurité financière." };
  }
  return { texte: proposee.texte };
}

export function repondre(question, ctx) {
  const intentResult = interpreteMotsCles(question);
  return genererReponse(intentResult, ctx);
}

export const suggestions = [
  'Est-ce que je peux augmenter mon salaire ?',
  'Puis-je acheter cette voiture ?',
  'Que se passe-t-il si mes revenus baissent de 20% ?',
  'Combien puis-je investir ce mois-ci ?',
  'Est-ce que ma trésorerie est suffisante ?',
  'Comment améliorer ma situation financière ?',
];
