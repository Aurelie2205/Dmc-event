exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { ids, title, message, url, data } = JSON.parse(event.body);
  if (!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ skipped: true }) };

  const key = process.env.ONESIGNAL_API_KEY?.trim();
  try {
    let notifUrl = url || 'https://dmc-event-v2.netlify.app';
    if (data && typeof data === 'object') {
      // Encoder la destination directement dans l'URL — fiable même si OneSignal
      // navigue nativement avant que le JS embarqué n'ait pu lire additionalData
      const params = new URLSearchParams();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
      notifUrl = 'https://dmc-event-v2.netlify.app/?' + params.toString();
    }

    const payload = {
      app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
      target_channel: 'push',
      include_subscription_ids: ids,
      headings: { fr: title, en: title },
      contents: { fr: message, en: message },
      url: notifUrl
    };

    // Métadonnées custom transmises au client pour la redirection intelligente
    // (type, postId, replyId, conversationId, targetScreen, etc.)
    if (data && typeof data === 'object') {
      payload.data = data;
    }

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${key}`
      },
      body: JSON.stringify(payload)
    });
    const resData = await res.json();
    console.log('Targeted notif:', JSON.stringify(resData));
    return { statusCode: 200, body: JSON.stringify(resData) };
  } catch (e) {
    console.error('Error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
