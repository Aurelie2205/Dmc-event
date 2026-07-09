// ============================================================
// PILOT — Design System
// ------------------------------------------------------------
// Ce fichier est LA source unique des tokens visuels de PILOT,
// désormais réellement importé par chaque écran (voir /screens),
// plus seulement documenté à côté comme durant la phase prototype.
// ============================================================

import { useState, useRef, useEffect } from 'react';
// Un changement ici (ex: affiner la teinte corail) se répercute
// alors partout automatiquement, au lieu de nécessiter huit
// modifications séparées comme c'est le cas dans les prototypes.
// ============================================================

// ------------------------------------------------------------
// Couleurs
// ------------------------------------------------------------
export const colors = {
  // Valeurs demandées : noir profond, cartes anthracite.
  bgDeep: '#0B0B0D',
  card: '#16161A',
  cardBorder: 'rgba(248, 248, 248, 0.05)',

  // ------------------------------------------------------------
  // ROSE MAGENTA — signature de marque, et RIEN d'autre. Ne porte
  // jamais une information financière : uniquement le logo, les CTA,
  // l'état actif, le focus, NEXA, les micro-interactions.
  //
  // Teinte 316°, saturation 58% — framboise désaturé, ni rose bonbon
  // ni violet. Choisi par mesure, pas à l'œil : la différence PERÇUE
  // (ΔE2000, la métrique qui intègre teinte, saturation et
  // luminosité) vaut 26.2 avec le rouge d'alerte, son voisin le plus
  // proche. Repères : l'or historique de PILOT n'était qu'à ΔE 14.0
  // de l'orange, et le corail à 17.7 du rouge. Ce rose est donc
  // presque deux fois plus séparé que l'or qui a toujours servi.
  //
  // C'est pourquoi AUCUNE couleur métier n'a eu à être déplacée pour
  // lui faire de la place — contrairement au corail, qui obligeait à
  // tordre l'orange et le rouge.
  //
  // roseA est CLAIR (contraste 7.12 sur le noir) : le texte des
  // boutons est donc sombre, et le bouton un aplat quasi plat plutôt
  // qu'un dégradé voyant. C'est l'inverse du violet, qui imposait un
  // fond sombre et du texte blanc.
  // ------------------------------------------------------------
  roseHi: '#EBC1E0',   // rose quartz — logo, extrémité lumineuse
  roseA: '#DC7AC2',    // accent principal — 316°, saturation 58%
  roseMid: '#CE5AAF',  // second stop du bouton — écart volontairement faible
  roseB: '#972B7A',    // framboise profond — halos, jauges
  roseSoft: 'rgba(220, 122, 194, 0.10)',

  roseGhost: 'rgba(220, 122, 194, 0.10)',
  rosePress: 'rgba(220, 122, 194, 0.16)',
  roseBorder: 'rgba(220, 122, 194, 0.35)',
  roseBorderStrong: 'rgba(220, 122, 194, 0.42)',
  // Lueur discrète, jamais un néon : 0.30 et non 0.45.
  roseGlow: 'rgba(220, 122, 194, 0.30)',

  // Texte et icônes posés SUR un aplat rose. Le rose étant clair,
  // c'est un quasi-noir — et non le blanc qu'imposait le violet.
  onAccent: '#0B0B0D',

  // ------------------------------------------------------------
  // Couleurs métier — universelles, jamais roses. Le rose ne
  // représente pas l'argent. Le grand cercle "Tu peux te verser"
  // change de couleur selon la SITUATION, pas selon la marque.
  //   vert   = positif (argent disponible, revenus, indicateurs)
  //   orange = prudence
  //   rouge  = alerte
  // Aucune n'a eu à être déplacée : le rose magenta leur laisse
  // toute la place, contrairement au corail.
  // ------------------------------------------------------------
  green: '#2FCB74',
  greenSoft: 'rgba(47, 203, 116, 0.09)',
  greenHalo: 'rgba(47, 203, 116, 0.20)',
  orange: '#F0A23C',
  orangeSoft: 'rgba(240, 162, 60, 0.09)',
  orangeHalo: 'rgba(240, 162, 60, 0.20)',
  red: '#E5484D',
  redSoft: 'rgba(229, 72, 77, 0.09)',
  redHalo: 'rgba(229, 72, 77, 0.20)',

  textPrimary: '#F7F6F3',
  textSecondary: 'rgba(247, 246, 243, 0.48)',
  textTertiary: 'rgba(247, 246, 243, 0.26)',
};

// ------------------------------------------------------------
// Typographie
// ------------------------------------------------------------
export const fontDisplay = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
export const fontText = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";

// Tous les montants et nombres significatifs doivent utiliser ce style —
// c'est ce qui donne le rendu "chiffres tabulaires" premium dans toute l'app.
export const tabularNums = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
};

// ------------------------------------------------------------
// Échelles — trois valeurs seulement pour les rayons, jamais
// une quatrième improvisée. Idem pour le tracking.
// ------------------------------------------------------------
export const RADIUS = { control: 18, card: 22, sheet: 36 };

// ------------------------------------------------------------
// Hauteur visuelle de la barre d'onglets (App.jsx), hors zone de
// sécurité iOS. Tout écran qui flotte un CTA au-dessus de cette
// barre doit utiliser cette même constante — jamais une valeur
// devinée localement, sans quoi le bouton finit caché derrière la
// barre (exactement le défaut trouvé lors de l'audit iPhone V1).
// ------------------------------------------------------------
export const TAB_BAR_HEIGHT = 58;
export const TRACK = { brand: '0.34em', focal: '0.14em', eyebrow: '0.08em' };

// ------------------------------------------------------------
// Ordre d'empilement — LA seule définition de toute l'application.
//
// Ces valeurs étaient auparavant écrites en dur dans chaque écran.
// Résultat : les sheets de Mon espace (30), Prévisions (20) et
// Trésorerie (20) se rendaient DERRIÈRE l'écran superposé (50) qui
// les contenait. Comme elles sont portalisées dans <body>, elles
// s'ouvraient réellement — simplement cachées. Un tap qui "ne fait
// rien", alors que tout fonctionnait.
//
// Toute nouvelle couche doit être déclarée ICI, jamais inventée
// localement.
// ------------------------------------------------------------
export const Z = {
  fabFlottant: 10,   // boutons flottants au-dessus d'une liste
  barreOnglets: 40,
  sheet: 45,         // sheet ouverte depuis un écran d'onglet
  ecranSuperpose: 50,
  fermerSuperpose: 60,
  sheetSuperposee: 65, // sheet ouverte DEPUIS un écran superposé
  toast: 70,         // confirme une action : toujours au-dessus de tout
};

// ------------------------------------------------------------
// Helpers de style partagés
// ------------------------------------------------------------
export function eyebrowStyle() {
  return {
    fontFamily: fontText,
    fontSize: '10.5px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: TRACK.eyebrow,
    color: colors.textTertiary,
  };
}

// ------------------------------------------------------------
// En-tête d'écran — remplace les "gros titres blancs génériques"
// des premiers prototypes. Un point corail (le même motif que les
// indicateurs de statut du reste de l'app) + un titre plus retenu :
// poids 600 (pas 700), taille 20px (pas 22px), tracking positif
// léger (0.02em) plutôt que la compression par défaut. Réservé aux
// écrans "liste" simples (Revenus, Dépenses, Objectifs, Prévisions,
// Trésorerie, Mon espace) — les écrans à hero fort (Dashboard, NEXA)
// gardent leur propre traitement, déjà distinctif.
// ------------------------------------------------------------
export function screenTitleDotStyle() {
  return {
    width: '5px', height: '5px', borderRadius: '50%',
    backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block',
  };
}
export function screenTitleStyle() {
  return {
    fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px',
    color: colors.textPrimary, letterSpacing: '0.02em',
  };
}

export function cardSurface(extra = {}) {
  return {
    backgroundColor: colors.card,
    backgroundImage:
      'linear-gradient(155deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 40%), linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0) 60%)',
    border: `1px solid ${colors.cardBorder}`,
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 24px 48px -28px rgba(0,0,0,0.6)',
    ...extra,
  };
}

// ------------------------------------------------------------
// Surface "verre" — réservée aux cartes d'ACTION (celles qui mènent
// ailleurs), jamais aux cartes de donnée. La distinction visuelle
// porte une information : ce qui brille se clique.
//
// Le flou d'arrière-plan est coûteux sur iOS : n'en poser qu'une ou
// deux par écran. Un `backdropFilter` sur dix cartes fait tomber le
// défilement à 30 images par seconde sur un iPhone d'entrée de gamme.
// ------------------------------------------------------------
export function glassSurface(extra = {}) {
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.028)',
    backgroundImage:
      `linear-gradient(140deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 45%), radial-gradient(120% 140% at 100% 0%, ${colors.roseSoft} 0%, rgba(0,0,0,0) 55%)`,
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    border: `1px solid rgba(255,255,255,0.07)`,
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 44px -30px rgba(0,0,0,0.8)',
    ...extra,
  };
}

// Remarque : formatEUR() n'habite plus ici. C'est un calcul financier,
// pas un token visuel — sa seule maison légitime est désormais
// /core/finance/calculs.js, conformément à la règle d'or de
// l'Architecture Core (aucune logique métier dupliquée).

// ------------------------------------------------------------
// Animation — un seul hook de valeur animée, réutilisé partout
// (compteurs, jauges, barres de progression). Anime toujours
// DEPUIS la valeur précédente, jamais depuis zéro à chaque
// changement — c'est ce qui donne la sensation de "vie" plutôt
// qu'un reset-puis-remplissage.
// ------------------------------------------------------------
export function useAnimatedValue(target, duration = 900) {
  const [value, setValue] = useState(target);
  const raf = useRef();
  const startTime = useRef(null);
  const fromValue = useRef(target);

  useEffect(() => {
    fromValue.current = value;
    startTime.current = null;
    const from = fromValue.current;
    const delta = target - from;
    function tick(ts) {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

// ------------------------------------------------------------
// Animations CSS partagées — à injecter une seule fois au niveau
// racine de l'app (layout global), plus besoin de les redéclarer
// dans un <style> par écran comme dans les prototypes.
// ------------------------------------------------------------
export const globalKeyframes = `
  @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

  @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }

  @keyframes digitPop { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }
  .digit-pop { animation: digitPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: inline-flex; align-items: baseline; }

  @keyframes dotSeq {
    0%, 20% { opacity: 0.28; transform: scale(0.82); }
    40%, 55% { opacity: 1; transform: scale(1); }
    80%, 100% { opacity: 0.28; transform: scale(0.82); }
  }
  .thinking-dot { animation: dotSeq 1.3s ease-in-out infinite; }

  .amount-input { background: transparent; border: none; outline: none; text-align: center; caret-color: ${colors.roseA}; }
  .amount-input::placeholder { color: rgba(247,246,243,0.16); font-weight: 700; }

  /* Accessibilité — respecte le réglage système de réduction des animations.
     Ne supprime pas les transitions d'état (indispensables pour comprendre
     ce qui se passe), seulement les animations d'agrément (respiration,
     confettis, pulsation). */
  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .sheet-rise, .digit-pop, .thinking-dot,
    .avatar-pulse, .confetti-dot, .check-pop, .gauge-breathe, .ring-breathe {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;

// ------------------------------------------------------------
// Accessibilité — règles concrètes, pas une intention vague
// ------------------------------------------------------------
// ------------------------------------------------------------
// Correspondance statut → couleur — la seule définition de ce
// mapping dans toute l'app. `classifierSante()` (dans
// /core/finance/classification.js) retourne toujours l'une de ces
// trois clés ; aucun écran ne doit redéfinir sa propre association
// couleur/statut, seulement l'importer d'ici.
// ------------------------------------------------------------
export const statusColors = {
  ok: colors.green,
  prudence: colors.orange,
  danger: colors.red,
};
export const statusHalos = {
  ok: colors.greenHalo,
  prudence: colors.orangeHalo,
  danger: colors.redHalo,
};

export const a11y = {
  // Zone tactile minimale (Apple HIG + WCAG 2.5.5) : 44×44px, même si
  // l'élément visuel affiché est plus petit (icône 13-16px acceptée à
  // l'intérieur d'un conteneur 44px).
  minTouchTarget: 44,

  // textTertiary (26% d'opacité) est réservé aux libellés strictement
  // décoratifs (eyebrows, métadonnées secondaires) — jamais à un texte
  // porteur d'une information nécessaire à la compréhension. Pour tout
  // texte qui compte, utiliser au minimum textSecondary (48%).
  minContrastText: colors.textSecondary,

  // Toute information de statut (vert/orange/rouge) doit TOUJOURS être
  // accompagnée d'un texte ou d'une icône distincte — jamais de la
  // couleur seule. Exemple : un point orange "en retard" doit porter
  // le mot "En retard", pas seulement changer de teinte.
  neverColorAlone: true,
};

// ------------------------------------------------------------
// Ce que ce fichier ne couvre PAS volontairement :
// - le composant SheetShell (poignée + croix + swipe-to-dismiss) :
//   à extraire en composant partagé `<Sheet>` au moment du vrai
//   développement, actuellement dupliqué dans chaque écran ;
// - l'avatar NEXA (`NexaAvatar`) : à déplacer ici une fois validé
//   comme identité visuelle définitive ;
// - les seuils métier (durées d'animation de vibration, délais de
//   debounce) : volontairement laissés au niveau de chaque écran
//   car ce sont des réglages de comportement, pas des tokens visuels.
// ------------------------------------------------------------
