import { SheetPortal } from '../components/SheetPortal';
import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, ChevronRight, X, Check, Download, Trash2, Shield, LogOut, Loader2,
} from 'lucide-react';
import {
  colors, fontDisplay, fontText, RADIUS, eyebrowStyle, cardSurface, Z
} from '../design-system';
import { formatEUR, nettoyerSaisieMontant, montantSaisiVersNombre } from '../core/finance/calculs';
import { useEntreprise } from '../data/hooks/useEntreprise';
import { uploaderPhotoProfil, urlSigneePhoto } from '../data/storage';
import { rechercherEntrepriseParSiren } from '../lib/sirene';
import { supabase } from '../lib/supabaseClient';

// ============================================
// Configuration des 7 champs d'identité d'entreprise.
// Cette liste ne contient plus aucune valeur — seulement la
// description de chaque champ. Les valeurs viennent maintenant
// exclusivement de /data via useEntreprise().
// ============================================
// Correspondance code APE/NAF → libellé — volontairement incomplète
// (il existe plus de 700 codes officiels). Un code absent de cette
// liste s'affiche tel quel, jamais avec un libellé inventé.
const LIBELLES_APE = {
  '73.11Z': 'Activités des agences de publicité',
};

const champsEntreprise = [
  { key: 'siren', label: 'SIREN', type: 'text', numeric: true, maxLen: 9, placeholder: '9 chiffres', vide: 'Ajouter mon SIREN', source: 'manuel' },
  { key: 'formeJuridique', label: 'Forme juridique', type: 'choice', options: ['EI', 'EURL', 'SASU', 'SARL', 'SAS', 'Autre'], vide: 'Récupérée via ton SIREN, ou à choisir ici', source: 'auto' },
  { key: 'regimeFiscal', label: 'Régime fiscal', type: 'choice', options: ['IR', 'IS'], vide: 'Choisir mon régime fiscal', source: 'manuel' },
  { key: 'regimeSocial', label: 'Régime social', type: 'choice', options: ['TNS', 'Assimilé salarié'], vide: 'Choisir mon régime social', source: 'manuel' },
  { key: 'activitePrincipale', label: 'Activité principale', type: 'text', placeholder: 'Ex. Conseil, communication…', vide: 'Définir mon activité principale', source: 'manuel' },
  { key: 'tva', label: 'Assujettie à la TVA', type: 'choice', options: ['Non', 'Franchise en base', 'Réel simplifié', 'Réel normal'], vide: 'Renseigner ma situation TVA', source: 'manuel' },
  { key: 'dateCloture', label: "Date de clôture d'exercice", type: 'text', placeholder: '31/12', vide: 'Ajouter ma date de clôture', source: 'manuel' },
  { key: 'codeApe', label: 'Code APE / NAF', type: 'text', placeholder: 'Ex. 73.11Z', vide: 'Ajouter mon code APE/NAF', source: 'manuel' },
];

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative transition-colors"
      style={{ width: '46px', height: '28px', borderRadius: '14px', backgroundColor: value ? colors.roseA : 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="absolute rounded-full transition-transform"
        style={{
          width: '22px', height: '22px', top: '3px', left: '3px',
          backgroundColor: '#0D0D0D',
          transform: value ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </button>
  );
}

function ChampRow({ champ, value, onTap, isLast }) {
  return (
    <button
      onClick={onTap}
      className="w-full flex items-center justify-between py-3.5 text-left gap-3"
      style={{ borderBottom: isLast ? 'none' : `1px solid ${colors.cardBorder}` }}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>{champ.label}</span>
        {champ.source === 'auto' && (
          <span
            className="px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors.roseSoft, fontFamily: fontText, fontSize: '9px', fontWeight: 700, color: colors.roseA, letterSpacing: '0.03em' }}
          >
            AUTO
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        {value ? (
          <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary, textAlign: 'right' }}>{value}</span>
        ) : (
          <span style={{ fontFamily: fontText, fontSize: '12.5px', fontStyle: 'italic', color: colors.textTertiary, textAlign: 'right' }}>{champ.vide}</span>
        )}
        <ChevronRight size={13} color={colors.textTertiary} style={{ flexShrink: 0 }} />
      </div>
    </button>
  );
}

function EditSheet({ champ, valeurActuelle, onClose, onSave }) {
  const [valeur, setValeur] = useState(valeurActuelle || '');

  function handleSave() {
    if (navigator.vibrate) navigator.vibrate(8);
    onSave(valeur);
    onClose();
  }

  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheetSuperposee }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-9 sheet-rise"
        style={{ backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, border: `1px solid ${colors.cardBorder}`, borderBottom: 'none' }}
      >
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>{champ.label}</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>

        {champ.type === 'text' ? (
          <input
            value={valeur}
            onChange={(e) => setValeur(
              champ.monetaire
                ? nettoyerSaisieMontant(e.target.value, champ.maxLen || 7)
                : champ.numeric
                  ? e.target.value.replace(/[^\d]/g, '').slice(0, champ.maxLen || 30)
                  : e.target.value
            )}
            placeholder={champ.placeholder}
            inputMode={champ.monetaire ? 'decimal' : champ.numeric ? 'numeric' : 'text'}
            autoFocus
            className="w-full mb-7 py-3.5 px-4"
            style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontText, fontSize: '15px', color: colors.textPrimary, outline: 'none' }}
          />
        ) : (
          <div className="flex flex-col gap-2 mb-7">
            {champ.options.map((opt) => {
              const active = valeur === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setValeur(opt)}
                  className="w-full flex items-center justify-between py-3.5 px-4 transition-transform active:scale-[0.99]"
                  style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}
                >
                  <span style={{ fontFamily: fontText, fontSize: '14px', fontWeight: 500, color: colors.textPrimary }}>{opt}</span>
                  {active && <Check size={14} color={colors.roseA} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={handleSave} className="w-full py-4 transition-transform active:scale-[0.98]" style={{ borderRadius: RADIUS.control, background: `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})`, fontFamily: fontText }}>
          <span className="text-[14.5px] font-semibold" style={{ color: colors.onAccent }}>Enregistrer</span>
        </button>
      </div>
    </div>
    </SheetPortal>
  );
}

function ConfirmationSuppressionSheet({ onClose }) {
  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheetSuperposee }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-9 sheet-rise" style={{ backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, border: `1px solid ${colors.cardBorder}`, borderBottom: 'none' }}>
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex flex-col items-center text-center mb-7 px-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors.redSoft }}>
            <Trash2 size={20} color={colors.red} strokeWidth={2} />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>Supprimer ton compte ?</span>
          <p className="mt-2" style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary, lineHeight: '1.5' }}>
            Cette action est irréversible. Toutes tes données — revenus, dépenses, objectifs, historique NEXA — seront définitivement supprimées.
          </p>
        </div>
        <button onClick={onClose} className="w-full py-4 mb-3 transition-transform active:scale-[0.98]" style={{ borderRadius: RADIUS.control, border: `1px solid ${colors.red}`, backgroundColor: 'transparent' }}>
          <span className="text-[14.5px] font-semibold" style={{ color: colors.red }}>Supprimer définitivement</span>
        </button>
        <button onClick={onClose} className="w-full py-4 transition-transform active:scale-[0.98]" style={{ borderRadius: RADIUS.control, backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
          <span className="text-[14.5px] font-semibold" style={{ color: colors.textPrimary }}>Annuler</span>
        </button>
      </div>
    </div>
    </SheetPortal>
  );
}

function AProposNexaSheet({ onClose }) {
  return (
    <SheetPortal><div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: Z.sheetSuperposee }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto px-6 pt-3 pb-9 sheet-rise" style={{ backgroundColor: colors.bgDeep, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, border: `1px solid ${colors.cardBorder}`, borderBottom: 'none' }}>
        <div className="w-full flex justify-center mb-3"><div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.14)' }} /></div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>À propos de NEXA</span>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <X size={13} color={colors.textSecondary} strokeWidth={2} />
          </button>
        </div>
        <p style={{ fontFamily: fontText, fontSize: '14px', lineHeight: '1.65', color: colors.textSecondary }}>
          NEXA n'existe pas pour prendre des décisions à ta place. Il existe pour t'aider à en prendre de meilleures.
          <br /><br />
          Il ne cherche ni à te convaincre, ni à t'influencer. Il n'invente jamais un chiffre : quand une donnée manque, il te le dit clairement plutôt que de deviner. Chaque recommandation peut toujours être expliquée, calcul à l'appui.
          <br /><br />
          NEXA garde toujours le dernier mot pour toi, jamais pour lui.
        </p>
      </div>
    </div>
    </SheetPortal>
  );
}

// ============================================
// Écran Mon espace
// ------------------------------------------------------------
// Ne détient plus AUCUNE donnée localement — tout vient de
// useEntreprise(). Un futur écran (Dashboard, Trésorerie de
// sécurité, NEXA...) qui a besoin de ces mêmes informations
// appellera exactement ce même hook, jamais une copie locale.
// ============================================
export default function MonEspace() {
  const { entreprise, chargement, mettreAJour } = useEntreprise();
  const [editingChamp, setEditingChamp] = useState(null);
  const [editingMois, setEditingMois] = useState(false);
  const [editingChargesSociales, setEditingChargesSociales] = useState(false);
  const [editingIdentite, setEditingIdentite] = useState(null); // 'nom' | 'email' | 'entreprise' | 'solde' | null
  const [aProposOuvert, setAProposOuvert] = useState(false);
  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [photoAffichee, setPhotoAffichee] = useState(null);
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const [siren, setSirenEtat] = useState({ enCours: false, resultat: null }); // resultat: null | 'trouve' | 'introuvable'
  const fileInputRef = useRef();

  // La photo est stockée comme un CHEMIN dans le bucket privé, jamais
  // une URL permanente — on résout une URL signée à chaque chargement.
  useEffect(() => {
    let monte = true;
    if (entreprise?.photoUrl) {
      urlSigneePhoto(entreprise.photoUrl).then((url) => {
        if (monte) setPhotoAffichee(url);
      });
    } else {
      setPhotoAffichee(null);
    }
    return () => { monte = false; };
  }, [entreprise?.photoUrl]);

  if (chargement) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: colors.bgDeep }} />;
  }

  const { identite, preferences } = entreprise;
  const nbRenseignes = champsEntreprise.filter((c) => identite[c.key]).length;
  const pctComplete = Math.round((nbRenseignes / champsEntreprise.length) * 100);
  const nomAffiche = identite.nomComplet || 'Ton nom';

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoEnCours(true);
    try {
      const chemin = await uploaderPhotoProfil(file);
      await mettreAJour({ photoUrl: chemin });
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (err) {
      console.error('Échec de l\'envoi de la photo :', err);
    } finally {
      setPhotoEnCours(false);
    }
  }

  // Déclenchée uniquement quand le champ modifié est le SIREN — une
  // vraie tentative de récupération, avec repli honnête sur la saisie
  // manuelle si elle échoue (réseau, SIREN introuvable, etc.).
  async function handleSaveChampEntreprise(champ, valeur) {
    await mettreAJour({ identite: { [champ.key]: valeur } });
    if (champ.key !== 'siren' || valeur.length !== 9) return;

    setSirenEtat({ enCours: true, resultat: null });
    const trouve = await rechercherEntrepriseParSiren(valeur);
    if (trouve) {
      const patch = {};
      if (trouve.nom && !identite.entrepriseNom) patch.entrepriseNom = trouve.nom;
      if (trouve.formeJuridique) patch.formeJuridique = trouve.formeJuridique;
      if (Object.keys(patch).length > 0) await mettreAJour({ identite: patch });
      setSirenEtat({ enCours: false, resultat: 'trouve' });
    } else {
      setSirenEtat({ enCours: false, resultat: 'introuvable' });
    }
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .sheet-rise { animation: sheetRise 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div className="relative w-full max-w-sm min-h-screen px-5" style={{ backgroundColor: colors.bgDeep, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}>
        <div className="mb-10">
          <span className="inline-flex items-center gap-2.5">
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.roseA, boxShadow: `0 0 7px ${colors.roseA}`, display: 'inline-block' }} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '20px', color: colors.textPrimary, letterSpacing: '0.02em' }}>Mon espace</span>
          </span>
        </div>

        {/* Photo + identité */}
        <div className="flex flex-col items-center mb-9 animate-rise">
          <button onClick={() => fileInputRef.current?.click()} className="relative mb-4" disabled={photoEnCours}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
              {photoEnCours ? (
                <Loader2 size={22} color={colors.roseA} className="animate-spin" />
              ) : photoAffichee ? (
                <img src={photoAffichee} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '28px', color: colors.roseA }}>{nomAffiche[0]}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.roseA, border: `2px solid ${colors.bgDeep}` }}>
              <Camera size={12} color="#0D0D0D" strokeWidth={2.5} />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '17px', color: colors.textPrimary }}>{nomAffiche}</span>
          <button onClick={() => setEditingIdentite('entreprise')} className="mt-0.5">
            <span style={{ fontFamily: fontText, fontSize: '13px', color: identite.entrepriseNom ? colors.textSecondary : colors.roseA, marginTop: '2px', textDecoration: identite.entrepriseNom ? 'none' : 'underline', textUnderlineOffset: '3px' }}>
              {identite.entrepriseNom ? `Fondatrice de ${identite.entrepriseNom}` : 'Ajouter le nom de mon entreprise'}
            </span>
          </button>
        </div>

        {/* Profil personnel */}
        <div className="mb-8 animate-rise" style={{ animationDelay: '30ms' }}>
          <span style={{ ...eyebrowStyle(), display: 'block', marginBottom: '10px', paddingLeft: '4px' }}>Profil personnel</span>
          <div className="px-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <button onClick={() => setEditingIdentite('nom')} className="w-full flex items-center justify-between py-3.5 text-left" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
              <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>Nom complet</span>
              <div className="flex items-center gap-1.5">
                {identite.nomComplet ? (
                  <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>{identite.nomComplet}</span>
                ) : (
                  <span style={{ fontFamily: fontText, fontSize: '12.5px', fontStyle: 'italic', color: colors.textTertiary }}>Ajouter mon nom complet</span>
                )}
                <ChevronRight size={13} color={colors.textTertiary} />
              </div>
            </button>
            <button onClick={() => setEditingIdentite('email')} className="w-full flex items-center justify-between py-3.5 text-left">
              <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>Email</span>
              <div className="flex items-center gap-1.5">
                {identite.email ? (
                  <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>{identite.email}</span>
                ) : (
                  <span style={{ fontFamily: fontText, fontSize: '12.5px', fontStyle: 'italic', color: colors.textTertiary }}>Ajouter mon email</span>
                )}
                <ChevronRight size={13} color={colors.textTertiary} />
              </div>
            </button>
          </div>
        </div>

        {/* Identité d'entreprise */}
        <div className="mb-8 animate-rise" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span style={eyebrowStyle()}>Identité d'entreprise</span>
            <span style={{ fontFamily: fontText, fontSize: '11px', color: colors.textTertiary }}>Complété à {pctComplete}%</span>
          </div>
          <div className="px-1 pb-4">
            <p style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary, lineHeight: '1.5' }}>
              Ces informations permettent à NEXA d'adapter ses recommandations à ta situation réelle. Rien n'est deviné — tant qu'un champ n'est pas renseigné, NEXA le signale honnêtement plutôt que de l'ignorer.
            </p>
            {siren.enCours && (
              <p className="mt-2 flex items-center gap-1.5" style={{ fontFamily: fontText, fontSize: '12px', color: colors.roseA }}>
                <Loader2 size={12} className="animate-spin" /> Recherche de ton entreprise via ton SIREN…
              </p>
            )}
            {siren.resultat === 'trouve' && (
              <p className="mt-2" style={{ fontFamily: fontText, fontSize: '12px', color: colors.green }}>
                Entreprise trouvée — nom et forme juridique pré-remplis. Modifiable si besoin.
              </p>
            )}
            {siren.resultat === 'introuvable' && (
              <p className="mt-2" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary }}>
                Aucune correspondance trouvée pour ce SIREN — renseigne les champs suivants toi-même.
              </p>
            )}
          </div>
          <div className="px-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            {champsEntreprise.map((c, i) => {
              const valeurAffichee = c.key === 'codeApe' && identite.codeApe && LIBELLES_APE[identite.codeApe.toUpperCase()]
                ? `${identite.codeApe} — ${LIBELLES_APE[identite.codeApe.toUpperCase()]}`
                : identite[c.key];
              return (
                <ChampRow key={c.key} champ={c} value={valeurAffichee} onTap={() => setEditingChamp(c)} isLast={i === champsEntreprise.length - 1} />
              );
            })}
          </div>
        </div>

        {/* Préférences NEXA */}
        <div className="mb-8 animate-rise" style={{ animationDelay: '120ms' }}>
          <span style={{ ...eyebrowStyle(), display: 'block', marginBottom: '10px', paddingLeft: '4px' }}>Préférences NEXA</span>

          <button onClick={() => setEditingIdentite('solde')} className="w-full flex items-center justify-between p-5 mb-3 text-left" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <div className="pr-4">
              <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Solde du compte société</span>
              <p className="mt-1" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                Le point de départ à partir duquel PILOT suit ton vrai solde, en ajoutant tes revenus et en retirant tes dépenses ponctuelles enregistrées depuis aujourd'hui.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {preferences.soldeInitial != null ? (
                <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '17px', color: colors.roseA }}>{formatEUR(preferences.soldeInitial)}</span>
              ) : (
                <span style={{ fontFamily: fontText, fontSize: '12.5px', fontStyle: 'italic', color: colors.textTertiary }}>À définir</span>
              )}
              <ChevronRight size={13} color={colors.textTertiary} />
            </div>
          </button>

          <div className="p-5 mb-3" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Niveau de prudence</span>
            <p className="mt-1 mb-3" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
              Ajuste la marge que NEXA garde avant de suggérer une optimisation.
            </p>
            <div className="flex gap-2">
              {[{ key: 'prudent', label: 'Prudent' }, { key: 'equilibre', label: 'Équilibré' }, { key: 'ambitieux', label: 'Ambitieux' }].map((p) => {
                const active = preferences.niveauPrudence === p.key;
                return (
                  <button key={p.key} onClick={() => mettreAJour({ preferences: { niveauPrudence: p.key } })} className="flex-1 py-2.5 transition-transform active:scale-[0.98]"
                    style={{ borderRadius: RADIUS.control, backgroundColor: active ? colors.roseSoft : 'transparent', border: `1px solid ${active ? colors.roseBorder : colors.cardBorder}` }}>
                    <span style={{ fontFamily: fontText, fontSize: '12.5px', fontWeight: 600, color: active ? colors.roseA : colors.textSecondary }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setEditingMois(true)} className="w-full flex items-center justify-between p-5 mb-3 text-left" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <div>
              <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Trésorerie de sécurité</span>
              <p className="mt-1" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4', maxWidth: '210px' }}>
                Seule donnée saisie — le montant en euros est toujours calculé automatiquement à partir de tes dépenses.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '17px', color: colors.roseA }}>{preferences.tresorerieSecuriteMois} mois</span>
              <ChevronRight size={13} color={colors.textTertiary} />
            </div>
          </button>

          <button onClick={() => setEditingChargesSociales(true)} className="w-full flex items-center justify-between p-5 mb-3 text-left" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <div className="pr-4">
              <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Taux de charges sociales estimé</span>
              <p className="mt-1" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                Une estimation à ajuster selon ta situation réelle — jamais un taux officiel. Vérifie avec ton expert-comptable ou l'URSSAF.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '17px', color: colors.roseA }}>{preferences.tauxChargesSociales}%</span>
              <ChevronRight size={13} color={colors.textTertiary} />
            </div>
          </button>

          <div className="p-5 mb-3" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Consentement à la mémoire</span>
                <p className="mt-1" style={{ fontFamily: fontText, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  NEXA ne retient tes décisions et préférences que si tu l'autorises explicitement.
                </p>
              </div>
              <Toggle value={preferences.consentementMemoire} onChange={(v) => mettreAJour({ preferences: { consentementMemoire: v } })} />
            </div>
          </div>

          <div className="p-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textPrimary }}>Notifications</span>
              <Toggle value={preferences.notifications} onChange={(v) => mettreAJour({ preferences: { notifications: v } })} />
            </div>
          </div>
        </div>

        {/* Confidentialité */}
        <div className="animate-rise" style={{ animationDelay: '180ms' }}>
          <span style={{ ...eyebrowStyle(), display: 'block', marginBottom: '10px', paddingLeft: '4px' }}>Confidentialité</span>
          <div className="px-5" style={{ ...cardSurface(), borderRadius: RADIUS.card }}>
            <button className="w-full flex items-center justify-between py-3.5 text-left" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
              <div className="flex items-center gap-3">
                <Download size={15} color={colors.textSecondary} />
                <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textPrimary }}>Exporter mes données</span>
              </div>
              <ChevronRight size={13} color={colors.textTertiary} />
            </button>
            <button onClick={() => setConfirmSuppression(true)} className="w-full flex items-center justify-between py-3.5 text-left">
              <div className="flex items-center gap-3">
                <Trash2 size={15} color={colors.red} />
                <span style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.red }}>Supprimer mon compte</span>
              </div>
              <ChevronRight size={13} color={colors.textTertiary} />
            </button>
          </div>
          <div className="flex items-start gap-2 mt-4 px-1">
            <Shield size={12} color={colors.textTertiary} style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontFamily: fontText, fontSize: '11px', color: colors.textTertiary, lineHeight: '1.5' }}>
              Tes données t'appartiennent. Elles ne sont jamais utilisées à des fins commerciales ni partagées sans ton accord explicite.
            </p>
          </div>
        </div>

        {/* Déconnexion — section à part, jamais mélangée aux actions destructrices de Confidentialité */}
        <div className="mt-6 animate-rise" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 py-4 transition-transform active:scale-[0.98]"
            style={{ ...cardSurface(), borderRadius: RADIUS.card }}
          >
            <LogOut size={15} color={colors.textSecondary} />
            <span style={{ fontFamily: fontText, fontSize: '13.5px', fontWeight: 600, color: colors.textSecondary }}>Se déconnecter</span>
          </button>
        </div>

        <div className="flex justify-center mt-8">
          <button onClick={() => setAProposOuvert(true)}>
            <span style={{ fontFamily: fontText, fontSize: '12px', color: colors.textTertiary, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              À propos de NEXA
            </span>
          </button>
        </div>

        {editingChamp && (
          <EditSheet
            champ={editingChamp}
            valeurActuelle={identite[editingChamp.key]}
            onClose={() => setEditingChamp(null)}
            onSave={(v) => handleSaveChampEntreprise(editingChamp, v)}
          />
        )}
        {editingMois && (
          <EditSheet
            champ={{ key: 'moisSecurite', label: 'Trésorerie de sécurité (en mois)', type: 'text', numeric: true, maxLen: 2, placeholder: 'Ex. 6' }}
            valeurActuelle={String(preferences.tresorerieSecuriteMois)}
            onClose={() => setEditingMois(false)}
            onSave={(v) => mettreAJour({ preferences: { tresorerieSecuriteMois: Number(v) || preferences.tresorerieSecuriteMois } })}
          />
        )}
        {editingChargesSociales && (
          <EditSheet
            champ={{ key: 'tauxChargesSociales', label: 'Taux de charges sociales (%)', type: 'text', numeric: true, maxLen: 2, placeholder: 'Ex. 45' }}
            valeurActuelle={String(preferences.tauxChargesSociales)}
            onClose={() => setEditingChargesSociales(false)}
            onSave={(v) => mettreAJour({ preferences: { tauxChargesSociales: Number(v) || preferences.tauxChargesSociales } })}
          />
        )}
        {editingIdentite === 'solde' && (
          <EditSheet
            champ={{ key: 'soldeInitial', label: 'Solde du compte société', type: 'text', monetaire: true, maxLen: 8, placeholder: 'Ex. 18240,50' }}
            valeurActuelle={preferences.soldeInitial != null ? String(preferences.soldeInitial).replace('.', ',') : ''}
            onClose={() => setEditingIdentite(null)}
            onSave={(v) => mettreAJour({ preferences: { soldeInitial: montantSaisiVersNombre(v), soldeInitialDate: new Date().toISOString() } })}
          />
        )}
        {editingIdentite === 'nom' && (
          <EditSheet
            champ={{ key: 'nomComplet', label: 'Nom complet', type: 'text', placeholder: 'Prénom Nom' }}
            valeurActuelle={identite.nomComplet}
            onClose={() => setEditingIdentite(null)}
            onSave={(v) => mettreAJour({ identite: { nomComplet: v } })}
          />
        )}
        {editingIdentite === 'entreprise' && (
          <EditSheet
            champ={{ key: 'entrepriseNom', label: "Nom de l'entreprise", type: 'text', placeholder: 'Ex. MÉLYSMÉE' }}
            valeurActuelle={identite.entrepriseNom}
            onClose={() => setEditingIdentite(null)}
            onSave={(v) => mettreAJour({ identite: { entrepriseNom: v } })}
          />
        )}
        {editingIdentite === 'email' && (
          <EditSheet
            champ={{ key: 'email', label: 'Email', type: 'text', placeholder: 'toi@exemple.com' }}
            valeurActuelle={identite.email}
            onClose={() => setEditingIdentite(null)}
            onSave={(v) => mettreAJour({ identite: { email: v } })}
          />
        )}
        {aProposOuvert && <AProposNexaSheet onClose={() => setAProposOuvert(false)} />}
        {confirmSuppression && <ConfirmationSuppressionSheet onClose={() => setConfirmSuppression(false)} />}
      </div>
    </div>
  );
}
