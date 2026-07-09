import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, statusColors,
} from '../design-system';
import {
  formatEUR, sommeDuMois, equivalentMensuel,
  calculerSoldeActuel, calculerSeuilSecurite,
  nettoyerSaisieMontant, montantSaisiVersNombre, formatMontantSaisi,
} from '../core/finance/calculs';
import { moyenneMensuelle } from '../core/finance/projection';
import { classifierSante } from '../core/finance/classification';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';

// Les messages restent une copy propre à cet écran, mais la
// classification (ok/prudence/danger) et ses couleurs viennent
// exclusivement de classifierSante() et statusColors — jamais une
// bande de seuil arbitraire propre à Simulation.
const messages = {
  ok: 'Tu peux te verser ce montant sereinement.',
  prudence: 'Tu peux te le permettre, mais ta marge de sécurité devient plus faible.',
  danger: 'Je te déconseille ce montant.',
};

// Simule le retrait — ne modifie jamais de vraie donnée, seulement
// une projection à l'écran. Le statut vient de la même fonction que
// Dashboard, Trésorerie de sécurité et Prévisions : si ce montant
// ferait passer PILOT en "danger" ici, il y passerait partout ailleurs
// pour la même raison, jamais une évaluation propre à cet écran.
function simulerRemuneration(montant, { solde, depensesMensuellesMoyennes }) {
  if (!montant || montant <= 0) return null;
  if (solde == null || depensesMensuellesMoyennes <= 0) return { statut: null };

  const soldeApres = solde - montant;
  const moisApres = soldeApres / depensesMensuellesMoyennes;
  const statut = classifierSante(moisApres);

  const conseils = {
    ok: `Il te restera environ ${moisApres.toFixed(1).replace('.', ',')} mois de trésorerie de sécurité après ce versement.`,
    prudence: `Ta trésorerie de sécurité tomberait à environ ${moisApres.toFixed(1).replace('.', ',')} mois après ce versement.`,
    danger: `Ta trésorerie de sécurité tomberait à environ ${moisApres.toFixed(1).replace('.', ',')} mois, sous ton seuil de vigilance.`,
  };

  return { statut, message: messages[statut], conseil: conseils[statut], soldeApres, moisApres };
}

function vibrateFor(statut) {
  if (!navigator.vibrate) return;
  if (statut === 'ok') navigator.vibrate(8);
  else if (statut === 'prudence') navigator.vibrate(18);
  else navigator.vibrate([16, 40, 16]);
}

// ============================================
// Écran Simulation
// ------------------------------------------------------------
// Ne connaît plus de seuil, de solde ou d'échéance en dur. Le solde
// vient de calculerSoldeActuel() (Mon espace + Revenus + Dépenses),
// le seuil de calculerSeuilSecurite() (Mon espace + Dépenses), et le
// verdict de classifierSante() — la même chaîne que le reste de l'app.
// ============================================
export default function Simulation({ onClose }) {
  const { entreprise, chargement: chargementEntreprise } = useEntreprise();
  const { revenus, chargement: chargementRevenus } = useRevenus();
  const { ponctuelles, chargesFixes, chargement: chargementDepenses } = useDepenses();

  const [raw, setRaw] = useState('');
  const [debounced, setDebounced] = useState('');
  const debounceRef = useRef();
  const inputRef = useRef();

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!window.visualViewport) return;
    function onResize() {
      setKeyboardInset(Math.max(0, window.innerHeight - window.visualViewport.height));
    }
    window.visualViewport.addEventListener('resize', onResize);
    onResize();
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(raw), 550);
    return () => clearTimeout(debounceRef.current);
  }, [raw]);

  const maintenant = new Date();
  const ponctuellesMoyennes = moyenneMensuelle(ponctuelles, maintenant);
  const chargesMensuelles = chargesFixes.reduce((total, c) => total + equivalentMensuel(c.montant, c.frequence), 0);
  const depensesMensuellesMoyennes = ponctuellesMoyennes + chargesMensuelles;

  const preferences = entreprise?.preferences;
  const solde = preferences
    ? calculerSoldeActuel({
        soldeInitial: preferences.soldeInitial,
        soldeInitialDate: preferences.soldeInitialDate,
        revenus,
        depensesPonctuelles: ponctuelles,
      })
    : null;
  const seuil = preferences && depensesMensuellesMoyennes > 0
    ? calculerSeuilSecurite(preferences.tresorerieSecuriteMois, depensesMensuellesMoyennes)
    : null;

  const configured = solde != null && depensesMensuellesMoyennes > 0;
  const resultat = simulerRemuneration(montantSaisiVersNombre(debounced), { solde, depensesMensuellesMoyennes });

  const prevStatutRef = useRef(null);
  useEffect(() => {
    if (resultat?.statut && resultat.statut !== prevStatutRef.current) {
      vibrateFor(resultat.statut);
      prevStatutRef.current = resultat.statut;
    }
    if (!resultat) prevStatutRef.current = null;
  }, [resultat]);

  const chargement = chargementEntreprise || chargementRevenus || chargementDepenses;
  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  function handleChange(e) {
    setRaw(nettoyerSaisieMontant(e.target.value));
  }
  function onPointerDown(e) {
    startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging(true);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(Math.max(0, y - startYRef.current));
  }
  function onPointerUp() {
    setDragging(false);
    if (dragY > 120) onClose();
    else setDragY(0);
  }

  let statusView = 'idle';
  if (!configured && raw) statusView = 'unconfigured';
  else if (raw && resultat?.statut) statusView = 'result';
  else if (raw) statusView = 'thinking';

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes crossfade { from { opacity: 0; } to { opacity: 1; } }
        .fade-swap { animation: crossfade 0.35s ease forwards; }
        @keyframes digitPop { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }
        .digit-pop { animation: digitPop 0.22s cubic-bezier(0.16, 1, 0.3, 1); display: inline-flex; align-items: baseline; }
        @keyframes dotSeq {
          0%, 20% { opacity: 0.28; transform: scale(0.82); }
          40%, 55% { opacity: 1; transform: scale(1); }
          80%, 100% { opacity: 0.28; transform: scale(0.82); }
        }
        .thinking-dot { animation: dotSeq 1.3s ease-in-out infinite; }
        .amount-input { background: transparent; border: none; outline: none; text-align: center; caret-color: ${colors.roseA}; }
        .amount-input::placeholder { color: rgba(247,246,243,0.16); font-weight: 700; }
      `}</style>

      <div className="w-full max-w-sm min-h-screen flex flex-col justify-end">
        <div
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          onMouseDown={onPointerDown} onMouseMove={dragging ? onPointerMove : undefined} onMouseUp={onPointerUp} onMouseLeave={dragging ? onPointerUp : undefined}
          className="w-full px-6 pt-3 flex flex-col"
          style={{
            backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
            border: `1px solid ${colors.cardBorder}`, borderBottom: 'none', minHeight: '86vh',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
            transform: `translateY(${dragY}px)`, marginBottom: keyboardInset,
            transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.25s ease',
            touchAction: 'none',
          }}
        >
          <div className="w-full flex justify-center mb-3 cursor-grab">
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} />
          </div>

          <div className="flex items-center mb-6">
            <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]"
              style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
              <X size={13} color={colors.textSecondary} strokeWidth={2} />
            </button>
          </div>

          <p className="text-center mb-8 px-4" style={{ fontFamily: fontText, fontSize: '17px', fontWeight: 500, color: colors.textPrimary, letterSpacing: '-0.005em', lineHeight: '1.4' }}>
            Quel montant souhaites-tu te verser ?
          </p>

          <div className="flex items-center justify-center mb-7 relative" style={{ minHeight: '96px' }}>
            <input
              ref={inputRef} value={raw} onChange={handleChange} inputMode="decimal" placeholder="•••• €" className="amount-input"
              style={{
                width: '220px', textAlign: 'center',
                fontFamily: fontDisplay, fontWeight: 700, fontSize: '56px',
                color: raw ? 'transparent' : colors.textPrimary,
                caretColor: colors.roseA,
                letterSpacing: '-0.03em', ...tabularNums,
              }}
            />
            {raw && (
              <span className="digit-pop" style={{ ...tabularNums, position: 'absolute', pointerEvents: 'none', fontFamily: fontDisplay, fontWeight: 700, fontSize: '70px', color: colors.textPrimary, letterSpacing: '-0.04em' }}>
                {formatMontantSaisi(raw)}<span style={{ marginLeft: '7px' }}>€</span>
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-start cursor-text" onClick={() => inputRef.current?.focus()} style={{ minHeight: '150px' }}>
            {statusView === 'idle' && (
              <p key="idle" className="text-center mt-8 fade-swap" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textTertiary, opacity: 0.55 }}>
                Commence par saisir un montant.
              </p>
            )}

            {statusView === 'unconfigured' && (
              <p key="unconfigured" className="text-center mt-8 px-6 fade-swap" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textTertiary, lineHeight: '1.5' }}>
                Renseigne le solde de ton compte société dans Mon espace pour que PILOT puisse évaluer ce versement.
              </p>
            )}

            {statusView === 'thinking' && (
              <div key="thinking" className="flex items-center gap-2 mt-8 fade-swap">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="thinking-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, animationDelay: `${i * 0.16}s` }} />
                ))}
              </div>
            )}

            {statusView === 'result' && (
              <div key={resultat.statut} className="w-full fade-swap mt-8">
                <p className="text-center px-6 mb-2" style={{ fontFamily: fontText, fontSize: '16.5px', fontWeight: 600, color: statusColors[resultat.statut], letterSpacing: '-0.005em' }}>
                  {resultat.message}
                </p>
                <p className="text-center px-8 mb-6" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
                  {resultat.conseil}
                </p>

                <button onClick={(e) => { e.stopPropagation(); setDetailOpen((v) => !v); }} className="w-full flex items-center justify-center gap-1 mb-3">
                  <span style={eyebrowStyle()}>Voir pourquoi</span>
                  <ChevronDown size={12} color={colors.textTertiary} style={{ transform: detailOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
                </button>

                {detailOpen && (
                  <div className="w-full p-5 fade-swap" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: RADIUS.card }}>
                    {[
                      { label: 'Solde actuel', value: formatEUR(solde) },
                      { label: 'Montant demandé', value: `− ${formatEUR(montantSaisiVersNombre(debounced))}` },
                      { label: 'Solde après versement', value: formatEUR(resultat.soldeApres) },
                      { label: 'Dépenses mensuelles moyennes', value: formatEUR(depensesMensuellesMoyennes) },
                      { label: 'Trésorerie après versement', value: `${resultat.moisApres.toFixed(1).replace('.', ',')} mois` },
                      { label: 'Objectif configuré', value: `${preferences.tresorerieSecuriteMois} mois (≈ ${formatEUR(seuil)})` },
                    ].map((row, i) => (
                      <div key={row.label} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : 'none' }}>
                        <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary }}>{row.label}</span>
                        <span style={{ ...tabularNums, fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>{row.value}</span>
                      </div>
                    ))}
                    <p className="mt-4" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary, lineHeight: '1.5' }}>
                      Ce résultat utilise le même calcul que Dashboard, Trésorerie de sécurité et Prévisions — jamais une évaluation propre à cet écran.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
