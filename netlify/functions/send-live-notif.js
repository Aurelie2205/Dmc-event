exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title, url } = JSON.parse(event.body);
  
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  
  // Récupérer tous les participants
  const partRes = await fetch(`${SB_URL}/rest/v1/participants?select=email`, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`
    }
  });
  const participants = await partRes.json();
  
  if (!participants || !participants.length) {
    return { statusCode: 200, body: JSON.stringify({ success: true, sent: 0 }) };
  }

  const emails = participants.map(p => p.email).filter(Boolean);

  // Envoyer l'email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'DMC Event <noreply@dmc-event.com>',
      to: emails,
      subject: '🔴 DMC Event — Le live commence !',
      html: `
        <div style="font-family:'Raleway',Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#0f0f0f;color:#f5f0e8;padding:40px 32px;border-radius:20px;">
          <div style="text-align:center;margin-bottom:28px;">
            <img src="https://i.postimg.cc/rscrjFYd/43B03296-46C3-4AD3-8BCB-569B840CA035.png" alt="DMC Event" style="max-width:160px;width:100%;object-fit:contain;">
          </div>
          <div style="background:#161616;border:2px solid rgba(200,80,80,0.4);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
            <div style="font-size:32px;margin-bottom:12px;">🔴</div>
            <p style="font-size:18px;font-weight:800;color:#e05555;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">LIVE EN COURS</p>
            <p style="font-size:14px;color:rgba(245,240,232,0.8);margin:0 0 20px;">${title || 'Le live commence maintenant !'}</p>
            <a href="${url || 'https://dmc-event-v2.netlify.app'}" style="display:inline-block;background:linear-gradient(135deg,#c84040,#e06060);color:#fff;padding:12px 32px;border-radius:50px;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:1px;">REJOINDRE LE LIVE</a>
          </div>
          <p style="font-size:12px;color:rgba(245,240,232,0.4);text-align:center;margin:0;">L'équipe DMC Event</p>
        </div>
      `
    })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true, sent: emails.length }) };
};
