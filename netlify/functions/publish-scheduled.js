const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_SERVICE_KEY
);

exports.handler = async () => {
  try {
    const now = new Date().toISOString();

    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'scheduled')
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
      const { data: claimed, error: claimError } = await supabase
        .from('scheduled_posts')
        .update({ status: 'publishing' })
        .eq('id', item.id)
        .eq('status', 'scheduled')
        .select();

      if (claimError || !claimed || claimed.length === 0) continue;

      const postObj = {
        animator_id: item.animator_id || 'studio-auto',
        animator_name: item.animator_name || 'Admin',
        animator_avatar: item.animator_avatar || '',
        type: item.type || 'text',
        title: item.title || '',
        content: item.content || ''
      };

      if (item.type === 'video') {
        postObj.video_url = item.video_url || '';
        postObj.embed_url = item.video_url || '';
      }

      if (item.type === 'image') {
        postObj.image_url = item.image_url || '';
      }

      if (item.type === 'pdf') {
        postObj.pdf_url = item.pdf_url || '';
      }

      const { error: publishError } = await supabase
        .from('posts')
        .insert(postObj);

      if (publishError) {
        console.error('Erreur publication automatique :', publishError);

        await supabase
          .from('scheduled_posts')
          .update({ status: 'scheduled' })
          .eq('id', item.id);

        continue;
      }

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', item.id);

      try {
        await fetch('https://dmc-event-v2.netlify.app/.netlify/functions/send-notif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (item.animator_name || 'Admin') + ' a publié du contenu',
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
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
};
