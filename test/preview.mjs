import {newDb} from 'pg-mem';
import {server,initDb} from '../server.mjs';
const {Pool}=newDb().adapters.createPg();
const pool=new Pool(); const base=pool.query.bind(pool); const images=new Map();
pool.query=async (sql,params)=>{ if(sql.startsWith('INSERT INTO images')) images.set(params[0],params[2]); const r=await base(sql,params?.map(v=>Buffer.isBuffer(v)?Buffer.from('local preview image'):v)); if(sql.startsWith('SELECT') && sql.includes('FROM images') && params?.[0] && images.has(params[0])) for(const row of r.rows) row.data=images.get(params[0]); return r; };
await initDb(pool);
server.listen(18180,()=>console.log('Local preview ready'));
