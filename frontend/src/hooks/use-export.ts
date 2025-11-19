// src/hooks/use-export.ts
import { useState, useCallback } from 'react';
import { PDFExport } from '../lib/pdf-export';
import { CSVExport } from '../lib/csv-export';
import { toast } from 'sonner';

export type ExportFormat = 'pdf' | 'csv';

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (
    data: any[],
    type: 'users' | 'stations' | 'violations' | 'omcs',
    format: ExportFormat = 'pdf',
    filters: any = {}
  ) => {
    if (data.length === 0) {
      toast.error('No Data', {
        description: 'There is no data to export.'
      });
      return;
    }

    setIsExporting(true);

    try {
      let result: any;

      if (format === 'pdf') {
        switch (type) {
          case 'users':
            result = PDFExport.exportUsers(data, filters);
            break;
          case 'stations':
            result = PDFExport.exportStations(data, filters);
            break;
          case 'violations':
            result = PDFExport.exportViolations(data, filters);
            break;
          case 'omcs':
            result = PDFExport.exportOMCs(data, filters);
            break;
          default:
            throw new Error(`Unsupported export type: ${type}`);
        }

        if (result.success) {
          PDFExport.download(result);
          toast.success('PDF Exported', {
            description: `Report has been generated and downloaded.`
          });
        } else {
          throw new Error('Failed to generate PDF');
        }
      } else {
        switch (type) {
          case 'users':
            result = CSVExport.exportUsers(data, filters);
            break;
          case 'stations':
            result = CSVExport.exportStations(data, filters);
            break;
          case 'omcs':
            result = CSVExport.exportOMCs(data, filters);
            break;
          default:
            throw new Error(`Unsupported export type: ${type}`);
        }

        if (result.success) {
          CSVExport.download(result);
          toast.success('CSV Exported', {
            description: `Data has been exported as CSV.`
          });
        } else {
          throw new Error('Failed to generate CSV');
        }
      }
    } catch (error: any) {
      toast.error('Export Failed', {
        description: error.message || 'Failed to generate export'
      });
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportUsers = useCallback((users: any[], format: ExportFormat = 'pdf', filters: any = {}) => {
    return handleExport(users, 'users', format, filters);
  }, [handleExport]);

  const exportStations = useCallback((stations: any[], format: ExportFormat = 'pdf', filters: any = {}) => {
    return handleExport(stations, 'stations', format, filters);
  }, [handleExport]);

  const exportViolations = useCallback((violations: any[], format: ExportFormat = 'pdf', filters: any = {}) => {
    return handleExport(violations, 'violations', format, filters);
  }, [handleExport]);

  const exportOMCs = useCallback((omcs: any[], format: ExportFormat = 'pdf', filters: any = {}) => {
    return handleExport(omcs, 'omcs', format, filters);
  }, [handleExport]);

  return {
    isExporting,
    exportUsers,
    exportStations,
    exportViolations,
    exportOMCs,
    handleExport
  };
}