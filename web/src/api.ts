export type Mini = { id: number; handle: string; name: string };
export type Comment = { id: number; text: string; handle: string; created: number };
export type Post = { id: number; image: string; caption: string; created: number; user: Mini; likes: number; liked: boolean; saved: boolean; commentCount: number; comments: Comment[] };
export type User = { id: number; handle: string; name: string; bio: string; followers: number; following: number; posts: number; followedByMe: boolean };

const BASE = ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? '';
let token = localStorage.getItem('tl_token') || '';
let onAuthLost: () => void = () => {};
export const setOnAuthLost = (f: () => void) => { onAuthLost = f; };
export const hasToken = () => !!token;
export const setToken = (t: string) => { token = t; t ? localStorage.setItem('tl_token', t) : localStorage.removeItem('tl_token'); };
export const img = (p: string) => (p.startsWith('http') ? p : BASE + p);

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && token) { setToken(''); onAuthLost(); }
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new Error((data && data.error) || 'Something went wrong');
  return data as T;
}
export const api = {
  signup: (handle: string, name: string, password: string) => call<{ token: string; user: User }>('POST', '/api/auth/signup', { handle, name, password }),
  login: (handle: string, password: string) => call<{ token: string; user: User }>('POST', '/api/auth/login', { handle, password }),
  me: () => call<User>('GET', '/api/me'),
  feed: () => call<{ posts: Post[] }>('GET', '/api/feed?limit=30'),
  explore: () => call<{ posts: Post[] }>('GET', '/api/explore?limit=48'),
  saved: () => call<{ posts: Post[] }>('GET', '/api/saved'),
  search: (q: string) => call<{ users: User[]; posts: Post[] }>('GET', '/api/search?q=' + encodeURIComponent(q)),
  profile: (h: string) => call<{ user: User; posts: Post[] }>('GET', '/api/users/' + encodeURIComponent(h)),
  follow: (h: string, on: boolean) => call<User>(on ? 'POST' : 'DELETE', `/api/users/${encodeURIComponent(h)}/follow`),
  like: (id: number, on: boolean) => call<Post>(on ? 'POST' : 'DELETE', `/api/posts/${id}/like`),
  save: (id: number, on: boolean) => call<Post>(on ? 'POST' : 'DELETE', `/api/posts/${id}/save`),
  comments: (id: number) => call<{ comments: Comment[] }>('GET', `/api/posts/${id}/comments`),
  comment: (id: number, text: string) => call<Post>('POST', `/api/posts/${id}/comments`, { text }),
  createPost: (image: string, caption: string) => call<Post>('POST', '/api/posts', { image, caption }),
  updateMe: (name: string, bio: string) => call<User>('PATCH', '/api/me', { name, bio }),
  notifications: () => call<{ items: Notif[]; unread: number }>('GET', '/api/notifications'),
  readNotifications: () => call<null>('POST', '/api/notifications/read'),
  deletePost: (id: number) => call<null>('DELETE', `/api/posts/${id}`),
};

export type Notif = { id: number; type: 'like' | 'comment' | 'follow'; postId: number | null; text: string; created: number; seen: boolean; user: { handle: string; name: string }; image: string | null };
