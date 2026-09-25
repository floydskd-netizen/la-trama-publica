const [url,source,medium='social',campaign='article_share',content='']=process.argv.slice(2);
if(!url||!source){console.error('Usage: node tools/utm.mjs <url> <source> [medium] [campaign] [content]');process.exit(1)}
const u=new URL(url);
u.searchParams.set('utm_source',source);
u.searchParams.set('utm_medium',medium);
u.searchParams.set('utm_campaign',campaign);
if(content)u.searchParams.set('utm_content',content);
console.log(u.toString());
