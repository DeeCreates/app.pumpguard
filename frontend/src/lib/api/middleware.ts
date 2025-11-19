import { API_CONSTANTS } from '../constants';

export class ApiMiddleware {
  private retryCount = 0;

  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (this.shouldRetry(error) && this.retryCount < API_CONSTANTS.MAX_RETRIES) {
        this.retryCount++;
        await this.delay(API_CONSTANTS.RETRY_DELAY * this.retryCount);
        return this.withRetry(operation);
      }
      throw error;
    }
  }

  async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number = API_CONSTANTS.REQUEST_TIMEOUT): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  private shouldRetry(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || error?.status >= 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}