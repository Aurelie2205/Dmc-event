import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, X, ChevronRight, Landmark, Receipt, Banknote, Car, Laptop2,
  UtensilsCrossed, Package, Circle, RefreshCw, Trash2, PauseCircle, Inbox,
} from 'lucide-react';
import {
  colors, fontDisplay, fontText, tabularNums, RADIUS,
  eyebrowStyle, cardSurface, useAnimatedValue, TAB_BAR_HEIGHT, Z
} from '../design-system';
import {
  formatEUR, formatDateRelative, formatDateCourte, dateISOLocale,
  equivalentMensuel, sommeDuMois, moisPrecedent, nomMois,
  nettoyerSaisieMontant, montantSaisiVersNombre, formatMontantSaisi,
  prochaineEcheanceMensuelle, formatEcheance,
} from '../core/finance/calculs';
import { useDepenses } from '../data/hooks/useDepenses';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { useRevenus } from '../data/hooks/useRevenus';
import Toast from '../components/Toast';
import { moyenneMensuelle } from '../core/finance/projection';
import { calculerSoldeActuel, calculerReserveUrssaf } from '../core/finance/calculs';

const categoriesPonctuelles = [
  { key: 'urssaf', label: 'URSSAF', icon: Landmark },
  { key: 'impots', label: 'Impôts', icon: Receipt },
  { key: 'salaire', label: 'Salaire dirigeant', icon: Banknote },
  { key: 'deplacement', label: 'Déplacement', icon: Car },
  { key: 'logiciel', label: 'Logiciel', icon: Laptop2 },
  { key: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { key: 'materiel', label: 'Matériel', icon: Package },
  { key: 'autre', label: 'Autre', icon: Circle },
];
function catInfo(key) {
  return categoriesPonctuelles.find((c) => c.key === key) || categoriesPonctuelles[categoriesPonctuelles.length - 1];
}

const freqLabel = { mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel' };

// ============================================
// Coque de sheet réutilisable
// ============================================
function SheetShell({ title, onClose, children }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

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
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="w-full flex justify-center mb-3">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} />
        </div>
        <div className="flex items-center justify-between mb-7">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>{title}</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
    </SheetPortal>
  );
}

function AmountField({ raw, setRaw, size = 54 }) {
  const inputRef = useRef();
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  return (
    <div className="flex items-center justify-center mb-8 relative" style={{ minHeight: '78px' }}>
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(nettoyerSaisieMontant(e.target.value))}
        inputMode="decimal"
        placeholder="•••• €"
        className="amount-input"
        style={{
          width: '220px',
          textAlign: 'center',
          fontFamily: fontDisplay, fontWeight: 700, fontSize: `${size - 8}px`,
          color: raw ? 'transparent' : colors.textPrimary,
          caretColor: colors.roseA,
          letterSpacing: '-0.03em',
          ...tabularNums,
        }}
      />
      {raw && (
        <span className="digit-pop" style={{ ...tabularNums, position: 'absolute', pointerEvents: 'none', fontFamily: fontDisplay, fontWeight: 700, fontSize: `${size}px`, color: colors.textPrimary, letterSpacing: '-0.03em' }}>
          {formatMontantSaisi(raw)}<span style={{ marginLeft: '6px' }}>€</span>
        </span>
      )}
    </div>
  );
}

// ============================================
// État vide — cohérent avec Revenus et Objectifs
// ============================================
function EtatVide({ texte }) {
  return (
    <div className="flex flex-col items-center text-center px-6 animate-rise" style={{ paddingTop: '10vh' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: colors.roseSoft }}>
        <Inbox size={22} color={colors.roseA} strokeWidth={1.8} />
      </div>
      <p style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', maxWidth: '230px' }}>{texte}</p>
    </div>
  );
}

// ============================================
// Sheet "J'ai payé" — dépense ponctuelle
// ============================================
function AjoutDepenseSheet({ onClose, onSave }) {
  const [raw, setRaw] = useState('');
  const [categorie, setCategorie] = useState(null);
  const [dateChoisie, setDateChoisie] = useState(() => dateISOLocale());

  const peutEnregistrer = raw && montantSaisiVersNombre(raw) > 0 && categorie;

  function handleSave() {
    if (!peutEnregistrer) return;
    if (navigator.vibrate) navigator.vibrate(10);
    const maintenant = new Date();
    const [an, mois, jour] = dateChoisie.split('-').map(Number);
    const date = new Date(an, mois - 1, jour, maintenant.getHours(), maintenant.getMinutes());
    onSave({ montant: montantSaisiVersNombre(raw), categorie, date: date.toISOString() });
  }

  return (
    <SheetShell title="J'ai payé" onClose={onClose}>
      <AmountField raw={raw} setRaw={setRaw} />

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {categoriesPonctuelles.map((c) => {
          const Icon = c.icon;
          const active = categorie === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategorie(c.key)}
              className="flex items-center gap-2 py-3 px-3.5 transition-transform active:scale-[0.98]"
              style={{
                borderRadius: RADIUS.control,
                backgroundColor: active ? colors.roseSoft : 'transparent',
                border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}`,
              }}
            >
              <Icon size={14} color={active ? colors.roseA : colors.textSecondary} />
              <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 500, color: colors.textPrimary, textAlign: 'left' }}>{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-6 py-3.5 px-4 relative" style={{ ...cardSurface(), borderRadius: RADIUS.control }}>
        <span style={eyebrowStyle()}>Date</span>
        <div className="flex items-center gap-1 pointer-events-none">
          <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 600, color: colors.textPrimary }}>
            {formatDateCourte(new Date(dateChoisie + 'T12:00:00'))}
          </span>
          <ChevronRight size={13} color={colors.textTertiary} />
        </div>
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
        onClick={handleSave}
        disabled={!peutEnregistrer}
        className="w-full py-4 transition-transform active:scale-[0.98]"
        style={{
          borderRadius: RADIUS.control,
          background: peutEnregistrer ? `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})` : 'rgba(255,255,255,0.06)',
          fontFamily: fontText,
        }}
      >
        <span className="text-[14.5px] font-semibold" style={{ color: peutEnregistrer ? colors.onAccent : colors.textTertiary }}>Enregistrer</span>
      </button>
    </SheetShell>
  );
}

// ============================================
// Sheet "Nouvelle charge fixe"
// ============================================
function NouvelleChargeFixeSheet({ onClose, onSave }) {
  const [nom, setNom] = useState('');
  const [raw, setRaw] = useState('');
  const [frequence, setFrequence] = useState('mensuel');
  const [dateChoisie, setDateChoisie] = useState(() => dateISOLocale());
  const [dejaPrelevee, setDejaPrelevee] = useState(false);
  const nomRef = useRef();

  useEffect(() => { const t = setTimeout(() => nomRef.current?.focus(), 60); return () => clearTimeout(t); }, []);

  const peutEnregistrer = nom.trim().length > 0 && raw && montantSaisiVersNombre(raw) > 0;

  function handleSave() {
    if (!peutEnregistrer) return;
    if (navigator.vibrate) navigator.vibrate(10);
    const [an, mois, jour] = dateChoisie.split('-').map(Number);

    let prochaine;
    if (frequence === 'mensuel') {
      // Seul le jour du mois compte pour une charge mensuelle — la
      // vraie prochaine échéance est toujours recalculée par rapport
      // à aujourd'hui, jamais figée à la date choisie dans le sélecteur.
      prochaine = prochaineEcheanceMensuelle(jour, dejaPrelevee, new Date());
    } else {
      // Trimestriel/annuel : la date choisie ancre directement le mois
      // de récurrence (peut légitimement être dans le passé, pour
      // compléter l'historique d'une charge déjà en cours).
      prochaine = new Date(an, mois - 1, jour, 12, 0);
    }
    onSave({ nom: nom.trim(), montant: montantSaisiVersNombre(raw), frequence, prochaine: prochaine.toISOString() });
  }

  return (
    <SheetShell title="Nouvelle charge fixe" onClose={onClose}>
      <div className="mb-6">
        <span style={eyebrowStyle()}>Nom</span>
        <input
          ref={nomRef}
          value={nom}
          onChange={(e) => setNom(e.target.value.slice(0, 40))}
          placeholder="Ex. Assurance, Loyer, Logiciel…"
          className="w-full mt-2 py-3.5 px-4"
          style={{
            ...cardSurface({ backgroundImage: 'none' }),
            borderRadius: RADIUS.control,
            fontFamily: fontText, fontSize: '14.5px', fontWeight: 500, color: colors.textPrimary,
            outline: 'none',
          }}
        />
      </div>

      <div className="mb-2">
        <span style={eyebrowStyle()}>Montant</span>
      </div>
      <AmountField raw={raw} setRaw={setRaw} size={46} />

      <div className="mb-6">
        <span style={eyebrowStyle()}>Fréquence</span>
        <div className="flex gap-2 mt-2">
          {Object.keys(freqLabel).map((key) => {
            const active = frequence === key;
            return (
              <button
                key={key}
                onClick={() => setFrequence(key)}
                className="flex-1 py-2.5 transition-transform active:scale-[0.98]"
                style={{
                  borderRadius: RADIUS.control,
                  backgroundColor: active ? colors.roseSoft : 'transparent',
                  border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}`,
                }}
              >
                <span style={{ fontFamily: fontText, fontSize: '13px', fontWeight: 600, color: active ? colors.roseA : colors.textSecondary }}>{freqLabel[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 py-3.5 px-4 relative" style={{ ...cardSurface(), borderRadius: RADIUS.control }}>
        <span style={eyebrowStyle()}>{frequence === 'mensuel' ? 'Jour de prélèvement' : 'Prochaine échéance'}</span>
        <div className="flex items-center gap-1 pointer-events-none">
          <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>
            {frequence === 'mensuel'
              ? `Le ${new Date(dateChoisie + 'T12:00:00').getDate()} de chaque mois`
              : formatDateCourte(new Date(dateChoisie + 'T12:00:00'))}
          </span>
          <ChevronRight size={13} color={colors.textTertiary} />
        </div>
        <input
          type="date"
          value={dateChoisie}
          onChange={(e) => e.target.value && setDateChoisie(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0"
          style={{ colorScheme: 'dark' }}
          aria-label="Choisir la date de prélèvement"
        />
      </div>

      {frequence === 'mensuel' && (
        <button
          onClick={() => setDejaPrelevee((v) => !v)}
          className="w-full flex items-center justify-between mb-6 py-3.5 px-4 transition-transform active:scale-[0.99]"
          style={{ ...cardSurface(), borderRadius: RADIUS.control }}
        >
          <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, textAlign: 'left', maxWidth: '220px' }}>
            Déjà prélevée ce mois-ci
          </span>
          <div
            className="relative flex-shrink-0"
            style={{ width: '40px', height: '24px', borderRadius: '12px', backgroundColor: dejaPrelevee ? colors.roseA : 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: '18px', height: '18px', top: '3px', left: '3px',
                backgroundColor: '#0D0D0D',
                transform: dejaPrelevee ? 'translateX(16px)' : 'translateX(0)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </button>
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
        <span className="text-[14.5px] font-semibold" style={{ color: peutEnregistrer ? colors.onAccent : colors.textTertiary }}>Enregistrer</span>
      </button>
    </SheetShell>
  );
}

// ============================================
// Fiches détail
// ============================================
function DepenseDetailSheet({ depense, onClose, onDelete }) {
  const { icon: Icon, label } = catInfo(depense.categorie);
  return (
    <SheetShell title="Détail" onClose={onClose}>
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors.roseSoft }}>
          <Icon size={20} color={colors.roseA} strokeWidth={2} />
        </div>
        <span style={{ fontFamily: fontText, fontSize: '14px', color: colors.textSecondary, marginBottom: '6px' }}>{label}</span>
        <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '40px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
          {formatEUR(depense.montant)}
        </span>
        <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textTertiary, marginTop: '8px' }}>{formatDateRelative(new Date(depense.date))}</span>
      </div>

      <button
        onClick={() => onDelete(depense.id)}
        className="w-full flex items-center justify-center gap-2 py-3.5 transition-transform active:scale-[0.98]"
        style={{ borderRadius: RADIUS.control, border: `1px solid rgba(232,92,92,0.25)` }}
      >
        <Trash2 size={14} color={colors.red} />
        <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.red }}>Supprimer cette dépense</span>
      </button>
    </SheetShell>
  );
}

function ChargeDetailSheet({ charge, onClose, onDeactivate }) {
  return (
    <SheetShell title="Détail" onClose={onClose}>
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors.roseSoft }}>
          <RefreshCw size={18} color={colors.roseA} strokeWidth={2} />
        </div>
        <span style={{ fontFamily: fontText, fontSize: '14px', color: colors.textSecondary, marginBottom: '6px' }}>{charge.nom}</span>
        <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '40px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
          {formatEUR(charge.montant)}
        </span>
        <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textTertiary, marginTop: '8px' }}>
          {freqLabel[charge.frequence]} • prévue {formatEcheance(new Date(charge.prochaine))}
        </span>
      </div>

      <button
        onClick={() => onDeactivate(charge.id)}
        className="w-full flex items-center justify-center gap-2 py-3.5 transition-transform active:scale-[0.98]"
        style={{ borderRadius: RADIUS.control, border: `1px solid ${colors.cardBorder}` }}
      >
        <PauseCircle size={14} color={colors.textSecondary} />
        <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textSecondary }}>Désactiver cette charge</span>
      </button>
    </SheetShell>
  );
}

// ============================================
// Lignes de liste
// ============================================
function DepenseRow({ depense, isNew, onTap }) {
  const { icon: Icon, label } = catInfo(depense.categorie);
  function handleTap() {
    if (navigator.vibrate) navigator.vibrate(5);
    onTap(depense);
  }
  return (
    <button
      onClick={handleTap}
      className={`w-full flex items-center justify-between py-4 px-2 -mx-2 rounded-xl transition-colors duration-150 active:bg-white/[0.045] ${isNew ? 'row-enter' : ''}`}
      style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <Icon size={15} color={colors.textSecondary} strokeWidth={2} />
        </div>
        <div className="text-left">
          <div style={{ fontFamily: fontText, fontWeight: 600, fontSize: '14.5px', color: colors.textPrimary }}>{label}</div>
          <div style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textSecondary, marginTop: '2px' }}>{formatDateRelative(new Date(depense.date))}</div>
        </div>
      </div>
      <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 800, fontSize: '17px', color: colors.textPrimary }}>
        − {formatEUR(depense.montant)}
      </span>
    </button>
  );
}

function ChargeFixeRow({ charge, isNew, onTap }) {
  function handleTap() {
    if (navigator.vibrate) navigator.vibrate(5);
    onTap(charge);
  }
  return (
    <button
      onClick={handleTap}
      className={`w-full flex items-center justify-between py-4 px-2 -mx-2 rounded-xl transition-colors duration-150 active:bg-white/[0.045] ${isNew ? 'row-enter' : ''}`}
      style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={13} color={colors.textSecondary} strokeWidth={2} />
        </div>
        <div className="text-left">
          <div style={{ fontFamily: fontText, fontWeight: 600, fontSize: '14.5px', color: colors.textPrimary }}>{charge.nom}</div>
          <div style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textSecondary, marginTop: '2px' }}>
            {freqLabel[charge.frequence]} • prévue {formatEcheance(new Date(charge.prochaine))}
          </div>
        </div>
      </div>
      <span style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 800, fontSize: '17px', color: colors.textPrimary }}>
        {formatEUR(charge.montant)}
      </span>
    </button>
  );
}

// ============================================
// Écran Dépenses
// ------------------------------------------------------------
// Plus aucune liste locale, plus de equivalentMensuel() dupliqué,
// plus de référence "mois dernier" inventée — tout vient de
// useDepenses() et de /core/finance/calculs.js.
// ============================================
export default function Depenses() {
  const {
    ponctuelles, chargesFixes, chargement,
    ajouterUnePonctuelle, supprimerUnePonctuelle,
    ajouterUneChargeFixe, desactiverUneChargeFixe,
  } = useDepenses();
  const { entreprise } = useEntreprise();
  const { revenus } = useRevenus();

  const [tab, setTab] = useState('depenses');
  const [sheetOpen, setSheetOpen] = useState(null);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [selectedDepense, setSelectedDepense] = useState(null);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [toast, setToast] = useState(null);

  const maintenant = new Date();
  const totalPonctuelles = sommeDuMois(ponctuelles, maintenant);
  const totalPonctuellesMoisDernier = sommeDuMois(ponctuelles, moisPrecedent(maintenant));
  const totalChargesMensuel = chargesFixes.reduce((s, c) => s + equivalentMensuel(c.montant, c.frequence), 0);
  const totalMois = totalPonctuelles + totalChargesMensuel;
  // Comparatif calculé sur les vraies ponctuelles du mois dernier — les
  // charges fixes ne varient pas d'un mois à l'autre par définition,
  // donc seule la partie ponctuelle a un sens à comparer.
  const totalMoisDernier = totalPonctuellesMoisDernier + totalChargesMensuel;
  const animatedTotal = useAnimatedValue(totalMois, 900);

  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const aUnComparatif = totalPonctuellesMoisDernier > 0;
  const percentVsMoisDernier = aUnComparatif ? Math.round(((totalMois - totalMoisDernier) / totalMoisDernier) * 100) : null;
  const enBaisse = percentVsMoisDernier !== null && percentVsMoisDernier <= 0;

  async function handleDeleteDepense(id) {
    await supprimerUnePonctuelle(id);
    setSelectedDepense(null);
  }
  async function handleDeactivateCharge(id) {
    await desactiverUneChargeFixe(id);
    setSelectedCharge(null);
  }
  async function handleSaveDepense(nouveau) {
    const suivantes = await ajouterUnePonctuelle(nouveau);
    setLastAddedId(suivantes[0].id);
    setSheetOpen(null);

    const categorieLabel = categoriesPonctuelles.find((c) => c.key === nouveau.categorie)?.label || nouveau.categorie;

    if (nouveau.categorie === 'salaire') {
      // Virement vers soi : on vérifie que la réserve URSSAF estimée
      // reste couverte par ce qu'il reste en compte, jamais un calcul
      // caché — les mêmes fonctions que Dashboard/NEXA.
      const soldeApres = entreprise?.preferences
        ? calculerSoldeActuel({
            soldeInitial: entreprise.preferences.soldeInitial,
            soldeInitialDate: entreprise.preferences.soldeInitialDate,
            revenus,
            depensesPonctuelles: suivantes,
          })
        : null;
      const revenusMoyens = moyenneMensuelle(revenus, new Date());
      const reserveUrssaf = entreprise?.preferences ? calculerReserveUrssaf(revenusMoyens, entreprise.preferences.tauxChargesSociales) : 0;
      const reserveCouverte = soldeApres == null || reserveUrssaf === 0 || soldeApres >= reserveUrssaf;

      setToast({
        titre: 'Virement enregistré',
        message: `${formatEUR(nouveau.montant)} versés. Ta trésorerie est mise à jour.`,
        sousTexte: reserveCouverte
          ? null
          : `Attention : il resterait moins que ta réserve URSSAF estimée (${formatEUR(reserveUrssaf)}).`,
      });
    } else {
      setToast({
        titre: 'Dépense enregistrée',
        message: `${formatEUR(nouveau.montant)} ajoutés dans ${categorieLabel}. Ta trésorerie est mise à jour.`,
      });
    }
  }
  async function handleSaveCharge(nouvelle) {
    const suivantes = await ajouterUneChargeFixe(nouvelle);
    setLastAddedId(suivantes[0].id);
    setSheetOpen(null);
    setTab('charges');
    setToast({
      titre: 'Charge fixe ajoutée',
      message: `${nouvelle.nom} sera désormais pris en compte chaque mois dans tes prévisions.`,
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
        @keyframes digitPop { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }
        .digit-pop { animation: digitPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: inline-flex; align-items: baseline; }
        .amount-input { background: transparent; border: none; outline: none; text-align: center; caret-color: ${colors.roseA}; }
        .amount-input::placeholder { color: rgba(247,246,243,0.16); font-weight: 700; }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 130px)` }}>
        <div className="flex items-center justify-between mb-10">
          <span className="inline-flex items-center gap-2.5">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block' }} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Dépenses</span>
          </span>
        </div>

        <div className="mb-7 animate-rise" style={{ animationDelay: '20ms' }}>
          <div className="flex items-start justify-between">
            <span style={eyebrowStyle()}>Total de {nomMois(maintenant)}</span>
            {aUnComparatif && (
              <span style={{ fontFamily: fontText, fontSize: '11.5px', fontWeight: 600, color: enBaisse ? colors.green : colors.red, ...tabularNums }}>
                {percentVsMoisDernier > 0 ? '+' : ''}{percentVsMoisDernier}% vs mois dernier
              </span>
            )}
          </div>
          <div className="mt-2" style={{ ...tabularNums, fontFamily: fontDisplay, fontWeight: 700, fontSize: '40px', color: colors.textPrimary, letterSpacing: '-0.02em' }}>
            {formatEUR(animatedTotal)}
          </div>
          <div className="mt-1.5" style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textTertiary }}>
            Charges fixes : {formatEUR(totalChargesMensuel)} • Dépenses : {formatEUR(totalPonctuelles)}
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 animate-rise" style={{ animationDelay: '60ms', backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: RADIUS.control }}>
          {[{ key: 'charges', label: 'Charges fixes' }, { key: 'depenses', label: 'Dépenses' }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2.5 transition-all"
              style={{ borderRadius: RADIUS.control - 6, backgroundColor: tab === t.key ? colors.roseSoft : 'transparent' }}
            >
              <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: tab === t.key ? colors.roseA : colors.textSecondary }}>{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'depenses' && (
          <div className="animate-rise" style={{ animationDelay: '100ms' }}>
            {ponctuelles.length === 0 ? (
              <EtatVide texte="Aucune dépense ponctuelle enregistrée. Utilise « J'ai payé » dès qu'une dépense sort du compte." />
            ) : (
              ponctuelles.map((d) => <DepenseRow key={d.id} depense={d} isNew={d.id === lastAddedId} onTap={setSelectedDepense} />)
            )}
          </div>
        )}

        {tab === 'charges' && (
          <div className="animate-rise" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-6 p-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
              <div>
                <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '20px', color: colors.textPrimary }}>
                  {chargesFixes.length} charge{chargesFixes.length > 1 ? 's' : ''} fixe{chargesFixes.length > 1 ? 's' : ''} active{chargesFixes.length > 1 ? 's' : ''}
                </div>
                <div className="mt-1" style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary }}>
                  {formatEUR(totalChargesMensuel)} prévus chaque mois
                </div>
              </div>
            </div>

            {chargesFixes.length === 0 ? (
              <EtatVide texte="Aucune charge fixe configurée. Ajoute tes abonnements et charges récurrentes pour ne plus jamais les ressaisir." />
            ) : (
              chargesFixes.map((c) => <ChargeFixeRow key={c.id} charge={c} isNew={c.id === lastAddedId} onTap={setSelectedCharge} />)
            )}

            <button onClick={() => setSheetOpen('charge')} className="mt-5">
              <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textSecondary, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                + Nouvelle charge fixe
              </span>
            </button>
          </div>
        )}

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
            onClick={() => setSheetOpen('depense')}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})`, borderRadius: RADIUS.control }}
          >
            <Plus size={17} color="#0D0D0D" strokeWidth={2.5} />
            <span className="text-[14.5px] font-semibold" style={{ color: colors.onAccent, fontFamily: fontText }}>J'ai payé</span>
          </button>
        </div>

        {sheetOpen === 'depense' && <AjoutDepenseSheet onClose={() => setSheetOpen(null)} onSave={handleSaveDepense} />}
        {sheetOpen === 'charge' && <NouvelleChargeFixeSheet onClose={() => setSheetOpen(null)} onSave={handleSaveCharge} />}
        {toast && <Toast {...toast} onDone={() => setToast(null)} />}
        {selectedDepense && <DepenseDetailSheet depense={selectedDepense} onClose={() => setSelectedDepense(null)} onDelete={handleDeleteDepense} />}
        {selectedCharge && <ChargeDetailSheet charge={selectedCharge} onClose={() => setSelectedCharge(null)} onDeactivate={handleDeactivateCharge} />}
      </div>
    </div>
  );
}
