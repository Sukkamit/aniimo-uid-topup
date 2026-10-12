import { CharacterInfo } from '../types';

interface CacheEntry {
  data: CharacterInfo;
  expiresAt: number;
}

export class CharacterCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMinutes: number = 5) {
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
  }

  private buildKey(uid: string, server: string): string {
    return `${uid.trim()}#${server.trim()}`;
  }

  public get(uid: string, server: string): CharacterInfo | null {
    const key = this.buildKey(uid, server);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(uid: string, server: string, data: CharacterInfo, ttlMs?: number): void {
    const key = this.buildKey(uid, server);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const characterCache = new CharacterCache();
