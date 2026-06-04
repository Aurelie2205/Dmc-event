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
        <div style="font-family:'Raleway',Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#0f0f0f;color:#f5f0e8;padding:40px 32px;border-radius:20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <img src="https://qcovftgwkughattbraba.supabase.co/storage/v1/object/public/images/43B03296-46C3-4AD3-8BCB-569B840CA035.PNG" alt="DMC Event" style="max-width:200px;width:100%;object-fit:contain;">
            <div style="width:60px;height:2px;background:linear-gradient(to right,transparent,#c8a050,transparent);margin:16px auto 0;border-radius:2px;"></div>
          </div>

          <p style="font-size:20px;color:#e8c87a;margin:0 0 16px;font-weight:700;letter-spacing:1px;">Bienvenue dans l'aventure ✦</p>
          <p style="font-size:14px;line-height:1.8;color:rgba(245,240,232,0.8);margin:0 0 28px;">Tu es sur le point de rejoindre une expérience immersive de 3 jours pour oser lancer ton business. On est ravis de t'accueillir.</p>

          <div style="background:#161616;border-left:3px solid #c8a050;padding:24px;margin-bottom:28px;text-align:center;border-radius:12px;">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c8a050;margin:0 0 12px;font-weight:700;">TON CODE DE VÉRIFICATION</p>
            <p style="font-size:48px;font-weight:800;color:#e8c87a;letter-spacing:12px;margin:0;">${code}</p>
            <p style="font-size:11px;color:rgba(245,240,232,0.35);margin:12px 0 0;">Valable 10 minutes</p>
          </div>

          <div style="background:#161616;border:1px solid rgba(200,160,80,0.2);padding:24px;margin-bottom:28px;border-radius:12px;">
            <p style="font-size:14px;color:#e8c87a;font-weight:700;margin:0 0 14px;letter-spacing:1px;">📱 INSTALLE L'APP SUR TON TÉLÉPHONE</p>
            <p style="font-size:13px;line-height:1.8;color:rgba(245,240,232,0.75);margin:0 0 14px;">Pour une meilleure expérience, ajoute DMC Event sur ton écran d'accueil !</p>
            <p style="text-align:center;margin:0 0 16px;"><a href="https://dmc-event-v2.netlify.app" style="color:#e8c87a;font-weight:700;font-size:13px;">👉 dmc-event-v2.netlify.app</a></p>
            <p style="font-size:13px;color:#e8c87a;font-weight:700;margin:0 0 8px;">Sur iPhone (Safari) :</p>
            <p style="font-size:12px;line-height:1.8;color:rgba(245,240,232,0.7);margin:0 0 14px;">1. Ouvre le lien dans Safari<br>2. Appuie sur l'icône partager ↑ en bas<br>3. Sélectionne "Sur l'écran d'accueil"<br>4. Appuie sur "Ajouter"</p>
            <p style="font-size:13px;color:#e8c87a;font-weight:700;margin:0 0 8px;">Sur Android (Chrome) :</p>
            <p style="font-size:12px;line-height:1.8;color:rgba(245,240,232,0.7);margin:0 0 0;">1. Ouvre le lien dans Chrome<br>2. Appuie sur les 3 points ⋮ en haut à droite<br>3. Sélectionne "Ajouter à l'écran d'accueil"<br>4. Appuie sur "Ajouter"</p>
          </div>

          <div style="background:#161616;border:1px solid rgba(200,160,80,0.2);padding:24px;margin-bottom:28px;border-radius:12px;">
            <p style="font-size:14px;color:#e8c87a;font-weight:700;margin:0 0 14px;letter-spacing:1px;">🔔 ACTIVE LES NOTIFICATIONS</p>
            <p style="font-size:13px;line-height:1.8;color:rgba(245,240,232,0.75);margin:0 0 14px;">Pour ne rater aucun contenu, active les notifications en 2 étapes :</p>
            <p style="font-size:13px;line-height:1.8;color:rgba(245,240,232,0.75);margin:0 0 10px;"><span style="color:#e8c87a;font-weight:700;">ÉTAPE 1</span> — Quand Apple te demande l'autorisation, appuie sur <strong style="color:#f5f0e8;">"Autoriser"</strong></p>
            <p style="font-size:13px;line-height:1.8;color:rgba(245,240,232,0.75);margin:0 0 14px;"><span style="color:#e8c87a;font-weight:700;">ÉTAPE 2</span> — Une fois connectée, un bandeau bleu apparaîtra <strong style="color:#f5f0e8;">en bas de l'écran</strong>. Appuie dessus et accepte pour finaliser l'activation.</p>
            <p style="font-size:12px;color:rgba(200,120,120,0.8);margin:0;font-weight:600;">Sans ça, tu risques de manquer des publications en temps réel !</p>
          </div>

          <p style="font-size:13px;color:rgba(245,240,232,0.5);text-align:center;margin:0;letter-spacing:1px;">À très vite dans l'immersion,<br><span style="color:#c8a050;font-weight:700;">L'ÉQUIPE DMC EVENT</span></p>
        </div>
      `
    })
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
