// src/lib/pdf-export.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { format } from 'date-fns';

export interface PDFExportConfig {
  title: string;
  filename: string;
  columns: PDFColumn[];
  data: any[];
  filters?: Record<string, any>;
  summary?: PDFSummary;
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeQRCode?: boolean;
  qrCodeData?: string;
  reportId?: string;
  verificationUrl?: string;
  logoUrl?: string;
  watermark?: boolean;
}

export interface PDFColumn {
  key: string;
  label: string;
  width?: number;
  format?: (value: any) => string;
  align?: 'left' | 'center' | 'right';
}

export interface PDFSummary {
  totalRecords: number;
  generatedBy?: string;
  timeRange?: string;
  notes?: string;
  stationName?: string;
  stationCode?: string;
  totalSales?: number;
  totalExpenses?: number;
  totalCommission?: number;
  netAmount?: number;
}

export class PDFExport {
  private static readonly APP_DOMAIN = 'https://pumpguardapp.vercel.app';
  private static readonly VERIFICATION_PATH = '/verify/report';
  private static readonly LOGO_URL = '/favicon.png';
  private static readonly COMPANY_NAME = 'PumpGuard Fuel Management System';
  
  // Color scheme
  private static readonly COLORS = {
    primary: [40, 53, 147], // blue-900
    secondary: [100, 116, 139], // slate-500
    success: [16, 185, 129], // green-500
    warning: [245, 158, 11], // yellow-500
    danger: [239, 68, 68], // red-500
    info: [59, 130, 246], // blue-500
    lightBg: [248, 250, 252], // slate-50
    border: [226, 232, 240] // slate-200
  };

  static async generatePDF(config: PDFExportConfig): Promise<{ 
    success: boolean; 
    blob: Blob; 
    filename: string; 
    url: string;
    error?: string;
  }> {
    try {
      console.log('📄 Starting PDF generation for:', config.title);
      
      const doc = new jsPDF();
      const date = new Date();
      const formattedDate = this.formatDate(date);
      const formattedTime = this.formatTime(date);

      let currentY = 20;

      // Header with Logo and Company Info
      if (config.includeHeader !== false) {
        await this.addHeader(doc, config, currentY);
        currentY = 45; // Space for header
        
        // Report Title
        doc.setFontSize(16);
        doc.setTextColor(...this.COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(config.title, 14, currentY);
        currentY += 6;

        // Metadata Section
        doc.setFontSize(9);
        doc.setTextColor(...this.COLORS.secondary);
        doc.setFont('helvetica', 'normal');
        
        const metadata = [];
        if (config.summary?.stationName) {
          metadata.push(`Station: ${config.summary.stationName}`);
        }
        if (config.summary?.stationCode) {
          metadata.push(`Code: ${config.summary.stationCode}`);
        }
        metadata.push(`Generated: ${formattedDate} at ${formattedTime}`);
        
        if (config.summary?.generatedBy) {
          metadata.push(`By: ${config.summary.generatedBy}`);
        }
        
        if (config.reportId) {
          metadata.push(`Report ID: ${config.reportId.slice(-8)}`);
        }

        metadata.forEach((text, index) => {
          doc.text(text, 14, currentY + (index * 4));
        });
        
        currentY += metadata.length * 4 + 10;
      }

      // Generate QR Code for verification
      if (config.includeQRCode) {
        try {
          const qrCodeUrl = await this.generateQRCodeForReport(config);
          doc.addImage(qrCodeUrl, 'PNG', 160, 20, 30, 30);
          
          // QR Code label
          doc.setFontSize(7);
          doc.setTextColor(...this.COLORS.secondary);
          doc.setFont('helvetica', 'bold');
          doc.text("SCAN TO", 165, 52);
          doc.text("VERIFY", 165, 56);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.text("Authenticity", 165, 60);
        } catch (error) {
          console.warn('QR Code generation failed:', error);
        }
      }

      // Add filters section if filters exist
      if (config.filters && Object.keys(config.filters).length > 0) {
        currentY = this.addFiltersSection(doc, config, currentY);
      }

      // Prepare and render table data
      const tableColumns = config.columns.map(col => ({
        header: col.label,
        dataKey: col.key,
        ...(col.width && { width: col.width }),
        ...(col.align && { halign: col.align })
      }));

      const tableData = config.data.map((row) => {
        const rowData: any = {};
        config.columns.forEach(col => {
          const value = this.getNestedValue(row, col.key);
          rowData[col.key] = col.format ? col.format(value) : this.formatValue(value, col.key);
        });
        return rowData;
      });

      // Generate main table
      autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: currentY,
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          lineColor: this.COLORS.border,
          lineWidth: 0.25,
          font: 'helvetica',
          textColor: [15, 23, 42] // slate-900
        },
        headStyles: { 
          fillColor: this.COLORS.primary,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: this.COLORS.border,
          lineWidth: 0.25,
        },
        alternateRowStyles: {
          fillColor: this.COLORS.lightBg
        },
        margin: { top: currentY },
        tableWidth: 'auto',
        theme: 'grid',
        didDrawCell: (data) => {
          // Optional: Add custom cell drawing logic here
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || currentY + 20;

      // Add summary section for reports
      if (config.summary) {
        this.addSummarySection(doc, config, finalY + 10);
      }

      // Add footer
      if (config.includeFooter !== false) {
        this.addFooter(doc, config);
      }

      // Add watermark if enabled
      if (config.watermark) {
        this.addWatermark(doc);
      }

      // Generate final output
      const pdfBlob = doc.output('blob');
      const filename = `${config.filename.replace(/[^a-z0-9]/gi, '-')}-${formattedDate.replace(/\//g, '-')}.pdf`;
      const url = URL.createObjectURL(pdfBlob);

      console.log('✅ PDF generated successfully:', filename);
      return { 
        success: true, 
        blob: pdfBlob, 
        filename, 
        url 
      };
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      return {
        success: false,
        blob: new Blob(),
        filename: '',
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Pre-configured report types
  static async exportDailyReport(report: any, user: any): Promise<ReturnType<typeof this.generatePDF>> {
    const reportId = report.id || `DR-${Date.now()}`;
    const verificationUrl = `${this.APP_DOMAIN}${this.VERIFICATION_PATH}`;
    const qrCodeData = `${verificationUrl}?id=${reportId}&hash=${this.generateSecureHash(report)}&t=${Date.now()}`;
    
    const config: PDFExportConfig = {
      title: 'DAILY SALES REPORT',
      filename: `daily-report-${report.station_code || report.station_id?.slice(-6)}-${report.report_date}`,
      columns: [
        { key: 'field', label: 'FIELD', width: 45, align: 'left' },
        { key: 'value', label: 'VALUE', width: 55, align: 'left' },
        { key: 'status', label: 'STATUS', width: 40, align: 'center' }
      ],
      data: [
        { 
          field: 'Report Information', 
          value: `Date: ${this.formatDate(new Date(report.report_date))}\nShift: ${this.capitalizeFirst(report.shift)}`, 
          status: '📅' 
        },
        { 
          field: 'Station Details', 
          value: `${report.station_name || 'N/A'}\nCode: ${report.station_code || 'N/A'}`, 
          status: '🏪' 
        },
        { 
          field: 'Fuel Sales', 
          value: `${this.formatNumber(report.total_fuel_sold)} Liters\n${this.formatCurrency(report.total_sales)} Total`, 
          status: '⛽' 
        },
        { 
          field: 'Cash Handling', 
          value: `${this.formatCurrency(report.cash_collected)} Collected\n${this.formatCurrency(report.bank_deposits)} Deposited`, 
          status: '💰' 
        },
        { 
          field: 'Expenses', 
          value: `${this.formatCurrency(report.total_expenses)} Total Expenses`, 
          status: '📋' 
        },
        { 
          field: 'Dealer Commission', 
          value: `${this.formatCurrency(report.dealer_commission)}\n${report.commission_paid ? '✅ Paid' : '⏳ Pending'}`, 
          status: report.commission_paid ? '✅' : '⏳' 
        },
        { 
          field: 'Financial Summary', 
          value: `Variance: ${this.formatCurrency(report.variance)} ${report.variance >= 0 ? '📈 Over' : '📉 Short'}\nNet: ${this.formatCurrency(report.net_amount)}`, 
          status: report.variance >= 0 ? '📈' : '📉' 
        },
        { 
          field: 'Report Status', 
          value: this.capitalizeFirst(report.status), 
          status: this.getStatusIcon(report.status) 
        },
        { 
          field: 'Submitted By', 
          value: `${report.submitted_by_name || 'System'}\n${this.formatDateTime(report.submitted_at)}`, 
          status: '👤' 
        },
        { 
          field: 'Approval', 
          value: report.approved_by_name 
            ? `${report.approved_by_name}\n${this.formatDateTime(report.approved_at)}`
            : 'Pending Approval', 
          status: report.approved_by_name ? '✅' : '⏳' 
        }
      ],
      summary: {
        totalRecords: 1,
        generatedBy: user?.full_name || user?.email || 'System',
        stationName: report.station_name,
        stationCode: report.station_code,
        timeRange: report.report_date,
        notes: report.notes || 'No additional notes provided.',
        totalSales: report.total_sales,
        totalExpenses: report.total_expenses,
        totalCommission: report.dealer_commission,
        netAmount: report.net_amount
      },
      includeHeader: true,
      includeFooter: true,
      includeQRCode: true,
      qrCodeData: qrCodeData,
      reportId: reportId,
      verificationUrl: verificationUrl,
      logoUrl: this.LOGO_URL,
      watermark: true
    };

    return await this.generatePDF(config);
  }

  static async exportMultipleReports(reports: any[], user: any, filters?: any): Promise<ReturnType<typeof this.generatePDF>> {
    const config: PDFExportConfig = {
      title: 'DAILY REPORTS SUMMARY',
      filename: `reports-summary-${this.formatDate(new Date(), 'yyyy-MM-dd')}`,
      columns: [
        { key: 'report_date', label: 'Date', width: 25, format: (v) => this.formatDate(new Date(v)) },
        { key: 'station_name', label: 'Station', width: 35 },
        { key: 'shift', label: 'Shift', width: 20, format: this.capitalizeFirst },
        { key: 'total_fuel_sold', label: 'Fuel (L)', width: 25, format: this.formatNumber },
        { key: 'total_sales', label: 'Sales', width: 30, format: this.formatCurrency },
        { key: 'cash_collected', label: 'Cash', width: 30, format: this.formatCurrency },
        { key: 'variance', label: 'Variance', width: 25, format: this.formatCurrency },
        { key: 'status', label: 'Status', width: 25, format: this.capitalizeFirst }
      ],
      data: reports,
      filters,
      summary: {
        totalRecords: reports.length,
        generatedBy: user?.full_name || user?.email || 'System',
        timeRange: filters?.date_from && filters?.date_to 
          ? `${filters.date_from} to ${filters.date_to}`
          : 'All Time',
        totalSales: reports.reduce((sum, r) => sum + (r.total_sales || 0), 0),
        totalExpenses: reports.reduce((sum, r) => sum + (r.total_expenses || 0), 0),
        totalCommission: reports.reduce((sum, r) => sum + (r.dealer_commission || 0), 0)
      },
      includeHeader: true,
      includeFooter: true,
      includeQRCode: false,
      logoUrl: this.LOGO_URL
    };

    return await this.generatePDF(config);
  }

  // Private helper methods
  private static async addHeader(doc: jsPDF, config: PDFExportConfig, y: number): Promise<void> {
    try {
      // Add logo
      const logoUrl = config.logoUrl || this.LOGO_URL;
      const img = await this.loadImage(logoUrl);
      doc.addImage(img, 'PNG', 14, y, 18, 18);
      
      // Company name and tagline
      doc.setFontSize(12);
      doc.setTextColor(...this.COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('PumpGuard', 36, y + 8);
      
      doc.setFontSize(8);
      doc.setTextColor(...this.COLORS.secondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Fuel Management System', 36, y + 13);
      doc.text('Daily Reports & Analytics', 36, y + 18);
      
    } catch (error) {
      console.warn('Logo loading failed, using text-only header:', error);
      // Fallback
      doc.setFontSize(14);
      doc.setTextColor(...this.COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('PumpGuard', 14, y + 10);
    }
  }

  private static addFiltersSection(doc: jsPDF, config: PDFExportConfig, y: number): number {
    if (!config.filters || Object.keys(config.filters).length === 0) return y;
    
    const filters = config.filters;
    const filterText = Object.entries(filters)
      .filter(([_, value]) => value && value !== 'all' && value !== '')
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${label}: ${value}`;
      })
      .join(' • ');
    
    if (!filterText) return y;
    
    doc.setFontSize(8);
    doc.setTextColor(...this.COLORS.secondary);
    doc.setFont('helvetica', 'italic');
    
    const filterLines = doc.splitTextToSize(`Filters: ${filterText}`, 180);
    doc.text(filterLines, 14, y);
    
    return y + (filterLines.length * 4) + 5;
  }

  private static addSummarySection(doc: jsPDF, config: PDFExportConfig, startY: number): void {
    const summary = config.summary;
    if (!summary) return;

    // Summary box
    doc.setDrawColor(...this.COLORS.border);
    doc.setFillColor(this.COLORS.lightBg[0], this.COLORS.lightBg[1], this.COLORS.lightBg[2]);
    doc.roundedRect(14, startY, 182, 25, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(...this.COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 20, startY + 8);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    let x = 20;
    let y = startY + 15;
    
    // Add summary items
    const summaryItems = [];
    
    if (summary.totalRecords) {
      summaryItems.push(`📊 Reports: ${summary.totalRecords}`);
    }
    if (summary.totalSales) {
      summaryItems.push(`💰 Sales: ${this.formatCurrency(summary.totalSales)}`);
    }
    if (summary.totalExpenses) {
      summaryItems.push(`📋 Expenses: ${this.formatCurrency(summary.totalExpenses)}`);
    }
    if (summary.totalCommission) {
      summaryItems.push(`🏦 Commission: ${this.formatCurrency(summary.totalCommission)}`);
    }
    
    // Split into two columns
    const midPoint = Math.ceil(summaryItems.length / 2);
    const leftColumn = summaryItems.slice(0, midPoint);
    const rightColumn = summaryItems.slice(midPoint);
    
    // Left column
    leftColumn.forEach((item, index) => {
      doc.text(item, x, y + (index * 5));
    });
    
    // Right column
    rightColumn.forEach((item, index) => {
      doc.text(item, x + 90, y + (index * 5));
    });
    
    // Notes section
    if (summary.notes) {
      y += Math.max(leftColumn.length, rightColumn.length) * 5 + 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...this.COLORS.secondary);
      
      const notesLines = doc.splitTextToSize(`📝 ${summary.notes}`, 175);
      doc.text(notesLines, 20, y);
    }
  }

  private static addFooter(doc: jsPDF, config: PDFExportConfig): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      
      // Footer line
      doc.setDrawColor(...this.COLORS.border);
      doc.line(14, pageHeight - 20, 196, pageHeight - 20);
      
      // Left footer - Document info
      doc.setFontSize(7);
      doc.setTextColor(...this.COLORS.secondary);
      doc.setFont('helvetica', 'normal');
      
      if (config.includeQRCode && i === 1 && config.reportId) {
        doc.text(`Report ID: ${config.reportId.slice(-8)}`, 14, pageHeight - 15);
        doc.text('QR Code for Verification', 14, pageHeight - 10);
      }
      
      // Center footer - Page info and company
      doc.text(
        `${this.COMPANY_NAME} • Page ${i} of ${pageCount}`,
        105,
        pageHeight - 15,
        { align: 'center' }
      );
      
      const currentDate = this.formatDate(new Date());
      doc.text(
        `Generated: ${currentDate} • PumpGuard v1.0`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Right footer - Confidential
      doc.setFont('helvetica', 'bold');
      doc.text(
        'CONFIDENTIAL',
        196,
        pageHeight - 15,
        { align: 'right' }
      );
      
      if (config.verificationUrl) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(
          `${config.verificationUrl}`,
          196,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    }
  }

  private static addWatermark(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Save current state
      doc.saveGraphicsState();
      
      // Set watermark properties
      doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
      doc.setFontSize(60);
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'bold');
      
      // Get page dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Rotate and position watermark
      doc.text(
        'PUMPGUARD',
        pageWidth / 2,
        pageHeight / 2,
        { angle: 45, align: 'center', baseline: 'middle' }
      );
      
      // Restore graphics state
      doc.restoreGraphicsState();
    }
  }

  private static async generateQRCodeForReport(config: PDFExportConfig): Promise<string> {
    const data = config.qrCodeData || 
      `${config.verificationUrl || this.APP_DOMAIN + this.VERIFICATION_PATH}?id=${config.reportId}`;
    
    try {
      return await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
          dark: `rgb(${this.COLORS.primary.join(',')})`,
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });
    } catch (error) {
      console.error('QR Code generation failed:', error);
      // Return a simple fallback QR code
      return await QRCode.toDataURL('PumpGuard Verification Failed');
    }
  }

  private static generateSecureHash(report: any): string {
    // Create a more secure hash using multiple fields
    const hashData = {
      id: report.id,
      report_date: report.report_date,
      station_id: report.station_id,
      total_sales: report.total_sales,
      cash_collected: report.cash_collected,
      status: report.status,
      timestamp: Date.now()
    };
    
    const dataString = JSON.stringify(hashData);
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to hex and pad to 12 characters
    return Math.abs(hash).toString(16).padStart(12, '0').toUpperCase();
  }

  private static async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      // Add cache busting for logo
      const cacheBuster = `?t=${Date.now()}`;
      img.src = url + cacheBuster;
    });
  }

  // Formatting utilities
  private static formatDate(date: Date | string, formatStr: string = 'PPP'): string {
    try {
      if (typeof date === 'string') {
        date = new Date(date);
      }
      return format(date, formatStr);
    } catch {
      return typeof date === 'string' ? date : 'Invalid Date';
    }
  }

  private static formatTime(date: Date): string {
    return format(date, 'HH:mm:ss');
  }

  private static formatDateTime(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  }

  private static formatCurrency(amount: number): string {
    if (amount === null || amount === undefined) return '₵0.00';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private static formatNumber(num: number): string {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  private static capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private static getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      draft: '📝',
      submitted: '📤',
      approved: '✅',
      rejected: '❌',
      paid: '💰'
    };
    return icons[status?.toLowerCase()] || '📄';
  }

  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    try {
      return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        return current[key];
      }, obj);
    } catch {
      return undefined;
    }
  }

  private static formatValue(value: any, key?: string): string {
    if (value === null || value === undefined) return 'N/A';
    
    // Special formatting for certain keys
    if (key?.includes('amount') || key?.includes('price') || key?.includes('total')) {
      if (typeof value === 'number') {
        return this.formatCurrency(value);
      }
    }
    
    if (key?.includes('date') || key?.includes('_at')) {
      if (typeof value === 'string' || value instanceof Date) {
        return this.formatDate(value);
      }
    }
    
    if (key?.includes('status')) {
      return this.capitalizeFirst(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      return this.formatNumber(value);
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  }

  // Public download helper
  static download(result: ReturnType<typeof this.generatePDF>): boolean {
    if (!result.success || !result.url || !result.filename) {
      console.error('Cannot download invalid PDF result');
      return false;
    }

    try {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL after download
      setTimeout(() => {
        if (result.url) {
          URL.revokeObjectURL(result.url);
        }
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return false;
    }
  }

  // Bulk export helper
  static async exportBulkReports(reports: any[], user: any, type: 'daily' | 'summary' = 'summary') {
    if (type === 'daily' && reports.length > 0) {
      // Export the first report as a sample
      return await this.exportDailyReport(reports[0], user);
    } else {
      return await this.exportMultipleReports(reports, user);
    }
  }

  // Print helper
  static print(result: ReturnType<typeof this.generatePDF>): boolean {
    if (!result.success || !result.url) {
      console.error('Cannot print invalid PDF');
      return false;
    }

    try {
      const printWindow = window.open(result.url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      return true;
    } catch (error) {
      console.error('Error printing PDF:', error);
      return false;
    }
  }
}