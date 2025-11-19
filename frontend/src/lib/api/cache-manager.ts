import { API_CONSTANTS } from '../constants';

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private cache = new Map<string, CacheItem>();

  set(key: string, data: any, ttl: number = API_CONSTANTS.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache key generators
  static generateKey(service: string, method: string, params: any = {}): string {
    const paramString = JSON.stringify(params);
    return `${service}:${method}:${Buffer.from(paramString).toString('base64')}`;
  }
}