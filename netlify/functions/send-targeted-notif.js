exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { ids, title, message, url, data } = JSON.parse(event.body);
  if (!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ skipped: true }) };

  const key = process.env.ONESIGNAL_API_KEY?.trim();
  try {
    const payload = {
      app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
      target_channel: 'push',
      include_subscription_ids: ids,
      headings: { fr: title, en: title },
      contents: { fr: message, en: message },
      url: url || 'https://dmc-event-v2.netlify.app'
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
