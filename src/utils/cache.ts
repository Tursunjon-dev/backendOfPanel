type CacheEntry = { data: any; expiry: number };

export class MemoryCache {
  private map = new Map<string, CacheEntry>();
  constructor(private ttlMs: number) {}

  get<T = any>(key: string): T | null {
    const v = this.map.get(key);
    if (!v) return null;
    if (Date.now() > v.expiry) {
      this.map.delete(key);
      return null;
    }
    return v.data as T;
  }

  set(key: string, data: any) {
    this.map.set(key, { data, expiry: Date.now() + this.ttlMs });
  }

  invalidate(key?: string) {
    if (!key) return this.map.clear();
    this.map.delete(key);
  }
}
