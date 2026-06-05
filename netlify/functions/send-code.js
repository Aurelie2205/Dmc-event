exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { email } = JSON.parse(event.body);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  await fetch(`${SB_URL}/rest/v1/verification_codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    body: JSON.stringify({ email, code, expires_at: expires, used: false })
  });
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'DMC Event <noreply@dmc-event.com>',
      to: [email],
      subject: 'Votre code de vérification DMC Event',
      html: `<div style="font-family:Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#0f0f0f;color:#f5f0e8;padding:40px 32px;border-radius:20px;"><div style="text-align:center;margin-bottom:28px;"><img src="https://i.postimg.cc/rscrjFYd/43B03296-46C3-4AD3-8BCB-569B840CA035.png" alt="DMC Event" style="max-width:160px;"></div><h2 style="text-align:center;font-size:22px;font-weight:800;color:#e8c87a;margin-bottom:24px;">Votre code de vérification</h2><div style="background:#161616;border:1px solid rgba(200,160,80,0.3);border-radius:14px;padding:32px;text-align:center;margin-bottom:24px;"><div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#e8c87a;">${code}</div><p style="font-size:12px;color:rgba(245,240,232,0.4);margin-top:12px;">Valable 10 minutes</p></div><p style="font-size:13px;color:rgba(245,240,232,0.6);text-align:center;line-height:1.8;">Entrez ce code pour accéder à la plateforme DMC Event.</p><p style="font-size:12px;color:rgba(245,240,232,0.4);text-align:center;margin-top:24px;">L'équipe DMC Event</p></div>`
    })
  });
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
