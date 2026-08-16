// ═══════════════════════════════════════════════════════════════════════════
//  DMC EVENT — migrate-dry-run   (NETLIFY FUNCTION — DRY-RUN UNIQUEMENT)
//  Simule la migration des comptes et renvoie un rapport JSON.
// ═══════════════════════════════════════════════════════════════════════════
//
//  POURQUOI CETTE FONCTION
//    Supabase bloque désormais l'usage de la service_role depuis un navigateur.
//    Cette fonction fait le même travail que migrate-accounts.js mais CÔTÉ
//    SERVEUR : la clé reste dans les variables d'environnement Netlify, jamais
//    exposée au client.
//
//  CE QU'ELLE FAIT / NE FAIT PAS
//    ✅ lit animators, ambassadors, participants
//    ✅ valide les 40 comptes (emails, mots de passe, doublons)
//    ✅ renvoie un rapport JSON complet
//    ❌ AUCUNE écriture — pas de createUser, pas d'INSERT
//    ❌ ne touche jamais la production (verrou sur SB_URL)
//
//  Cette fonction NE PEUT PAS écrire même si on le voulait : le code de
//  création de comptes n'y est simplement pas présent. C'est un lecteur.
//
//  USAGE
//    Déployée sur la branche auth-migration, appeler dans le navigateur :
//      https://<site-staging>.netlify.app/.netlify/functions/migrate-dry-run
//
//  À SUPPRIMER après validation du dry-run (outil jetable).
//
//  Variables utilisées : SB_URL, SB_SERVICE_KEY (déjà configurées sur Netlify)
// ═══════════════════════════════════════════════════════════════════════════

const SB_URL         = process.env.SB_URL;
const SB_SERVICE_KEY = process.env.SB_SERVICE_KEY;

// Verrou anti-production. Cette fonction ne tourne QUE sur le staging.
const STAGING_REF = 'wffiarchhhkzswcapybf';
const PROD_REF    = 'qcovftgwkughattbraba';

// Mapping des admins — animators n'a pas de colonne email.
const ADMIN_EMAILS = {
  'admin':   'aurelmatt@icloud.com',
  'Jess':    'Jessicavincent54@gmail.com',
  'Laure':   'Lauremarthre64@gmail.com',
  'Adeline': 'Adeline.martel.95@gmail.com'
};

// Valeurs attendues
const EXPECTED      = { super_admin: 1, admin: 3, ambassador: 36, participant: 0 };
const EXPECTED_OS   = 35;
const EXPECTED_CODE = 38;

const headers = {
  'Content-Type':  'application/json',
  'apikey':        SB_SERVICE_KEY,
  'Authorization': 'Bearer ' + SB_SERVICE_KEY
};

async function sbGet(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { headers });
  if (!r.ok) throw new Error(`GET ${table} → ${r.status} ${await r.text()}`);
  return r.json();
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body, null, 2)
});

exports.handler = async () => {
  const log = [];
  const push = (m) => log.push(m);

  try {
    // ─── Verrous ────────────────────────────────────────────────────────────
    if (!SB_URL || !SB_SERVICE_KEY) {
      return json(500, { ok: false, error: 'SB_URL ou SB_SERVICE_KEY absente des variables Netlify.' });
    }
    if (SB_URL.includes(PROD_REF)) {
      return json(403, {
        ok: false,
        error: 'ARRÊT — SB_URL pointe vers la PRODUCTION. Cette fonction est réservée au staging.',
        sb_url: SB_URL
      });
    }
    if (!SB_URL.includes(STAGING_REF)) {
      return json(403, {
        ok: false,
        error: `ARRÊT — SB_URL ne correspond pas au staging attendu (...${STAGING_REF}).`,
        sb_url: SB_URL
      });
    }
    push(`Projet ciblé : ${SB_URL}`);
    push('Mode : DRY-RUN — aucune écriture');

    // ─── Contrôles préalables ────────────────────────────────────────────────
    try {
      await sbGet('profiles', 'select=id&limit=1');
      await sbGet('migration_log', 'select=auth_id&limit=1');
      push('✓ profiles et migration_log présents');
    } catch (e) {
      return json(400, {
        ok: false,
        error: 'profiles ou migration_log introuvable — exécuter etape2-schema-profiles.sql d\'abord.',
        detail: e.message
      });
    }

    const already = await sbGet('migration_log', 'select=auth_id&batch=eq.auth-migration-v1');
    if (already.length > 0) {
      return json(409, {
        ok: false,
        error: `Le batch auth-migration-v1 a déjà migré ${already.length} compte(s). Rollback ciblé d'abord.`
      });
    }
    push('✓ aucun batch antérieur');

    // ─── Lecture ─────────────────────────────────────────────────────────────
    const [animators, ambassadors, participants] = await Promise.all([
      sbGet('animators',    'select=*&order=username.asc'),
      sbGet('ambassadors',  'select=*&order=created_at.asc'),
      sbGet('participants', 'select=*&order=created_at.asc')
    ]);
    push(`Lu : ${animators.length} animators, ${ambassadors.length} ambassadors, ${participants.length} participants`);

    const accounts = [];
    const blocking = [];

    // Admins
    for (const a of animators) {
      const email = ADMIN_EMAILS[a.username];
      if (!email) {
        blocking.push(`Admin "${a.username}" absent du mapping ADMIN_EMAILS — aucun email deviné.`);
        continue;
      }
      accounts.push({
        legacy_id: a.id, legacy_table: 'animators',
        username: a.username, email, password: a.password,
        role: a.is_super_admin ? 'super_admin' : 'admin',
        display_name: a.display_name,
        onesignal_id: a.onesignal_id || null,
        referral_code: a.code || null,
        is_active: true
      });
    }

    // Ambassadeurs
    for (const a of ambassadors) {
      accounts.push({
        legacy_id: a.id, legacy_table: 'ambassadors',
        username: null, email: a.email, password: a.password_hash,
        role: 'ambassador',
        display_name: a.name,
        onesignal_id: a.onesignal_id || null,
        referral_code: a.code || null,
        is_active: a.active !== false
      });
    }

    // Participants (0 attendu)
    for (const p of participants) {
      if (!p.email) {
        blocking.push(`Participant ${p.id} sans email — impossible à migrer.`);
        continue;
      }
      accounts.push({
        legacy_id: p.id, legacy_table: 'participants',
        username: null, email: p.email, password: p.password,
        role: 'participant',
        display_name: p.display_name,
        onesignal_id: p.onesignal_id || null,
        referral_code: null,
        is_active: true
      });
    }

    // ─── Validation ──────────────────────────────────────────────────────────
    const errors    = [];
    const seenEmail = new Map();
    const seenCode  = new Map();

    for (const a of accounts) {
      const who = `${a.legacy_table}/${a.username || a.email}`;
      if (!a.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email))
        errors.push(`${who} : email invalide`);
      if (!a.password || a.password.length < 6)
        errors.push(`${who} : mot de passe absent ou < 6 caractères`);
      if (!a.display_name || !a.display_name.trim())
        errors.push(`${who} : display_name vide`);

      const ek = a.email?.toLowerCase();
      if (seenEmail.has(ek)) errors.push(`Email en double : ${a.email} (${who} + ${seenEmail.get(ek)})`);
      else if (ek) seenEmail.set(ek, who);

      if (a.referral_code) {
        if (seenCode.has(a.referral_code))
          errors.push(`Code en double : ${a.referral_code} (${who} + ${seenCode.get(a.referral_code)})`);
        else seenCode.set(a.referral_code, who);
      }
    }

    // ─── Rapport ─────────────────────────────────────────────────────────────
    const byRole = accounts.reduce((m, a) => (m[a.role] = (m[a.role] || 0) + 1, m), {});
    const withOs   = accounts.filter(a => a.onesignal_id).length;
    const withCode = accounts.filter(a => a.referral_code).length;

    const conformity = [];
    for (const [role, n] of Object.entries(EXPECTED)) {
      const got = byRole[role] || 0;
      conformity.push({ item: role, attendu: n, trouvé: got, ok: got === n });
    }
    conformity.push({ item: 'onesignal_id',  attendu: EXPECTED_OS,   trouvé: withOs,   ok: withOs === EXPECTED_OS });
    conformity.push({ item: 'referral_code', attendu: EXPECTED_CODE, trouvé: withCode, ok: withCode === EXPECTED_CODE });

    const allConform = conformity.every(c => c.ok) && errors.length === 0 && blocking.length === 0;

    // Liste des comptes qui seraient créés (sans mot de passe)
    const would_create = accounts.map(a => ({
      role: a.role,
      email: a.email,
      username: a.username,
      display_name: a.display_name,
      onesignal_id: a.onesignal_id ? '(présent)' : null,
      referral_code: a.referral_code
    }));

    return json(200, {
      ok: allConform,
      mode: 'DRY-RUN — aucune écriture effectuée',
      projet: SB_URL,
      resume: {
        total: accounts.length,
        par_role: byRole,
        onesignal_id_a_reporter: withOs,
        referral_code_a_reporter: withCode
      },
      conformite: conformity,
      erreurs_bloquantes: blocking,
      erreurs_validation: errors,
      comptes_qui_seraient_crees: would_create,
      verdict: allConform
        ? '✅ Conforme — prêt pour la migration réelle'
        : '⚠️ Écarts détectés — voir erreurs et conformité ci-dessus',
      log
    });

  } catch (err) {
    return json(500, { ok: false, error: err.message, log });
  }
};
