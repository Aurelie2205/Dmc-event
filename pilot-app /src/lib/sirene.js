// ============================================================
// /src/lib/sirene.js
// ------------------------------------------------------------
// Recherche via l'API publique "Recherche d'entreprises" de
// l'État (recherche-entreprises.api.gouv.fr) — gratuite, sans clé,
// accessible directement depuis le navigateur.
//
// ⚠️ Honnêteté sur ce fichier : il a été écrit sans accès réseau
// pour le tester en conditions réelles. La forme de la réponse est
// basée sur la documentation publique de cette API, mais seul un
// vrai test (en le faisant depuis Mon espace) confirmera qu'elle
// correspond exactement. Si un jour le format change ou diffère de
// ce qui est prévu ici, la fonction échoue proprement (retourne
// `null`) plutôt que d'afficher une donnée fausse — l'utilisateur
// retombe alors sur la saisie manuelle, jamais sur un écran cassé.
// ============================================================

// Correspondance code INSEE de catégorie juridique → nos options.
// Volontairement incomplète : seuls les codes dont la correspondance
// est sûre sont mappés. Un code absent de cette liste ne remplit
// jamais le champ au hasard — il reste vide, à choisir manuellement.
const CODES_FORME_JURIDIQUE = {
  '1000': 'EI', '1100': 'EI', '1200': 'EI', '1300': 'EI', '1400': 'EI', '1500': 'EI',
  '5410': 'SARL',
  '5498': 'EURL', '5499': 'EURL',
  '5710': 'SAS',
  '5720': 'SASU',
};

export async function rechercherEntrepriseParSiren(siren) {
  if (!siren || siren.length !== 9) return null;

  let reponse;
  try {
    reponse = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`);
  } catch {
    return null; // pas de réseau, API indisponible — échec propre
  }
  if (!reponse.ok) return null;

  let data;
  try {
    data = await reponse.json();
  } catch {
    return null;
  }

  const resultat = data?.results?.[0];
  if (!resultat || resultat.siren !== siren) return null;

  const nom = resultat.nom_complet || resultat.nom_raison_sociale || null;
  const codeJuridique = resultat.nature_juridique || resultat.siege?.nature_juridique || null;
  const formeJuridique = codeJuridique ? CODES_FORME_JURIDIQUE[String(codeJuridique)] || null : null;

  if (!nom && !formeJuridique) return null;
  return { nom, formeJuridique };
}
