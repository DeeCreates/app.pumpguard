// src/lib/csv-export.ts
export interface CSVExportConfig {
  title: string;
  filename: string;
  columns: CSVColumn[];
  data: any[];
  filters?: Record<string, any>;
}

export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export class CSVExport {
  static generateCSV(config: CSVExportConfig): { success: boolean; blob: Blob; filename: string; url: string } {
    try {
      // Headers
      const headers = config.columns.map(col => this.escapeCSV(col.label));
      
      // Data rows
      const rows = config.data.map(row => 
        config.columns.map(col => {
          const value = this.getNestedValue(row, col.key);
          const formattedValue = col.format ? col.format(value) : this.formatValue(value);
          return this.escapeCSV(formattedValue);
        })
      );

      // Add metadata as comments
      const metadata = [
        `# ${config.title}`,
        `# Generated: ${new Date().toLocaleString()}`,
        `# Total Records: ${config.data.length}`,
        ...Object.entries(config.filters || {}).map(([key, value]) => `# Filter ${key}: ${value}`),
        ''
      ];

      const csvContent = [
        ...metadata,
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `${config.filename}-${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
      const url = URL.createObjectURL(blob);

      return {
        success: true,
        blob,
        filename,
        url
      };
    } catch (error) {
      console.error('CSV generation failed:', error);
      return {
        success: false,
        blob: new Blob(),
        filename: '',
        url: ''
      };
    }
  }

  // Pre-configured exports
  static exportUsers(users: any[], filters: any = {}) {
    const config: CSVExportConfig = {
      title: 'User Management Report',
      filename: 'pumpguard-users',
      columns: [
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', format: (value) => value.replace(/_/g, ' ').toUpperCase() },
        { key: 'status', label: 'Status', format: (value) => value.toUpperCase() },
        { key: 'phone', label: 'Phone' },
        { key: 'stations.name', label: 'Station' },
        { key: 'omcs.name', label: 'OMC' },
        { key: 'created_at', label: 'Created Date', format: (value) => new Date(value).toLocaleDateString() }
      ],
      data: users,
      filters
    };

    return this.generateCSV(config);
  }

  static exportStations(stations: any[], filters: any = {}) {
    const config: CSVExportConfig = {
      title: 'Stations Report',
      filename: 'pumpguard-stations',
      columns: [
        { key: 'name', label: 'Station Name' },
        { key: 'code', label: 'Code' },
        { key: 'address', label: 'Address' },
        { key: 'region', label: 'Region' },
        { key: 'omcs.name', label: 'OMC' },
        { key: 'status', label: 'Status', format: (value) => value.toUpperCase() },
        { key: 'compliance_status', label: 'Compliance', format: (value) => value?.replace(/_/g, ' ').toUpperCase() || 'N/A' }
      ],
      data: stations,
      filters
    };

    return this.generateCSV(config);
  }

  // Utility methods
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  private static formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }

  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Download helper
  static download(result: ReturnType<typeof this.generateCSV>): void {
    if (!result.success) {
      console.error('Cannot download failed CSV');
      return;
    }

    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(result.url), 100);
  }
}