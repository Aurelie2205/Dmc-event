import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, HandCoins, RotateCcw, Sparkles, Circle, ChevronRight, Inbox } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, useAnimatedValue, TAB_BAR_HEIGHT, Z
} from '../design-system';
import { formatEUR, formatDateRelative, formatDateCourte, dateISOLocale, sommeDuMois, moisPrecedent, nomMois, nettoyerSaisieMontant, montantSaisiVersNombre, formatMontantSaisi } from '../core/finance/calculs';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';
import Toast from '../components/Toast';

const categories = [
  { key: 'travorium', label: 'Commission Travorium', icon: HandCoins },
  { key: 'remboursement', label: 'Remboursement', icon: RotateCcw },
  { key: 'exceptionnel', label: 'Revenu exceptionnel', icon: Sparkles },
  { key: 'autre', label: 'Autre', icon: Circle },
];

function categoryIcon(key) {
  return categories.find((c) => c.key === key)?.icon || Circle;
}

// ============================================
// Ligne de revenu
// ============================================
function RevenuRow({ revenu, isNew }) {
  const Icon = categoryIcon(revenu.categorie);
  const label = categories.find((c) => c.key === revenu.categorie)?.label || 'Autre';
  return (
    <div className={`flex items-center justify-between py-4 ${isNew ? 'row-enter' : ''}`} style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.roseSoft }}>
          <Icon size={15} color={colors.roseA} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontFamily: fontText, fontWeight: 600, fontSize: '14.5px', color: colors.textPrimary }}>{label}</div>
          <div style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textSecondary, marginTop: '2px' }}>{formatDateRelative(new Date(revenu.date))}</div>
        </div>
      </div>
      <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '16px', color: colors.textPrimary }}>
        + {formatEUR(revenu.montant)}
      </span>
    </div>
  );
}

// ============================================
// État vide — honnête, jamais un écran silencieusement blanc
// ============================================
function EtatVide() {
  return (
    <div className="flex flex-col items-center text-center px-6 animate-rise" style={{ paddingTop: '12vh' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: colors.roseSoft }}>
        <Inbox size={22} color={colors.roseA} strokeWidth={1.8} />
      </div>
      <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>Aucun revenu enregistré</span>
      <p className="mt-2" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '230px' }}>
        Enregistre ton premier revenu pour que PILOT commence à suivre ta trésorerie réelle.
      </p>
    </div>
  );
}

// ============================================
// Sheet "J'ai été payée"
// ============================================
function AjoutRevenuSheet({ onClose, onSave }) {
  const [raw, setRaw] = useState('');
  const [dateChoisie, setDateChoisie] = useState(() => dateISOLocale());
  const [categorie, setCategorie] = useState('travorium');
  const [autreOuvert, setAutreOuvert] = useState(false);
  const inputRef = useRef();

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

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

  const peutEnregistrer = raw && montantSaisiVersNombre(raw) > 0;

  function handleSave() {
    if (!peutEnregistrer) return;
    if (navigator.vibrate) navigator.vibrate(10);
    // dateChoisie est au format "AAAA-MM-JJ" (natif du input date) — on y
    // ajoute l'heure actuelle plutôt que minuit, pour un tri/affichage
    // cohérent avec les entrées historiques qui ont une vraie heure.
    const maintenant = new Date();
    const [an, mois, jour] = dateChoisie.split('-').map(Number);
    const date = new Date(an, mois - 1, jour, maintenant.getHours(), maintenant.getMinutes());
    onSave({ montant: montantSaisiVersNombre(raw), categorie, date: date.toISOString() });
  }

  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheet }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        onMouseDown={onPointerDown}
        onMouseMove={dragging ? onPointerMove : undefined}
        onMouseUp={onPointerUp}
        onMouseLeave={dragging ? onPointerUp : undefined}
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-8 sheet-rise"
        style={{
          backgroundColor: colors.bgDeep,
          borderTopLeftRadius: RADIUS.sheet,
          borderTopRightRadius: RADIUS.sheet,
          border: `1px solid ${colors.cardBorder}`,
          borderBottom: 'none',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'none',
        }}
      >
        <div className="w-full flex justify-center mb-3">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} />
        </div>

        <div className="flex items-center justify-between mb-7">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>J'ai été payée</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center justify-center mb-8 relative" style={{ minHeight: '78px' }}>
          <input
            ref={inputRef}
            value={raw}
            onChange={handleChange}
            inputMode="decimal"
            placeholder="•••• €"
            className="amount-input"
            style={{
              width: '220px',
              textAlign: 'center',
              fontFamily: fontDisplay, fontWeight: 700, fontSize: '46px',
              color: raw ? 'transparent' : colors.textPrimary,
              caretColor: colors.roseA,
              letterSpacing: '-0.03em',
              ...tabularNums,
            }}
          />
          {raw && (
            <span className="digit-pop" style={{ ...tabularNums, position: 'absolute', pointerEvents: 'none', fontFamily: fontDisplay, fontWeight: 700, fontSize: '54px', color: colors.textPrimary, letterSpacing: '-0.03em' }}>
              {formatMontantSaisi(raw)}<span style={{ marginLeft: '6px' }}>€</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4 py-3.5 px-4 relative" style={{ ...cardSurface(), borderRadius: RADIUS.control }}>
          <span style={eyebrowStyle()}>Date</span>
          <div className="flex items-center gap-1 pointer-events-none">
            <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>
              {formatDateCourte(new Date(dateChoisie + 'T12:00:00'))}
            </span>
            <ChevronRight size={13} color={colors.textTertiary} />
          </div>
          {/* Input natif invisible superposé — ouvre le vrai sélecteur de
              date iOS/Android au tap, sur toute la largeur de la ligne. */}
          <input
            type="date"
            value={dateChoisie}
            onChange={(e) => e.target.value && setDateChoisie(e.target.value)}
            max={dateISOLocale()}
            className="absolute inset-0 w-full h-full opacity-0"
            style={{ colorScheme: 'dark' }}
            aria-label="Choisir la date"
          />
        </div>

        <button
          onClick={() => { setCategorie('travorium'); setAutreOuvert(false); }}
          className="w-full flex items-center justify-between py-3.5 px-4 mb-3 transition-transform active:scale-[0.99]"
          style={{
            borderRadius: RADIUS.control,
            backgroundColor: categorie === 'travorium' ? colors.roseSoft : 'transparent',
            border: `1px solid ${categorie === 'travorium' ? colors.roseBorder : colors.cardBorder}`,
          }}
        >
          <span className="flex items-center gap-2.5">
            <HandCoins size={15} color={categorie === 'travorium' ? colors.roseA : colors.textSecondary} />
            <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>Commission Travorium</span>
          </span>
          {categorie === 'travorium' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.roseA }} />}
        </button>

        {!autreOuvert ? (
          <button onClick={() => setAutreOuvert(true)} className="mb-8">
            <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Autre revenu
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 mb-8 fade-swap">
            {categories.filter((c) => c.key !== 'travorium').map((c) => {
              const Icon = c.icon;
              const active = categorie === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategorie(c.key)}
                  className="w-full flex items-center justify-between py-3 px-4 transition-transform active:scale-[0.99]"
                  style={{
                    borderRadius: RADIUS.control,
                    backgroundColor: active ? colors.roseSoft : 'transparent',
                    border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}`,
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={14} color={active ? colors.roseA : colors.textSecondary} />
                    <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 500, color: colors.textPrimary }}>{c.label}</span>
                  </span>
                  {active && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.roseA }} />}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!peutEnregistrer}
          className="w-full py-4 transition-transform active:scale-[0.98]"
          style={{
            borderRadius: RADIUS.control,
            background: peutEnregistrer ? `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})` : 'rgba(255,255,255,0.06)',
            fontFamily: fontText,
          }}
        >
          <span className="text-[14.5px] font-semibold" style={{ color: peutEnregistrer ? colors.onAccent : colors.textTertiary }}>
            Enregistrer
          </span>
        </button>
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran Revenus
// ------------------------------------------------------------
// Ne détient plus aucune liste locale — useRevenus() est la seule
// source. Le comparatif "vs mois dernier" est calculé sur les
// vraies dates des revenus enregistrés ; s'il n'y a pas encore de
// mois précédent, le badge ne s'affiche simplement pas — jamais
// un pourcentage inventé faute de donnée.
// ============================================
export default function Revenus() {
  const { revenus, chargement, ajouter } = useRevenus();
  const { chargesFixes } = useDepenses();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [toast, setToast] = useState(null);

  const maintenant = new Date();
  const total = sommeDuMois(revenus, maintenant);
  const totalMoisDernier = sommeDuMois(revenus, moisPrecedent(maintenant));
  // Appelé inconditionnellement, avant tout retour anticipé — les hooks
  // ne doivent jamais dépendre d'une condition qui varie d'un rendu à l'autre.
  const animatedTotal = useAnimatedValue(total, 900);

  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const aUnComparatif = totalMoisDernier > 0;
  const percentVsMoisDernier = aUnComparatif ? Math.round(((total - totalMoisDernier) / totalMoisDernier) * 100) : null;
  const progression = percentVsMoisDernier !== null && percentVsMoisDernier >= 0;

  const revenusDuMois = revenus.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
  });

  async function handleSave(nouveau) {
    const suivants = await ajouter(nouveau);
    setLastAddedId(suivants[0].id);
    setSheetOpen(false);
    setToast({
      titre: 'Paiement enregistré',
      message: `Tu as été payée de ${formatEUR(nouveau.montant)}. Félicitations, PILOT met à jour ta trésorerie.`,
      sousTexte: chargesFixes.length > 0 ? 'Pense à garder une réserve pour tes charges à venir.' : null,
    });
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes rowEnter { from { opacity: 0; transform: translateY(-8px); background-color: ${colors.roseGhost}; } to { opacity: 1; transform: translateY(0); background-color: transparent; } }
        .row-enter { animation: rowEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-swap { animation: fadeIn 0.25s ease; }
        @keyframes digitPop { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }
        .digit-pop { animation: digitPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: inline-flex; align-items: baseline; }
        .amount-input { background: transparent; border: none; outline: none; text-align: center; caret-color: ${colors.roseA}; }
        .amount-input::placeholder { color: rgba(247,246,243,0.16); font-weight: 700; }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 110px)` }}>
        <div className="flex items-center justify-between mb-10">
          <span className="inline-flex items-center gap-2.5">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block' }} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Revenus</span>
          </span>
        </div>

        <div className="mb-8 animate-rise" style={{ animationDelay: '20ms' }}>
          <div className="flex items-start justify-between">
            <span style={eyebrowStyle()}>Total de {nomMois(maintenant)}</span>
            {aUnComparatif && (
              <span style={{ fontFamily: fontText, fontSize: '11.5px', fontWeight: 600, color: progression ? colors.green : colors.red, ...tabularNums }}>
                {progression ? '+' : ''}{percentVsMoisDernier}% vs mois dernier
              </span>
            )}
          </div>
          <div className="mt-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '40px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
            {formatEUR(animatedTotal)}
          </div>
          <div className="mt-1.5" style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textTertiary }}>
            {revenusDuMois.length} revenu{revenusDuMois.length > 1 ? 's' : ''} enregistré{revenusDuMois.length > 1 ? 's' : ''} ce mois-ci
          </div>
        </div>

        <div className="animate-rise" style={{ animationDelay: '80ms' }}>
          {revenus.length === 0 ? (
            <EtatVide />
          ) : (
            revenus.map((r) => <RevenuRow key={r.id} revenu={r} isNew={r.id === lastAddedId} />)
          )}
        </div>

        <div
          className="fixed left-0 right-0 flex justify-center px-5 pt-6"
          style={{
            bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            background: `linear-gradient(0deg, ${colors.bgDeep} 65%, rgba(11,11,13,0))`,
            paddingBottom: '14px',
            zIndex: Z.fabFlottant, // sous les sheets — ne doit jamais les recouvrir
          }}
        >
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})`, borderRadius: RADIUS.control }}
          >
            <Plus size={17} color="#0D0D0D" strokeWidth={2.5} />
            <span className="text-[14.5px] font-semibold" style={{ color: colors.onAccent, fontFamily: fontText }}>J'ai été payée</span>
          </button>
        </div>

        {sheetOpen && <AjoutRevenuSheet onClose={() => setSheetOpen(false)} onSave={handleSave} />}
        {toast && <Toast {...toast} onDone={() => setToast(null)} />}
      </div>
    </div>
  );
}
