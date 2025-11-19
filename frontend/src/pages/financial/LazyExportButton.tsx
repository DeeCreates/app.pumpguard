// src/pages/operations/LazyExportButton.tsx
import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Download, FileText, Sheet, FileDown, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  onExport?: (format: string) => void;
}

export function ExportButton({ data, filename = 'shift-report', onExport }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = async (format: string) => {
    if (data.length === 0) {
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');

    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      switch (format) {
        case 'csv':
          exportToCSV();
          break;
        case 'pdf':
          exportToPDF();
          break;
        case 'excel':
          exportToExcel();
          break;
      }

      setExportStatus('success');
      onExport?.(format);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportToPDF = () => {
    // In a real app, this would generate a PDF
    // For now, we'll create a simple text representation
    const pdfContent = `Shift Management Report\n\nGenerated: ${new Date().toLocaleString()}\n\n${JSON.stringify(data, null, 2)}`;
    downloadFile(pdfContent, `${filename}.txt`, 'text/plain');
  };

  const exportToExcel = () => {
    // In a real app, this would generate an Excel file
    // For now, we'll create a CSV that can be opened in Excel
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const excelContent = `${headers}\n${rows}`;
    downloadFile(excelContent, `${filename}.xls`, 'application/vnd.ms-excel');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getExportOptions = () => [
    {
      format: 'csv',
      label: 'Export as CSV',
      description: 'Comma-separated values',
      icon: FileText,
      disabled: data.length === 0
    },
    {
      format: 'excel',
      label: 'Export as Excel',
      description: 'Microsoft Excel format',
      icon: Sheet,
      disabled: data.length === 0
    },
    {
      format: 'pdf',
      label: 'Export as PDF',
      description: 'Printable document',
      icon: FileDown,
      disabled: data.length === 0
    }
  ];

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            disabled={isExporting || data.length === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Report
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {getExportOptions().map((option) => {
            const IconComponent = option.icon;
            return (
              <DropdownMenuItem
                key={option.format}
                onClick={() => handleExport(option.format)}
                disabled={option.disabled || isExporting}
                className="flex items-center gap-3 py-3"
              >
                <IconComponent className="w-4 h-4 text-gray-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {exportStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Report exported successfully!
          </AlertDescription>
        </Alert>
      )}

      {exportStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {data.length === 0 ? 'No data available to export' : 'Export failed. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {data.length === 0 && !isExporting && (
        <p className="text-xs text-gray-500 text-center">
          No shift data available for export
        </p>
      )}
    </div>
  );
}

export default ExportButton;