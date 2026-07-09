// ============================================================
// Adaptateur mémoire — implémentation V1 de la couche /data
// ------------------------------------------------------------
// Contrat que TOUT adaptateur doit respecter (celui-ci comme le
// futur adaptateur Supabase) :
//
//   async get(cle)          → valeur | null
//   async set(cle, valeur)  → void
//
// Rien d'autre ne doit fuiter en dehors de ce contrat. Le jour où
// `supabaseAdapter.js` existera avec la même forme, il suffira de
// changer l'import dans `/data/entreprise.js` — aucun écran ne doit
// avoir besoin d'être modifié.
//
// Persistance : localStorage pour l'instant, pour que les données
// survivent à un rechargement pendant le développement. Ce n'est
// pas une vraie base de données, seulement un pense-bête local —
// jamais présenté comme une garantie de sauvegarde à l'utilisateur.
// ============================================================

const PREFIXE = 'pilot:';
const memoire = {};

function disponibleLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export const memoryAdapter = {
  async get(cle) {
    if (disponibleLocalStorage()) {
      const brut = window.localStorage.getItem(PREFIXE + cle);
      if (brut !== null) {
        try {
          return JSON.parse(brut);
        } catch {
          return null;
        }
      }
    }
    return memoire[cle] ?? null;
  },

  async set(cle, valeur) {
    memoire[cle] = valeur;
    if (disponibleLocalStorage()) {
      window.localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    }
  },
};
