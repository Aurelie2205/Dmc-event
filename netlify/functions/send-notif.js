exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title, message, excludeUserId, data } = JSON.parse(event.body);
  const key = process.env.ONESIGNAL_API_KEY?.trim();
  const SB_URL = process.env.SB_URL;
  const SB_KEY = process.env.SB_SERVICE_KEY;

  try {
    const [partRes, ambRes, animRes] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/participants?select=onesignal_id&onesignal_id=not.is.null`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      }),
      fetch(`${SB_URL}/rest/v1/ambassadors?select=onesignal_id&onesignal_id=not.is.null`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      }),
      fetch(`${SB_URL}/rest/v1/animators?select=id,onesignal_id&onesignal_id=not.is.null`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      })
    ]);

    const participants = await partRes.json();
    const ambassadors = await ambRes.json();
    const animators = await animRes.json();

    const ids = [
      ...(participants || []).map(p => p.onesignal_id),
      ...(ambassadors || []).map(a => a.onesignal_id),
      ...(animators || [])
        .filter(a => !excludeUserId || a.id !== excludeUserId)
        .map(a => a.onesignal_id)
    ].filter(Boolean);

    if (!ids.length) return { statusCode: 200, body: JSON.stringify({ skipped: true }) };

    const payload = {
      app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
      target_channel: 'push',
      include_subscription_ids: ids,
      headings: { fr: title || 'DMC Event ✦', en: title || 'DMC Event ✦' },
      contents: { fr: message || 'Nouveau contenu', en: message || 'Nouveau contenu' },
      url: 'https://dmc-event-v2.netlify.app'
    };

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
    return { statusCode: 200, body: JSON.stringify(resData) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
