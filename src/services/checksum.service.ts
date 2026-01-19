import crypto from 'crypto';

export function stableStringify(obj: any): string {
  const norm = (x: any): any => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === 'object') {
      const out: any = {};
      Object.keys(x).sort().forEach((k) => (out[k] = norm(x[k])));
      return out;
    }
    return x;
  };
  return JSON.stringify(norm(obj));
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
