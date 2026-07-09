import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Home, PiggyBank, Car, Building2, Plane, Target, Calendar, Check, Pin, Pencil, Trash2 } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, useAnimatedValue, TAB_BAR_HEIGHT, Z
} from '../design-system';
import { formatEUR, nettoyerSaisieMontant, montantSaisiVersNombre } from '../core/finance/calculs';
import { calculerObjectif, trierObjectifs } from '../core/finance/objectifs';
import { useObjectifs } from '../data/hooks/useObjectifs';

const typesObjectifs = [
  { key: 'maison', label: 'Maison', icon: Home },
  { key: 'apport', label: 'Apport', icon: PiggyBank },
  { key: 'voiture', label: 'Voiture', icon: Car },
  { key: 'reserve', label: 'Réserve entreprise', icon: Building2 },
  { key: 'voyage', label: 'Voyage', icon: Plane },
  { key: 'personnalise', label: 'Personnalisé', icon: Target },
];
function typeInfo(key) {
  return typesObjectifs.find((t) => t.key === key) || typesObjectifs[typesObjectifs.length - 1];
}

const freqLabel = { hebdo: 'Hebdomadaire', mensuel: 'Mensuelle', trimestriel: 'Trimestrielle' };

// ============================================
// Carte compacte
// ============================================
function ObjectifCard({ objectif, onTap }) {
  const { icon: Icon } = typeInfo(objectif.type);
  const calc = calculerObjectif(objectif);
  const animatedProgress = useAnimatedValue(calc.progression, 900);
  const accent = calc.termine ? colors.green : colors.roseA;

  const [celebrate, setCelebrate] = useState(false);
  const prevTermine = useRef(calc.termine);
  useEffect(() => {
    if (calc.termine && !prevTermine.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 900);
      return () => clearTimeout(t);
    }
    prevTermine.current = calc.termine;
  }, [calc.termine]);

  return (
    <div onClick={onTap} className="relative w-full p-5 text-left" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
      {objectif.epingle && (
        <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.roseSoft, border: `1px solid ${colors.roseBorderStrong}` }}>
          <Pin size={11} color={colors.roseA} strokeWidth={2.3} />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: calc.termine ? colors.greenSoft : colors.roseSoft }}>
          <Icon size={16} color={accent} strokeWidth={2} />
        </div>
        <span style={{ fontFamily: fontText, fontWeight: 600, fontSize: '15px', color: colors.textPrimary }}>{objectif.nom}</span>
      </div>

      <div className="relative w-full mb-2.5" style={{ height: '7px' }}>
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.045)' }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${animatedProgress * 100}%`, background: calc.termine ? colors.green : `linear-gradient(90deg, ${colors.roseB}, ${colors.roseHi})`, transition: 'background 0.4s ease' }}
        />
      </div>

      {calc.termine ? (
        <div className="relative flex items-center gap-1.5" style={{ height: '16px' }}>
          {celebrate && (
            <div className="absolute inset-0 flex items-center pointer-events-none" style={{ left: '2px' }}>
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <div key={i} style={{ position: 'absolute', transform: `rotate(${deg}deg)` }}>
                  <div className="confetti-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: i % 2 ? colors.roseHi : colors.green, animationDelay: `${i * 25}ms` }} />
                </div>
              ))}
            </div>
          )}
          <Check size={12} color={colors.green} strokeWidth={3} className={celebrate ? 'check-pop' : ''} />
          <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: colors.green }}>
            {calc.depasse ? 'Objectif dépassé' : 'Objectif atteint'}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textSecondary }}>{formatEUR(calc.reste)} restants</span>
          <div className="flex items-center gap-1.5">
            {calc.enRetard && (
              <span style={{ fontFamily: fontText, fontSize: '11px', fontWeight: 600, color: colors.orange }}>En retard ·</span>
            )}
            <Calendar size={13} color={colors.roseA} strokeWidth={2} />
            <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: colors.textSecondary }}>{calc.dateEstimee}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Wrapper de swipe
// ============================================
function SwipeableObjectifCard({ objectif, delay, onTap, onPin, onEdit, onDelete }) {
  const ACTIONS_WIDTH = 174;
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const movedRef = useRef(false);

  function onDown(e) {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    movedRef.current = false;
    setDragging(true);
  }
  function onMove(e) {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const base = translateX === -ACTIONS_WIDTH ? -ACTIONS_WIDTH : 0;
    let delta = base + (x - startX.current);
    delta = Math.min(0, Math.max(delta, -ACTIONS_WIDTH));
    if (Math.abs(x - startX.current) > 6) movedRef.current = true;
    setTranslateX(delta);
  }
  function onUp() {
    setDragging(false);
    if (!movedRef.current) {
      if (translateX !== 0) setTranslateX(0);
      else onTap();
      return;
    }
    setTranslateX((prev) => (prev < -ACTIONS_WIDTH / 2 ? -ACTIONS_WIDTH : 0));
  }

  const actionBtn = (bg, handler, Icon, label, color) => (
    <button
      onClick={(e) => { e.stopPropagation(); setTranslateX(0); handler(); }}
      className="flex flex-col items-center justify-center gap-1"
      style={{ width: `${ACTIONS_WIDTH / 3}px`, backgroundColor: bg }}
    >
      <Icon size={15} color={color} strokeWidth={2} />
      <span style={{ fontFamily: fontText, fontSize: '10px', fontWeight: 600, color }}>{label}</span>
    </button>
  );

  return (
    <div className="relative mb-3.5 animate-rise" style={{ borderRadius: RADIUS.card, overflow: 'hidden', animationDelay: `${delay}ms` }}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width: `${ACTIONS_WIDTH}px` }}>
        {actionBtn(colors.rosePress, onPin, Pin, objectif.epingle ? 'Désépingler' : 'Épingler', colors.roseA)}
        {actionBtn('rgba(255,255,255,0.06)', onEdit, Pencil, 'Modifier', colors.textSecondary)}
        {actionBtn('rgba(232,92,92,0.16)', onDelete, Trash2, 'Supprimer', colors.red)}
      </div>
      <div
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        onMouseDown={onDown} onMouseMove={dragging ? onMove : undefined} onMouseUp={onUp} onMouseLeave={dragging ? onUp : undefined}
        style={{ transform: `translateX(${translateX}px)`, transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'pan-y' }}
      >
        <ObjectifCard objectif={objectif} onTap={() => {}} />
      </div>
    </div>
  );
}

// ============================================
// Sheet détail
// ============================================
function ObjectifDetailSheet({ objectif, onClose, onTogglePin }) {
  const { icon: Icon } = typeInfo(objectif.type);
  const calc = calculerObjectif(objectif);
  const [simDelta, setSimDelta] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  function onPointerDown(e) { startYRef.current = e.touches ? e.touches[0].clientY : e.clientY; setDragging(true); }
  function onPointerMove(e) { if (!dragging) return; const y = e.touches ? e.touches[0].clientY : e.clientY; setDragY(Math.max(0, y - startYRef.current)); }
  function onPointerUp() { setDragging(false); if (dragY > 120) onClose(); else setDragY(0); }

  const simObjectif = { ...objectif, montant: objectif.montant + simDelta };
  const simCalc = simDelta > 0 ? calculerObjectif(simObjectif) : null;

  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheet }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        onMouseDown={onPointerDown} onMouseMove={dragging ? onPointerMove : undefined} onMouseUp={onPointerUp} onMouseLeave={dragging ? onPointerUp : undefined}
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-9 sheet-rise"
        style={{
          backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
          border: `1px solid ${colors.cardBorder}`, borderBottom: 'none',
          transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'none',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>{objectif.nom}</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        <button onClick={() => onTogglePin(objectif.id)} className="flex items-center gap-1.5 mb-6">
          <Pin size={12} color={objectif.epingle ? colors.roseA : colors.textTertiary} strokeWidth={2.3} />
          <span style={{ fontFamily: fontText, fontSize: '12px', fontWeight: 500, color: objectif.epingle ? colors.roseA : colors.textTertiary }}>
            {objectif.epingle ? 'Objectif épinglé' : 'Épingler cet objectif'}
          </span>
        </button>

        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: calc.termine ? colors.greenSoft : colors.roseSoft }}>
            <Icon size={20} color={calc.termine ? colors.green : colors.roseA} strokeWidth={2} />
          </div>
          {calc.termine ? (
            <>
              <span style={eyebrowStyle()}>{calc.depasse ? 'Objectif dépassé' : 'Objectif atteint'}</span>
              <span className="mt-2 flex items-center gap-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '36px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
                <Check size={26} color={colors.green} strokeWidth={3} /> {formatEUR(objectif.dejaDisponible)}
              </span>
            </>
          ) : (
            <>
              <span style={eyebrowStyle()}>Reste à épargner</span>
              <span className="mt-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '40px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
                {formatEUR(calc.reste)}
              </span>
            </>
          )}
        </div>

        <div className="relative w-full mb-2.5" style={{ height: '10px' }}>
          <div className="absolute inset-0 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.045)' }} />
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${calc.progression * 100}%`, background: calc.termine ? colors.green : `linear-gradient(90deg, ${colors.roseB}, ${colors.roseHi})`, boxShadow: calc.termine ? 'none' : `0 0 10px ${colors.roseGlow}` }} />
        </div>
        <div className="flex items-center justify-between mb-7">
          <span style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary }}>{formatEUR(objectif.dejaDisponible)} épargnés</span>
          <span style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary }}>Cible {formatEUR(objectif.cible)}</span>
        </div>

        <div className="p-5 mb-4" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
          {[
            { label: 'Montant cible', value: formatEUR(objectif.cible) },
            { label: 'Déjà épargné', value: formatEUR(objectif.dejaDisponible) },
            { label: 'Restant', value: formatEUR(calc.reste) },
            { label: "Rythme d'épargne actuel", value: `${formatEUR(objectif.montant)} / ${freqLabel[objectif.frequence].toLowerCase()}` },
            { label: 'Date estimée', value: calc.dateEstimee || '—' },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : 'none' }}>
              <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>{row.label}</span>
              <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>{row.value}</span>
            </div>
          ))}
        </div>

        {!calc.termine && (
          <p className="text-center mb-4 px-2" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
            Au rythme actuel, objectif atteint dans <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{Math.round(calc.moisRestants)} mois</span> (environ {calc.dateEstimee}).
          </p>
        )}

        {calc.ecart && (
          <div className="p-5 mb-4" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>
              {calc.ecart.enAvance ? `En avance de ${calc.ecart.mois} mois sur ton objectif.` : `En retard de ${calc.ecart.mois} mois sur ton objectif.`}
            </span>
          </div>
        )}

        {!calc.termine && (
          <div className="p-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <span style={eyebrowStyle()}>Simulation</span>
            <div className="flex gap-2 mt-3 mb-3">
              {[50, 100, 200].map((d) => {
                const active = simDelta === d;
                return (
                  <button key={d} onClick={() => setSimDelta(active ? 0 : d)} className="flex-1 py-2 transition-transform active:scale-[0.98]"
                    style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}>
                    <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: active ? colors.roseA : colors.textSecondary }}>+{d} €</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
              {simCalc
                ? `Avec ${formatEUR(simDelta)} de plus, tu l'atteindras en ${simCalc.dateEstimee}.`
                : "Choisis un montant pour voir l'effet sur ta date d'atteinte."}
            </p>
          </div>
        )}
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Sheet création
// ============================================
function NouvelObjectifSheet({ onClose, onSave }) {
  const [type, setType] = useState(null);
  const [nomPerso, setNomPerso] = useState('');
  const [cible, setCible] = useState('');
  const [dejaDisponible, setDejaDisponible] = useState('');
  const [frequence, setFrequence] = useState('mensuel');
  const [montant, setMontant] = useState('');
  const [dateChoice, setDateChoice] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  function onPointerDown(e) { startYRef.current = e.touches ? e.touches[0].clientY : e.clientY; setDragging(true); }
  function onPointerMove(e) { if (!dragging) return; const y = e.touches ? e.touches[0].clientY : e.clientY; setDragY(Math.max(0, y - startYRef.current)); }
  function onPointerUp() { setDragging(false); if (dragY > 120) onClose(); else setDragY(0); }

  const nomFinal = type === 'personnalise' ? nomPerso.trim() : type ? typeInfo(type).label : '';
  const peutEnregistrer = type && nomFinal && cible && montantSaisiVersNombre(cible) > 0 && montant && montantSaisiVersNombre(montant) > 0;

  function handleSave() {
    if (!peutEnregistrer) return;
    if (navigator.vibrate) navigator.vibrate(10);
    const dateMap = { '6m': 6, '1a': 12, '2a': 24 };
    let dateSouhaitee = null;
    if (dateChoice) {
      const d = new Date();
      d.setMonth(d.getMonth() + dateMap[dateChoice]);
      dateSouhaitee = d.toISOString();
    }
    onSave({ type, nom: nomFinal, cible: montantSaisiVersNombre(cible), dejaDisponible: montantSaisiVersNombre(dejaDisponible), frequence, montant: montantSaisiVersNombre(montant), dateSouhaitee });
  }

  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheet }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        onMouseDown={onPointerDown} onMouseMove={dragging ? onPointerMove : undefined} onMouseUp={onPointerUp} onMouseLeave={dragging ? onPointerUp : undefined}
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-8 sheet-rise"
        style={{
          backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
          border: `1px solid ${colors.cardBorder}`, borderBottom: 'none',
          transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'none',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>Nouvel objectif</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        <span style={eyebrowStyle()}>Type d'objectif</span>
        <div className="grid grid-cols-2 gap-2.5 mt-2 mb-5">
          {typesObjectifs.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <button key={t.key} onClick={() => setType(t.key)}
                className="flex items-center gap-2 py-3 px-3.5 transition-transform active:scale-[0.98]"
                style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}>
                <Icon size={14} color={active ? colors.roseA : colors.textSecondary} />
                <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 500, color: colors.textPrimary, textAlign: 'left' }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {type === 'personnalise' && (
          <div className="mb-5">
            <span style={eyebrowStyle()}>Nom</span>
            <input value={nomPerso} onChange={(e) => setNomPerso(e.target.value.slice(0, 40))} placeholder="Ex. Mariage, Studio photo…"
              className="w-full mt-2 py-3.5 px-4" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontText, fontSize: '14.5px', color: colors.textPrimary, outline: 'none' }} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <span style={eyebrowStyle()}>Montant cible</span>
            <input value={cible} onChange={(e) => setCible(nettoyerSaisieMontant(e.target.value))} inputMode="decimal" placeholder="0 €"
              className="w-full mt-2 py-3.5 px-4" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontDisplay, fontWeight: 700, fontSize: '15px', color: colors.textPrimary, outline: 'none', ...tabularNums }} />
          </div>
          <div>
            <span style={eyebrowStyle()}>Déjà disponible</span>
            <input value={dejaDisponible} onChange={(e) => setDejaDisponible(nettoyerSaisieMontant(e.target.value))} inputMode="decimal" placeholder="0 €"
              className="w-full mt-2 py-3.5 px-4" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontDisplay, fontWeight: 700, fontSize: '15px', color: colors.textPrimary, outline: 'none', ...tabularNums }} />
          </div>
        </div>

        <span style={eyebrowStyle()}>À quelle fréquence ?</span>
        <div className="flex gap-2 mt-2 mb-5">
          {Object.keys(freqLabel).map((key) => {
            const active = frequence === key;
            return (
              <button key={key} onClick={() => setFrequence(key)} className="flex-1 py-2.5 transition-transform active:scale-[0.98]"
                style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}>
                <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: active ? colors.roseA : colors.textSecondary }}>{freqLabel[key]}</span>
              </button>
            );
          })}
        </div>

        <span style={eyebrowStyle()}>Combien ?</span>
        <input value={montant} onChange={(e) => setMontant(nettoyerSaisieMontant(e.target.value, 6))} inputMode="decimal" placeholder="0 €"
          className="w-full mt-2 mb-5 py-3.5 px-4" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontDisplay, fontWeight: 700, fontSize: '16px', color: colors.textPrimary, outline: 'none', ...tabularNums }} />

        <span style={eyebrowStyle()}>Date souhaitée (optionnel)</span>
        <div className="flex gap-2 mt-2 mb-7">
          {[{ key: '6m', label: '6 mois' }, { key: '1a', label: '1 an' }, { key: '2a', label: '2 ans' }].map((d) => {
            const active = dateChoice === d.key;
            return (
              <button key={d.key} onClick={() => setDateChoice(active ? null : d.key)} className="flex-1 py-2.5 transition-transform active:scale-[0.98]"
                style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}>
                <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: active ? colors.roseA : colors.textSecondary }}>Dans {d.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={handleSave} disabled={!peutEnregistrer} className="w-full py-4 transition-transform active:scale-[0.98]"
          style={{ borderRadius: RADIUS.control, background: peutEnregistrer ? `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})` : 'rgba(255,255,255,0.06)', fontFamily: fontText }}>
          <span className="text-[14.5px] font-semibold" style={{ color: peutEnregistrer ? colors.onAccent : colors.textTertiary }}>Enregistrer</span>
        </button>
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran Objectifs
// ------------------------------------------------------------
// Plus de seedObjectifs, plus d'AUJOURDHUI figée, plus de
// equivalentMensuel/calculerObjectif/trierObjectifs locaux — tout
// vient de /core/finance/objectifs.js et /data/hooks/useObjectifs.
// ============================================
export default function Objectifs() {
  const { objectifs, chargement, ajouter, supprimer, togglePin } = useObjectifs();
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const selected = objectifs.find((o) => o.id === selectedId) || null;
  const objectifsTries = trierObjectifs(objectifs);

  async function handleSave(nouveau) {
    await ajouter(nouveau);
    setCreateOpen(false);
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes confettiBurst { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-18px) scale(0.4); opacity: 0; } }
        .confetti-dot { animation: confettiBurst 0.7s ease-out forwards; }
        @keyframes checkPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .check-pop { display: inline-block; animation: checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 120px)` }}>
        <div className="flex items-center justify-between mb-10">
          <span className="inline-flex items-center gap-2.5">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block' }} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Objectifs</span>
          </span>
        </div>

        {objectifsTries.length === 0 && (
          <div className="flex flex-col items-center text-center px-6 animate-rise" style={{ paddingTop: '18vh' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: colors.roseSoft }}>
              <Target size={22} color={colors.roseA} strokeWidth={1.8} />
            </div>
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>Aucun objectif pour l'instant</span>
            <p className="mt-2" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '240px' }}>
              Une maison, un apport, une voiture, une réserve — crée ton premier objectif pour que PILOT commence à en suivre la progression.
            </p>
          </div>
        )}

        {objectifsTries.map((o, i) => (
          <SwipeableObjectifCard
            key={o.id}
            objectif={o}
            delay={i * 60}
            onTap={() => setSelectedId(o.id)}
            onPin={() => togglePin(o.id)}
            onEdit={() => setSelectedId(o.id)}
            onDelete={() => supprimer(o.id)}
          />
        ))}

        <div
          className="fixed left-0 right-0 flex justify-center px-5 pt-6"
          style={{
            bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            background: `linear-gradient(0deg, ${colors.bgDeep} 65%, rgba(11,11,13,0))`,
            paddingBottom: '14px',
            zIndex: Z.fabFlottant, // sous les sheets — ne doit jamais les recouvrir
          }}
        >
          <button onClick={() => setCreateOpen(true)} className="w-full max-w-sm flex items-center justify-center gap-2 py-4 transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})`, borderRadius: RADIUS.control }}>
            <Plus size={17} color="#0D0D0D" strokeWidth={2.5} />
            <span className="text-[14.5px] font-semibold" style={{ color: colors.onAccent, fontFamily: fontText }}>Nouvel objectif</span>
          </button>
        </div>

        {selected && <ObjectifDetailSheet objectif={selected} onClose={() => setSelectedId(null)} onTogglePin={togglePin} />}
        {createOpen && <NouvelObjectifSheet onClose={() => setCreateOpen(false)} onSave={handleSave} />}
      </div>
    </div>
  );
}
