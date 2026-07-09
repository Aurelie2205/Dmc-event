// ============================================================
// tests/nexa.test.js
// ------------------------------------------------------------
// Protège les INVARIANTS de NEXA — les propriétés qui doivent
// rester vraies quelles que soient les données d'entrée. C'est
// plus solide que de figer des messages exacts, qui changeront.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { classifierSante } from '../src/core/finance/classification.js';
import { moyenneMensuelle } from '../src/core/finance/projection.js';
import { calculerObjectif } from '../src/core/finance/objectifs.js';
import { verifierGardeFou } from '../src/core/nexa/garde-fou.js';
import { TIERS } from '../src/core/copilot/hierarchie.js';
import { genererConseils } from '../src/core/copilot/regles.js';

// ------------------------------------------------------------
describe('classifierSante — les seuils ne doivent jamais dériver', () => {
  test('frontières exactes', () => {
    assert.equal(classifierSante(4), 'ok');
    assert.equal(classifierSante(3.99), 'prudence');
    assert.equal(classifierSante(2), 'prudence');
    assert.equal(classifierSante(1.99), 'danger');
    assert.equal(classifierSante(0), 'danger');
  });
});

// ------------------------------------------------------------
describe('moyenneMensuelle', () => {
  const ref = new Date(2026, 6, 15); // 15 juillet 2026

  test('moyenne les mois précédents non nuls, pas le mois en cours', () => {
    const items = [
      { montant: 1000, date: '2026-06-10' },
      { montant: 2000, date: '2026-05-10' },
      { montant: 9999, date: '2026-07-02' }, // mois en cours : ignoré
    ];
    assert.equal(moyenneMensuelle(items, ref), 1500); // (1000+2000)/2
  });

  test('sans historique, retombe sur le mois en cours plutôt que de renvoyer 0', () => {
    const items = [{ montant: 800, date: '2026-07-02' }];
    assert.equal(moyenneMensuelle(items, ref), 800);
  });

  test('aucune donnée → 0, jamais NaN', () => {
    assert.equal(moyenneMensuelle([], ref), 0);
  });
});

// ------------------------------------------------------------
describe('calculerObjectif — BUG RÉEL : division par zéro', () => {
  test('sans capacité d’épargne, moisRestants ne doit pas contaminer l’affichage', () => {
    const o = calculerObjectif(
      { id: '1', nom: 'Voiture', montantCible: 10000, dejaDisponible: 0, contribution: 0, frequence: 'mensuel' },
      new Date(2026, 6, 9),
    );
    // Le résultat peut valoir Infinity — c'est acceptable EN INTERNE,
    // à condition que l'écran teste isFinite avant d'afficher.
    // Ce qui est interdit, c'est NaN : il se propage silencieusement.
    assert.ok(!Number.isNaN(o.moisRestants), 'moisRestants ne doit jamais être NaN');
  });

  test('objectif atteint → progression bornée à 1', () => {
    const o = calculerObjectif(
      { id: '1', nom: 'Voiture', montantCible: 10000, dejaDisponible: 12000, contribution: 500, frequence: 'mensuel' },
      new Date(2026, 6, 9),
    );
    assert.ok(o.progression <= 1, `progression = ${o.progression}`);
  });
});

// ------------------------------------------------------------
describe('verifierGardeFou — la règle qui protège l’entreprise', () => {
  const avecPreuve = { tier: TIERS.OPTIMISATION, detail: { steps: [{ label: 'a', value: 'b' }] } };

  test('bloque toute optimisation quand la sécurité n’est pas assurée', () => {
    for (const statut of ['prudence', 'danger']) {
      const r = verifierGardeFou(avecPreuve, { statutSecurite: statut });
      assert.equal(r.valide, false, `statut ${statut} devrait bloquer l'optimisation`);
    }
  });

  test('laisse passer l’optimisation quand la sécurité est ok', () => {
    assert.equal(verifierGardeFou(avecPreuve, { statutSecurite: 'ok' }).valide, true);
  });

  test('refuse une affirmation sans trace de calcul ni aveu de donnée manquante', () => {
    const sansPreuve = { tier: TIERS.SECURITE, message: 'Tout va bien.' };
    assert.equal(verifierGardeFou(sansPreuve, { statutSecurite: 'ok' }).valide, false);
  });

  test('accepte un aveu explicite de donnée manquante', () => {
    const aveu = { tier: TIERS.SECURITE, manquant: true };
    assert.equal(verifierGardeFou(aveu, { statutSecurite: 'danger' }).valide, true);
  });
});

// ------------------------------------------------------------
// Le test le plus important : NEXA ne doit JAMAIS produire un
// nombre non fini, quelles que soient les données. C'est le bug
// "Infinity mois" qui a réellement été affiché à l'utilisatrice.
// ------------------------------------------------------------
describe('genererConseils — invariants sur toutes les combinaisons', () => {
  const combinaisons = [];
  for (const solde of [null, 0, 21653]) {
    for (const depensesMensuellesMoyennes of [0, 1200, 12000]) {
      for (const chargesFixes of [[], [{ id: '1', nom: 'Apple', montant: 30, frequence: 'mensuel', actif: true }]]) {
        for (const statutSecurite of ['ok', 'prudence', 'danger', null]) {
          for (const reserveUrssaf of [0, 1800]) {
            combinaisons.push({
              solde,
              seuil: depensesMensuellesMoyennes > 0 ? 6 * depensesMensuellesMoyennes : null,
              tresorerieSecuriteMois: 6,
              niveauPrudence: 'equilibre',
              statutSecurite,
              depensesMensuellesMoyennes,
              depensesVariablesMoisCourant: 0,
              depensesVariablesMoyenne: 0,
              chargesFixes,
              revenusMois: 4079,
              objectifPrioritaire: null,
              reserveUrssaf,
              argentPrudent: solde != null && depensesMensuellesMoyennes > 0
                ? solde - 6 * depensesMensuellesMoyennes - reserveUrssaf
                : null,
              tauxChargesSociales: 45,
              identiteComplete: true,
            });
          }
        }
      }
    }
  }

  test(`aucun "Infinity" ni "NaN" dans les messages (${combinaisons.length} combinaisons)`, () => {
    for (const ctx of combinaisons) {
      const conseils = genererConseils(ctx);
      for (const c of conseils) {
        assert.doesNotMatch(String(c.message), /Infinity|NaN|undefined|null/,
          `message fautif pour solde=${ctx.solde} dep=${ctx.depensesMensuellesMoyennes} : ${c.message}`);
        for (const s of c.detail?.steps ?? []) {
          assert.doesNotMatch(String(s.value), /Infinity|NaN|undefined/,
            `étape fautive : ${s.label} = ${s.value}`);
        }
      }
    }
  });

  test('ne propose jamais une optimisation quand la sécurité n’est pas ok', () => {
    for (const ctx of combinaisons.filter((c) => c.statutSecurite && c.statutSecurite !== 'ok')) {
      const conseils = genererConseils(ctx);
      const optims = conseils.filter((c) => c.tier === TIERS.OPTIMISATION);
      assert.equal(optims.length, 0,
        `optimisation affichée alors que statut=${ctx.statutSecurite}`);
    }
  });

  test('chaque conseil explique son calcul ou avoue la donnée manquante', () => {
    for (const ctx of combinaisons) {
      for (const c of genererConseils(ctx)) {
        const explique = c.manquant === true || (Array.isArray(c.detail?.steps) && c.detail.steps.length > 0);
        assert.ok(explique, `conseil sans preuve : ${c.id}`);
      }
    }
  });

  test('alerte bien quand la réserve URSSAF n’est plus couverte', () => {
    const ctx = combinaisons.find((c) => c.reserveUrssaf > 0 && c.argentPrudent != null && c.argentPrudent < 0);
    assert.ok(ctx, 'le jeu de combinaisons doit contenir ce cas');
    const ids = genererConseils(ctx).map((c) => c.id);
    assert.ok(ids.includes('reserve-urssaf-insuffisante') || ids.includes('solde-non-configure') || ids.includes('charges-non-configurees'),
      `aucune alerte pertinente : ${ids.join(', ')}`);
  });
});
