// src/pages/users/pdf-export.tsx
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, UserExportData } from '../../lib/api';

export class PDFExport {
  static generateUserReport(exportData: UserExportData) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(40, 53, 147);
    doc.text('PUMPGUARD USER REPORT', 105, 20, { align: 'center' });
    
    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${date}`, 14, 35);
    doc.text(`Total Records: ${exportData.metadata.total_records}`, 14, 42);
    doc.text(`Exported by: System`, 14, 49);
    
    // Prepare table data
    const tableData = exportData.users.map(user => [
      user.full_name,
      user.email,
      user.role.replace('_', ' ').toUpperCase(),
      user.status.toUpperCase(),
      user.phone || 'N/A',
      this.getUserAssociation(user),
      new Date(user.created_at).toLocaleDateString()
    ]);

    // Add table
    autoTable(doc, {
      head: [['Name', 'Email', 'Role', 'Status', 'Phone', 'Association', 'Created']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { 
        fillColor: [40, 53, 147],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      margin: { top: 60 }
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} - PumpGuard User Management System`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(`pumpguard-users-${date.replace(/\//g, '-')}.pdf`);
  }

  static generateUserDetailsReport(user: User) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Add header
    doc.setFontSize(16);
    doc.setTextColor(40, 53, 147);
    doc.text('USER DETAILS REPORT', 105, 20, { align: 'center' });
    
    // User information
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 40;
    
    // Personal Information
    doc.setFont(undefined, 'bold');
    doc.text('PERSONAL INFORMATION', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Full Name: ${user.full_name}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Email: ${user.email}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Phone: ${user.phone || 'Not provided'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`User ID: ${user.id}`, 20, yPosition);
    yPosition += 12;
    
    // Account Information
    doc.setFont(undefined, 'bold');
    doc.text('ACCOUNT INFORMATION', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Role: ${user.role.replace('_', ' ').toUpperCase()}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Status: ${user.status.toUpperCase()}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Email Verified: ${user.email_verified ? 'YES' : 'NO'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Last Login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}`, 20, yPosition);
    yPosition += 12;
    
    // Association Information
    doc.setFont(undefined, 'bold');
    doc.text('ASSOCIATION', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    const association = this.getUserAssociation(user);
    doc.text(`Association: ${association}`, 20, yPosition);
    yPosition += 12;
    
    // Timestamps
    doc.setFont(undefined, 'bold');
    doc.text('TIMESTAMPS', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Created: ${new Date(user.created_at).toLocaleString()}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Last Updated: ${new Date(user.updated_at).toLocaleString()}`, 20, yPosition);
    
    // Add QR Code placeholder note
    yPosition += 15;
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('*QR code can be generated separately for this user', 14, yPosition);
    
    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${date} - PumpGuard User Management System`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );

    doc.save(`user-${user.id}-details-${date.replace(/\//g, '-')}.pdf`);
  }

  static generateComplianceReport(users: User[]) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Add header
    doc.setFontSize(16);
    doc.setTextColor(40, 53, 147);
    doc.text('USER COMPLIANCE REPORT', 105, 20, { align: 'center' });
    
    // Summary statistics
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const pendingUsers = users.filter(u => u.status === 'pending').length;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 40;
    
    // Summary
    doc.setFont(undefined, 'bold');
    doc.text('SUMMARY STATISTICS', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Total Users: ${users.length}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Active Users: ${activeUsers}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Inactive Users: ${inactiveUsers}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Suspended Users: ${suspendedUsers}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Pending Users: ${pendingUsers}`, 20, yPosition);
    yPosition += 12;
    
    // Role distribution
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    doc.setFont(undefined, 'bold');
    doc.text('ROLE DISTRIBUTION', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    Object.entries(roleCounts).forEach(([role, count]) => {
      doc.text(`${role.replace('_', ' ').toUpperCase()}: ${count} users`, 20, yPosition);
      yPosition += 6;
    });
    
    yPosition += 6;
    
    // Compliance status
    const verifiedUsers = users.filter(u => u.email_verified).length;
    const unverifiedUsers = users.length - verifiedUsers;
    
    doc.setFont(undefined, 'bold');
    doc.text('EMAIL VERIFICATION STATUS', 14, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Verified: ${verifiedUsers} users`, 20, yPosition);
    yPosition += 6;
    doc.text(`Unverified: ${unverifiedUsers} users`, 20, yPosition);
    
    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${date} - PumpGuard Compliance Report`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );

    doc.save(`user-compliance-report-${date.replace(/\//g, '-')}.pdf`);
  }

  private static getUserAssociation(user: User): string {
    if (user.stations?.name) return `Station: ${user.stations.name}`;
    if (user.omcs?.name) return `OMC: ${user.omcs.name}`;
    if (user.dealers?.name) return `Dealer: ${user.dealers.name}`;
    return 'No association';
  }
}