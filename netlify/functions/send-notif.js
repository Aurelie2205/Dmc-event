exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const key = process.env.ONESIGNAL_API_KEY?.trim();
  const authHeader = `Key ${key}`;
  console.log('Auth header start:', authHeader.substring(0, 25));
  console.log('Auth header length:', authHeader.length);
  console.log('Has newline:', authHeader.includes('\n'));
  console.log('Has carriage return:', authHeader.includes('\r'));
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
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
