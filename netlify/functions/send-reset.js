exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  
  const { email } = JSON.parse(event.body);
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  const SITE_URL = 'https://dmc-event-v2.netlify.app';

  // Vérifier que le compte existe
  const checkRes = await fetch(`${SB_URL}/rest/v1/participants?email=eq.${encodeURIComponent(email)}&select=id,display_name`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  const participants = await checkRes.json();
  if (!participants || participants.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) }; // Silencieux pour sécurité
  }
  const participant = participants[0];

  // Invalider les anciens tokens
  await fetch(`${SB_URL}/rest/v1/password_resets?email=eq.${encodeURIComponent(email)}&used=eq.false`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify({ used: true })
  });

  // Générer token sécurisé
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  await fetch(`${SB_URL}/rest/v1/password_resets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify({ email, token, expires_at: expires, used: false })
  });

  const resetLink = `${SITE_URL}?reset=${token}`;
  const LOGO_URL = 'https://qcovftgwkughattbraba.supabase.co/storage/v1/object/public/images/43B03296-46C3-4AD3-8BCB-569B840CA035.PNG';
  const name = participant.display_name || email;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(160deg,#0d0d14,#050508);border:1px solid rgba(200,160,80,0.2);border-radius:24px;overflow:hidden;">

  <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>

  <tr><td align="center" style="padding:40px 40px 20px;">
    <img src="${LOGO_URL}" alt="DMC Event" width="130" style="max-width:130px;width:100%;display:block;">
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
    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#b8902a 0%,#e8c87a 40%,#c8a050 60%,#f0d890 100%);color:#050508;text-decoration:none;padding:16px 40px;border-radius:50px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px rgba(200,160,80,0.3);">Réinitialiser mon mot de passe</a>
  </td></tr>

  <tr><td style="padding:0 40px 28px;">
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,160,80,0.12);border-radius:14px;padding:16px 20px;">
      <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.4);line-height:1.7;">⏱ Ce lien expire dans <strong style="color:rgba(245,240,232,0.6);">30 minutes</strong>.<br>🔒 Si vous n'avez pas fait cette demande, ignorez cet email.</p>
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

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'DMC Event <noreply@dmc-event.com>',
      to: [email],
      subject: '🔑 Réinitialisation de votre mot de passe DMC Event',
      html
    })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
