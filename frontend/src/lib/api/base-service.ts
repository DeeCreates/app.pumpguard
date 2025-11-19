import { supabase } from '../supabase';
import { ApiResponse } from '@/types/api';
import { generateRequestId, createSuccessResponse, createErrorResponse } from './utils';

export abstract class BaseService {
  protected requestId: string;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor() {
    this.requestId = generateRequestId();
  }

  protected async handleRequest<T>(
    operation: string,
    callback: () => Promise<T>,
    options: { 
      requireAuth?: boolean; 
      logActivity?: boolean;
      cacheKey?: string;
      cacheTtl?: number; // in milliseconds
      retryCount?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [${this.requestId}] ${operation} started`);

      // Check cache first
      if (options.cacheKey) {
        const cached = this.getFromCache<T>(options.cacheKey, options.cacheTtl);
        if (cached) {
          console.log(`💾 [${this.requestId}] ${operation} served from cache`);
          return createSuccessResponse(cached);
        }
      }

      // Check authentication if required
      if (options.requireAuth) {
        await this.requireAuth();
      }

      // Execute with retry logic
      const data = await this.executeWithRetry(callback, options.retryCount || 0);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [${this.requestId}] ${operation} completed in ${duration}ms`);

      // Cache result if requested
      if (options.cacheKey) {
        this.setCache(options.cacheKey, data, options.cacheTtl);
      }

      // Log activity if requested
      if (options.logActivity) {
        await this.logActivity(operation, { duration, success: true });
      }

      return createSuccessResponse(data);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${this.requestId}] ${operation} failed after ${duration}ms:`, error);

      if (options.logActivity) {
        await this.logActivity(operation, { duration, success: false, error: error.message });
      }

      return createErrorResponse(
        error.message || 'An unexpected error occurred',
        error.code || 'UNEXPECTED_ERROR'
      );
    }
  }

  private async executeWithRetry<T>(
    callback: () => Promise<T>,
    maxRetries: number,
    currentRetry = 0
  ): Promise<T> {
    try {
      return await callback();
    } catch (error: any) {
      if (currentRetry < maxRetries && this.isRetryableError(error)) {
        const delay = Math.pow(2, currentRetry) * 1000; // Exponential backoff
        console.log(`🔄 [${this.requestId}] Retrying operation (${currentRetry + 1}/${maxRetries}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(callback, maxRetries, currentRetry + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED'
    ];
    
    return retryableCodes.includes(error.code) || error.status >= 500;
  }

  protected async requireAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      const authError = new Error('Authentication required');
      (authError as any).code = 'AUTH_REQUIRED';
      throw authError;
    }
    
    return user;
  }

  protected async getUserProfile(userId: string) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User profile not found');
    }

    return profile;
  }

  protected async logActivity(action: string, details: any = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_activity_logs')
        .insert({
          action,
          user_id: user.id,
          details: { ...details, requestId: this.requestId },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log activity:', error);
    }
  }

  protected isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Cache management
  private getFromCache<T>(key: string, ttl?: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = ttl && (Date.now() - cached.timestamp) > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Auto-cleanup if TTL provided
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  protected clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Validation helpers
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  protected sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  // Pagination helper
  protected buildPagination(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return { offset, limit };
  }

  // Role-based access control
  protected async checkPermission(userId: string, permission: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    
    // Define role permissions (you can move this to constants)
    const rolePermissions = {
      admin: ['*'],
      omc: ['read:stations', 'write:stations', 'read:users'],
      dealer: ['read:stations', 'read:sales'],
      station_manager: ['read:station', 'write:station'],
      attendant: ['read:station', 'write:sales']
    };

    const permissions = rolePermissions[profile.role as keyof typeof rolePermissions] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  // Bulk operation helper
  protected async processBulkOperation<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 10
  ): Promise<{ success: number; failed: number; errors: Array<{ item: T; error: string }> }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ item: T; error: string }>
    };

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            item: batch[index],
            error: result.reason.message
          });
        }
      });

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}