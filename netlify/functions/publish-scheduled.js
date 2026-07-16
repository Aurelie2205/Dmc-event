// Pas de @supabase/supabase-js — on utilise l'API REST directement via fetch
// Évite le crash Node 18 / WebSocket lié à Supabase Realtime

const SB_URL = process.env.SB_URL;
const SB_SERVICE_KEY = process.env.SB_SERVICE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SB_SERVICE_KEY,
  'Authorization': 'Bearer ' + SB_SERVICE_KEY,
  'Prefer': 'return=representation'
};

async function sbGet(table, params) {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, params, body) {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

exports.handler = async () => {
  try {
    const now = new Date().toISOString();

    // Récupérer les contenus programmés dont la date est passée
    const posts = await sbGet('scheduled_posts',
      `published=eq.false&scheduled_at=lte.${encodeURIComponent(now)}&order=scheduled_at.asc&limit=20`
    );

    if (!posts || posts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, published: 0 })
      };
    }

    let published = 0;

    for (const item of posts) {
      const postObj = {
        animator_id: item.author_id || 'studio-auto',
        animator_name: 'DMC Event',
        animator_avatar: 'https://qcovftgwkughattbraba.supabase.co/storage/v1/object/public/images/43B03296-46C3-4AD3-8BCB-569B840CA035.PNG',
        type: item.type || 'text',
        title: item.title || '',
        content: item.content || ''
      };

      if (item.type === 'video') {
        postObj.video_url = item.video_url || '';
        postObj.embed_url = item.embed_url || item.video_url || '';
      }
      if (item.type === 'image') {
        postObj.image_url = item.image_url || '';
      }
      if (item.type === 'pdf') {
        postObj.pdf_url = item.pdf_url || '';
      }

      let createdPost;
      try {
        const result = await sbPost('posts', postObj);
        createdPost = Array.isArray(result) ? result[0] : result;
      } catch (publishError) {
        console.error('Erreur publication automatique :', publishError.message);
        continue;
      }

      try {
        await sbPatch('scheduled_posts', `id=eq.${item.id}`, { published: true, published_at: new Date().toISOString() });
      } catch (e) {
        console.error('Erreur mise à jour scheduled_posts :', e.message);
      }

      try {
        await fetch('https://dmc-event-v2.netlify.app/.netlify/functions/send-notif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (item.author_name || 'Admin') + ' a publié du contenu',
            message: item.title || 'Nouveau contenu disponible',
            data: { type: 'post', postId: createdPost?.id }
          })
        });
      } catch (notifError) {
        console.error('Notification automatique non envoyée :', notifError.message);
      }

      published++;
      console.log('Publication automatique effectuée :', item.title);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, published })
    };

  } catch (err) {
    console.error('Erreur fonction publish-scheduled :', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
