exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title } = JSON.parse(event.body);
  const apiKey = process.env.ONESIGNAL_API_KEY;
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Key ' + apiKey
    },
    body: JSON.stringify({
      app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
      included_segments: ['Total Subscriptions'],
      headings: { fr: 'DMC Event LIVE', en: 'DMC Event LIVE' },
      contents: { fr: title || 'Le live commence maintenant !', en: title || 'Le live commence maintenant !' },
      url: 'https://dmc-event-v2.netlify.app'
    })
  });
  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify({ success: true, onesignal: data }) };
};
