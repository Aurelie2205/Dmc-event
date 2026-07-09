// ============================================================
// tests/conversation.test.js
// ------------------------------------------------------------
// C'est ici que vivait le bug "Infinity mois" réellement affiché
// à l'utilisatrice. Ces tests balaient TOUTES les intentions
// croisées avec TOUTES les configurations de données incomplètes.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { repondre, interpreteMotsCles, INTENTS } from '../src/core/copilot/conversation.js';
import { TIERS } from '../src/core/copilot/hierarchie.js';
import { calculerObjectif } from '../src/core/finance/objectifs.js';

// Toutes les configurations de données possibles, y compris les
// combinaisons "impossibles" — un utilisateur trouvera toujours
// le moyen de les produire.
function avecCalc(o) {
  return { ...o, calc: calculerObjectif(o, new Date(2026, 6, 9)) };
}

function tousLesContextes() {
  const ctxs = [];
  for (const solde of [null, 0, 21653]) {
    for (const dep of [0, 1200, 12000]) {
      for (const statutSecurite of ['ok', 'prudence', 'danger', null]) {
        // Trois formes réelles : aucun objectif, un objectif alimenté,
        // et un objectif SANS contribution (moisRestants = Infinity).
        const objectifs = [
          null,
          avecCalc({ id: '1', nom: 'Voiture', cible: 10000, dejaDisponible: 2000, montant: 300, frequence: 'mensuel' }),
          avecCalc({ id: '2', nom: 'Bureau', cible: 5000, dejaDisponible: 0, montant: 0, frequence: 'mensuel' }),
        ];
        for (const objectifPrioritaire of objectifs) {
          const seuil = dep > 0 ? 6 * dep : null;
          ctxs.push({
            solde,
            seuil,
            tresorerieSecuriteMois: 6,
            niveauPrudence: 'equilibre',
            statutSecurite,
            depensesMensuellesMoyennes: dep,
            depensesVariablesMoisCourant: 0,
            depensesVariablesMoyenne: 0,
            chargesFixes: [],
            revenusMois: 4079,
            objectifPrioritaire,
            reserveUrssaf: 1800,
            argentPrudent: solde != null && seuil != null ? solde - seuil - 1800 : null,
            tauxChargesSociales: 45,
            identiteComplete: true,
          });
        }
      }
    }
  }
  return ctxs;
}

// Une question par intention, formulée comme le ferait un humain.
const QUESTIONS = [
  'Est-ce que je peux augmenter ma rémunération ?',
  "Combien je peux mobiliser ce mois-ci ?",
  'Est-ce que ma trésorerie est suffisante ?',
  'Puis-je acheter ma voiture ?',
  'Que se passe-t-il si mes revenus baissent ?',
  'Comment améliorer ma situation ?',
  'Comment je me situe par rapport à mon secteur ?',
  'Quelle est la couleur du ciel ?',
];

const CONTEXTES = tousLesContextes();

describe('repondre() — invariants sur toutes les questions × tous les contextes', () => {
  test(`aucun Infinity / NaN / undefined affiché (${QUESTIONS.length} questions × ${CONTEXTES.length} contextes)`, () => {
    for (const q of QUESTIONS) {
      for (const ctx of CONTEXTES) {
        const r = repondre(q, ctx);
        assert.ok(r && typeof r.texte === 'string', `réponse vide pour "${q}"`);
        assert.doesNotMatch(r.texte, /Infinity|NaN|undefined/,
          `BUG : "${r.texte}" (question="${q}", solde=${ctx.solde}, dep=${ctx.depensesMensuellesMoyennes})`);
        for (const s of r.detail?.steps ?? []) {
          assert.doesNotMatch(String(s.value), /Infinity|NaN|undefined/,
            `étape fautive "${s.label}" = "${s.value}" pour "${q}"`);
        }
      }
    }
  });

  test('ne recommande jamais une optimisation quand la sécurité n’est pas assurée', () => {
    for (const q of QUESTIONS) {
      for (const ctx of CONTEXTES.filter((c) => c.statutSecurite && c.statutSecurite !== 'ok')) {
        const r = repondre(q, ctx);
        assert.notEqual(r.tier, TIERS.OPTIMISATION,
          `optimisation renvoyée alors que statut=${ctx.statutSecurite} — question="${q}"`);
      }
    }
  });

  test('sans solde, NEXA avoue la donnée manquante au lieu de deviner', () => {
    const sansSolde = CONTEXTES.filter((c) => c.solde === null);
    for (const ctx of sansSolde) {
      const r = repondre('Est-ce que je peux augmenter ma rémunération ?', ctx);
      assert.match(r.texte, /solde|Mon espace|manque/i, `réponse inattendue : ${r.texte}`);
    }
  });

  test('BUG RÉEL : solde connu mais AUCUNE dépense → jamais "Infinity mois"', () => {
    const ctx = CONTEXTES.find((c) => c.solde === 21653 && c.depensesMensuellesMoyennes === 0);
    assert.ok(ctx);
    const r = repondre('Est-ce que ma trésorerie est suffisante ?', ctx);
    assert.doesNotMatch(r.texte, /Infinity/);
    assert.match(r.texte, /dépense|charge|manque/i,
      `NEXA devrait dire qu'il manque les dépenses, or : "${r.texte}"`);
  });
});

describe('interpreteMotsCles', () => {
  test('une question hors sujet retombe sur INCONNU plutôt que d’inventer', () => {
    const r = interpreteMotsCles('Quelle est la couleur du ciel ?');
    assert.equal(r.intent, INTENTS.INCONNU);
  });

  test('reconnaît une demande de rémunération', () => {
    const r = interpreteMotsCles('Je peux augmenter ma rémunération ?');
    assert.equal(r.intent, INTENTS.AUGMENTER_REMUNERATION);
  });
});
