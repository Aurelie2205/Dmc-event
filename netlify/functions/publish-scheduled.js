const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_SERVICE_KEY,
  {
    auth: { persistSession: false },
    realtime: { enabled: false }
  }
);

exports.handler = async () => {
  try {
    const now = new Date().toISOString();

    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('published', false)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Erreur récupération publications programmées :', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

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
        animator_name: item.author_name || 'Admin',
        animator_avatar: '',
        type: 'text',
        title: item.title || '',
        content: item.content || ''
      };

      const { error: publishError } = await supabase
        .from('posts')
        .insert(postObj);

      if (publishError) {
        console.error('Erreur publication automatique :', publishError);
        continue;
      }

      await supabase
        .from('scheduled_posts')
        .update({ published: true })
        .eq('id', item.id);

      try {
        await fetch('https://dmc-event-v2.netlify.app/.netlify/functions/send-notif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (item.author_name || 'Admin') + ' a publié du contenu',
            message: item.title || 'Nouveau contenu disponible',
            url: 'https://dmc-event-v2.netlify.app'
          })
        });
      } catch (notifError) {
        console.error('Notification automatique non envoyée :', notifError);
      }

      published++;
      console.log('Publication automatique effectuée :', item.title);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, published })
    };

  } catch (err) {
    console.error('Erreur fonction publish-scheduled :', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
