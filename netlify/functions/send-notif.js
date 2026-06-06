exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title, message } = JSON.parse(event.body);
  const key = process.env.ONESIGNAL_API_KEY;
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
        target_channel: 'push',
        included_segments: ['All Subscribers'],
        headings: { fr: title || 'DMC Event ✦', en: title || 'DMC Event ✦' },
        contents: { fr: message || 'Nouveau contenu', en: message || 'Nouveau contenu' },
        url: 'https://dmc-event-v2.netlify.app'
      })
    });
    const data = await res.json();
    console.log('OneSignal:', JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
