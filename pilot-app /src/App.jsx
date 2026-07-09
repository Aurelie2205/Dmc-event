import React, { useState, useEffect } from 'react';
import { Home, TrendingUp, Receipt, Target, Sparkles, X } from 'lucide-react';
import { colors, fontText, cardSurface, TAB_BAR_HEIGHT , Z} from './design-system';
import { supabase } from './lib/supabaseClient';
import { reinitialiserTousLesStores } from './data/hooks/creerStorePartage';

import Auth from './screens/Auth';
import Dashboard from './screens/Dashboard';
import Revenus from './screens/Revenus';
import Depenses from './screens/Depenses';
import Objectifs from './screens/Objectifs';
import Nexa from './screens/Nexa';
import MonEspace from './screens/MonEspace';
import TresorerieSecurite from './screens/TresorerieSecurite';
import Previsions from './screens/Previsions';
import Simulation from './screens/Simulation';

// Les cinq destinations principales, accessibles en permanence depuis
// la barre du bas. Mon espace, Trésorerie de sécurité, Prévisions et
// Simulation restent des écrans "plein écran temporaires", ouverts
// depuis le Dashboard — cohérent avec la façon dont ils ont été conçus
// (aucun n'a de barre de navigation propre).
const ONGLETS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home, Composant: Dashboard },
  { key: 'revenus', label: 'Revenus', icon: TrendingUp, Composant: Revenus },
  { key: 'depenses', label: 'Dépenses', icon: Receipt, Composant: Depenses },
  { key: 'objectifs', label: 'Objectifs', icon: Target, Composant: Objectifs },
  { key: 'nexa', label: 'NEXA', icon: Sparkles, Composant: Nexa },
];

function TabBar({ actif, onSelect }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center"
      style={{
        zIndex: Z.barreOnglets,
        // Le fond vit ICI, sur le conteneur qui touche réellement le bas de
        // l'écran — et non sur le div intérieur. Sinon la zone sûre (la
        // bande de l'indicateur d'accueil, ~34px) reste transparente et le
        // contenu de la page défile visiblement en dessous de la barre :
        // elle semble "ne pas être tout à fait en bas".
        backgroundColor: colors.bgDeep,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // Sans ceci, Safari iOS peut "décoller" un élément fixed du bas
        // de l'écran pendant le défilement (le navigateur le repeint
        // avec un léger retard) — le forcer sur son propre calque GPU
        // élimine ce décalage visuel.
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
    >
      <div className="w-full max-w-sm flex" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
        {ONGLETS.map((o) => {
          const Icon = o.icon;
          const actifIci = o.key === actif;
          return (
            <button
              key={o.key}
              onClick={() => onSelect(o.key)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-transform active:scale-[0.96]"
            >
              <Icon size={19} strokeWidth={actifIci ? 2.3 : 1.8} color={actifIci ? colors.roseA : colors.textTertiary} />
              <span style={{ fontFamily: fontText, fontSize: '10px', fontWeight: actifIci ? 700 : 500, color: actifIci ? colors.roseA : colors.textTertiary }}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Enveloppe commune aux écrans "plein écran temporaires" qui n'ont
// pas leur propre bouton de fermeture (Mon espace, Trésorerie de
// sécurité, Prévisions ont été conçus comme des onglets à part
// entière, pas des sheets — App.jsx leur ajoute un retour, sans
// modifier ces écrans eux-mêmes).
function EcranSuperpose({ onClose, children }) {
  return (
    <div className="fixed inset-0" style={{ zIndex: Z.ecranSuperpose, backgroundColor: '#000', overflowY: 'auto' }}>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="fixed w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]"
        style={{ ...cardSurface(), top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: '18px', zIndex: Z.fermerSuperpose }}
      >
        <X size={14} color={colors.textSecondary} strokeWidth={2} />
      </button>
      {children}
    </div>
  );
}

export default function App() {
  const [onglet, setOnglet] = useState('dashboard');
  const [ecranSuperpose, setEcranSuperpose] = useState(null); // null | 'monespace' | 'tresorerie' | 'previsions' | 'simulation'

  // Garde d'authentification — le seul endroit de l'app qui décide si
  // on affiche PILOT ou l'écran de connexion. Tant que `verifiee` est
  // fausse, on n'affiche rien de substantiel : jamais un écran de
  // données monté "au cas où" pendant la vérification.
  const [session, setSession] = useState(null);
  const [sessionVerifiee, setSessionVerifiee] = useState(false);

  useEffect(() => {
    let monte = true;
    // Identifiant du compte actuellement chargé dans les stores partagés.
    // Sert à détecter un CHANGEMENT d'utilisateur, pas seulement une
    // déconnexion : se reconnecter sur un autre compte doit aussi purger.
    let utilisateurCharge = null;

    supabase.auth.getSession().then(({ data }) => {
      if (monte) {
        utilisateurCharge = data.session?.user?.id ?? null;
        setSession(data.session);
        setSessionVerifiee(true);
      }
    });

    // Réagit à toute connexion, déconnexion ou renouvellement de
    // jeton — c'est ce qui permet de rester connectée sur iPhone
    // sans revérifier manuellement à chaque ouverture de l'app.
    const { data: abonnement } = supabase.auth.onAuthStateChange((_event, nouvelleSession) => {
      const nouvelUtilisateur = nouvelleSession?.user?.id ?? null;

      // Les stores partagés vivent au niveau du module : ils survivent au
      // démontage des écrans, donc à une déconnexion. Sans cette purge, le
      // compte suivant hériterait des données financières du précédent —
      // leur drapeau `chargee` restant vrai, le rechargement serait sauté.
      // On ne purge QUE sur un vrai changement d'utilisateur : un simple
      // renouvellement de jeton ne doit pas provoquer un rechargement complet.
      if (nouvelUtilisateur !== utilisateurCharge) {
        reinitialiserTousLesStores();
        utilisateurCharge = nouvelUtilisateur;
      }

      setSession(nouvelleSession);
      setSessionVerifiee(true);
    });

    return () => {
      monte = false;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  const OngletActif = ONGLETS.find((o) => o.key === onglet)?.Composant || Dashboard;
  const fermerSuperpose = () => setEcranSuperpose(null);

  if (!sessionVerifiee) {
    return <div style={{ backgroundColor: '#000', minHeight: '100vh' }} />;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      <div style={{ paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}>
        <OngletActif
          onOpenMonEspace={() => setEcranSuperpose('monespace')}
          onOpenTresorerie={() => setEcranSuperpose('tresorerie')}
          onOpenPrevisions={() => setEcranSuperpose('previsions')}
          onOpenSimulation={() => setEcranSuperpose('simulation')}
          onAllerDepenses={() => setOnglet('depenses')}
        />
      </div>

      <TabBar actif={onglet} onSelect={setOnglet} />

      {ecranSuperpose === 'monespace' && (
        <EcranSuperpose onClose={fermerSuperpose}><MonEspace /></EcranSuperpose>
      )}
      {ecranSuperpose === 'tresorerie' && (
        <EcranSuperpose onClose={fermerSuperpose}><TresorerieSecurite /></EcranSuperpose>
      )}
      {ecranSuperpose === 'previsions' && (
        <EcranSuperpose onClose={fermerSuperpose}><Previsions /></EcranSuperpose>
      )}
      {ecranSuperpose === 'simulation' && <Simulation onClose={fermerSuperpose} />}
    </div>
  );
}
