import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef } from 'react';
import { X, Wallet, TrendingDown } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, useAnimatedValue, statusColors, statusHalos, Z
} from '../design-system';
import {
  formatEUR, sommeDuMois, equivalentMensuel,
  calculerSoldeActuel, calculerSeuilSecurite,
} from '../core/finance/calculs';
import { moyenneMensuelle } from '../core/finance/projection';
import { classifierSante } from '../core/finance/classification';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';

// Couleurs dérivées de la source partagée — seul le libellé du badge
// reste une copy propre à cet écran.
const statusVisuel = {
  ok: { color: statusColors.ok, halo: statusHalos.ok, badge: 'Situation confortable' },
  prudence: { color: statusColors.prudence, halo: statusHalos.prudence, badge: 'Prudence conseillée' },
  danger: { color: statusColors.danger, halo: statusHalos.danger, badge: 'Vigilance requise' },
};

// ============================================
// Jauge unique — statut + objectif fusionnés
// ============================================
function JaugeSecurite({ mois, objectif, seuilEuros, statut }) {
  const fraction = Math.min(mois / objectif, 1);
  const animatedFraction = useAnimatedValue(fraction, 1100);
  const reste = Math.max(objectif - mois, 0);
  const s = statusVisuel[statut];

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: '14px' }}>
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.045)' }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${animatedFraction * 100}%`,
            background: `linear-gradient(90deg, ${s.color}CC, ${s.color})`,
            boxShadow: `0 0 14px ${s.halo}`,
            transition: 'background 0.6s ease',
          }}
        />
        <div className="absolute" style={{ right: 0, top: '-5px', width: '2px', height: '24px', backgroundColor: colors.roseA, borderRadius: '1px' }} />
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <span style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary }}>0 mois</span>
        <span style={{ fontFamily: fontText, fontSize: '11.5px', fontWeight: 600, color: colors.roseA }}>
          Objectif · {objectif} mois {seuilEuros != null ? `(≈ ${formatEUR(seuilEuros)})` : ''}
        </span>
      </div>

      <p className="text-center mt-5" style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>
        Encore <span style={{ color: colors.textPrimary, fontWeight: 600, ...tabularNums }}>{reste.toFixed(1).replace('.', ',')} mois</span> pour atteindre l'objectif.
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, delay }) {
  const animatedValue = useAnimatedValue(value ?? 0, 900);
  return (
    <div className="p-5 flex flex-col justify-between animate-rise"
      style={{ ...cardSurface(), borderRadius: RADIUS.card, minHeight: '118px', animationDelay: `${delay}ms` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.035)' }}>
        <Icon size={14} strokeWidth={2} color={colors.textPrimary} />
      </div>
      <div className="mt-4">
        {value != null ? (
          <div style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '23px', color: colors.textPrimary, letterSpacing: '-0.01em' }}>
            {formatEUR(animatedValue)}
          </div>
        ) : (
          <div style={{ fontFamily: fontText, fontSize: '13px', fontStyle: 'italic', color: colors.textTertiary }}>À configurer</div>
        )}
        <div style={{ ...eyebrowStyle(), marginTop: '6px' }}>{label}</div>
      </div>
    </div>
  );
}

function PourquoiSheet({ objectifMois, onClose }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  function onPointerDown(e) { startYRef.current = e.touches ? e.touches[0].clientY : e.clientY; setDragging(true); }
  function onPointerMove(e) { if (!dragging) return; const y = e.touches ? e.touches[0].clientY : e.clientY; setDragY(Math.max(0, y - startYRef.current)); }
  function onPointerUp() { setDragging(false); if (dragY > 120) onClose(); else setDragY(0); }

  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheetSuperposee }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        onMouseDown={onPointerDown} onMouseMove={dragging ? onPointerMove : undefined} onMouseUp={onPointerUp} onMouseLeave={dragging ? onPointerUp : undefined}
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-10 sheet-rise"
        style={{
          backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
          border: `1px solid ${colors.cardBorder}`, borderBottom: 'none',
          transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'none',
        }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>Pourquoi {objectifMois} mois ?</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>
        <p style={{ fontFamily: fontText, fontSize: '14.5px', lineHeight: '1.6', color: colors.textSecondary }}>
          3 à 6 mois de dépenses est souvent utilisé comme repère de sécurité pour absorber les imprévus. Ce n'est pas une règle absolue, seulement un indicateur d'aide à la décision.
        </p>
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran Trésorerie de sécurité
// ------------------------------------------------------------
// Utilise intégralement calculerSoldeActuel(), calculerSeuilSecurite()
// et classifierSante() — les mêmes fonctions que le Dashboard. Aucune
// classification, aucun calcul de seuil, aucune valeur en dur propres
// à cet écran.
// ============================================
export default function TresorerieSecurite() {
  const { entreprise, chargement: chargementEntreprise } = useEntreprise();
  const { revenus, chargement: chargementRevenus } = useRevenus();
  const { ponctuelles, chargesFixes, chargement: chargementDepenses } = useDepenses();
  const [sheetOpen, setSheetOpen] = useState(false);

  const maintenant = new Date();
  // Moyenne réelle sur les derniers mois, jamais le seul mois en cours —
  // sans quoi le seuil de sécurité serait artificiellement bas le 3 du
  // mois et artificiellement haut le 28, sans que rien n'ait changé.
  const ponctuellesMoyennes = moyenneMensuelle(ponctuelles, maintenant);
  const chargesMensuelles = chargesFixes.reduce((total, c) => total + equivalentMensuel(c.montant, c.frequence), 0);
  const depensesMensuellesMoyennes = ponctuellesMoyennes + chargesMensuelles;

  const preferences = entreprise?.preferences;
  const soldeActuel = preferences
    ? calculerSoldeActuel({
        soldeInitial: preferences.soldeInitial,
        soldeInitialDate: preferences.soldeInitialDate,
        revenus,
        depensesPonctuelles: ponctuelles,
      })
    : null;

  const objectifMois = preferences?.tresorerieSecuriteMois ?? null;
  const seuilEuros = objectifMois != null && depensesMensuellesMoyennes > 0
    ? calculerSeuilSecurite(objectifMois, depensesMensuellesMoyennes)
    : null;
  const moisCouverts = soldeActuel != null && depensesMensuellesMoyennes > 0
    ? soldeActuel / depensesMensuellesMoyennes
    : null;

  const configured = moisCouverts != null && objectifMois != null;
  const animatedMois = useAnimatedValue(moisCouverts ?? 0, 900);

  const chargement = chargementEntreprise || chargementRevenus || chargementDepenses;
  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const statut = configured ? classifierSante(moisCouverts) : null;
  const s = statut ? statusVisuel[statut] : null;

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}>
        <div className="flex items-center justify-between mb-10">
          <span className="inline-flex items-center gap-2.5">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block' }} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Trésorerie de sécurité</span>
          </span>
        </div>

        {configured ? (
          <>
            <div className="flex flex-col items-center mb-10 animate-rise" style={{ animationDelay: '20ms' }}>
              <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '56px', color: colors.textPrimary, letterSpacing: '-0.03em' }}>
                {animatedMois.toFixed(1).replace('.', ',')} mois
              </span>
              <span className="mt-3 text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: `${s.color}18`, color: s.color, fontFamily: fontText }}>
                {s.badge}
              </span>
              <p className="text-center mt-5 px-6" style={{ fontFamily: fontText, fontSize: '14.5px', color: colors.textSecondary, lineHeight: '1.5' }}>
                Tu peux couvrir environ {moisCouverts.toFixed(1).replace('.', ',')} mois de dépenses si tes revenus s'arrêtent aujourd'hui.
              </p>
            </div>

            <div className="mb-9 animate-rise" style={{ animationDelay: '80ms' }}>
              <JaugeSecurite mois={moisCouverts} objectif={objectifMois} seuilEuros={seuilEuros} statut={statut} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center mb-10 px-6 animate-rise" style={{ paddingTop: '6vh' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <Wallet size={22} color={colors.textTertiary} strokeWidth={1.8} />
            </div>
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>Pas encore assez de données</span>
            <p className="mt-2" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '240px' }}>
              Renseigne le solde de ton compte société dans Mon espace, et enregistre quelques dépenses, pour que PILOT calcule ta trésorerie de sécurité réelle.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5 mb-8 animate-rise" style={{ animationDelay: '140ms' }}>
          <MetricCard icon={Wallet} label="Solde actuel" value={soldeActuel} delay={0} />
          <MetricCard icon={TrendingDown} label="Dépenses mensuelles" value={depensesMensuellesMoyennes > 0 ? depensesMensuellesMoyennes : null} delay={0} />
        </div>

        <div className="flex justify-center animate-rise" style={{ animationDelay: '200ms' }}>
          <button onClick={() => setSheetOpen(true)}>
            <span style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textTertiary, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Pourquoi {objectifMois} mois ?
            </span>
          </button>
        </div>

        {sheetOpen && <PourquoiSheet objectifMois={objectifMois} onClose={() => setSheetOpen(false)} />}
      </div>
    </div>
  );
}
