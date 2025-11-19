import { PumpGuardAPI } from './index';

export class APIDocsGenerator {
  static generateDocs(api: PumpGuardAPI): any {
    return {
      version: '1.0.0',
      base_url: '/api',
      endpoints: {
        authentication: this.getAuthDocs(),
        stations: this.getStationDocs(),
        users: this.getUserDocs(),
        violations: this.getViolationDocs(),
        sales: this.getSalesDocs(),
        // Add other endpoints...
      },
      types: this.getTypeDefinitions()
    };
  }

  private static getAuthDocs() {
    return {
      signup: {
        method: 'POST',
        path: '/auth/signup',
        body: {
          email: 'string',
          password: 'string',
          full_name: 'string',
          role: 'UserRole'
        }
      },
      login: {
        method: 'POST',
        path: '/auth/login',
        body: {
          email: 'string',
          password: 'string'
        }
      }
    };
  }

  private static getTypeDefinitions() {
    return {
      APIResponse: {
        success: 'boolean',
        data: 'any',
        error: 'string?',
        message: 'string?',
        timestamp: 'string'
      },
      User: {
        id: 'string',
        email: 'string',
        full_name: 'string',
        role: 'UserRole'
      }
      // Add more type definitions...
    };
  }
}