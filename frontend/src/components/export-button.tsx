// src/components/export-button.tsx
import React from 'react';
import { Button } from './ui/button';
import { Download, Loader2, FileText, Sheet } from 'lucide-react';
import { ExportFormat } from '../hooks/use-export';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  isExporting?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  dataLength?: number;
}

export function ExportButton({
  onExport,
  isExporting = false,
  disabled = false,
  variant = 'outline',
  size = 'default',
  dataLength = 0
}: ExportButtonProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setShowDropdown(false);
  };

  const isDisabled = disabled || isExporting || dataLength === 0;

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isDisabled}
        className="flex items-center gap-2"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export
        {dataLength > 0 && (
          <span className="ml-1 text-xs opacity-70">({dataLength})</span>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isDisabled}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isDisabled}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sheet className="w-4 h-4 mr-2" />
            Export as CSV
          </button>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}