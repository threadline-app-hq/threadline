export type Reel={id:string;title:string;channel:string;source:'YouTube';watchUrl:string;embedUrl:string};
export type ReelPage={items:Reel[];next:string|null;notice:string};
export type Mini = { id: number; handle: string; name: string; avatar?: string | null };
export type Comment = { id: number; text: string; handle: string; created: number };
export type Post = { id: number; image: string; width: number | null; height: number | null; caption: string; created: number; user: Mini; likes: number; liked: boolean; saved: boolean; commentCount: number; comments: Comment[] };
export type User = { avatar?: string | null; id: number; handle: string; name: string; bio: string; followers: number; following: number; posts: number; followedByMe: boolean };

const BASE = ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? '';
export const readStored=(key:string)=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
export const writeStored=(key:string,value:string)=>{try{value?localStorage.setItem(key,value):localStorage.removeItem(key);return true;}catch{return false;}};
let token=readStored('tl_token');
let onAuthLost: () => void = () => {};
export const setOnAuthLost = (f: () => void) => { onAuthLost = f; };
export const hasToken = () => !!token;
export const setToken = (t: string) => { token=t;return writeStored('tl_token',t); };
export const img = (p: string) => (p.startsWith('http') ? p : BASE + p);

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const requestToken=token;let r:Response;try{r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(requestToken ? { authorization: 'Bearer ' + requestToken } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });}catch(e:any){throw new Error(e?.name==='TimeoutError'?'This is taking too long. Please try again.':'Could not connect. Check your connection and try again.');}
  if(token!==requestToken)throw new Error('Your session changed. Please try again.');
  if(r.status===401&&token&&token===requestToken&&!url.startsWith('/api/auth/')){ setToken(''); onAuthLost(); }
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if(token!==requestToken)throw new Error('Your session changed. Please try again.');
  if (!r.ok) throw new Error((data && data.error) || 'Something went wrong');
  if(r.status!==204&&data===null)throw new Error('The server returned an unreadable response. Please try again.');
  return data as T;
}
export const api = {
  signup: (handle: string, name: string, password: string) => call<{ token: string; user: User; recoveryCode: string }>('POST', '/api/auth/signup', { handle, name, password }),
  reset: (handle: string, code: string, password: string) => call<{ token: string; user: User; recoveryCode: string }>('POST', '/api/auth/reset', { handle, code, password }),
  newRecovery: (password: string) => call<{ recoveryCode: string }>('POST', '/api/auth/recovery-code', { password }),
  login: (handle: string, password: string) => call<{ token: string; user: User }>('POST', '/api/auth/login', { handle, password }),
  me: () => call<User>('GET', '/api/me'),
  reels: (cursor='') => call<ReelPage>('GET','/api/reels'+(cursor?'?cursor='+encodeURIComponent(cursor):'')),
  feed: (before?: number) => call<{ posts: Post[]; next: number | null }>('GET', '/api/feed?limit=12' + (before ? '&before=' + before : '')),
  explore: (before?: number) => call<{ posts: Post[]; next: number | null }>('GET', '/api/explore?limit=24' + (before ? '&before=' + before : '')),
  saved: () => call<{ posts: Post[] }>('GET', '/api/saved'),
  search: (q: string) => call<{ users: User[]; posts: Post[] }>('GET', '/api/search?q=' + encodeURIComponent(q)),
  profile: (h: string,before?:number) => call<{ user: User; posts: Post[];next:number|null }>('GET', '/api/users/' + encodeURIComponent(h)+(before?'?before='+before:'')),
  follow: (h: string, on: boolean) => call<User>(on ? 'POST' : 'DELETE', `/api/users/${encodeURIComponent(h)}/follow`),
  like: (id: number, on: boolean) => call<Post>(on ? 'POST' : 'DELETE', `/api/posts/${id}/like`),
  save: (id: number, on: boolean) => call<Post>(on ? 'POST' : 'DELETE', `/api/posts/${id}/save`),
  post:(id:number)=>call<Post>('GET',`/api/posts/${id}`),
  comments: (id: number) => call<{ comments: Comment[] }>('GET', `/api/posts/${id}/comments`),
  comment: (id: number, text: string) => call<Post>('POST', `/api/posts/${id}/comments`, { text }),
  createPost: (image: string, caption: string) => call<Post>('POST', '/api/posts', { image, caption }),
  updateMe:(name:string,bio:string,avatar?:string,removeAvatar=false) => call<User>('PATCH', '/api/me', {name,bio,...(avatar?{avatar}:{}),...(removeAvatar?{removeAvatar:true}:{})}),
  stories: () => call<{ groups: StoryGroup[] }>('GET', '/api/stories'),
  deleteStory:(id:number)=>call<null>('DELETE',`/api/stories/${id}`),
  addStory: (image: string) => call<{ id: number }>('POST', '/api/stories', { image }),
  conversations: () => call<{ conversations: Convo[]; unread: number }>('GET', '/api/messages'),
  thread: (h: string) => call<{ user: Mini; messages: Msg[] }>('GET', '/api/messages/' + encodeURIComponent(h)),
  send: (h: string, text: string) => call<Msg>('POST', '/api/messages/' + encodeURIComponent(h), { text }),
  notifications: () => call<{ items: Notif[]; unread: number }>('GET', '/api/notifications'),
  readNotifications: (throughId:number) => call<null>('POST', '/api/notifications/read',{throughId}),
  deletePost: (id: number) => call<null>('DELETE', `/api/posts/${id}`),
};

export type Notif = { id: number; type: 'like' | 'comment' | 'follow'; postId: number | null; text: string; created: number; seen: boolean; user: { handle: string; name: string; avatar?: string | null }; image: string | null };

export type Msg = { id: number; mine: boolean; text: string; created: number };
export type Convo = { user: Mini; text: string; created: number; mine: boolean; unread: number };

export type StoryGroup = { user: Mini; items: { id: number; image: string; created: number }[] };
