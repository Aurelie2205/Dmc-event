exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title } = JSON.parse(event.body);
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'key os_v2_app_p236cc4dwfg2pn2uy477pfzjpfisghzgtfme42eeenagupijqdcbk2pnn6jtwtfdoa4wc7lnb64grgj5aw766rlubuqsixpvu43qbpa'
    },
    body: JSON.stringify({
      app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
      included_segments: ['Total Subscriptions'],
      headings: { fr: 'DMC Event LIVE' },
      contents: { fr: title || 'Le live commence maintenant !' },
      url: 'https://dmc-event-v2.netlify.app'
    })
  });
  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify({ success: true, onesignal: data }) };
};
