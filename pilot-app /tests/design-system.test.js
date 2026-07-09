// ============================================================
// tests/design-system.test.js
// ------------------------------------------------------------
// Protège l'ordre d'empilement. Ce test existe parce qu'un bug
// réel a rendu TOUT le profil inéditable : les sheets de Mon
// espace (z-index 30), portalisées dans <body>, se rendaient
// derrière l'écran superposé (z-index 50) qui les avait ouvertes.
// Le tap fonctionnait, la sheet s'ouvrait — invisible.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// design-system.js importe React (useState/useEffect) : on ne peut pas
// l'importer tel quel dans Node. On lit donc les valeurs directement
// depuis la source — ce qui teste EXACTEMENT ce que l'app utilisera.
const source = readFileSync(new URL('../src/design-system.js', import.meta.url), 'utf8');
const blocZ = source.match(/export const Z = \{([\s\S]*?)\};/);
const Z = Object.fromEntries(
  [...blocZ[1].matchAll(/(\w+):\s*(\d+)/g)].map(([, k, v]) => [k, Number(v)]),
);

describe('Ordre d’empilement (z-index)', () => {
  test('toutes les couches sont déclarées', () => {
    for (const couche of ['fabFlottant', 'barreOnglets', 'sheet', 'ecranSuperpose', 'fermerSuperpose', 'sheetSuperposee', 'toast']) {
      assert.ok(Number.isInteger(Z[couche]), `couche manquante : ${couche}`);
    }
  });

  test('une sheet ouverte depuis un écran superposé le recouvre', () => {
    // C'est LA règle qui était violée (30 < 50).
    assert.ok(Z.sheetSuperposee > Z.ecranSuperpose);
    assert.ok(Z.sheetSuperposee > Z.fermerSuperpose, 'elle doit aussi couvrir la croix de fermeture');
  });

  test('une sheet d’onglet recouvre la barre d’onglets', () => {
    assert.ok(Z.sheet > Z.barreOnglets);
  });

  test('un toast recouvre toute sheet — il confirme une action', () => {
    assert.ok(Z.toast > Z.sheet);
    assert.ok(Z.toast > Z.sheetSuperposee);
  });

  test('les boutons flottants passent sous la barre d’onglets', () => {
    assert.ok(Z.fabFlottant < Z.barreOnglets);
  });
});

describe('Aucun z-index en dur hors du design system', () => {
  const fichiers = [
    'App.jsx',
    'components/Toast.jsx',
    ...['Auth', 'Dashboard', 'Depenses', 'MonEspace', 'Nexa', 'Objectifs', 'Previsions', 'Revenus', 'Simulation', 'TresorerieSecurite']
      .map((n) => `screens/${n}.jsx`),
  ];

  test('chaque écran importe Z plutôt que d’inventer sa propre valeur', () => {
    for (const f of fichiers) {
      const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
      const enDur = src.match(/zIndex:\s*\d+/g);
      assert.equal(enDur, null, `${f} contient un z-index en dur : ${enDur?.join(', ')}`);
    }
  });
});

describe('Défilement horizontal — jamais sur un écran principal', () => {
  test('index.css utilise `clip` et non `hidden` sur html/body', () => {
    // `overflow-x: hidden` sur html/body fait du body un conteneur de
    // défilement : `position: fixed` s'y ancre et la barre d'onglets
    // décroche. `clip` coupe sans créer de conteneur.
    const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
    const regleRacine = css.match(/html,\s*body\s*\{[^}]*\}/);
    assert.ok(regleRacine, 'aucune règle html, body trouvée');
    assert.match(regleRacine[0], /overflow-x:\s*clip/);
    assert.doesNotMatch(regleRacine[0], /overflow-x:\s*hidden/);
  });

  test('aucun écran ne pose overflow-x: hidden (rendrait le div glissable au doigt)', () => {
    for (const n of ['Auth', 'Dashboard', 'Depenses', 'MonEspace', 'Nexa', 'Objectifs', 'Previsions', 'Revenus', 'Simulation', 'TresorerieSecurite']) {
      const src = readFileSync(new URL(`../src/screens/${n}.jsx`, import.meta.url), 'utf8');
      assert.doesNotMatch(src, /overflowX:\s*'hidden'/, `${n}.jsx : utiliser 'clip'`);
    }
  });

  test('aucune largeur en 100vw (déborde sous iOS avec viewport-fit=cover)', () => {
    for (const n of ['Auth', 'Dashboard', 'Depenses', 'MonEspace', 'Nexa', 'Objectifs', 'Previsions', 'Revenus', 'Simulation', 'TresorerieSecurite']) {
      const src = readFileSync(new URL(`../src/screens/${n}.jsx`, import.meta.url), 'utf8');
      assert.doesNotMatch(src, /100vw/, `${n}.jsx : utiliser '100%'`);
    }
  });
});
