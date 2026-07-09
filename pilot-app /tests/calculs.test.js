// ============================================================
// tests/calculs.test.js
// ------------------------------------------------------------
// Lancement : `npm test` (aucune dépendance à installer — Node 18+
// embarque son propre lanceur de tests).
//
// PRINCIPE : chaque test ci-dessous correspond à un bug RÉELLEMENT
// survenu en production, pas à un cas théorique. Un test qui ne
// protège de rien est un test qui ment sur la couverture.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  equivalentMensuel,
  calculerSeuilSecurite,
  calculerDisponibleBrut,
  calculerSoldeActuel,
  calculerReserveUrssaf,
  calculerArgentPrudent,
  dateISOLocale,
  joursDansLeMois,
  prochaineEcheanceMensuelle,
  formatEcheance,
  nettoyerSaisieMontant,
  montantSaisiVersNombre,
  formatMontantSaisi,
  sommeDuMois,
  formatEUR,
} from '../src/core/finance/calculs.js';

// ------------------------------------------------------------
describe('equivalentMensuel', () => {
  test('convertit chaque fréquence', () => {
    assert.equal(equivalentMensuel(120, 'mensuel'), 120);
    assert.equal(equivalentMensuel(300, 'trimestriel'), 100);
    assert.equal(equivalentMensuel(1200, 'annuel'), 100);
    assert.ok(Math.abs(equivalentMensuel(100, 'hebdo') - 433.33) < 0.01);
  });

  test('refuse bruyamment une fréquence inconnue plutôt que de renvoyer une valeur fausse', () => {
    assert.throws(() => equivalentMensuel(100, 'bimensuel'), /Fréquence inconnue/);
  });
});

// ------------------------------------------------------------
describe('calculerSoldeActuel', () => {
  const revenus = [
    { montant: 4000, date: '2026-07-05' },
    { montant: 1000, date: '2026-06-01' }, // avant le point de départ
  ];
  const depenses = [{ montant: 500, date: '2026-07-06' }];

  test('retourne null tant que le point de départ n’est pas défini (jamais un solde inventé)', () => {
    assert.equal(calculerSoldeActuel({ soldeInitial: null, soldeInitialDate: '2026-07-01', revenus, depensesPonctuelles: depenses }), null);
    assert.equal(calculerSoldeActuel({ soldeInitial: 1000, soldeInitialDate: null, revenus, depensesPonctuelles: depenses }), null);
  });

  test('ignore tout mouvement antérieur au point de départ', () => {
    const solde = calculerSoldeActuel({ soldeInitial: 10000, soldeInitialDate: '2026-07-01', revenus, depensesPonctuelles: depenses });
    assert.equal(solde, 13500); // 10000 + 4000 - 500 ; les 1000 de juin sont exclus
  });

  test('un solde de 0 est une vraie donnée, pas une absence de donnée', () => {
    const solde = calculerSoldeActuel({ soldeInitial: 0, soldeInitialDate: '2026-07-01', revenus: [], depensesPonctuelles: [] });
    assert.equal(solde, 0);
    assert.notEqual(solde, null);
  });
});

// ------------------------------------------------------------
describe('calculerSeuilSecurite', () => {
  // Ce test a été ajouté après qu'une mutation volontaire
  // (`return 42`) soit passée inaperçue : la fonction n'était
  // couverte par AUCUN test malgré son rôle central.
  test('seuil = mois d’objectif × dépenses mensuelles moyennes', () => {
    assert.equal(calculerSeuilSecurite(6, 1200), 7200);
    assert.equal(calculerSeuilSecurite(3, 2000), 6000);
  });

  test('sans dépenses, le seuil vaut 0 — jamais une valeur inventée', () => {
    assert.equal(calculerSeuilSecurite(6, 0), 0);
  });
});

// ------------------------------------------------------------
describe('calculerDisponibleBrut', () => {
  test('peut être négatif — une donnée honnête ne se masque pas', () => {
    assert.equal(calculerDisponibleBrut({ solde: 1000, seuilSecurite: 3000 }), -2000);
  });

  test('déduit aussi les échéances à venir quand elles sont fournies', () => {
    assert.equal(calculerDisponibleBrut({ solde: 10000, echeancesAVenir: 500, seuilSecurite: 7200 }), 2300);
  });
});

// ------------------------------------------------------------
describe('Réserve URSSAF', () => {
  test('applique le taux saisi par l’utilisatrice', () => {
    assert.equal(calculerReserveUrssaf(4000, 45), 1800);
  });

  test('ne divise jamais par zéro et ne devine jamais un taux', () => {
    assert.equal(calculerReserveUrssaf(0, 45), 0);
    assert.equal(calculerReserveUrssaf(4000, 0), 0);
    assert.equal(calculerReserveUrssaf(4000, null), 0);
    assert.equal(calculerReserveUrssaf(null, 45), 0);
  });

  test('argentPrudent reste null si le disponible est inconnu (BUG RÉEL : affichait "0 €")', () => {
    // Le Dashboard affichait un faux "0 €" pour une valeur en réalité
    // INCONNUE. Pour un outil financier, c’est le pire des mensonges.
    assert.equal(calculerArgentPrudent(null, 1800), null);
  });

  test('argentPrudent peut être négatif : la réserve dépasse le disponible', () => {
    assert.equal(calculerArgentPrudent(1000, 1800), -800);
  });
});

// ------------------------------------------------------------
describe('dateISOLocale — BUG RÉEL : toISOString() renvoyait la veille', () => {
  test('les tests tournent bien en Europe/Paris', () => {
    // SANS CE GARDE-FOU, LES TESTS SUIVANTS SONT AVEUGLES.
    // Ce conteneur — comme Netlify — tourne en UTC par défaut. En UTC,
    // toISOString() donne le même résultat que dateISOLocale() : le bug
    // devient indétectable et le test passe au vert en mentant.
    // Le script `npm test` force donc TZ=Europe/Paris.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    assert.equal(tz, 'Europe/Paris', `Lancer les tests avec TZ=Europe/Paris (actuellement : ${tz})`);
  });

  test('à 00h30 heure de Paris, renvoie AUJOURD’HUI et non hier', () => {
    const minuitTrente = new Date(2026, 6, 9, 0, 30); // 9 juillet 2026, 00h30 à Paris
    assert.equal(dateISOLocale(minuitTrente), '2026-07-09');
  });

  test('et surtout : diffère bien de toISOString() dans ce cas précis', () => {
    // C’est CE test qui attrape la régression. Si quelqu’un réécrit
    // dateISOLocale avec toISOString(), il vire au rouge immédiatement.
    const minuitTrente = new Date(2026, 6, 9, 0, 30);
    assert.equal(minuitTrente.toISOString().slice(0, 10), '2026-07-08'); // UTC : la veille
    assert.notEqual(dateISOLocale(minuitTrente), minuitTrente.toISOString().slice(0, 10));
  });

  test('remplit correctement les zéros', () => {
    assert.equal(dateISOLocale(new Date(2026, 0, 5)), '2026-01-05');
  });
});

// ------------------------------------------------------------
describe('Échéances des charges fixes', () => {
  const le9juillet = new Date(2026, 6, 9);

  test('joursDansLeMois gère février et les années bissextiles', () => {
    assert.equal(joursDansLeMois(2026, 1), 28); // février 2026
    assert.equal(joursDansLeMois(2024, 1), 29); // février 2024, bissextile
    assert.equal(joursDansLeMois(2026, 3), 30); // avril
  });

  test('un jour déjà passé ce mois-ci bascule au mois suivant', () => {
    const d = prochaineEcheanceMensuelle(5, false, le9juillet); // Assurance le 5
    assert.equal(dateISOLocale(d), '2026-08-05');
  });

  test('un jour encore à venir reste ce mois-ci', () => {
    const d = prochaineEcheanceMensuelle(15, false, le9juillet); // Numbr le 15
    assert.equal(dateISOLocale(d), '2026-07-15');
  });

  test('"déjà prélevée ce mois" force le mois suivant', () => {
    const d = prochaineEcheanceMensuelle(15, true, le9juillet);
    assert.equal(dateISOLocale(d), '2026-08-15');
  });

  test('un 31 ne déborde jamais sur le mois suivant', () => {
    const finJanvier = new Date(2026, 0, 31);
    const d = prochaineEcheanceMensuelle(31, true, finJanvier);
    assert.equal(dateISOLocale(d), '2026-02-28'); // et non le 3 mars
  });

  test('formatEcheance dit "aujourd’hui" et "demain"', () => {
    assert.equal(formatEcheance(new Date(2026, 6, 9), le9juillet), "aujourd'hui");
    assert.equal(formatEcheance(new Date(2026, 6, 10), le9juillet), 'demain');
    assert.match(formatEcheance(new Date(2026, 7, 5), le9juillet), /^le 5 août$/);
  });
});

// ------------------------------------------------------------
describe('Saisie d’un montant au clavier français — BUG RÉEL : impossible de taper 12,50', () => {
  test('la virgule survit pendant la frappe', () => {
    let v = '';
    for (const c of '12,50') v = nettoyerSaisieMontant(v + c);
    assert.equal(v, '12,50');
    assert.equal(montantSaisiVersNombre(v), 12.5);
  });

  test('un "12," en cours de frappe n’est pas avalé', () => {
    assert.equal(nettoyerSaisieMontant('12,'), '12,');
    assert.equal(formatMontantSaisi('12,'), '12,');
  });

  test('le point est accepté comme virgule', () => {
    assert.equal(nettoyerSaisieMontant('12.50'), '12,50');
  });

  test('une seule virgule, deux décimales maximum', () => {
    assert.equal(nettoyerSaisieMontant('12,,5'), '12,5');
    assert.equal(nettoyerSaisieMontant('12,509'), '12,50');
  });

  test('les caractères parasites sont filtrés', () => {
    assert.equal(nettoyerSaisieMontant('abc12x,5y'), '12,5');
  });

  test('la partie entière est bornée', () => {
    assert.equal(nettoyerSaisieMontant('123456789012', 8), '12345678');
  });

  test('ne produit JAMAIS de NaN — un NaN contamine tout le calcul du solde', () => {
    for (const x of [null, undefined, '', ',', 'abc', '..']) {
      const n = montantSaisiVersNombre(x);
      assert.ok(Number.isFinite(n), `montantSaisiVersNombre(${JSON.stringify(x)}) = ${n}`);
      assert.equal(n, 0);
    }
  });

  test('formatMontantSaisi sépare les milliers à la française', () => {
    assert.equal(formatMontantSaisi('4079'), '4\u202F079');
    assert.equal(formatMontantSaisi('1234567'), '1\u202F234\u202F567');
  });
});

// ------------------------------------------------------------
describe('sommeDuMois', () => {
  const items = [
    { montant: 100, date: '2026-07-05' },
    { montant: 200, date: '2026-07-28' },
    { montant: 999, date: '2026-06-30' },
    { montant: 999, date: '2025-07-05' }, // même mois, autre année
  ];
  test('ne somme que le mois ET l’année de référence', () => {
    assert.equal(sommeDuMois(items, new Date(2026, 6, 15)), 300);
  });
  test('liste vide → 0, jamais NaN', () => {
    assert.equal(sommeDuMois([], new Date()), 0);
  });
});

// ------------------------------------------------------------
describe('formatEUR — piège connu', () => {
  test('formatEUR(null) renvoie "0 €" : ne JAMAIS l’appeler sans vérifier le null en amont', () => {
    // Ce test ne corrige pas formatEUR : il DOCUMENTE le piège qui a
    // produit le faux "0 €" du Dashboard, pour qu’aucune future
    // modification ne le considère comme un comportement sûr.
    assert.equal(formatEUR(null), '0 €');
  });
});
