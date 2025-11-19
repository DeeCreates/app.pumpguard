// src/utils/offline-sync.ts
import { supabase } from './supabase-client';

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  userId?: string;
  metadata?: {
    source?: string;
    deviceId?: string;
    appVersion?: string;
  };
}

export interface SyncStatus {
  pending: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  successCount: number;
  failureCount: number;
}

export interface SyncConfig {
  maxRetries: number;
  syncInterval: number;
  batchSize: number;
  retryDelay: number;
  enableAutoSync: boolean;
}

class OfflineSync {
  private queue: SyncQueueItem[] = [];
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private config: SyncConfig;
  private successCount = 0;
  private failureCount = 0;
  private lastSync?: Date;
  private syncInterval?: NodeJS.Timeout;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      maxRetries: 5,
      syncInterval: 30000, // 30 seconds
      batchSize: 10,
      retryDelay: 1000, // 1 second
      enableAutoSync: true,
      ...config
    };

    this.loadQueue();
    this.loadStats();
    this.setupEventListeners();
    
    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emitStatusEvent('online');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emitStatusEvent('offline');
    });

    // Listen for auth state changes to include user ID in sync items
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.processQueue();
      }
    });
  }

  private startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        this.processQueue();
      }
    }, this.config.syncInterval);
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem('pumpguard_sync_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('pumpguard_sync_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private loadStats() {
    try {
      const stats = localStorage.getItem('pumpguard_sync_stats');
      if (stats) {
        const { successCount, failureCount, lastSync } = JSON.parse(stats);
        this.successCount = successCount || 0;
        this.failureCount = failureCount || 0;
        this.lastSync = lastSync ? new Date(lastSync) : undefined;
      }
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  }

  private saveStats() {
    try {
      const stats = {
        successCount: this.successCount,
        failureCount: this.failureCount,
        lastSync: this.lastSync?.toISOString()
      };
      localStorage.setItem('pumpguard_sync_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to save sync stats:', error);
    }
  }

  async init() {
    console.log('OfflineSync initialized');
    // Process any pending items on initialization
    if (this.isOnline) {
      await this.processQueue();
    }
    return this.getStatus();
  }

  async addToQueue(
    action: 'create' | 'update' | 'delete', 
    table: string, 
    data: any, 
    metadata?: SyncQueueItem['metadata']
  ): Promise<string> {
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get current user ID if available
    const { data: { user } } = await supabase.auth.getUser();
    
    const queueItem: SyncQueueItem = {
      id,
      action,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
      userId: user?.id,
      metadata: {
        deviceId: this.getDeviceId(),
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        ...metadata
      }
    };

    this.queue.push(queueItem);
    this.saveQueue();

    this.emitSyncEvent('queued', queueItem);

    // Try to sync immediately if online
    if (this.isOnline && this.config.enableAutoSync) {
      this.processQueue();
    }

    return id;
  }

  async processQueue(): Promise<{ success: number; failures: number }> {
    if (this.isSyncing || this.queue.length === 0 || !this.isOnline) {
      return { success: 0, failures: 0 };
    }

    this.isSyncing = true;
    this.emitStatusEvent('syncing');

    let successCount = 0;
    let failureCount = 0;

    try {
      // Process items in batches
      const batches = this.chunkArray(this.queue, this.config.batchSize);
      
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(item => this.processItem(item))
        );

        // Update queue based on results
        for (let i = 0; i < results.length; i++) {
          const item = batch[i];
          const result = results[i];

          if (result.status === 'fulfilled') {
            // Remove successful item from queue
            this.queue = this.queue.filter(q => q.id !== item.id);
            successCount++;
            this.successCount++;
            this.emitSyncEvent('success', item);
          } else {
            item.retries += 1;
            failureCount++;
            this.failureCount++;

            if (item.retries >= this.config.maxRetries) {
              this.moveToFailedQueue(item, result.reason);
              this.emitSyncEvent('failed', item, result.reason);
            } else {
              // Update retry count in queue
              const index = this.queue.findIndex(q => q.id === item.id);
              if (index !== -1) {
                this.queue[index] = item;
              }
            }
          }
        }

        this.saveQueue();
        this.saveStats();

        // Delay between batches to avoid rate limiting
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }

      this.lastSync = new Date();
      this.saveStats();

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.emitStatusEvent('error', error);
    } finally {
      this.isSyncing = false;
      this.emitStatusEvent('idle');
    }

    return { success: successCount, failures: failureCount };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    // Add delay for retries
    if (item.retries > 0) {
      const delay = Math.min(this.config.retryDelay * Math.pow(2, item.retries - 1), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    switch (item.action) {
      case 'create':
        const { data: createData, error: createError } = await supabase
          .from(item.table)
          .insert(item.data)
          .select()
          .single();

        if (createError) {
          // Handle specific Supabase errors
          if (createError.code === '23505') { // Unique violation
            console.warn('Duplicate entry detected, skipping:', createError);
            return; // Consider this a success since the data exists
          }
          throw createError;
        }

        // Update local data with server-generated ID if needed
        if (createData && item.data.id?.startsWith('offline_')) {
          this.updateLocalReferences(item.table, item.data.id, createData.id);
        }
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(item.table)
          .update(this.sanitizeUpdateData(item.data))
          .eq('id', item.data.id);

        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(item.table)
          .delete()
          .eq('id', item.data.id);

        if (deleteError) {
          // If item doesn't exist on server, consider delete successful
          if (deleteError.code === 'PGRST116') {
            console.warn('Item not found during delete, skipping:', deleteError);
            return;
          }
          throw deleteError;
        }
        break;
    }
  }

  private sanitizeUpdateData(data: any): any {
    // Remove fields that shouldn't be updated
    const { id, created_at, created_by, ...updateData } = data;
    return updateData;
  }

  private updateLocalReferences(table: string, oldId: string, newId: string) {
    // Update any local references to the old ID
    this.queue.forEach(item => {
      if (item.data && typeof item.data === 'object') {
        this.updateNestedReferences(item.data, oldId, newId);
      }
    });
    this.saveQueue();
  }

  private updateNestedReferences(obj: any, oldId: string, newId: string) {
    for (const key in obj) {
      if (obj[key] === oldId) {
        obj[key] = newId;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.updateNestedReferences(obj[key], oldId, newId);
      }
    }
  }

  private moveToFailedQueue(item: SyncQueueItem, error: any) {
    try {
      const failed = this.getFailedItems();
      failed.push({
        ...item,
        error: {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details
        },
        failedAt: new Date().toISOString()
      });
      
      localStorage.setItem('pumpguard_failed_sync', JSON.stringify(failed));
      
      // Remove from main queue
      this.queue = this.queue.filter(q => q.id !== item.id);
      this.saveQueue();
    } catch (storageError) {
      console.error('Failed to move item to failed queue:', storageError);
    }
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('pumpguard_device_id');
    if (!deviceId) {
      deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pumpguard_device_id', deviceId);
    }
    return deviceId;
  }

  private emitSyncEvent(type: 'queued' | 'success' | 'failed', item: SyncQueueItem, error?: any) {
    const event = new CustomEvent('syncItem', {
      detail: { type, item, error }
    });
    window.dispatchEvent(event);
  }

  private emitStatusEvent(status: 'online' | 'offline' | 'syncing' | 'idle' | 'error', error?: any) {
    const event = new CustomEvent('syncStatus', {
      detail: { status, error, ...this.getStatus() }
    });
    window.dispatchEvent(event);
  }

  // Public API
  getStatus(): SyncStatus {
    return {
      pending: this.queue.length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      successCount: this.successCount,
      failureCount: this.failureCount
    };
  }

  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  getFailedItems(): any[] {
    try {
      return JSON.parse(localStorage.getItem('pumpguard_failed_sync') || '[]');
    } catch {
      return [];
    }
  }

  async retryFailedItem(id: string): Promise<boolean> {
    try {
      const failed = this.getFailedItems();
      const itemIndex = failed.findIndex((f: any) => f.id === id);
      
      if (itemIndex !== -1) {
        const item = failed[itemIndex];
        
        // Add back to queue with reset retries
        this.queue.push({
          ...item,
          retries: 0,
          timestamp: Date.now()
        });
        
        // Remove from failed queue
        failed.splice(itemIndex, 1);
        localStorage.setItem('pumpguard_failed_sync', JSON.stringify(failed));
        
        this.saveQueue();
        
        // Trigger sync
        if (this.isOnline) {
          this.processQueue();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to retry item:', error);
    }
    
    return false;
  }

  clearFailedItems(): void {
    localStorage.removeItem('pumpguard_failed_sync');
  }

  removeFromQueue(id: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveQueue();
    return this.queue.length !== initialLength;
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableAutoSync !== undefined) {
      if (newConfig.enableAutoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
    
    if (newConfig.syncInterval !== undefined) {
      this.startAutoSync(); // Restart with new interval
    }
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // Force sync regardless of auto-sync settings
  async forceSync(): Promise<{ success: number; failures: number }> {
    return this.processQueue();
  }

  // Clear all sync data (use with caution)
  clearAll(): void {
    this.queue = [];
    this.successCount = 0;
    this.failureCount = 0;
    this.lastSync = undefined;
    
    localStorage.removeItem('pumpguard_sync_queue');
    localStorage.removeItem('pumpguard_sync_stats');
    localStorage.removeItem('pumpguard_failed_sync');
    
    this.emitStatusEvent('idle');
  }

  // Export data for debugging
  exportData(): any {
    return {
      queue: this.queue,
      failed: this.getFailedItems(),
      stats: {
        successCount: this.successCount,
        failureCount: this.failureCount,
        lastSync: this.lastSync
      },
      config: this.config
    };
  }
}

// Create singleton instance with default config
export const offlineSync = new OfflineSync();

// Export the class for testing or custom instances
export { OfflineSync };