import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, useAnimatedValue, statusColors, Z
} from '../design-system';
import { formatEUR, sommeDuMois, equivalentMensuel, nomMois, calculerSoldeActuel } from '../core/finance/calculs';
import { projeterTrajectoire } from '../core/finance/projection';
import { classifierSante } from '../core/finance/classification';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';

// Les messages restent spécifiques à cet écran (copy éditoriale),
// mais la couleur associée à chaque statut vient exclusivement de
// statusColors — plus jamais redéfinie localement.
const statusLabel = { ok: 'Ta trésorerie reste confortable.', prudence: 'Prudence conseillée.', danger: 'Vigilance requise.' };

// Anime plusieurs valeurs ensemble — la courbe entière se redessine en
// douceur quand la trajectoire change, jamais par à-coups.
function useAnimatedArray(targets, duration = 900) {
  const [values, setValues] = useState(targets);
  const raf = useRef();
  const startTime = useRef(null);
  const fromValues = useRef(targets);
  const key = targets.join(',');
  useEffect(() => {
    fromValues.current = values;
    startTime.current = null;
    const from = fromValues.current;
    function tick(ts) {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValues(from.map((f, i) => f + (targets[i] - f) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return values;
}

function catmullRomPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function TrajectoireChart({ data, selectedIndex, onSelect, width = 320, height = 168 }) {
  const padTop = 24;
  const padBottom = 16;
  const targetSoldes = data.map((m) => m.solde);
  const animatedSoldes = useAnimatedArray(targetSoldes, 900);
  const min = Math.min(...targetSoldes) - 3000;
  const max = Math.max(...targetSoldes) + 3000;
  const step = width / (data.length - 1);

  const points = data.map((m, i) => ({
    x: i * step,
    y: padTop + (1 - (animatedSoldes[i] - min) / (max - min)) * (height - padTop - padBottom),
  }));

  const linePath = catmullRomPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="relative" style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.roseA} stopOpacity="0.24" />
            <stop offset="100%" stopColor={colors.roseA} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.roseB} />
            <stop offset="100%" stopColor={colors.roseHi} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Repères d'échéances — issus des vraies charges fixes dues ce mois, jamais inventés */}
        {data.map((m, i) =>
          m.chargesDuMois.length > 0 ? (
            <g key={`ech-${i}`}>
              <line x1={points[i].x} y1={points[i].y - 22} x2={points[i].x} y2={points[i].y - 8} stroke="rgba(247,246,243,0.28)" strokeWidth="1" />
              <circle cx={points[i].x} cy={points[i].y - 26} r="2" fill={colors.roseHi} />
              <text x={points[i].x} y={points[i].y - 32} textAnchor="middle" fontSize="8.5" fill={colors.textSecondary} fontFamily={fontText} letterSpacing="0.02em" fontWeight="600">
                {m.chargesDuMois[0].nom}
              </text>
            </g>
          ) : null
        )}

        {data.map((m, i) => {
          const isSelected = i === selectedIndex;
          const c = statusColors[m.statut] || colors.textTertiary;
          return (
            <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
              <circle cx={points[i].x} cy={points[i].y} r="14" fill="transparent" />
              {isSelected && <circle cx={points[i].x} cy={points[i].y} r="7" fill={c} opacity="0.22" />}
              <circle cx={points[i].x} cy={points[i].y} r={isSelected ? 4.3 : 3.5} fill={c} stroke={colors.bgDeep} strokeWidth={isSelected ? 2 : 1.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MonthTimeline({ data, selectedIndex, onSelect }) {
  return (
    <div className="flex justify-between mt-2">
      {data.map((m, i) => {
        const active = i === selectedIndex;
        return (
          <button key={i} onClick={() => onSelect(i)} className="flex flex-col items-center gap-1.5 py-1 px-1.5">
            <span style={{ fontFamily: fontText, fontSize: '12px', fontWeight: active ? 700 : 500, color: active ? colors.roseHi : colors.textTertiary }}>
              {(() => { const n = nomMois(m.date).slice(0, 4); return n.charAt(0).toUpperCase() + n.slice(1); })()}
            </span>
            {m.actuel && <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: colors.roseA }} />}
          </button>
        );
      })}
    </div>
  );
}

function MonthDetailSheet({ data, index, onClose }) {
  const m = data[index];
  const prev = data[index - 1];
  const delta = prev ? m.solde - prev.solde : null;

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
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-9 sheet-rise"
        style={{
          backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
          border: `1px solid ${colors.cardBorder}`, borderBottom: 'none',
          transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'none',
        }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>

        <div className="flex items-center justify-between mb-7">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>
            {nomMois(m.date)}{m.actuel ? " (aujourd'hui)" : ''}
          </span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-7">
          <span style={eyebrowStyle()}>{m.actuel ? 'Solde constaté' : 'Solde estimé en fin de mois'}</span>
          <span className="mt-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '42px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
            {formatEUR(m.solde)}
          </span>
          {m.statut && (
            <span className="mt-2 text-[13px]" style={{ fontFamily: fontText, fontWeight: 600, color: statusColors[m.statut] }}>{statusLabel[m.statut]}</span>
          )}
          {delta !== null && (
            <span className="mt-1.5 text-[12px]" style={{ fontFamily: fontText, color: colors.textTertiary }}>
              {delta >= 0 ? '+' : ''}{formatEUR(delta)} vs {nomMois(prev.date)}
            </span>
          )}
        </div>

        <div className="p-5 mb-4" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
          {[
            { label: m.actuel ? 'Revenus du mois' : 'Revenus estimés', value: m.revenus },
            { label: m.actuel ? 'Dépenses du mois' : 'Dépenses estimées', value: -m.depenses },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : 'none' }}>
              <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>{row.label}</span>
              <span style={{ ...tabularNums, fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>
                {row.value < 0 ? '− ' : '+ '}{formatEUR(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>

        {m.chargesDuMois.length > 0 && (
          <div className="p-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <span style={eyebrowStyle()}>Charges fixes du mois</span>
            {m.chargesDuMois.map((c) => (
              <div key={c.id} className="flex items-center justify-between mt-3">
                <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>{c.nom}</span>
                <span style={{ ...tabularNums, fontFamily: fontDisplay, fontSize: '15px', fontWeight: 700, color: colors.roseA }}>{formatEUR(c.montant)}</span>
              </div>
            ))}
          </div>
        )}

        {!m.actuel && (
          <p className="mt-4 text-center" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary, lineHeight: '1.5' }}>
            Estimation basée sur la moyenne de tes revenus et dépenses récents, plus tes charges fixes réellement dues ce mois-ci.
          </p>
        )}
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran Prévisions
// ------------------------------------------------------------
// Plus aucun mois fictif, plus de classify() local, plus de seuils
// en dur. La trajectoire vient de projeterTrajectoire() (données
// réelles), le statut de chaque mois vient de classifierSante() —
// la même fonction que Dashboard et Trésorerie de sécurité.
// ============================================
export default function Previsions() {
  const { entreprise, chargement: chargementEntreprise } = useEntreprise();
  const { revenus, chargement: chargementRevenus } = useRevenus();
  const { ponctuelles, chargesFixes, chargement: chargementDepenses } = useDepenses();
  const [selectedIndex, setSelectedIndex] = useState(5);
  const [sheetOpen, setSheetOpen] = useState(false);

  const maintenant = new Date();
  const revenusMois = sommeDuMois(revenus, maintenant);
  const ponctuellesMois = sommeDuMois(ponctuelles, maintenant);
  const chargesMensuelles = chargesFixes.reduce((total, c) => total + equivalentMensuel(c.montant, c.frequence), 0);
  const depensesMois = ponctuellesMois + chargesMensuelles;

  const preferences = entreprise?.preferences;
  const soldeActuel = preferences
    ? calculerSoldeActuel({
        soldeInitial: preferences.soldeInitial,
        soldeInitialDate: preferences.soldeInitialDate,
        revenus,
        depensesPonctuelles: ponctuelles,
      })
    : null;

  const configured = soldeActuel != null;

  const trajectoireBrute = configured
    ? projeterTrajectoire({ soldeActuel, revenusMois, depensesMois, revenus, ponctuelles, chargesFixes, nombreMois: 6, reference: maintenant })
    : [];

  // Statut de chaque mois via la même fonction que le reste de l'app —
  // jamais un seuil en euros propre à cet écran.
  const trajectoire = trajectoireBrute.map((m) => ({
    ...m,
    statut: m.depenses > 0 ? classifierSante(m.solde / m.depenses) : null,
  }));

  const objectifMois = trajectoire[trajectoire.length - 1] || null;
  const animatedSolde = useAnimatedValue(objectifMois?.solde ?? 0, 700);

  const chargement = chargementEntreprise || chargementRevenus || chargementDepenses;
  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  function handleSelect(i) {
    setSelectedIndex(i);
    setSheetOpen(true);
  }

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
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Prévisions</span>
          </span>
        </div>

        {configured ? (
          <>
            <div className="mb-2 animate-rise" style={{ animationDelay: '20ms' }}>
              <span style={eyebrowStyle()}>Estimation en {nomMois(objectifMois.date)}</span>
              <div className="mt-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '44px', color: colors.textPrimary, letterSpacing: '-0.025em' }}>
                {formatEUR(animatedSolde)}
              </div>
              {objectifMois.statut && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[objectifMois.statut], boxShadow: `0 0 6px ${statusColors[objectifMois.statut]}` }} />
                  <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 500, color: colors.textPrimary }}>{statusLabel[objectifMois.statut]}</span>
                </div>
              )}
              <p className="mt-2" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary, lineHeight: '1.4' }}>
                Se recalcule automatiquement avec tes revenus et dépenses enregistrés.
              </p>
            </div>

            <div className="mt-1 mb-1 animate-rise" style={{ animationDelay: '80ms' }}>
              <TrajectoireChart data={trajectoire} selectedIndex={selectedIndex} onSelect={handleSelect} />
              <MonthTimeline data={trajectoire} selectedIndex={selectedIndex} onSelect={handleSelect} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center px-6 animate-rise" style={{ paddingTop: '10vh' }}>
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>Pas encore de projection possible</span>
            <p className="mt-2" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '240px' }}>
              Renseigne le solde de ton compte société dans Mon espace pour que PILOT commence à projeter ta trésorerie.
            </p>
          </div>
        )}

        {sheetOpen && <MonthDetailSheet data={trajectoire} index={selectedIndex} onClose={() => setSheetOpen(false)} />}
      </div>
    </div>
  );
}
