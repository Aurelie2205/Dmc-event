// ============================================================
// /core/finance/calculs.js
// ------------------------------------------------------------
// Composant obligatoire n°5 de l'Architecture Core.
// Tout calcul financier courant vit ici, une seule fois. Un écran
// qui a besoin d'un calcul déjà présent l'importe — il ne le
// réécrit jamais localement, même "juste pour cet écran-là".
// ============================================================

// Remplace les deux versions divergentes trouvées dans les
// prototypes Dépenses et Objectifs (l'une ignorait "hebdomadaire",
// l'autre "annuel"). Un seul jeu de fréquences, partout.
export function equivalentMensuel(montant, frequence) {
  switch (frequence) {
    case 'hebdo':
      return (montant * 52) / 12;
    case 'mensuel':
      return montant;
    case 'trimestriel':
      return montant / 3;
    case 'annuel':
      return montant / 12;
    default:
      throw new Error(`Fréquence inconnue : "${frequence}". Valeurs valides : hebdo, mensuel, trimestriel, annuel.`);
  }
}

// Le seuil de sécurité n'est jamais saisi directement — toujours
// dérivé de l'objectif en mois (Mon espace) et des dépenses moyennes
// réelles (/data). Un seul endroit, pour ne plus jamais avoir
// 6 000 € ici et 19 080 € ailleurs.
export function calculerSeuilSecurite(moisObjectif, depensesMensuellesMoyennes) {
  return moisObjectif * depensesMensuellesMoyennes;
}

// Montant qu'il serait prudent de garder disponible, après échéances
// à venir et seuil de sécurité. Peut être négatif — c'est une donnée
// honnête, pas une erreur à masquer (voir /core/finance/classification.js).
export function calculerDisponibleBrut({ solde, echeancesAVenir = 0, seuilSecurite }) {
  return solde - echeancesAVenir - seuilSecurite;
}

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function nomMois(date) {
  return MOIS_NOMS[date.getMonth()];
}

// Additionne les montants d'une liste d'éléments {montant, date} dont
// la date tombe dans le même mois/année que `reference`. Utilisé pour
// "Total de juillet", partagé entre Revenus, Dépenses et à terme le
// Dashboard — jamais recalculé séparément à chaque endroit.
export function sommeDuMois(items, reference = new Date()) {
  return items
    .filter((item) => {
      const d = new Date(item.date);
      return d.getMonth() === reference.getMonth() && d.getFullYear() === reference.getFullYear();
    })
    .reduce((total, item) => total + item.montant, 0);
}

export function moisPrecedent(reference = new Date()) {
  const d = new Date(reference);
  d.setMonth(d.getMonth() - 1);
  return d;
}

export function ajouterMois(date, nombreMois) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.round(nombreMois));
  return d;
}

export function estimerDateDansNMois(moisRestants, reference = new Date()) {
  const d = ajouterMois(reference, moisRestants);
  return `${nomMois(d)} ${d.getFullYear()}`;
}

export function moisEntreDates(dateCible, reference = new Date()) {
  return (dateCible.getFullYear() - reference.getFullYear()) * 12 + (dateCible.getMonth() - reference.getMonth());
}

export function formatEUR(montant) {
  return Math.round(montant).toLocaleString('fr-FR') + ' €';
}

// ------------------------------------------------------------
// Saisie d'un montant au clavier français
// ------------------------------------------------------------
// Un clavier iPhone en français produit une VIRGULE décimale, pas un
// point. Tout filtre qui ne garde que [0-9] rend donc impossible la
// saisie de "12,50". Ces trois fonctions sont la seule manière
// autorisée de traiter un champ montant — aucun écran ne refiltre
// dans son coin.
//
//  - nettoyerSaisieMontant : ce qu'on RÉINJECTE dans l'input
//  - montantSaisiVersNombre : ce qu'on ENVOIE au calcul / à la base
//  - formatMontantSaisi     : ce qu'on AFFICHE par-dessus l'input

// Accepte le point comme virgule (certains claviers), n'autorise
// qu'une seule virgule, deux décimales, et borne la partie entière.
// Rend toujours une chaîne — jamais un nombre : on ne doit pas
// détruire un "12," en cours de frappe en le convertissant trop tôt.
export function nettoyerSaisieMontant(saisie, maxEntiers = 9) {
  if (saisie == null) return '';
  let s = String(saisie).replace(/\./g, ',').replace(/[^\d,]/g, '');

  const premiere = s.indexOf(',');
  if (premiere !== -1) {
    // une seule virgule : les suivantes sont supprimées
    s = s.slice(0, premiere + 1) + s.slice(premiere + 1).replace(/,/g, '');
  }

  let [entiers, decimales] = s.split(',');
  entiers = (entiers || '').slice(0, maxEntiers);
  if (decimales === undefined) return entiers;
  return `${entiers},${decimales.slice(0, 2)}`;
}

// Retourne 0 plutôt que NaN : un NaN qui remonte dans un calcul de
// solde contamine silencieusement tout ce qui suit.
export function montantSaisiVersNombre(saisie) {
  if (!saisie) return 0;
  const n = Number(String(saisie).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// Sépare les milliers avec une espace fine insécable (U+202F), la
// convention typographique française. Préserve exactement ce qui est
// tapé : "12," reste "12," pendant la frappe, sans virgule avalée.
export function formatMontantSaisi(saisie) {
  if (saisie == null || saisie === '') return '';
  const [entiers, decimales] = String(saisie).split(',');
  const entiersFormates = (entiers || '').replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return decimales === undefined ? entiersFormates : `${entiersFormates},${decimales}`;
}

// Le solde réel n'est jamais une donnée qu'on prétend connaître par magie.
// Sans synchronisation bancaire (prévue pour une version future), PILOT ne
// peut que partir d'un point de départ déclaré par l'utilisateur (Mon
// espace) et suivre les mouvements réellement enregistrés depuis cette
// date. Retourne `null` si ce point de départ n'a pas encore été défini —
// jamais un solde inventé.
//
// Les charges fixes ne sont volontairement PAS déduites ici : sans preuve
// de prélèvement réel (pas de synchronisation bancaire), les compter
// comme des sorties de trésorerie confirmées serait une supposition, pas
// un calcul. Elles restent utilisées ailleurs (Dépenses, Trésorerie de
// sécurité) comme projection, jamais comme mouvement de solde constaté.
export function calculerSoldeActuel({ soldeInitial, soldeInitialDate, revenus, depensesPonctuelles }) {
  if (soldeInitial == null || !soldeInitialDate) return null;
  const depuis = new Date(soldeInitialDate);
  const revenusDepuis = revenus
    .filter((r) => new Date(r.date) >= depuis)
    .reduce((total, r) => total + r.montant, 0);
  const depensesDepuis = depensesPonctuelles
    .filter((d) => new Date(d.date) >= depuis)
    .reduce((total, d) => total + d.montant, 0);
  return soldeInitial + revenusDepuis - depensesDepuis;
}

export function formatDateCourte(date, reference = new Date()) {
  const suffixeAnnee = date.getFullYear() !== reference.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${date.getDate()} ${nomMois(date)}${suffixeAnnee}`;
}

// ------------------------------------------------------------
// Réserve de charges sociales (URSSAF)
// ------------------------------------------------------------
// PILOT n'invente jamais un taux URSSAF exact : le taux réel dépend
// du statut précis, des seuils de revenus, d'une éventuelle ACRE, etc.
// Cette fonction applique le taux que l'UTILISATRICE a renseigné dans
// Mon espace (préférences.tauxChargesSociales) — jamais une constante
// cachée dans le code. Le résultat est présenté comme une estimation
// à vérifier, jamais comme un montant officiel.
export function calculerReserveUrssaf(baseRevenus, tauxChargesSociales) {
  if (!baseRevenus || baseRevenus <= 0 || !tauxChargesSociales) return 0;
  return baseRevenus * (tauxChargesSociales / 100);
}

// "Argent réellement prudent à utiliser" — le disponible après seuil
// de sécurité, moins la réserve URSSAF estimée. Peut être négatif :
// une donnée honnête (voir calculerDisponibleBrut), jamais masquée.
export function calculerArgentPrudent(disponibleBrut, reserveUrssaf) {
  if (disponibleBrut == null) return null;
  return disponibleBrut - reserveUrssaf;
}

// "AAAA-MM-JJ" en heure LOCALE — jamais `date.toISOString().slice(0,10)`,
// qui convertit en UTC et peut renvoyer la veille entre minuit et 1h-2h
// du matin heure de Paris (UTC+1 l'hiver, UTC+2 l'été). Cette fonction
// est la seule à utiliser pour peupler un <input type="date">.
export function dateISOLocale(date = new Date()) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

// "Aujourd'hui • 09:15", "Hier • 14:42", "2 juillet • 11:03"...
export function formatDateRelative(date, aujourdHui = new Date()) {
  const estAujourdHui = date.toDateString() === aujourdHui.toDateString();
  const hier = new Date(aujourdHui);
  hier.setDate(hier.getDate() - 1);
  const estHier = date.toDateString() === hier.toDateString();

  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (estAujourdHui) return `Aujourd'hui • ${heure}`;
  if (estHier) return `Hier • ${heure}`;

  const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${date.getDate()} ${moisNoms[date.getMonth()]} • ${heure}`;
}

// ------------------------------------------------------------
// Échéances récurrentes des charges fixes
// ------------------------------------------------------------
// `new Date()` en JavaScript reflète toujours l'heure LOCALE de
// l'appareil (jamais UTC) — sur un iPhone réglé en France, "aujourd'hui"
// est donc déjà le bon jour. Le vrai bug n'était pas le fuseau horaire :
// c'était qu'aucune notion de "jour du mois récurrent" n'existait —
// seule une date arbitraire, choisie une fois, était stockée telle
// quelle, sans jamais être recalculée par rapport à aujourd'hui.

// Nombre de jours réel du mois donné (gère février et les années
// bissextiles) — nécessaire pour qu'un "31" choisi pour une charge
// mensuelle ne déborde jamais sur le mois suivant en avril, juin,
// septembre ou novembre.
export function joursDansLeMois(annee, moisIndex) {
  return new Date(annee, moisIndex + 1, 0).getDate();
}

// Calcule la vraie prochaine échéance d'une charge mensuelle à partir
// du jour du mois où elle tombe (1-31) — jamais une date figée au jour
// de la saisie. Si ce jour est déjà passé ce mois-ci (ou si l'utilisateur
// indique explicitement qu'elle a déjà été prélevée), l'échéance suivante
// tombe le mois prochain.
export function prochaineEcheanceMensuelle(jourDuMois, dejaPreleveeCeMois, reference = new Date()) {
  const auj = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const jourCeMois = Math.min(jourDuMois, joursDansLeMois(auj.getFullYear(), auj.getMonth()));
  const candidatCeMois = new Date(auj.getFullYear(), auj.getMonth(), jourCeMois);

  if (!dejaPreleveeCeMois && candidatCeMois >= auj) {
    return candidatCeMois;
  }
  const moisProchain = auj.getMonth() + 1;
  const jourMoisProchain = Math.min(jourDuMois, joursDansLeMois(auj.getFullYear(), moisProchain));
  return new Date(auj.getFullYear(), moisProchain, jourMoisProchain);
}

// "Aujourd'hui", "Demain", ou "le 5 août" — jamais "prochaine le 8
// juillet" pour une échéance qui tombe en réalité dans deux semaines,
// ni pour une échéance qui tombe justement aujourd'hui.
export function formatEcheance(date, reference = new Date()) {
  const auj = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const cible = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffJours = Math.round((cible - auj) / (1000 * 60 * 60 * 24));

  if (diffJours === 0) return "aujourd'hui";
  if (diffJours === 1) return 'demain';
  return `le ${formatDateCourte(date, reference)}`;
}
