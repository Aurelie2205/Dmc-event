exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration serveur incomplete' }) };
  }

  const sbHeaders = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json'
  };
  const deny = (msg) => ({ statusCode: 403, body: JSON.stringify({ error: msg }) });

  // 1 — Jeton de l'appelant. C'est LUI qui fait foi, pas ce que dit le corps.
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!callerToken) return deny('Authentification requise');

  let callerId;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${callerToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data || !data.id) return deny('Session invalide');
    callerId = data.id;
  } catch (e) {
    console.error('[delete-ambassador] lecture user:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Verification impossible' }) };
  }

  // 2 — L'appelant doit etre administrateur.
  let callerRole;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(callerId)}&select=role`,
      { headers: sbHeaders }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return deny('Profil appelant introuvable');
    callerRole = rows[0].role;
  } catch (e) {
    console.error('[delete-ambassador] lecture profil appelant:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Verification impossible' }) };
  }
  if (callerRole !== 'admin' && callerRole !== 'super_admin') return deny('Droits insuffisants');

  // 3 — Cible
  let profileId;
  try {
    ({ profileId } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps invalide' }) };
  }
  profileId = (profileId || '').trim();
  if (!profileId) return { statusCode: 400, body: JSON.stringify({ error: 'profileId manquant' }) };
  // On ne supprime pas son propre compte par cette voie.
  if (profileId === callerId) return deny('Suppression de son propre compte interdite');

  // 4 — La cible doit etre un ambassadeur : un bug d'interface ne pourra jamais
  //     effacer un administrateur.
  let targetRole;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&select=role,email`,
      { headers: sbHeaders }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Compte introuvable' }) };
    }
    targetRole = rows[0].role;
  } catch (e) {
    console.error('[delete-ambassador] lecture profil cible:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Verification impossible' }) };
  }
  if (targetRole !== 'ambassador') return deny('Seul un compte ambassadeur peut etre supprime ici');

  // 5 — Suppression du compte Auth. Le profil suit par cascade.
  try {
    const res = await fetch(`${SB_URL}/auth/v1/admin/users/${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
      headers: sbHeaders
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[delete-ambassador] suppression:', res.status, detail.slice(0, 300));
      return { statusCode: 500, body: JSON.stringify({ error: 'Suppression impossible' }) };
    }
  } catch (e) {
    console.error('[delete-ambassador] suppression:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Suppression impossible' }) };
  }

  console.log('[delete-ambassador] compte supprime:', profileId, 'par', callerId);
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
