exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { title, message } = JSON.parse(event.body);
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key os_v2_app_p236cc4dwfg2pn2uy477pfzjph73xf3l6gweeyeep32uey63eepakr6dgqkafyv7vh6jxx2pdtroyx4ev5vca3hs3ejboaaz5ymbuhy'
      },
      body: JSON.stringify({
        app_id: '7eb7e10b-83b1-4da7-b754-c73ff7972979',
        target_channel: 'push',
        included_segments: ['All'],
        headings: { fr: title || 'DMC Event ✦', en: title || 'DMC Event ✦' },
        contents: { fr: message || 'Nouveau contenu disponible', en: message || 'Nouveau contenu disponible' },
        url: 'https://dmc-event-v2.netlify.app'
      })
    });
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
