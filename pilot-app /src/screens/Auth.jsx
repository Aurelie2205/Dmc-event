import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  colors, fontDisplay, fontText, RADIUS, TRACK, cardSurface,
} from '../design-system';
import { supabase } from '../lib/supabaseClient';

// ============================================
// Écran Connexion / Création de compte
// ------------------------------------------------------------
// Seul point d'accès à PILOT. Tant qu'aucune session n'existe,
// App.jsx n'affiche que cet écran — aucune donnée, aucun autre
// écran n'est jamais monté avant une authentification réussie.
// ============================================
export default function Auth() {
  const [mode, setMode] = useState('connexion'); // 'connexion' | 'creation'
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [messageCreation, setMessageCreation] = useState(null);

  const peutValider = email.trim().length > 3 && motDePasse.length >= 6 && !chargement;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!peutValider) return;
    setChargement(true);
    setErreur(null);
    setMessageCreation(null);

    try {
      if (mode === 'connexion') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
        if (error) setErreur(traduireErreur(error));
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: motDePasse,
          // Explicite plutôt qu'implicite : la redirection après le lien
          // de confirmation ne dépend jamais uniquement du "Site URL"
          // configuré dans Supabase — qui pourrait un jour être mal réglé
          // ou pointer vers un environnement de test par erreur.
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          setErreur(traduireErreur(error));
        } else {
          setMessageCreation("Compte créé. Si Supabase demande une confirmation par email, vérifie ta boîte de réception avant de te connecter.");
        }
      }
    } catch (err) {
      // Exception réseau (pas de connexion, serveur injoignable) — sans ce
      // catch, le bouton resterait bloqué sur "Un instant…" indéfiniment.
      setErreur("Connexion impossible pour le moment. Vérifie ta connexion internet et réessaie.");
    } finally {
      setChargement(false);
    }
  }

  function traduireErreur(error) {
    if (error.message?.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (error.message?.includes('User already registered')) return 'Un compte existe déjà avec cet email — connecte-toi plutôt.';
    if (error.message?.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
    return error.message;
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: '#000', overflowX: 'clip', maxWidth: '100%' }}>
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-rise { opacity: 0; animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="w-full max-w-sm min-h-screen flex flex-col justify-center px-7" style={{ backgroundColor: colors.bgDeep, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex flex-col items-center mb-11 animate-rise">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ ...cardSurface(), border: `1px solid ${colors.roseBorder}` }}>
            <RingMark />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '13px', letterSpacing: TRACK.brand, background: `linear-gradient(135deg, ${colors.roseHi}, ${colors.roseA})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            PILOT
          </span>
          <span className="mt-2" style={{ fontFamily: fontText, fontSize: '13.5px', color: colors.textSecondary }}>
            {mode === 'connexion' ? 'Content de te revoir.' : 'Créons ton espace.'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="animate-rise" style={{ animationDelay: '80ms' }}>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full py-4 px-4"
              style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontText, fontSize: '15px', color: colors.textPrimary, outline: 'none' }}
            />
          </div>
          <div className="mb-2">
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe"
              className="w-full py-4 px-4"
              style={{ ...cardSurface({ backgroundImage: 'none' }), borderRadius: RADIUS.control, fontFamily: fontText, fontSize: '15px', color: colors.textPrimary, outline: 'none' }}
            />
          </div>

          {mode === 'creation' && (
            <p className="mt-2 mb-1 px-1" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary, lineHeight: '1.4' }}>
              6 caractères minimum.
            </p>
          )}

          {erreur && (
            <p className="mt-3 px-1" style={{ fontFamily: fontText, fontSize: '13px', color: colors.red, lineHeight: '1.4' }}>
              {erreur}
            </p>
          )}
          {messageCreation && (
            <p className="mt-3 px-1" style={{ fontFamily: fontText, fontSize: '13px', color: colors.green, lineHeight: '1.4' }}>
              {messageCreation}
            </p>
          )}

          <button
            type="submit"
            disabled={!peutValider}
            className="w-full mt-6 flex items-center justify-center gap-1.5 py-4 transition-transform active:scale-[0.98]"
            style={{
              borderRadius: RADIUS.control,
              background: peutValider ? `linear-gradient(135deg, ${colors.roseA}, ${colors.roseMid})` : 'rgba(255,255,255,0.06)',
              fontFamily: fontText,
            }}
          >
            <span className="text-[14.5px] font-semibold" style={{ color: peutValider ? colors.onAccent : colors.textTertiary }}>
              {chargement ? 'Un instant…' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
            </span>
            {!chargement && <ChevronRight size={16} color={peutValider ? colors.onAccent : colors.textTertiary} strokeWidth={2.5} />}
          </button>
        </form>

        <button
          onClick={() => { setMode((m) => (m === 'connexion' ? 'creation' : 'connexion')); setErreur(null); setMessageCreation(null); }}
          className="mt-6 animate-rise"
          style={{ animationDelay: '140ms' }}
        >
          <span style={{ fontFamily: fontText, fontSize: '13px', color: colors.textTertiary }}>
            {mode === 'connexion' ? "Pas encore de compte ? " : 'Déjà un compte ? '}
            <span style={{ color: colors.roseA, fontWeight: 600 }}>
              {mode === 'connexion' ? 'Créer un compte' : 'Se connecter'}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

// Petit écho du motif de l'anneau (Dashboard / NEXA) — la même
// signature visuelle, pour que l'écran de connexion ne ressemble
// pas à un formulaire générique.
function RingMark() {
  const size = 34, stroke = size * 0.1, r = (size - stroke) / 2 - 1, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.72;
  const arcLength = circumference * arcFraction;
  const rotation = 90 + (360 * (1 - arcFraction)) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="authRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.roseHi} />
          <stop offset="100%" stopColor={colors.roseB} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`} strokeLinecap="round" transform={`rotate(${rotation} ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#authRingGrad)" strokeWidth={stroke}
        strokeDasharray={`${arcLength * 0.62} ${circumference}`} strokeLinecap="round" transform={`rotate(${rotation} ${cx} ${cy})`} />
    </svg>
  );
}
