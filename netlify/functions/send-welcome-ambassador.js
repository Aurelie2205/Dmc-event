exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { email, name, code, sponsorUrl } = JSON.parse(event.body);
  const key = process.env.RESEND_API_KEY?.trim();

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060410;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060410;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:linear-gradient(160deg,#0e0820,#060410);border:1px solid rgba(200,160,80,0.25);border-radius:20px;overflow:hidden;">
        <!-- Barre or -->
        <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>
        <!-- Header -->
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#c8a050;margin-bottom:12px;">DMC Event</div>
          <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:8px;font-family:Georgia,serif;">Votre espace Ambassadeur</div>
          <div style="font-size:28px;font-weight:800;font-family:Georgia,serif;">est <span style="background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">prêt</span> ✨</div>
        </td></tr>
        <!-- Séparateur -->
        <tr><td style="padding:24px 40px 0;">
          <div style="height:1px;background:linear-gradient(135deg,transparent,rgba(200,160,80,0.3),transparent);"></div>
        </td></tr>
        <!-- Corps -->
        <tr><td style="padding:28px 40px;">
          <p style="font-size:15px;color:rgba(245,240,232,0.85);line-height:1.8;margin:0 0 20px;font-family:Georgia,serif;">
            Bonjour <strong style="color:#e8c87a;">${name}</strong>,
          </p>
          <p style="font-size:15px;color:rgba(245,240,232,0.75);line-height:1.8;margin:0 0 24px;font-family:Georgia,serif;">
            Bienvenue dans l'aventure DMC Event.<br>
            Votre espace Ambassadeur est maintenant actif.
          </p>
          <p style="font-size:15px;color:rgba(245,240,232,0.75);line-height:1.8;margin:0 0 28px;font-family:Georgia,serif;">
            Vous pouvez dès à présent partager votre lien personnel et commencer à construire votre cercle.
          </p>
          <!-- Lien sponsor -->
          <div style="background:linear-gradient(160deg,rgba(200,160,80,0.08),rgba(60,20,90,0.12));border:1px solid rgba(200,160,80,0.2);border-radius:14px;padding:20px 24px;margin-bottom:16px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);"></div>
            <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c8a050;margin-bottom:8px;">🔗 Mon lien d'invitation</div>
            <a href="${sponsorUrl}" style="font-size:13px;color:#e8c87a;word-break:break-all;font-family:monospace;">${sponsorUrl}</a>
          </div>
          <!-- Code ambassadeur -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px 24px;margin-bottom:28px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(200,160,80,0.6);margin-bottom:6px;">🔑 Code Ambassadeur</div>
            <div style="font-size:18px;font-weight:800;color:#e8c87a;font-family:monospace;letter-spacing:2px;">${code}</div>
          </div>
          <p style="font-size:14px;color:rgba(245,240,232,0.65);line-height:1.8;margin:0 0 28px;font-family:Georgia,serif;">
            Chaque personne qui rejoint l'immersion via votre lien sera automatiquement rattachée à votre cercle.
          </p>
          <!-- CTA -->
          <div style="text-align:center;margin-bottom:8px;">
            <a href="https://dmc-event-v2.netlify.app" style="display:inline-block;background:linear-gradient(135deg,#b8902a,#e8c87a);color:#050508;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px;">
              Accéder à mon espace
            </a>
          </div>
        </td></tr>
        <!-- Séparateur -->
        <tr><td style="padding:0 40px;">
          <div style="height:1px;background:linear-gradient(135deg,transparent,rgba(200,160,80,0.15),transparent);"></div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;text-align:center;">
          <p style="font-size:11px;color:rgba(200,160,80,0.5);margin:0;letter-spacing:1px;">Nous vous souhaitons une belle expérience au sein de la communauté.</p>
          <p style="font-size:12px;color:rgba(200,160,80,0.4);margin:8px 0 0;font-family:Georgia,serif;">DMC Event ✨</p>
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
        subject: 'Votre accès Ambassadeur est prêt ✨',
        html
      })
    });
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
