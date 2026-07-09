import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SheetPortal } from './SheetPortal';
import { colors, fontDisplay, fontText, RADIUS, cardSurface, Z } from '../design-system';

// ============================================================
// /src/components/Toast.jsx
// ------------------------------------------------------------
// Confirmation courte après une action importante (revenu, dépense,
// charge fixe enregistrés) — jamais un popup bloquant, jamais du
// vocabulaire marketing. Se ferme seule après quelques secondes ou
// au tap. Passe par SheetPortal pour les mêmes raisons que toute
// sheet de l'app : jamais piégée dans un conteneur qui défile.
// ============================================================
export default function Toast({ titre, message, sousTexte, onDone, duree = 4200 }) {
  const [sortie, setSortie] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSortie(true), duree);
    const t2 = setTimeout(() => onDone?.(), duree + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duree, onDone]);

  function fermer() {
    setSortie(true);
    setTimeout(() => onDone?.(), 300);
  }

  return (
    <SheetPortal>
      <div
        className="fixed left-0 right-0 flex justify-center px-5"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)', zIndex: Z.toast, pointerEvents: 'none' }}
      >
        <style>{`
          @keyframes toastIn { from { opacity: 0; transform: translateY(-14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes toastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-10px) scale(0.98); } }
        `}</style>
        <button
          onClick={fermer}
          className="w-full max-w-sm px-5 py-4 text-left"
          style={{
            ...cardSurface(),
            borderRadius: RADIUS.card,
            border: `1px solid ${colors.roseBorder}`,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            pointerEvents: 'auto',
            animation: `${sortie ? 'toastOut' : 'toastIn'} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        >
          <div className="flex items-start gap-2.5">
            {/* Rose, pas vert : c'est un retour d'INTERFACE, pas une donnée
                financière. Le vert reste strictement réservé aux indicateurs
                (argent disponible, revenus). Frontière nette, sans exception. */}
            <CheckCircle2 size={17} color={colors.roseA} strokeWidth={2} style={{ marginTop: '1px', flexShrink: 0 }} />
            <div className="min-w-0">
              <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '14.5px', color: colors.textPrimary }}>{titre}</span>
              <p className="mt-0.5" style={{ fontFamily: fontText, fontSize: '12.5px', color: colors.textSecondary, lineHeight: '1.45' }}>
                {message}
              </p>
              {sousTexte && (
                <p className="mt-1.5 pt-1.5" style={{ fontFamily: fontText, fontSize: '11.5px', color: colors.textTertiary, lineHeight: '1.4', borderTop: `1px solid ${colors.cardBorder}` }}>
                  {sousTexte}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>
    </SheetPortal>
  );
}
