const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, code } = JSON.parse(event.body);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'DMC Event <noreply@dmc-event-v2.netlify.app>',
      to: email,
      subject: 'Votre code de vérification',
      html: `<p>Votre code : <strong>${code}</strong></p>`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
