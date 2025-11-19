import { ApiResponse } from '@/types/api';

export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
};

export const createErrorResponse = (error: string, code?: string): ApiResponse => {
  return {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString()
  };
};

export const generateCacheKey = (prefix: string, params: any = {}): string => {
  const paramString = JSON.stringify(params);
  const hash = Buffer.from(paramString).toString('base64').slice(0, 10);
  return `${prefix}_${hash}`;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const sanitizeData = <T>(data: T): T => {
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data } as any;
    const sensitiveFields = ['password', 'token', 'secret_key', 'api_key'];
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }
  
  return data;
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};