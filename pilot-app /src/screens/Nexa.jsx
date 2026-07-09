import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import {
  X, ChevronRight, TrendingUp, Target, LineChart,
  MessageCircle, Send, ShieldQuestion, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, glassSurface, TAB_BAR_HEIGHT, Z
} from '../design-system';
import {
  formatEUR, sommeDuMois, equivalentMensuel, calculerSoldeActuel, calculerSeuilSecurite,
  calculerDisponibleBrut, calculerReserveUrssaf, calculerArgentPrudent,
} from '../core/finance/calculs';
import { classifierSante } from '../core/finance/classification';
import { calculerObjectif, trierObjectifs } from '../core/finance/objectifs';
import { moyenneMensuelle, projeterTrajectoire } from '../core/finance/projection';
import { genererConseils } from '../core/copilot/regles';
import { repondre, suggestions } from '../core/copilot/conversation';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import { useDepenses } from '../data/hooks/useDepenses';
import { useObjectifs } from '../data/hooks/useObjectifs';

// Icônes et couleurs associées à chaque carte — décision purement
// visuelle, volontairement tenue à l'écart de /core/copilot/regles.js
// (le moteur de conseils ne doit rien savoir de lucide-react).
const PRESENTATION_PAR_ID = {
  'solde-non-configure': { icon: ShieldQuestion, color: colors.textSecondary },
  'charges-non-configurees': { icon: ShieldQuestion, color: colors.textSecondary },
  'identite-incomplete': { icon: ShieldQuestion, color: colors.textSecondary },
  'objectif-non-configure': { icon: ShieldQuestion, color: colors.textSecondary },
  'reserve-urssaf-insuffisante': { icon: AlertTriangle, color: colors.red },
  objectifs: { icon: Target, color: colors.roseA },
  optimisation: { icon: TrendingUp, color: colors.green },
  analyse: { icon: LineChart, color: colors.green },
};

function NexaAvatar({ size = 36, pulse = false }) {
  const stroke = size * 0.09;
  const r = (size - stroke) / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.72;
  const arcLength = circumference * arcFraction;
  const rotation = 90 + (360 * (1 - arcFraction)) / 2;

  return (
    <div
      className={pulse ? 'avatar-pulse' : ''}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size, borderRadius: '50%', backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="nexaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.roseHi} />
            <stop offset="100%" stopColor={colors.roseB} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`} strokeLinecap="round" transform={`rotate(${rotation} ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#nexaGrad)" strokeWidth={stroke}
          strokeDasharray={`${arcLength * 0.62} ${circumference}`} strokeLinecap="round" transform={`rotate(${rotation} ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={size * 0.09} fill={colors.roseHi} />
      </svg>
    </div>
  );
}

function DetailSheet({ titre, detail, onClose }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  function onPointerDown(e) { startYRef.current = e.touches ? e.touches[0].clientY : e.clientY; setDragging(true); }
  function onPointerMove(e) { if (!dragging) return; const y = e.touches ? e.touches[0].clientY : e.clientY; setDragY(Math.max(0, y - startYRef.current)); }
  function onPointerUp() { setDragging(false); if (dragY > 120) onClose(); else setDragY(0); }

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
        }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '16px', color: colors.textPrimary }}>{titre}</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>
        <div className="p-5 mb-4" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
          {detail.steps.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : 'none' }}>
              <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>{row.label}</span>
              <span style={{ ...tabularNums, fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>{row.value}</span>
            </div>
          ))}
        </div>
        {detail.conclusion && <p style={{ fontFamily: fontText, fontSize: '14px', lineHeight: '1.55', color: colors.textPrimary }}>{detail.conclusion}</p>}
      </div>
    </div>
    </SheetPortal>
  );
}

function ConseilCard({ conseil, onVoirPourquoi, delay }) {
  const { icon: Icon, color } = PRESENTATION_PAR_ID[conseil.id] || { icon: ShieldQuestion, color: colors.textSecondary };
  return (
    <div className="p-5 mb-3.5 animate-rise" style={{ ...cardSurface(), borderRadius: RADIUS.card, animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon size={14} color={color} strokeWidth={2} />
        </div>
        <span style={{ ...eyebrowStyle(), color }}>{conseil.categorie}</span>
      </div>
      <p style={{ fontFamily: fontText, fontSize: '14px', lineHeight: '1.5', color: colors.textPrimary }}>{conseil.message}</p>
      {!conseil.manquant && conseil.detail && (
        <button onClick={() => onVoirPourquoi(conseil)} className="flex items-center gap-1 mt-3">
          <span style={{ fontFamily: fontText, fontSize: '12px', fontWeight: 600, color: colors.roseA }}>Voir pourquoi</span>
          <ChevronRight size={12} color={colors.roseA} />
        </button>
      )}
    </div>
  );
}

function ConversationSheet({ ctx, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  function poserQuestion(q) {
    if (!q.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const { texte } = repondre(q, ctx);
      setMessages((prev) => [...prev, { role: 'pilot', text: texte }]);
      setThinking(false);
      if (navigator.vibrate) navigator.vibrate(6);
    }, 700);
  }

  return (
    <SheetPortal><div className="fixed inset-0 flex justify-center" style={{ zIndex: Z.sheet, backgroundColor: colors.bgDeep }}>
      <div className="w-full max-w-sm flex flex-col" style={{ backgroundColor: colors.bgDeep }}>
        <div className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <NexaAvatar size={28} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>NEXA</span>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={14} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="mb-5 animate-rise">
              <p style={{ fontFamily: fontText, fontSize: '14.5px', color: colors.textSecondary, lineHeight: '1.5' }}>
                Pose-moi une question sur ta trésorerie, tes objectifs ou tes revenus. Je réponds à partir de tes vraies données — si je n'ai pas l'information, je te le dirai.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`mb-4 flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'pilot' && <NexaAvatar size={22} />}
              <div className="px-4 py-3 animate-rise" style={{ maxWidth: '78%', borderRadius: RADIUS.control, backgroundColor: m.role === 'user' ? colors.roseSoft : colors.card, border: `1px solid ${m.role === 'user' ? colors.roseBorder : colors.cardBorder}` }}>
                <p style={{ fontFamily: fontText, fontSize: '13.5px', lineHeight: '1.5', color: colors.textPrimary }}>{m.text}</p>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-end gap-2 justify-start mb-4">
              <NexaAvatar size={22} />
              <div className="px-4 py-3.5 flex items-center gap-1.5" style={{ borderRadius: RADIUS.control, backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                {[0, 1, 2].map((i) => <div key={i} className="thinking-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, animationDelay: `${i * 0.16}s` }} />)}
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => poserQuestion(s)} className="text-left px-4 py-3 transition-transform active:scale-[0.98]" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control }}>
                  <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary }}>{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', borderTop: `1px solid ${colors.cardBorder}` }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control }}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') poserQuestion(input); }}
              placeholder="Pose une question à NEXA…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: fontText, fontSize: '14px', color: colors.textPrimary }}
            />
            <button onClick={() => poserQuestion(input)} aria-label="Envoyer" className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.roseA }}>
              <Send size={15} color="#0D0D0D" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran NEXA
// ------------------------------------------------------------
// Dernier écran migré. Ne détient plus aucune donnée locale : tout
// vient de Mon espace, Revenus, Dépenses et Objectifs — les mêmes
// hooks que les six écrans précédents. Le statut de sécurité vient
// de classifierSante(), l'estimation de décembre de la même
// projeterTrajectoire() que Prévisions, l'objectif prioritaire de la
// même trierObjectifs()/calculerObjectif() qu'Objectifs. Chaque
// conseil passe par le garde-fou et la hiérarchie avant d'atteindre
// cet écran — NEXA n'invente ni ne recalcule sa propre vérité.
// ============================================
export default function Nexa() {
  const { entreprise, chargement: chargementEntreprise } = useEntreprise();
  const { revenus, chargement: chargementRevenus } = useRevenus();
  const { ponctuelles, chargesFixes, chargement: chargementDepenses } = useDepenses();
  const { objectifs, chargement: chargementObjectifs } = useObjectifs();

  const [detailSheet, setDetailSheet] = useState(null);
  const [conversationOpen, setConversationOpen] = useState(false);

  const maintenant = new Date();
  const revenusMois = sommeDuMois(revenus, maintenant);
  const ponctuellesMois = sommeDuMois(ponctuelles, maintenant);
  const chargesMensuelles = chargesFixes.reduce((total, c) => total + equivalentMensuel(c.montant, c.frequence), 0);
  const depensesVariablesMoyenne = moyenneMensuelle(ponctuelles, maintenant);
  // Deux usages distincts, jamais mélangés : le mois réel pour le point
  // "aujourd'hui" de la trajectoire projetée, la moyenne réelle pour tout
  // calcul de sécurité — sans quoi le seuil fluctuerait selon le jour du
  // mois plutôt que selon la vraie situation financière.
  const depensesMoisActuel = ponctuellesMois + chargesMensuelles;
  const depensesMensuellesMoyennes = depensesVariablesMoyenne + chargesMensuelles;

  const preferences = entreprise?.preferences;
  const solde = preferences
    ? calculerSoldeActuel({ soldeInitial: preferences.soldeInitial, soldeInitialDate: preferences.soldeInitialDate, revenus, depensesPonctuelles: ponctuelles })
    : null;
  const seuil = preferences && depensesMensuellesMoyennes > 0 ? calculerSeuilSecurite(preferences.tresorerieSecuriteMois, depensesMensuellesMoyennes) : null;
  const moisDeTresorerieActuel = solde != null && depensesMensuellesMoyennes > 0 ? solde / depensesMensuellesMoyennes : null;
  const statutSecurite = moisDeTresorerieActuel != null ? classifierSante(moisDeTresorerieActuel) : null;

  // Réserve URSSAF estimée (taux ajustable, Mon espace) et argent
  // réellement prudent à utiliser — jamais confondu avec le disponible
  // brut (voir calculerArgentPrudent). Même logique que le Dashboard.
  const disponibleBrut = solde != null && seuil != null ? calculerDisponibleBrut({ solde, seuilSecurite: seuil }) : null;
  const reserveUrssaf = preferences ? calculerReserveUrssaf(moyenneMensuelle(revenus, maintenant), preferences.tauxChargesSociales) : 0;
  const argentPrudent = disponibleBrut != null ? calculerArgentPrudent(disponibleBrut, reserveUrssaf) : null;

  const objectifsTries = trierObjectifs(objectifs, maintenant);
  const premierObjectif = objectifsTries[0] || null;
  const objectifPrioritaire = premierObjectif ? { ...premierObjectif, calc: calculerObjectif(premierObjectif, maintenant) } : null;

  const trajectoire = solde != null
    ? projeterTrajectoire({ soldeActuel: solde, revenusMois, depensesMois: depensesMoisActuel, revenus, ponctuelles, chargesFixes, nombreMois: 6, reference: maintenant })
    : [];
  const estimationDecembre = trajectoire.length > 0 ? trajectoire[trajectoire.length - 1].solde : null;

  const ctx = {
    solde,
    seuil,
    tresorerieSecuriteMois: preferences?.tresorerieSecuriteMois ?? null,
    niveauPrudence: preferences?.niveauPrudence ?? 'equilibre',
    statutSecurite,
    depensesMensuellesMoyennes,
    depensesVariablesMoisCourant: ponctuellesMois,
    depensesVariablesMoyenne,
    chargesFixes,
    revenusMois,
    objectifPrioritaire,
    reserveUrssaf,
    argentPrudent,
    tauxChargesSociales: preferences?.tauxChargesSociales ?? null,
    identiteComplete: !!(entreprise?.identite?.formeJuridique && entreprise?.identite?.regimeFiscal && entreprise?.identite?.regimeSocial && entreprise?.identite?.tva),
  };

  const chargement = chargementEntreprise || chargementRevenus || chargementDepenses || chargementObjectifs;
  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const conseils = genererConseils(ctx);
  const nomAffiche = entreprise.identite.nomComplet || 'là';

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes dotSeq { 0%, 20% { opacity: 0.28; transform: scale(0.82); } 40%, 55% { opacity: 1; transform: scale(1); } 80%, 100% { opacity: 0.28; transform: scale(0.82); } }
        .thinking-dot { animation: dotSeq 1.3s ease-in-out infinite; }
        @keyframes avatarPulse {
          0% { box-shadow: 0 0 0 0 ${colors.roseGlow}; transform: scale(1); }
          40% { box-shadow: 0 0 14px 3px ${colors.roseGlow}; transform: scale(1.07); }
          100% { box-shadow: 0 0 0 0 transparent; transform: scale(1); }
        }
        .avatar-pulse { animation: avatarPulse 0.6s ease-out; border-radius: 50%; }
        @keyframes textFadeDelayed { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .text-fade-delayed { opacity: 0; animation: textFadeDelayed 0.6s ease forwards; animation-delay: 0.32s; }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 24px)` }}>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <NexaAvatar size={38} pulse />
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '21px', color: colors.textPrimary, letterSpacing: '-0.01em' }}>
              Bonjour {nomAffiche} 👋
            </span>
          </div>
          <p className="mt-2.5 text-fade-delayed" style={{ fontFamily: fontText, fontSize: '14.5px', lineHeight: '1.5' }}>
            <span style={{ color: colors.roseA, fontWeight: 600, fontStyle: 'normal' }}>NEXA</span>
            <span style={{ color: colors.textSecondary, fontStyle: 'italic' }}> — J'ai analysé la situation de ton entreprise. Voici ce qui mérite ton attention aujourd'hui.</span>
          </p>

          {ctx.identiteComplete && ctx.solde != null && ctx.chargesFixes.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-fade-delayed" style={{ fontFamily: fontText, fontSize: '12px', color: colors.green }}>
              <ShieldCheck size={12} color={colors.green} />
              Tes données sont suffisamment complètes pour que NEXA puisse fournir des conseils fiables.
            </p>
          )}

          <div className="mt-5 p-5 animate-rise" style={{ ...cardSurface(), borderRadius: RADIUS.card, animationDelay: '620ms' }}>
            {[
              {
                emoji: statutSecurite ? { ok: '🟢', prudence: '🟠', danger: '🔴' }[statutSecurite] : '⚪️',
                label: 'Trésorerie de sécurité',
                value: moisDeTresorerieActuel != null ? `${moisDeTresorerieActuel.toFixed(1).replace('.', ',')} mois` : 'À configurer',
              },
              { emoji: '📈', label: 'Estimation en décembre', value: estimationDecembre != null ? formatEUR(estimationDecembre) : 'À configurer' },
              {
                emoji: '🎯',
                label: objectifPrioritaire ? `Objectif prioritaire · ${objectifPrioritaire.nom}` : 'Objectif prioritaire',
                value: objectifPrioritaire && isFinite(objectifPrioritaire.calc.moisRestants) ? `${Math.round(objectifPrioritaire.calc.moisRestants)} mois` : '—',
              },
            ].map((row, i) => (
              <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: i > 0 ? `1px solid ${colors.cardBorder}` : 'none' }}>
                <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary }}>{row.emoji} {row.label}</span>
                <span style={{ ...tabularNums, fontFamily: fontText, fontSize: '13.5px', fontWeight: 700, color: colors.textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <span style={eyebrowStyle()}>Ce que j'ai remarqué aujourd'hui</span>
        </div>
        {conseils.map((c, i) => (
          <ConseilCard key={c.id} conseil={c} onVoirPourquoi={(conseil) => setDetailSheet({ titre: 'Comment NEXA a calculé ça', detail: conseil.detail })} delay={740 + i * 80} />
        ))}

        {/* Espace de conversation — pas un simple champ posé en bas de page.
            L'invitation précède le champ : on s'adresse à quelqu'un avant de
            lui écrire. Le rose signale que ce bloc appelle une action. */}
        <div className="mt-7 px-5 pt-6 pb-5 animate-rise" style={{ ...glassSurface(), borderRadius: RADIUS.card, animationDelay: `${740 + conseils.length * 80 + 60}ms` }}>
          <div className="flex items-center gap-2.5 mb-2">
            <NexaAvatar size={26} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '15px', color: colors.textPrimary }}>Besoin d'aide ?</span>
          </div>
          <p className="mb-5" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
            Demande à NEXA d'analyser une dépense, un revenu, tes charges ou ta trésorerie.
          </p>

          <button
            onClick={() => setConversationOpen(true)}
            className="w-full flex items-center gap-2.5 px-4 py-3.5 transition-transform active:scale-[0.98]"
            style={{ borderRadius: RADIUS.control, backgroundColor: colors.roseSoft, border: `1px solid ${colors.roseBorder}` }}
          >
            <MessageCircle size={15} color={colors.roseA} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span className="min-w-0" style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.roseA, textAlign: 'left' }}>
              Pose une question à NEXA…
            </span>
          </button>
        </div>

        {detailSheet && <DetailSheet titre={detailSheet.titre} detail={detailSheet.detail} onClose={() => setDetailSheet(null)} />}
        {conversationOpen && <ConversationSheet ctx={ctx} onClose={() => setConversationOpen(false)} />}
      </div>
    </div>
  );
}
