// Sample content so a fresh deployment is not empty. Runs once, only when there are no users yet.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const people = [['mara.treks', 'Mara Ellis', 'Ridges, rivers, rest days.', 'p1.jpg', 'Worth every switchback.'], ['beanbar', 'Bean Bar', 'Small-batch coffee.', 'p2.jpg', 'Oat flat white, new beans from Huila.'],
  ['tomasv', 'Tomas Vieira', 'Street photographer in Lisbon.', 'p3.jpg', 'Tram 28 never runs on time. Nobody minds.'], ['kai.waves', 'Kai Nakamura', 'Chasing swell.', 'p4.jpg', 'Last wave of the day.'],
  ['nest.studio', 'Nest Studio', 'Calm interiors.', 'p5.jpg', 'Quiet corners make loud rooms better.'], ['pasta.nonna', 'Lucia Romano', 'Recipes from my kitchen.', 'p6.jpg', 'Fresh tagliatelle, three ingredients.'],
  ['neon.nights', 'Ren Park', 'Cities after dark.', 'p7.jpg', 'Rain makes every sign a mirror.'], ['biscuit.the.dog', 'Biscuit', 'Good boy. 2 years old.', 'p8.jpg', 'Found the one stick on the whole beach.']];
export async function seed({ one, run, hashPw, dir, MIME }) {
  if (Number((await one('SELECT COUNT(*) c FROM users')).c) > 0) return;
  const pw = hashPw(crypto.randomBytes(24).toString('hex')); let t = Date.now() - people.length * 3600e3;
  for (const [h, n, bio, file, cap] of people) {
    const u = await one('INSERT INTO users(handle,handle_lc,name,bio,pw,created) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', h, h.toLowerCase(), n, bio, pw, Date.now());
    const key = crypto.randomUUID() + '.jpg'; await run('INSERT INTO images(key,mime,data) VALUES($1,$2,$3)', key, MIME.jpg, fs.readFileSync(path.join(dir, file)));
    await run('INSERT INTO posts(user_id,image,caption,created) VALUES($1,$2,$3,$4)', u.id, key, cap, (t += 3600e3));
  }
  console.log('Seeded sample content');
}
