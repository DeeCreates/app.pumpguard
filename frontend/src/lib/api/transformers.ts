import { APIResponse, PaginatedResponse } from '../../types/api';

export class ResponseTransformer {
  static transformResponse<T>(data: any, message?: string): APIResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  static transformPaginatedResponse<T>(
    data: T[], 
    total: number, 
    page: number, 
    limit: number
  ): PaginatedResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      timestamp: new Date().toISOString()
    };
  }

  static transformError(error: any, customMessage?: string): APIResponse {
    console.error('API Error:', error);
    
    return {
      success: false,
      error: customMessage || error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  static sanitizeData<T>(data: T): T {
    // Remove sensitive fields from responses
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data } as any;
      const sensitiveFields = ['password', 'token', 'secret', 'api_key'];
      
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          delete sanitized[field];
        }
      });
      
      return sanitized;
    }
    
    return data;
  }
}