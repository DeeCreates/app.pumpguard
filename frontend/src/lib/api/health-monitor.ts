import { supabase } from '../supabase';

export interface HealthStatus {
  database: 'healthy' | 'degraded' | 'unhealthy';
  api: 'healthy' | 'degraded' | 'unhealthy';
  storage: 'healthy' | 'degraded' | 'unhealthy';
  last_checked: string;
  response_time: number;
}

export class HealthMonitor {
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const [dbStatus, storageStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage()
    ]);

    const responseTime = Date.now() - startTime;

    return {
      database: dbStatus,
      api: 'healthy', // Assuming API is healthy if we reached here
      storage: storageStatus,
      last_checked: new Date().toISOString(),
      response_time: responseTime
    };
  }

  private async checkDatabase(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const startTime = Date.now();
      const { error } = await supabase.from('profiles').select('count').limit(1);
      const responseTime = Date.now() - startTime;

      if (error) return 'unhealthy';
      return responseTime > 1000 ? 'degraded' : 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  private async checkStorage(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // Test storage by uploading a small test file
      const testContent = new Blob(['health-check'], { type: 'text/plain' });
      const { error } = await supabase.storage
        .from('health-check')
        .upload(`test-${Date.now()}.txt`, testContent);

      return error ? 'unhealthy' : 'healthy';
    } catch {
      return 'unhealthy';
    }
  }
}