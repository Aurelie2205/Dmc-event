exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { email, name, token, ambassadorId } = JSON.parse(event.body);
  const key = process.env.RESEND_API_KEY?.trim();
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;

  // Sauvegarder le token en base
  if (SB_URL && SB_KEY) {
    const expires = new Date(Date.now() + 3600000).toISOString();
    await fetch(`${SB_URL}/rest/v1/ambassador_reset_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ambassador_id: ambassadorId, token, expires_at: expires })
    }).catch(() => {});
  }

  const resetUrl = `https://dmc-event-v2.netlify.app?reset_ambassador=${token}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060410;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060410;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:linear-gradient(160deg,#0e0820,#060410);border:1px solid rgba(200,160,80,0.25);border-radius:20px;overflow:hidden;">
        <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#c8a050;margin-bottom:12px;">DMC Event</div>
          <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;font-family:Georgia,serif;">Réinitialisation</div>
          <div style="font-size:26px;font-weight:800;font-family:Georgia,serif;">de votre <span style="background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">mot de passe</span></div>
        </td></tr>
        <tr><td style="padding:24px 40px 0;"><div style="height:1px;background:linear-gradient(135deg,transparent,rgba(200,160,80,0.3),transparent);"></div></td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="font-size:15px;color:rgba(245,240,232,0.85);line-height:1.8;margin:0 0 20px;font-family:Georgia,serif;">
            Bonjour <strong style="color:#e8c87a;">${name}</strong>,
          </p>
          <p style="font-size:15px;color:rgba(245,240,232,0.75);line-height:1.8;margin:0 0 28px;font-family:Georgia,serif;">
            Vous avez demandé la réinitialisation de votre mot de passe Ambassadeur.<br>
            Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8902a,#e8c87a);color:#050508;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="font-size:12px;color:rgba(245,240,232,0.4);line-height:1.8;margin:0;font-family:Georgia,serif;text-align:center;">
            Ce lien est valable pendant 1 heure.<br>
            Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(135deg,transparent,rgba(200,160,80,0.15),transparent);"></div></td></tr>
        <tr><td style="padding:24px 40px 32px;text-align:center;">
          <p style="font-size:12px;color:rgba(200,160,80,0.4);margin:0;font-family:Georgia,serif;">DMC Event ✨</p>
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
        subject: 'Réinitialisation de votre mot de passe Ambassadeur',
        html
      })
    });
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
