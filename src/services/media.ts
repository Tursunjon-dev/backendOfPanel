import fs from 'fs';
import path from 'path';

export function listMediaFiles() {
  const dir = path.join(process.cwd(), 'public', 'images', 'menu');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => /\.(webp)$/i.test(f));
  // newest first
  return files
    .map(name => {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      return { name, size: st.size, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}
