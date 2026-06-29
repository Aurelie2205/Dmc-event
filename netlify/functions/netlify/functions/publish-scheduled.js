const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
exports.handler = async () => {
  const now = new Date().toISOString();
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('published', false)
    .lte('scheduled_at', now);
  if (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify(error)
    };
  }
  for (const post of posts) {
    await supabase.from('posts').insert({
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      author_name: post.author_name,
      created_at: new Date().toISOString()
    });
    await supabase
      .from('scheduled_posts')
      .update({
        published: true
      })
      .eq('id', post.id);
    console.log('Publication automatique :', post.title);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      published: posts.length
    })
  };
};
