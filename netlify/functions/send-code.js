exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;
  
  await fetch(`${SB_URL}/rest/v1/verification_codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`
    },
    body: JSON.stringify({ email, code })
  });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'DMC Event <noreply@dmc-event.com>',
      to: email,
      subject: 'DMC Event ✦ Ton code d\'accès',
      html: `
        <div style="font-family:'Raleway',Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#050508;color:#f5f0e8;padding:48px 36px;border-radius:24px;">
          <div style="text-align:center;margin-bottom:36px;">
            <img src="https://i.postimg.cc/rscrjFYd/43B03296-46C3-4AD3-8BCB-569B840CA035.png" alt="DMC Event" style="max-width:180px;width:100%;object-fit:contain;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#c8a050,transparent);margin:20px auto 0;"></div>
          </div>

          <p style="font-size:22px;color:#e8c87a;margin:0 0 12px;font-weight:800;letter-spacing:1px;text-align:center;">Bienvenue dans l'aventure ✦</p>
          
          <p style="font-size:14px;line-height:1.9;color:rgba(245,240,232,0.75);margin:0 0 32px;text-align:center;font-style:italic;">Tu viens de faire le premier pas.<br>Ces 3 jours vont bousculer ta façon de voir les choses<br>— et c'est exactement pour ça que tu es là.<br><br>Prépare-toi. Quelque chose d'extraordinaire commence.</p>

          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(200,160,80,0.2);border-radius:16px;padding:28px;margin-bottom:16px;text-align:center;">
            <p style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c8a050;margin:0 0 14px;font-weight:700;">TON CODE DE VÉRIFICATION</p>
            <p style="font-size:52px;font-weight:800;color:#e8c87a;letter-spacing:14px;margin:0;font-family:'Raleway',Helvetica,sans-serif;">${code}</p>
            <p style="font-size:11px;color:rgba(245,240,232,0.3);margin:14px 0 0;">Valable 10 minutes</p>
          </div>

          <p style="font-size:12px;color:rgba(245,240,232,0.35);text-align:center;margin:24px 0 0;letter-spacing:1px;">Tu es officiellement dans l'aventure.<br><span style="color:#c8a050;font-weight:700;">L'ÉQUIPE DMC EVENT</span></p>
        </div>
      `
    })
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
