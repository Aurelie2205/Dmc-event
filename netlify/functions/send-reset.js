exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  // Seul l'email est lu du client. Tout le reste est determine cote serveur.
  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps invalide' }) };
  }
  email = (email || '').trim().toLowerCase();
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email manquant' }) };

  const key = process.env.RESEND_API_KEY?.trim();
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration serveur incomplete' }) };
  }

  // URL du site qui sert cette fonction : staging ou production selon le deploiement.
  const SITE = (process.env.URL || 'https://dmc-event.com').replace(/\/+$/, '');
  const LOGO = 'https://qcovftgwkughattbraba.supabase.co/storage/v1/object/public/images/43B03296-46C3-4AD3-8BCB-569B840CA035.PNG';

  // Reponse identique que le compte existe ou non.
  const SILENCE = { statusCode: 200, body: JSON.stringify({ success: true }) };

  const sbHeaders = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1 — Verifier que le compte existe, est participant et actif
  let profile;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,display_name,role,is_active`,
      { headers: sbHeaders }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return SILENCE;
    profile = rows[0];
  } catch (e) {
    console.error('[send-reset] lecture profiles:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Lecture impossible' }) };
  }
  if (profile.role !== 'participant') return SILENCE;
  if (profile.is_active === false) return SILENCE;

  // 2 — Demander a Supabase un jeton de recuperation natif.
  //     Remplace la mecanique maison : plus de token genere ni stocke par nous.
  let hashedToken;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ type: 'recovery', email })
    });
    const data = await res.json();
    if (!res.ok || !data || !data.hashed_token) {
      console.error('[send-reset] generate_link:', res.status, JSON.stringify(data).slice(0, 300));
      return { statusCode: 500, body: JSON.stringify({ error: 'Generation du lien impossible' }) };
    }
    hashedToken = data.hashed_token;
  } catch (e) {
    console.error('[send-reset] generate_link:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Generation du lien impossible' }) };
  }

  // Le lien pointe vers notre domaine : aucune Redirect URL Supabase requise.
  const resetUrl = `${SITE}/?recovery=${encodeURIComponent(hashedToken)}`;
  const name = profile.display_name || email;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(160deg,#0d0d14,#050508);border:1px solid rgba(200,160,80,0.2);border-radius:24px;overflow:hidden;">

  <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>

  <tr><td align="center" style="padding:40px 40px 20px;">
    <img src="${LOGO}" alt="DMC Event" width="130" style="max-width:130px;width:100%;display:block;">
  </td></tr>

  <tr><td align="center" style="padding:0 40px 8px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:60px;height:1px;background:linear-gradient(to right,transparent,rgba(200,160,80,0.5));"></td>
      <td style="padding:0 10px;color:#c8a050;font-size:10px;">◆</td>
      <td style="width:60px;height:1px;background:linear-gradient(to left,transparent,rgba(200,160,80,0.5));"></td>
    </tr></table>
  </td></tr>

  <tr><td align="center" style="padding:8px 40px 4px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:rgba(245,240,232,0.4);">Récupération d'accès</p>
  </td></tr>
  <tr><td align="center" style="padding:4px 40px 16px;">
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Réinitialiser votre mot de passe</h1>
  </td></tr>

  <tr><td style="padding:0 40px 24px;">
    <p style="margin:0;font-size:14px;color:rgba(245,240,232,0.7);line-height:1.8;">Bonjour <strong style="color:#e8c87a;">${name}</strong>,</p>
    <p style="margin:12px 0 0;font-size:13px;color:rgba(245,240,232,0.6);line-height:1.8;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
  </td></tr>

  <tr><td align="center" style="padding:0 40px 28px;">
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8902a 0%,#e8c87a 40%,#c8a050 60%,#f0d890 100%);color:#050508;text-decoration:none;padding:16px 40px;border-radius:50px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px rgba(200,160,80,0.3);">Réinitialiser mon mot de passe</a>
  </td></tr>

  <tr><td style="padding:0 40px 28px;">
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,160,80,0.12);border-radius:14px;padding:16px 20px;">
      <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.4);line-height:1.7;">⏱ Ce lien expire dans <strong style="color:rgba(245,240,232,0.6);">1 heure</strong>.<br>🔒 Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    </div>
  </td></tr>

  <tr><td style="padding:0 40px;"><div style="height:1px;background:rgba(200,160,80,0.1);"></div></td></tr>
  <tr><td align="center" style="padding:24px 40px 32px;">
    <p style="margin:0;font-size:11px;color:rgba(245,240,232,0.2);letter-spacing:1px;">— L'équipe DMC Event —</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        from: 'DMC Event <noreply@dmc-event.com>',
        to: [email],
        subject: '🔑 Réinitialisation de votre mot de passe DMC Event',
        html
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[send-reset] resend:', res.status, detail.slice(0, 200));
    }
  } catch (e) {
    console.error('[send-reset] resend:', e.message);
  }

  return SILENCE;
};
