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
      .eq('published', false)
      .lte('scheduled_at', now);
    if (error) {
      console.error('Erreur récupération publications programmées :', error);
      return {
        statusCode: 500,
        body: JSON.stringify(error)
      };
    }
    if (!posts || posts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          published: 0
        })
      };
    }
    for (const post of posts) {
      const { error: publishError } = await supabase
        .from('posts')
        .insert({
          title: post.title,
          content: post.content,
          author_id: post.author_id,
          author_name: post.author_name,
          created_at: new Date().toISOString()
        });
      if (publishError) {
        console.error('Erreur publication :', publishError);
        continue;
      }
      await supabase
        .from('scheduled_posts')
        .update({
          published: true
        })
        .eq('id', post.id);
      console.log(`Publication automatique effectuée : ${post.title}`);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        published: posts.length
      })
    };
  } catch (err) {
    console.error('Erreur fonction publish-scheduled :', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
