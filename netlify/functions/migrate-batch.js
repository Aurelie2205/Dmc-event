// ═══════════════════════════════════════════════════════════════════════════
//  DMC EVENT — migrate-batch   (NETLIFY FUNCTION — MIGRATION RÉELLE PAR LOTS)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Migre les comptes existants vers Supabase Auth + profiles, PAR LOTS DE 10,
//  de façon RELANÇABLE et IDEMPOTENTE. Chaque appel traite au plus 10 comptes
//  non encore migrés, puis s'arrête. Aucun enchaînement automatique.
//
//  DÉCLENCHEMENT (manuel, depuis le terminal — curl est déjà sur macOS) :
//    curl -X POST "https://<staging>.netlify.app/.netlify/functions/migrate-batch" \
//         -H "x-migration-secret: <MIGRATION_SECRET>"
//
//  PROTECTIONS
//    · POST obligatoire         → une ouverture d'URL (GET) ne déclenche RIEN
//    · secret partagé requis     → sans x-migration-secret valide : 401
//    · verrou anti-prod absolu   → SB_URL doit être le staging
//    · idempotence stricte       → tout legacy_id déjà dans migration_log est ignoré
//    · lots de 10 maximum
//    · compensation              → createUser OK mais profiles/journal KO → nettoyage
//    · n'active JAMAIS le trigger on_auth_user_created (action SQL manuelle)
//
//  Variables Netlify : SB_URL, SB_SERVICE_KEY, MIGRATION_SECRET
//                      (MIGRATION_SECRET à générer et stocker toi-même)
//
//  ⚠️ Après la migration (staging ET prod) : SUPPRIMER cette fonction.
//     Pour la prod : régénérer un MIGRATION_SECRET différent.
// ═══════════════════════════════════════════════════════════════════════════

const SB_URL          = process.env.SB_URL;
const SB_SERVICE_KEY  = process.env.SB_SERVICE_KEY;
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;

const STAGING_REF = 'wffiarchhhkzswcapybf';
const PROD_REF    = 'qcovftgwkughattbraba';

const BATCH      = 'auth-migration-v1';
const BATCH_SIZE = 10;
const EXPECTED_TOTAL = 40;   // garde-fou : 4 admins + 36 ambassadeurs.
                             // Sert UNIQUEMENT à refuser un état source différent,
                             // PAS au calcul du restant (basé sur allAccounts.length).

const ADMIN_EMAILS = {
  'admin':   'aurelmatt@icloud.com',
  'Jess':    'Jessicavincent54@gmail.com',
  'Laure':   'Lauremarthre64@gmail.com',
  'Adeline': 'Adeline.martel.95@gmail.com'
};

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
async function sbInsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`INSERT ${table} → ${r.status} ${await r.text()}`);
  return r.json();
}
async function sbDelete(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { method: 'DELETE', headers });
  if (!r.ok) throw new Error(`DELETE ${table} → ${r.status} ${await r.text()}`);
}
async function authCreateUser(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const b = await r.json();
  if (!r.ok) throw new Error(`createUser(${email}) → ${r.status} ${JSON.stringify(b)}`);
  return b;
}
async function authDeleteUser(id) {
  const r = await fetch(`${SB_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers });
  if (!r.ok) throw new Error(`deleteUser(${id}) → ${r.status} ${await r.text()}`);
}

// Détecte un état partiel : un compte Auth ou un profil existe déjà pour cet
// email, alors que le legacy_id n'est PAS dans migration_log. C'est la
// signature d'une interruption brutale entre createUser/INSERT profiles et
// l'écriture du journal. On refuse de recréer : on diagnostique et on stoppe.
async function findPartialState(acc) {
  const problems = [];

  // Un profil avec cet email existe-t-il déjà ?
  const prof = await sbGet('profiles',
    `select=id,email&email=eq.${encodeURIComponent(acc.email)}&limit=1`);
  if (prof.length > 0) {
    problems.push({
      type: 'profil_existant',
      email: acc.email,
      profile_id: prof[0].id
    });
  }

  // Un compte Auth avec cet email existe-t-il déjà ?
  // (l'API admin filtre par email)
  const r = await fetch(
    `${SB_URL}/auth/v1/admin/users?filter=${encodeURIComponent('email eq "' + acc.email + '"')}`,
    { headers });
  if (r.ok) {
    const data = await r.json();
    const users = data?.users || [];
    if (users.length > 0) {
      problems.push({
        type: 'compte_auth_existant',
        email: acc.email,
        auth_id: users[0].id
      });
    }
  }
  // Si l'appel échoue, on ne bloque pas là-dessus : la contrainte UNIQUE de
  // profiles et l'échec de createUser sur email dupliqué restent des filets.

  return problems;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body, null, 2)
});

// Construit la liste complète des comptes sources (même logique que le dry-run)
function buildAccounts(animators, ambassadors, participants, blocking) {
  const accounts = [];

  for (const a of animators) {
    const email = ADMIN_EMAILS[a.username];
    if (!email) { blocking.push(`Admin "${a.username}" absent du mapping ADMIN_EMAILS.`); continue; }
    accounts.push({
      legacy_id: a.id, legacy_table: 'animators',
      username: a.username, email, password: a.password,
      role: a.is_super_admin ? 'super_admin' : 'admin',
      display_name: a.display_name,
      avatar_url: a.avatar_url || null,
      onesignal_id: a.onesignal_id || null,
      referral_code: a.code || null,
      is_active: true
    });
  }
  for (const a of ambassadors) {
    accounts.push({
      legacy_id: a.id, legacy_table: 'ambassadors',
      username: null, email: a.email, password: a.password_hash,
      role: 'ambassador',
      display_name: a.name,
      avatar_url: a.avatar_url || null,
      onesignal_id: a.onesignal_id || null,
      referral_code: a.code || null,
      is_active: a.active !== false
    });
  }
  for (const p of participants) {
    if (!p.email) { blocking.push(`Participant ${p.id} sans email.`); continue; }
    accounts.push({
      legacy_id: p.id, legacy_table: 'participants',
      username: null, email: p.email, password: p.password,
      role: 'participant',
      display_name: p.display_name,
      avatar_url: p.avatar_url || null,
      onesignal_id: p.onesignal_id || null,
      referral_code: null,
      is_active: true
    });
  }
  return accounts;
}

exports.handler = async (event) => {
  // ─── Protection 1a : méthode POST obligatoire ────────────────────────────
  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée. Utiliser POST avec l\'en-tête x-migration-secret.',
      note: 'Une simple ouverture d\'URL (GET) ne déclenche aucune migration.'
    });
  }

  // ─── Protection 1b : secret partagé ──────────────────────────────────────
  const provided = event.headers['x-migration-secret'] || event.headers['X-Migration-Secret'];
  if (!MIGRATION_SECRET) {
    return json(500, { ok: false, error: 'MIGRATION_SECRET non configurée côté serveur.' });
  }
  if (!provided || provided !== MIGRATION_SECRET) {
    return json(401, { ok: false, error: 'Secret manquant ou invalide.' });
  }

  // ─── Config présente ? ───────────────────────────────────────────────────
  if (!SB_URL || !SB_SERVICE_KEY) {
    return json(500, { ok: false, error: 'SB_URL ou SB_SERVICE_KEY absente.' });
  }

  // ─── Protection 2 : verrou anti-prod ─────────────────────────────────────
  if (SB_URL.includes(PROD_REF)) {
    return json(403, { ok: false, error: 'ARRÊT — SB_URL pointe vers la PRODUCTION.', sb_url: SB_URL });
  }
  if (!SB_URL.includes(STAGING_REF)) {
    return json(403, { ok: false, error: `ARRÊT — SB_URL n'est pas le staging attendu (...${STAGING_REF}).`, sb_url: SB_URL });
  }

  try {
    // ─── Schéma en place ? ─────────────────────────────────────────────────
    try {
      await sbGet('profiles', 'select=id&limit=1');
      await sbGet('migration_log', 'select=auth_id&limit=1');
    } catch (e) {
      return json(400, { ok: false, error: 'profiles ou migration_log introuvable — exécuter etape2 d\'abord.', detail: e.message });
    }

    // ─── Idempotence : qui est déjà migré ? ────────────────────────────────
    const done = await sbGet('migration_log', `select=legacy_id&batch=eq.${BATCH}`);
    const doneSet = new Set(done.map(d => d.legacy_id));

    // ─── Charger les sources ───────────────────────────────────────────────
    const blocking = [];
    const [animators, ambassadors, participants] = await Promise.all([
      sbGet('animators',    'select=*&order=username.asc'),
      sbGet('ambassadors',  'select=*&order=created_at.asc'),
      sbGet('participants', 'select=*&order=created_at.asc')
    ]);
    const allAccounts = buildAccounts(animators, ambassadors, participants, blocking);

    if (blocking.length > 0) {
      return json(400, {
        ok: false,
        error: 'Anomalies bloquantes — aucune écriture effectuée.',
        blocking
      });
    }

    // ─── Contrôle bloquant : le nombre de comptes sources doit être EXACT ───
    // TARGET n'est plus la cible du calcul (voir "restant" plus bas) : c'est
    // un garde-fou. Si les données sources ont changé (compte ajouté/supprimé
    // en prod, import staging différent), on refuse de migrer sur un état
    // inattendu plutôt que de le masquer.
    if (allAccounts.length !== EXPECTED_TOTAL) {
      return json(409, {
        ok: false,
        error: `Nombre de comptes sources inattendu : ${allAccounts.length} (attendu ${EXPECTED_TOTAL}).`,
        detail: {
          animators: animators.length,
          ambassadors: ambassadors.length,
          participants: participants.length,
          par_role_construit: allAccounts.reduce((m, a) => (m[a.role] = (m[a.role] || 0) + 1, m), {})
        },
        note: 'Migration refusée sur un état source différent de la référence. ' +
              'Vérifier les données du staging avant de continuer.'
      });
    }

    // ─── Filtrer les déjà-migrés (idempotence) ─────────────────────────────
    const remaining = allAccounts.filter(a => !doneSet.has(a.legacy_id));
    const migratedBefore = doneSet.size;

    // Déjà terminé ?
    if (remaining.length === 0) {
      return json(200, {
        ok: true,
        termine: true,
        global: { migres_total: migratedBefore, restant: 0, cible: allAccounts.length },
        message: `Migration complète : ${migratedBefore} compte(s).`,
        prochaine_action:
          'Activer le trigger d\'inscription (SQL, manuel) :\n' +
          '  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users\n' +
          '    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();\n' +
          'Puis reporter referred_by (SQL séparé) si des participants existent.'
      });
    }

    // ─── Le lot : 10 premiers restants ─────────────────────────────────────
    const batch = remaining.slice(0, BATCH_SIZE);
    const result = { crees: 0, ignores_deja_faits: 0, erreurs: [] };

    for (const acc of batch) {
      let authUser = null;
      let profileCreated = false;

      try {
        // (0) Détection d'état partiel — couvre l'interruption brutale entre
        //     createUser/profiles et l'écriture du journal (le legacy_id n'est
        //     pas dans migration_log, mais le compte/profil existe déjà).
        const partial = await findPartialState(acc);
        if (partial.length > 0) {
          result.erreurs.push({
            compte: `${acc.legacy_table}/${acc.username || acc.email}`,
            erreur: 'ÉTAT PARTIEL DÉTECTÉ — un compte Auth ou un profil existe déjà ' +
                    'pour cet email sans entrée dans migration_log.',
            diagnostic: partial,
            action_requise:
              'Interruption antérieure probable. NE PAS recréer. Choisir :\n' +
              '  (a) compléter manuellement migration_log pour ce compte, ou\n' +
              '  (b) supprimer le compte Auth + profil partiels puis relancer.\n' +
              'Résoudre AVANT toute relance.'
          });
          break;   // arrêt du lot — pas de recréation sur un état incertain
        }

        // (a) compte Auth — createUser hache le mot de passe
        authUser = await authCreateUser(acc.email, acc.password);

        // (b) profil
        await sbInsert('profiles', {
          id:            authUser.id,
          role:          acc.role,
          username:      acc.username,
          display_name:  acc.display_name,
          avatar_url:    acc.avatar_url,
          email:         acc.email,
          onesignal_id:  acc.onesignal_id,
          referral_code: acc.referral_code,
          referred_by:   null,          // 2e passe SQL séparée
          is_active:     acc.is_active
        });
        profileCreated = true;

        // (c) journal — INDISPENSABLE à l'idempotence et au rollback
        await sbInsert('migration_log', {
          auth_id:      authUser.id,
          legacy_id:    acc.legacy_id,
          legacy_table: acc.legacy_table,
          username:     acc.username,
          email:        acc.email,
          batch:        BATCH
        });

        result.crees++;

      } catch (err) {
        // ─── Compensation ──────────────────────────────────────────────────
        const entry = { compte: `${acc.legacy_table}/${acc.username || acc.email}`, erreur: err.message };

        if (authUser) {
          try {
            if (profileCreated) await sbDelete('profiles', `id=eq.${authUser.id}`);
            await authDeleteUser(authUser.id);
            entry.compensation = 'OK — compte Auth et profil supprimés, état propre';
          } catch (compErr) {
            // Orphelin : createUser OK mais compensation KO. FATAL pour ce lot.
            entry.compensation = 'ÉCHOUÉE — ORPHELIN';
            entry.orphelin = {
              auth_id: authUser.id,
              email: acc.email,
              profil_cree: profileCreated,
              nettoyage_sql: [
                profileCreated ? `DELETE FROM public.profiles WHERE id = '${authUser.id}';` : null,
                `DELETE FROM auth.users WHERE id = '${authUser.id}';`
              ].filter(Boolean)
            };
          }
        }
        result.erreurs.push(entry);

        // Arrêt du lot au premier échec — pas de continuation
        break;
      }
    }

    const migratedNow = migratedBefore + result.crees;
    const restant     = allAccounts.length - migratedNow;
    const hasError    = result.erreurs.length > 0;

    return json(hasError ? 207 : 200, {
      ok: !hasError,
      termine: false,
      lot: {
        crees: result.crees,
        ignores_deja_faits: 0,     // les déjà-faits sont filtrés avant le lot
        erreurs: result.erreurs.length,
        detail_erreurs: result.erreurs
      },
      global: {
        migres_total: migratedNow,
        restant: Math.max(restant, 0),
        cible: allAccounts.length
      },
      prochaine_action: hasError
        ? 'ARRÊT sur erreur. Voir detail_erreurs. Corriger avant de relancer. ' +
          'Si un orphelin est signalé, exécuter son nettoyage_sql avant toute relance.'
        : (restant > 0
            ? `Relancer le même curl pour le lot suivant (${restant} restant).`
            : 'Tous les comptes sont migrés. Relancer une fois pour obtenir le récap final ' +
              '(termine:true) et le rappel d\'activation du trigger.')
    });

  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
