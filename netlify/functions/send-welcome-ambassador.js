exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { email, name, code, sponsorUrl } = JSON.parse(event.body);
  const key = process.env.RESEND_API_KEY?.trim();
  const LOGO = 'https://qcovftgwkughattbraba.supabase.co/storage/v1/object/public/images/43B03296-46C3-4AD3-8BCB-569B840CA035.PNG';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Raleway:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#03030a;font-family:'Raleway',Georgia,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#03030a;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:linear-gradient(160deg,rgba(15,10,25,0.97),rgba(5,5,12,0.98));border:1px solid rgba(200,160,80,0.3);border-radius:24px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.8),0 0 60px rgba(80,20,120,0.15);">
      <!-- Ligne dorée -->
      <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>
      <!-- Halo violet -->
      <tr><td style="padding:40px 36px 0;text-align:center;position:relative;">
        <div style="position:relative;display:inline-block;">
          <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:300px;height:200px;background:radial-gradient(ellipse,rgba(100,40,160,0.18),transparent 70%);pointer-events:none;"></div>
          <!-- Logo -->
          <img src="${LOGO}" alt="DMC Event" width="160" style="display:block;margin:0 auto 24px;filter:drop-shadow(0 0 20px rgba(200,160,80,0.3));">
        </div>
        <!-- Ornement -->
        <div style="display:flex;align-items:center;gap:16px;justify-content:center;margin-bottom:16px;">
          <div style="flex:1;max-width:60px;height:1px;background:linear-gradient(to right,transparent,rgba(200,160,80,0.5));"></div>
          <span style="color:#c8a050;font-size:8px;">◆</span>
          <div style="flex:1;max-width:60px;height:1px;background:linear-gradient(to left,transparent,rgba(200,160,80,0.5));"></div>
        </div>
        <!-- Titre cursif -->
        <div style="font-family:'Great Vibes',cursive;font-size:22px;background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;">Votre espace Ambassadeur</div>
        <div style="font-family:'Raleway',sans-serif;font-size:26px;font-weight:800;color:#fff;letter-spacing:.02em;margin-bottom:16px;">est prêt ✨</div>
        <!-- Séparateur -->
        <div style="width:50px;height:2px;background:linear-gradient(135deg,#b8902a,#e8c87a);margin:0 auto 20px;border-radius:2px;"></div>
      </td></tr>
      <!-- Corps -->
      <tr><td style="padding:0 36px 32px;">
        <p style="font-size:15px;color:rgba(245,240,232,0.85);line-height:1.9;margin:0 0 16px;">
          Bonjour <strong style="color:#e8c87a;">${name}</strong>,
        </p>
        <p style="font-size:15px;color:rgba(245,240,232,0.7);line-height:1.9;margin:0 0 16px;">
          Bienvenue dans l'aventure DMC Event.<br>
          Votre espace Ambassadeur est maintenant actif.
        </p>
        <p style="font-size:15px;color:rgba(245,240,232,0.7);line-height:1.9;margin:0 0 28px;">
          Vous pouvez dès à présent partager votre lien personnel et commencer à construire votre cercle.
        </p>
        <!-- Bloc lien -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(200,160,80,0.06);border:1px solid rgba(200,160,80,0.2);border-radius:14px;overflow:hidden;margin-bottom:14px;">
          <tr><td style="height:2px;background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);"></td></tr>
          <tr><td style="padding:16px 20px;">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c8a050;margin-bottom:8px;">🔗 Mon lien d'invitation</div>
            <a href="${sponsorUrl}" style="font-size:13px;color:#e8c87a;font-family:monospace;word-break:break-all;text-decoration:none;">${sponsorUrl}</a>
          </td></tr>
        </table>
        <!-- Bloc code -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;margin-bottom:28px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(200,160,80,0.6);margin-bottom:6px;">🔑 Code Ambassadeur</div>
            <div style="font-size:20px;font-weight:800;color:#e8c87a;font-family:monospace;letter-spacing:3px;">${code}</div>
          </td></tr>
        </table>
        <p style="font-size:14px;color:rgba(245,240,232,0.6);line-height:1.9;margin:0 0 28px;">
          Chaque personne qui rejoint l'immersion via votre lien sera automatiquement rattachée à votre cercle.
        </p>
        <!-- CTA -->
        <div style="text-align:center;margin-bottom:8px;">
          <a href="https://dmc-event-v2.netlify.app" style="display:inline-block;background:linear-gradient(135deg,#b8902a,#e8c87a,#f0d890);color:#050508;font-family:'Raleway',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:50px;box-shadow:0 6px 24px rgba(200,160,80,0.35);">
            Accéder à mon espace ✦
          </a>
        </div>
      </td></tr>
      <!-- Séparateur -->
      <tr><td style="padding:0 36px;">
        <div style="height:1px;background:linear-gradient(135deg,transparent,rgba(200,160,80,0.2),transparent);"></div>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 36px 28px;text-align:center;">
        <p style="font-size:11px;color:rgba(200,160,80,0.45);margin:0 0 4px;letter-spacing:.5px;">Nous vous souhaitons une belle expérience au sein de la communauté.</p>
        <p style="font-size:12px;color:rgba(200,160,80,0.35);margin:0;font-family:Georgia,serif;">DMC Event ✨</p>
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
