// Discovery only. Video playback belongs to YouTube's official embed player.
// No video downloads, scraping, fabricated IDs or silent repeat loops.
export class FeedError extends Error { constructor(status,message){super(message);this.status=status;} }
const bad=(s,m)=>{throw new FeedError(s,m);};
const ID=/^[A-Za-z0-9_-]{11}$/;
const token=/^[A-Za-z0-9_-]{1,256}$/;
export function createYouTubeFeed({key=process.env.YOUTUBE_API_KEY||'',fetcher=fetch,now=Date.now,ttl=30*60000,maxSearches=80}={}){
  const cache=new Map();const inFlight=new Map();let period='';let searches=0;
  const api=async(path,params)=>{
    const u=new URL('https://www.googleapis.com/youtube/v3/'+path);Object.entries({...params,key}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
    let r;try{r=await fetcher(u,{signal:AbortSignal.timeout(15000)});}catch{bad(503,'Video discovery is temporarily unavailable. Try again later.');}
    if(!r.ok){if(r.status===403||r.status===429)bad(503,'Video discovery has reached its current allowance. Try again later.');bad(503,'Video discovery is temporarily unavailable. Try again later.');}
    const data=await r.json().catch(()=>null);if(!data||!Array.isArray(data.items))bad(503,'Video discovery returned an unreadable response.');return data;
  };
  const load=async(cursor)=>{
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()));if(day!==period){period=day;searches=0;}
    if(searches>=maxSearches)bad(503,'Video discovery has reached its current allowance. Try again later.');searches++;
    const search=await api('search',{part:'snippet',type:'video',q:'#shorts',videoDuration:'short',videoEmbeddable:'true',videoSyndicated:'true',safeSearch:'strict',maxResults:20,...(cursor?{pageToken:cursor}:{})});
    const ids=[...new Set(search.items.map(x=>x.id?.videoId).filter(x=>typeof x==='string'&&ID.test(x)))];
    const detail=ids.length?await api('videos',{part:'snippet,contentDetails,status',id:ids.join(',')}):{items:[]};
    // Reject kids/age-restricted/nonembeddable results; never infer a safe status
    // from missing fields. Explicit consent precedes all third-party playback.
    const items=detail.items.filter(x=>ID.test(x.id||'')&&x.status?.embeddable===true&&x.status?.privacyStatus==='public'&&x.status?.madeForKids===false&&!x.contentDetails?.contentRating?.ytRating).map(x=>({id:x.id,title:String(x.snippet?.title||'Untitled video').slice(0,300),channel:String(x.snippet?.channelTitle||'').slice(0,200),source:'YouTube',watchUrl:'https://www.youtube.com/watch?v='+x.id,embedUrl:'https://www.youtube-nocookie.com/embed/'+x.id}));
    return {items,next:typeof search.nextPageToken==='string'&&token.test(search.nextPageToken)?search.nextPageToken:null,notice:'Short videos from YouTube. Some may be landscape. Discovery has daily limits; videos play in YouTube\'s player.'};
  };
  return async(cursor='')=>{
    if(!key)bad(503,'Video discovery is not configured yet.');
    if(typeof cursor!=='string'||(cursor&&!token.test(cursor)))bad(400,'Invalid video cursor');
    const old=cache.get(cursor);if(old&&old.expires>now())return old.value;
    if(inFlight.has(cursor))return inFlight.get(cursor);
    // Bound retained cursor pages. Never return stale data past TTL.
    for(const[k,v]of cache)if(v.expires<=now())cache.delete(k);
    if(cache.size>=20)cache.delete(cache.keys().next().value);
    const task=load(cursor).then(value=>{cache.set(cursor,{expires:now()+ttl,value});return value;}).finally(()=>inFlight.delete(cursor));inFlight.set(cursor,task);return task;
  };
}
