// ═══════════════════════════════════════════════════════════════════════════
//  DMC EVENT — resolve-login
//  Résolution username → email pour la connexion des administrateurs.
// ═══════════════════════════════════════════════════════════════════════════
//
//  POURQUOI CETTE FONCTION
//  Les admins se connectent par identifiant (username), pas par email —
//  UX historique conservée. Supabase Auth exige un email.
//  Cette fonction fait le pont, côté serveur, car le front ne peut pas lire
//  la table profiles avant d'être authentifié (c'est tout l'intérêt de RLS).
//
//  FLUX
//    Front : { username: 'admin' }
//      → resolve-login : cherche profiles WHERE username = 'admin'
//      → { email: 'aurelmatt@icloud.com' }
//    Front : supabase.auth.signInWithPassword({ email, password })
//
//  ANTI-ÉNUMÉRATION (décision actée — option A)
//  Un username inconnu renvoie TOUJOURS un email factice (200), jamais 404.
//  Supabase Auth échoue ensuite sur le mot de passe. L'appelant ne peut pas
//  distinguer « username inconnu » de « mot de passe faux ».
//  → Un seul chemin, un seul message : « Identifiant ou mot de passe incorrect ».
//
//  LOGS SERVEUR
//  L'utilisateur voit toujours la même chose ; les logs Netlify distinguent :
//    [RESOLVE_OK]        username trouvé
//    [RESOLVE_NOT_FOUND] username introuvable  → l'appelant reçoit un leurre
//    [RESOLVE_SB_ERROR]  Supabase a répondu en erreur
//    [RESOLVE_ERROR]     erreur technique / réseau
//
//  ⚠️ « Mot de passe incorrect » n'est PAS loggable ici : cette fonction ne
//     voit jamais le mot de passe. Ce cas apparaît dans les logs Auth de
//     Supabase (Dashboard → Authentication → Logs), pas dans Netlify.
//
//  Variables d'environnement : SB_URL, SB_SERVICE_KEY
// ═══════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.SB_URL;
const SB_SERVICE_KEY = process.env.SB_SERVICE_KEY;

// Domaine du leurre. Volontairement non routable (RFC 2606) : aucun email
// ne partira jamais dessus, et aucun compte réel ne peut porter ce domaine.
const DECOY_DOMAIN = 'invalid.dmc-event.local';

// Réponse leurre : un email syntaxiquement valide, dérivé du username pour
// être stable (le même username renvoie toujours le même leurre — pas de
// signal temporel exploitable).
function decoyEmail(username) {
  const safe = String(username || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32) || 'unknown';
  return `${safe}@${DECOY_DOMAIN}`;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let username;
  try {
    ({ username } = JSON.parse(event.body || '{}'));
  } catch (e) {
    console.error('[RESOLVE_ERROR] Corps de requête illisible :', e.message);
    // Même en cas de JSON invalide : réponse uniforme, pas d'indice.
    return json(200, { email: decoyEmail('') });
  }

  const cleaned = String(username || '').trim();

  if (!cleaned) {
    console.warn('[RESOLVE_NOT_FOUND] Username vide');
    return json(200, { email: decoyEmail('') });
  }

  if (!SB_URL || !SB_SERVICE_KEY) {
    console.error('[RESOLVE_ERROR] SB_URL ou SB_SERVICE_KEY absente des variables d\'environnement');
    return json(200, { email: decoyEmail(cleaned) });
  }

  try {
    // Recherche insensible à la casse : l'admin peut taper « Laure » ou « laure ».
    // ilike sans wildcard = égalité insensible à la casse.
    // Seuls les rôles admin/super_admin ont un username — le filtre sur role
    // évite qu'un participant puisse être résolu par ce chemin.
    const url = `${SB_URL}/rest/v1/profiles`
      + `?select=email,username,role,is_active`
      + `&username=ilike.${encodeURIComponent(cleaned)}`
      + `&role=in.(admin,super_admin)`
      + `&limit=1`;

    const res = await fetch(url, {
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`
      }
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[RESOLVE_SB_ERROR] Supabase ${res.status} — ${detail.slice(0, 200)}`);
      return json(200, { email: decoyEmail(cleaned) });
    }

    const rows = await res.json();
    const profile = Array.isArray(rows) ? rows[0] : null;

    if (!profile || !profile.email) {
      console.warn(`[RESOLVE_NOT_FOUND] Username introuvable : "${cleaned}" — leurre renvoyé`);
      return json(200, { email: decoyEmail(cleaned) });
    }

    // Compte désactivé : traité comme introuvable côté client, mais loggé
    // distinctement pour qu'un admin comprenne pourquoi la connexion échoue.
    if (profile.is_active === false) {
      console.warn(`[RESOLVE_NOT_FOUND] Compte désactivé : "${cleaned}" — leurre renvoyé`);
      return json(200, { email: decoyEmail(cleaned) });
    }

    console.log(`[RESOLVE_OK] "${cleaned}" → résolu (role=${profile.role})`);
    return json(200, { email: profile.email });

  } catch (e) {
    console.error('[RESOLVE_ERROR] Exception :', e.message);
    return json(200, { email: decoyEmail(cleaned) });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  CÔTÉ FRONT (étape 5) — usage attendu
// ═══════════════════════════════════════════════════════════════════════════
//
//    async function loginAnimator(){
//      const username = document.getElementById('login-user').value.trim();
//      const pw       = document.getElementById('login-pw').value;
//
//      // 1. Résoudre l'identifiant en email
//      const res  = await fetch('/.netlify/functions/resolve-login', {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json' },
//        body: JSON.stringify({ username })
//      });
//      const { email } = await res.json();
//
//      // 2. Authentifier — échoue naturellement si l'email est un leurre
//      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
//
//      if (error) {
//        // MESSAGE UNIQUE — ne jamais distinguer les cas côté client
//        showError('Identifiant ou mot de passe incorrect');
//        return;
//      }
//      // 3. Charger le profil, construire currentUser (même forme qu'avant)
//    }
//
//  ⚠️ Le front ne doit JAMAIS afficher un message différent selon le cas.
//     Sinon toute l'anti-énumération de cette fonction est annulée.
//
// ═══════════════════════════════════════════════════════════════════════════
//  DIAGNOSTIC — où regarder selon le symptôme
// ═══════════════════════════════════════════════════════════════════════════
//
//  « Un admin ne peut pas se connecter »
//    1. Netlify → Functions → resolve-login
//         [RESOLVE_OK]        → le username est bon, le souci est le mot de passe
//                               → Supabase → Authentication → Logs
//         [RESOLVE_NOT_FOUND] → username absent de profiles, ou compte désactivé,
//                               ou rôle ≠ admin/super_admin
//         [RESOLVE_SB_ERROR]  → problème Supabase (clé, RLS, table absente)
//         [RESOLVE_ERROR]     → variable d'env manquante ou erreur réseau
//
//    2. Vérifier le profil :
//         SELECT username, email, role, is_active FROM public.profiles
//         WHERE username ILIKE '<le_username>';
//
// ═══════════════════════════════════════════════════════════════════════════
//  ROLLBACK
//  Supprimer ce fichier du dépôt. Aucune donnée touchée, aucun état persistant.
// ═══════════════════════════════════════════════════════════════════════════
