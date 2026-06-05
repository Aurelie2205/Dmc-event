exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { email } = JSON.parse(event.body);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const digits = code.split('');
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;

  await fetch(`${SB_URL}/rest/v1/verification_codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify({ email, code, expires_at: expires, used: false })
  });

  const digitBoxes = digits.map(d => `<td style="padding:0 4px;"><div style="width:44px;height:56px;background:#1a1a2e;border:1px solid rgba(200,160,80,0.4);border-radius:12px;display:inline-block;text-align:center;line-height:56px;font-size:26px;font-weight:800;color:#e8c87a;font-family:Helvetica,Arial,sans-serif;">${d}</div></td>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(160deg,#0d0d14,#050508);border:1px solid rgba(200,160,80,0.2);border-radius:24px;overflow:hidden;">

  <tr><td style="height:3px;background:linear-gradient(135deg,#b8902a,#e8c87a,#c8a050,#f0d890);"></td></tr>

  <tr><td align="center" style="padding:40px 40px 20px;">
    <img src="https://i.postimg.cc/rscrjFYd/43B03296-46C3-4AD3-8BCB-569B840CA035.png" alt="DMC Event" style="max-width:130px;width:100%;">
  </td></tr>

  <tr><td align="center" style="padding:0 40px 8px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:60px;height:1px;background:linear-gradient(to right,transparent,rgba(200,160,80,0.5));"></td>
      <td style="padding:0 10px;color:#c8a050;font-size:10px;">◆</td>
      <td style="width:60px;height:1px;background:linear-gradient(to left,transparent,rgba(200,160,80,0.5));"></td>
    </tr></table>
  </td></tr>

  <tr><td align="center" style="padding:8px 40px 4px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:rgba(245,240,232,0.4);">Bienvenue dans l'aventure</p>
  </td></tr>
  <tr><td align="center" style="padding:4px 40px 24px;">
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">Votre code d'accès</h1>
  </td></tr>

  <tr><td align="center" style="padding:0 40px 10px;">
    <table cellpadding="0" cellspacing="0"><tr>${digitBoxes}</tr></table>
  </td></tr>
  <tr><td align="center" style="padding:10px 40px 32px;">
    <p style="margin:0;font-size:11px;color:rgba(245,240,232,0.35);letter-spacing:1px;">Valable 10 minutes</p>
  </td></tr>

  <tr><td style="padding:0 40px 28px;"><div style="height:1px;background:rgba(200,160,80,0.1);"></div></td></tr>

  <tr><td align="center" style="padding:0 40px 20px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:rgba(245,240,232,0.4);">Pour une expérience optimale</p>
    <h2 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">Installe l'app sur ton téléphone</h2>
  </td></tr>

  <tr><td style="padding:0 32px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,160,80,0.15);border-radius:16px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:800;color:#e8c87a;letter-spacing:1px;">📱 Sur iPhone — Safari</p>
        <p style="margin:0 0 4px;font-size:12px;color:rgba(245,240,232,0.5);font-style:italic;line-height:1.6;">Pour installer l'app, ouvre le site sur Safari (pas Chrome ni un autre navigateur).</p>
        <p style="margin:8px 0 6px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">1.</span>&nbsp; En bas de l'écran, appuie sur le bouton <strong style="color:#fff;">Partager ⬆️</strong> <span style="color:rgba(245,240,232,0.4);font-size:11px;">(le carré avec une flèche qui sort)</span></p>
        <p style="margin:0 0 6px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">2.</span>&nbsp; Fais défiler vers le bas et appuie sur <strong style="color:#fff;">"Sur l'écran d'accueil"</strong></p>
        <p style="margin:0;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">3.</span>&nbsp; Appuie sur <strong style="color:#fff;">"Ajouter"</strong> en haut à droite ✓</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,160,80,0.15);border-radius:16px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:800;color:#e8c87a;letter-spacing:1px;">🤖 Sur Android — Chrome</p>
        <p style="margin:0 0 8px;font-size:12px;color:rgba(245,240,232,0.5);font-style:italic;line-height:1.6;">Une fois le site ouvert sur Chrome :</p>
        <p style="margin:0 0 6px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">1.</span>&nbsp; Appuie sur les <strong style="color:#fff;">3 points ⋮</strong> en haut à droite</p>
        <p style="margin:0 0 6px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">2.</span>&nbsp; Appuie sur <strong style="color:#fff;">"Ajouter à l'écran d'accueil"</strong></p>
        <p style="margin:0;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><span style="color:#e8c87a;font-weight:700;">3.</span>&nbsp; Appuie sur <strong style="color:#fff;">"Ajouter"</strong> ✓</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(200,160,80,0.06);border:1px solid rgba(200,160,80,0.25);border-radius:16px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 14px;font-size:13px;font-weight:800;color:#e8c87a;letter-spacing:1px;">🔔 Active tes notifications</p>
        <p style="margin:0 0 8px;font-size:12px;color:rgba(245,240,232,0.5);font-style:italic;">Deux étapes vont apparaître :</p>
        <p style="margin:0 0 8px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><strong style="color:#e8c87a;">Étape 1 —</strong> Une fenêtre te demande d'autoriser les notifications → appuie sur <strong style="color:#fff;">"Autoriser"</strong></p>
        <p style="margin:0 0 14px;font-size:13px;color:rgba(245,240,232,0.7);line-height:1.7;"><strong style="color:#e8c87a;">Étape 2 —</strong> Une petite banderole bleue apparaît → appuie dessus et sélectionne <strong style="color:#fff;">"Autoriser"</strong></p>
        <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.45);line-height:1.7;">⚠️ Ces deux étapes sont importantes pour ne rien rater de l'immersion !</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 40px;"><div style="height:1px;background:rgba(200,160,80,0.1);"></div></td></tr>

  <tr><td align="center" style="padding:24px 40px 32px;">
    <p style="margin:0 0 8px;font-size:14px;color:rgba(245,240,232,0.6);font-style:italic;">À tout de suite de l'autre côté ! 🚀</p>
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
      subject: "✦ Votre code d'accès DMC Event",
      html
    })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
