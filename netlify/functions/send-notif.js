exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const key = process.env.ONESIGNAL_API_KEY?.trim();
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${key}`
      },
      body: JSON.stringify({
        app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
        target_channel: 'push',
        included_segments: ['All'],
        headings: { en: 'Test DMC Event' },
        contents: { en: 'Test notification' }
      })
    });
    const data = await res.json();
    console.log('OneSignal response:', JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch(e) {
    console.log('Error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
