import React from 'react';
import { ChevronRight, Briefcase, TrendingUp, TrendingDown, ShieldCheck, Landmark, LineChart } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS, TRACK,
  eyebrowStyle, cardSurface, glassSurface, useAnimatedValue, statusColors, statusHalos, TAB_BAR_HEIGHT,
} from '../design-system';
import {
  formatEUR, sommeDuMois, equivalentMensuel, nomMois,
  calculerSoldeActuel, calculerSeuilSecurite, calculerDisponibleBrut,
  calculerReserveUrssaf, calculerArgentPrudent,
} from '../core/finance/calculs';
import { moyenneMensuelle, projeterTrajectoire } from '../core/finance/projection';
import { classifierSante } from '../core/finance/classification';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';

// Les couleurs viennent exclusivement de statusColors/statusHalos —
// seuls les messages (copy éditoriale) restent propres à cet écran.
// Deux causes de blocage DISTINCTES, longtemps confondues sous un seul
// statut 'configuration' dont le message ne parlait que du solde. Un
// utilisateur ayant renseigné son solde mais aucune dépense se voyait
// donc demander de renseigner… son solde. Chaque état nomme désormais
// exactement la donnée qui manque.
const statusStyle = {
  ok: { color: statusColors.ok, halo: statusHalos.ok, soft: colors.greenSoft, copilot: 'Situation saine.' },
  prudence: { color: statusColors.prudence, halo: statusHalos.prudence, soft: colors.orangeSoft, copilot: "Ta trésorerie est un peu sous ton seuil de sécurité — mieux vaut laisser la réserve se reconstituer ce mois-ci." },
  danger: { color: statusColors.danger, halo: statusHalos.danger, soft: colors.redSoft, copilot: 'Trésorerie nettement sous le seuil — concentre-toi sur sa reconstitution avant tout nouveau versement.' },
  'configuration-solde': {
    color: colors.textTertiary, halo: 'rgba(255,255,255,0.06)', soft: 'rgba(255,255,255,0.04)',
    copilot: "Configure ton solde de départ pour activer ton tableau de bord.",
    titreVide: 'Tableau de bord inactif',
    detailVide: "Renseigne le solde de ton compte société.",
    action: 'Configurer maintenant',
    cible: 'monespace',
  },
  'configuration-depenses': {
    color: colors.textTertiary, halo: 'rgba(255,255,255,0.06)', soft: 'rgba(255,255,255,0.04)',
    // La ligne du haut pose le CONSTAT, la carte donne l'ACTION. Elles
    // disaient auparavant la même chose, ce qui noyait la carte de texte.
    copilot: "Il manque tes dépenses pour calculer ton seuil de sécurité.",
    titreVide: 'Encore une étape',
    detailVide: "Ajoute une charge fixe ou une dépense.",
    action: 'Configurer maintenant',
    cible: 'depenses',
  },
};

// ============================================
// L'ANNEAU
// ============================================
function PilotRing({ progress, color, montant, size = 268 }) {
  const animatedProgress = useAnimatedValue(progress, 1300);
  const animatedMontant = useAnimatedValue(montant, 1000);

  const strokeWidth = 11;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - animatedProgress);

  const tipAngleDeg = -90 + 360 * animatedProgress;
  const tipRad = (tipAngleDeg * Math.PI) / 180;
  const tipX = cx + r * Math.cos(tipRad);
  const tipY = cy + r * Math.sin(tipRad);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <style>{`
        @keyframes breathe { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.68; transform: scale(1.012); } }
        .ring-breathe { animation: breathe 6s ease-in-out infinite; transform-origin: ${cx}px ${cy}px; }
      `}</style>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <filter id="ringGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="tipGlow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={strokeWidth} />
        <g className="ring-breathe">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeOpacity="0.26" strokeWidth={strokeWidth + 6}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`} filter="url(#ringGlow)" />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke 0.6s ease' }} />
        {/* Pointe de l'anneau : prend la couleur du STATUT, jamais celle de la
            marque. Un point corail au bout d'un anneau vert "trésorerie saine"
            créerait une fausse alerte visuelle. */}
        <circle cx={tipX} cy={tipY} r={3} fill={color} filter="url(#tipGlow)" opacity={0.9} />
      </svg>
      <div className="flex flex-col items-center justify-center text-center">
        <span style={{ ...eyebrowStyle(), letterSpacing: TRACK.focal, marginBottom: '12px' }}>Tu peux te verser</span>
        <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '46px', lineHeight: '1', letterSpacing: '-0.025em', color: colors.textPrimary }}>
          {formatEUR(animatedMontant)}
        </span>
      </div>
    </div>
  );
}

function CopilotLine({ status }) {
  const s = statusStyle[status];
  return (
    <div className="flex items-start gap-2.5 mb-6 px-1 animate-rise" style={{ animationDelay: '0ms', animationDuration: '0.6s' }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: s.color, boxShadow: s.color !== colors.textTertiary ? `0 0 6px ${s.color}` : 'none' }} />
      <p style={{ fontFamily: fontText, fontSize: '15px', fontWeight: 500, color: colors.textPrimary, letterSpacing: '-0.005em', lineHeight: '1.4' }}>{s.copilot}</p>
    </div>
  );
}

function HeroCard({ status, montant, configured, onSimuler, onConfigurer }) {
  const s = statusStyle[status];
  const handlePress = () => {
    if (navigator.vibrate) navigator.vibrate(8);
    onSimuler();
  };
  return (
    <div
      className="w-full pt-9 pb-7 px-6 mb-5 flex flex-col items-center animate-rise"
      style={{
        ...cardSurface({ boxShadow: `0 1px 0 rgba(255,255,255,0.05) inset, 0 28px 70px -24px ${s.halo}` }),
        borderRadius: RADIUS.sheet, // même valeur que les sheets — la carte hero réutilise ce rayon
        animationDelay: '40ms',
        animationDuration: '0.7s',
      }}
    >
      {configured ? (
        <>
          <PilotRing progress={status === 'ok' ? 0.88 : status === 'prudence' ? 0.55 : 0.2} color={s.color} montant={montant} />
          <button
            onClick={handlePress}
            className="w-full mt-7 flex items-center justify-center gap-1.5 py-4 transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})`, fontFamily: fontText, borderRadius: RADIUS.control }}
          >
            <span className="text-[14.5px] font-semibold" style={{ color: colors.onAccent }}>Simuler ma rémunération</span>
            <ChevronRight size={16} color={colors.onAccent} strokeWidth={2.5} />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center text-center py-3 px-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <Briefcase size={20} color={colors.textTertiary} strokeWidth={1.8} />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>{s.titreVide}</span>
          <p className="mt-1.5 mb-5" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '230px' }}>
            {s.detailVide}
          </p>
          <button
            onClick={onConfigurer}
            className="flex items-center gap-1.5 px-5 py-2.5 transition-transform active:scale-[0.96]"
            style={{ borderRadius: RADIUS.control, border: `1px solid ${colors.roseBorder}`, backgroundColor: colors.roseSoft }}
          >
            <span style={{ fontFamily: fontText, fontSize: '13px', fontWeight: 600, color: colors.roseA }}>{s.action}</span>
            <ChevronRight size={14} color={colors.roseA} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, iconTint, delay, onClick }) {
  const animatedValue = useAnimatedValue(value ?? 0, 900);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="p-5 flex flex-col justify-between animate-rise text-left"
      style={{ ...cardSurface(), borderRadius: RADIUS.card, minHeight: '118px', animationDelay: `${delay}ms` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: iconTint || 'rgba(255,255,255,0.035)' }}>
        <Icon size={14} strokeWidth={2} color={colors.textPrimary} />
      </div>
      <div className="mt-4">
        {value != null ? (
          <div style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '23px', color: colors.textPrimary, letterSpacing: '-0.01em' }}>
            {formatEUR(animatedValue)}
          </div>
        ) : (
          // "Non configurée" plutôt que "À configurer" : un constat neutre,
          // pas un reproche. L'invitation vit sur la ligne du dessous, en
          // rose puisqu'elle appelle une action — la couleur porte le sens.
          <div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textTertiary, letterSpacing: '-0.01em' }}>
              Non configurée
            </div>
            {onClick && (
              <div className="flex items-center gap-1 mt-1">
                <span style={{ fontFamily: fontText, fontSize: '11.5px', fontWeight: 500, color: colors.roseA }}>Compléter</span>
                <ChevronRight size={11} color={colors.roseA} strokeWidth={2.5} />
              </div>
            )}
          </div>
        )}
        <div style={{ ...eyebrowStyle(), marginTop: '6px' }}>{label}</div>
      </div>
    </Tag>
  );
}

// ============================================
// Dashboard
// ------------------------------------------------------------
// Ne simule plus rien : lit Mon espace (solde de départ, seuil de
// sécurité), Revenus et Dépenses réels. Aucune échéance fiscale
// n'est encore affichée — cette donnée n'existe pas dans l'app
// (voir message d'accompagnement), donc PILOT n'en invente pas.
// ============================================
export default function Dashboard({ onOpenMonEspace, onOpenTresorerie, onOpenPrevisions, onOpenSimulation, onAllerDepenses }) {
  const { entreprise, chargement: chargementEntreprise } = useEntreprise();
  const { revenus, chargement: chargementRevenus } = useRevenus();
  const { ponctuelles, chargesFixes, chargement: chargementDepenses } = useDepenses();

  const maintenant = new Date();
  const revenusMois = sommeDuMois(revenus, maintenant);
  const ponctuellesMois = sommeDuMois(ponctuelles, maintenant);
  const chargesMensuelles = chargesFixes.reduce((total, c) => total + equivalentMensuel(c.montant, c.frequence), 0);
  // Deux usages distincts, jamais mélangés : le mois réel pour l'afficher
  // tel quel ("Dépenses du mois"), la moyenne réelle pour tout calcul de
  // sécurité — sans quoi le seuil fluctuerait selon le jour du mois plutôt
  // que selon la vraie situation financière.
  const depensesMois = ponctuellesMois + chargesMensuelles;
  const depensesMensuellesMoyennes = moyenneMensuelle(ponctuelles, maintenant) + chargesMensuelles;

  const preferences = entreprise?.preferences;
  const solde = preferences
    ? calculerSoldeActuel({
        soldeInitial: preferences.soldeInitial,
        soldeInitialDate: preferences.soldeInitialDate,
        revenus,
        depensesPonctuelles: ponctuelles,
      })
    : null;

  const seuil = preferences && depensesMensuellesMoyennes > 0 ? calculerSeuilSecurite(preferences.tresorerieSecuriteMois, depensesMensuellesMoyennes) : null;
  const disponibleBrut = solde != null && seuil != null ? calculerDisponibleBrut({ solde, seuilSecurite: seuil }) : null;
  const moisDeTresorerie = solde != null && depensesMensuellesMoyennes > 0 ? solde / depensesMensuellesMoyennes : null;
  const montantDisponibleAffiche = disponibleBrut != null ? Math.max(disponibleBrut, 0) : 0;

  // Estimation ajustable (Mon espace), jamais un taux officiel — voir
  // calculerReserveUrssaf(). Basée sur la moyenne réelle des revenus,
  // jamais le seul mois en cours, pour la même raison que le seuil de
  // sécurité : rester stable, pas dépendant du jour du mois.
  const revenusMoyens = moyenneMensuelle(revenus, maintenant);
  const reserveUrssaf = preferences ? calculerReserveUrssaf(revenusMoyens, preferences.tauxChargesSociales) : 0;
  const argentPrudent = disponibleBrut != null ? calculerArgentPrudent(disponibleBrut, reserveUrssaf) : null;

  // Aperçu de la projection affiché sur la carte d'action. Calculé avec
  // projeterTrajectoire(), EXACTEMENT la fonction qu'utilise l'écran
  // Prévisions — jamais une estimation approchée "pour l'aperçu", qui
  // finirait par contredire l'écran qu'elle est censée annoncer.
  const trajectoire = solde != null
    ? projeterTrajectoire({
        soldeActuel: solde,
        revenusMois,
        depensesMois,
        revenus,
        ponctuelles,
        chargesFixes,
        nombreMois: 6,
        reference: maintenant,
      })
    : [];
  const dernierMois = trajectoire.length > 0 ? trajectoire[trajectoire.length - 1] : null;
  const evolutionProjetee = dernierMois && solde != null ? dernierMois.solde - solde : null;

  const chargement = chargementEntreprise || chargementRevenus || chargementDepenses;
  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  // "configuré" ne veut pas dire "le solde existe" : le calcul du montant
  // affiché exige AUSSI des dépenses (sans elles, pas de seuil de sécurité,
  // donc pas de disponible). Les confondre affichait un "0 €" qui n'était
  // pas un vrai zéro, mais une valeur inconnue — le pire des mensonges
  // pour un outil financier.
  const soldeConfigure = solde != null;
  const depensesConnues = depensesMensuellesMoyennes > 0;
  const configured = soldeConfigure && depensesConnues;

  const status = !soldeConfigure
    ? 'configuration-solde'
    : !depensesConnues
      ? 'configuration-depenses'
      : classifierSante(moisDeTresorerie);

  const initiale = entreprise.identite.nomComplet ? entreprise.identite.nomComplet[0] : '';

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation-name: riseIn; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); animation-fill-mode: forwards; }
      `}</style>

      <div className="w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 24px)` }}>
        <div className="flex items-center justify-between mb-9">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '12px', letterSpacing: TRACK.brand, background: `linear-gradient(135deg, ${colors.roseHi}, ${colors.roseA})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            PILOT
          </span>
          <button onClick={onOpenMonEspace} aria-label="Mon espace" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={cardSurface()}>
            <span style={{ color: colors.roseA, fontFamily: fontDisplay, fontWeight: 600, fontSize: '13px' }}>{initiale}</span>
          </button>
        </div>

        <CopilotLine status={status} />

        <HeroCard status={status} montant={montantDisponibleAffiche} configured={configured} onSimuler={onOpenSimulation} onConfigurer={statusStyle[status].cible === 'depenses' ? onAllerDepenses : onOpenMonEspace} />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <MetricCard icon={Briefcase} label="Compte société" value={solde} delay={70} />
          <MetricCard icon={TrendingUp} label="Revenus du mois" value={revenusMois} iconTint={colors.greenSoft} delay={140} />
          <MetricCard icon={TrendingDown} label="Dépenses du mois" value={depensesMois} delay={210} />
          <MetricCard icon={ShieldCheck} label="Trésorerie sécurité" value={seuil} iconTint={colors.roseSoft} delay={280} onClick={onOpenTresorerie} />
        </div>

        {reserveUrssaf > 0 && (
          <div className="mb-4 px-5 pt-6 pb-5 animate-rise" style={{ ...cardSurface(), borderRadius: RADIUS.card, animationDelay: '320ms' }}>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.035)' }}>
                <Landmark size={12} color={colors.textTertiary} strokeWidth={2} />
              </div>
              <span style={eyebrowStyle()}>Réserve URSSAF estimée</span>
            </div>

            {/* Le montant domine, le libellé le sert — et non l'inverse.
                min-w-0 sur la colonne de texte : sans lui, un libellé long ne
                peut pas rétrécir (min-width vaut `auto` en flex) et pousse le
                contenu HORS de la carte. */}
            <div className="flex items-end justify-between gap-4 mb-5">
              <div className="min-w-0">
                <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary }}>À garder de côté</span>
                <p className="mt-1" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary }}>
                  ≈{preferences.tauxChargesSociales} % des revenus
                </p>
              </div>
              <span className="flex-shrink-0" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '26px', letterSpacing: '-0.015em', color: colors.textPrimary, ...tabularNums }}>
                {formatEUR(reserveUrssaf)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
              <span className="min-w-0" style={{ fontFamily: fontText, fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>
                Argent prudent
              </span>
              {argentPrudent != null ? (
                // Vert ou rouge, jamais rose : c'est un montant d'argent, pas
                // un élément de marque. Le rose reste réservé à l'identité.
                <span className="flex-shrink-0" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '17px', color: argentPrudent < 0 ? colors.red : colors.green, ...tabularNums }}>
                  {formatEUR(argentPrudent)}
                </span>
              ) : (
                <span className="flex-shrink-0" style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textTertiary }}>Non configuré</span>
              )}
            </div>
          </div>
        )}

        {/* Carte d'ACTION — surface verre, distincte des cartes de donnée.
            L'aperçu affiché vient de projeterTrajectoire(), la même fonction
            que l'écran Prévisions : il ne pourra jamais le contredire.
            Sans solde configuré, aucun aperçu n'est inventé. */}
        <button
          onClick={onOpenPrevisions}
          className="w-full flex items-center gap-4 px-5 py-5 mb-8 animate-rise transition-transform active:scale-[0.98] text-left"
          style={{ ...glassSurface(), borderRadius: RADIUS.card, animationDelay: '380ms' }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.roseSoft, border: `1px solid ${colors.roseBorder}` }}>
            <LineChart size={17} color={colors.roseA} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '14.5px', color: colors.textPrimary }}>
              Projection sur 6 mois
            </div>
            {dernierMois != null ? (
              <div className="flex items-baseline gap-1.5 mt-1">
                <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '15px', color: colors.textPrimary }}>
                  {formatEUR(dernierMois.solde)}
                </span>
                <span style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary }}>
                  en {nomMois(dernierMois.date)}
                </span>
                {evolutionProjetee != null && (
                  <span className="flex items-center gap-0.5 ml-0.5" style={{ fontFamily: fontText, fontSize: '11.5px', fontWeight: 600, color: evolutionProjetee >= 0 ? colors.green : colors.orange }}>
                    {evolutionProjetee >= 0 ? '+' : '−'}{formatEUR(Math.abs(evolutionProjetee))}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary }}>
                Disponible une fois ton solde renseigné
              </div>
            )}
          </div>

          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} className="flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
