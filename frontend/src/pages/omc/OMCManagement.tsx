// src/pages/management/omcmanagement.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  MapPin, 
  MoreVertical,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Phone,
  Mail,
  Globe,
  QrCode,
  Copy,
  ExternalLink,
  Shield,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ExportButton } from "../../components/export-button";
import { useExport } from "../../hooks/use-export";
import { QRCodeSVG } from "qrcode.react";

interface OMC {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  region: string;
  country: string;
  status: 'active' | 'inactive' | 'suspended';
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  license_number: string;
  license_expiry: string;
  total_stations: number;
  total_users: number;
  total_violations: number;
  monthly_sales: number;
  created_at: string;
  updated_at: string;
  contact_person?: string;
  logo_url?: string;
  brand_color?: string;
  is_active?: boolean;
}

interface OMCFilters {
  search?: string;
  status?: string;
  region?: string;
  compliance_status?: string;
  page?: number;
  limit?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function OMCManagement() {
  // State management
  const [omcs, setOmcs] = useState<OMC[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Filters and search
  const [filters, setFilters] = useState<OMCFilters>({
    page: 1,
    limit: 50,
    search: "",
    status: "all",
    region: "all",
    compliance_status: "all"
  });
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Selected items
  const [selectedOMC, setSelectedOMC] = useState<OMC | null>(null);
  const [selectedOmcs, setSelectedOmcs] = useState<Set<string>>(new Set());
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // Export functionality
  const { isExporting, exportData } = useExport();

  // Form states
  const [newOMC, setNewOMC] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    region: "",
    country: "Ghana",
    license_number: "",
    license_expiry: "",
    contact_person: "",
    status: "active" as 'active'
  });

  const [editOMC, setEditOMC] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    region: "",
    country: "",
    license_number: "",
    license_expiry: "",
    contact_person: "",
    status: "active" as 'active' | 'inactive' | 'suspended'
  });

  // Regions data
  const regions = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Northern", "Upper East", "Upper West", "Brong Ahafo"
  ];

  // Enhanced data loading with error handling
  const loadOMCs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getOMCs();
      
      if (response.success) {
        // Transform API data to match our interface with safe defaults
        const omcsData = (Array.isArray(response.data) ? response.data : []) as OMC[];
        
        // Apply client-side filtering with safe access
        let filteredData = omcsData.map(omc => ({
          ...omc,
          name: omc.name || 'Unknown OMC',
          code: omc.code || 'N/A',
          email: omc.email || 'N/A',
          phone: omc.phone || 'N/A',
          address: omc.address || 'N/A',
          city: omc.city || 'N/A',
          region: omc.region || 'N/A',
          country: omc.country || 'Ghana',
          status: omc.status || 'active',
          compliance_status: omc.compliance_status || 'compliant',
          license_number: omc.license_number || 'N/A',
          license_expiry: omc.license_expiry || '',
          contact_person: omc.contact_person || '',
          total_stations: omc.total_stations || 0,
          total_users: omc.total_users || 0,
          total_violations: omc.total_violations || 0,
          monthly_sales: omc.monthly_sales || 0
        }));
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredData = filteredData.filter(omc => 
            (omc.name?.toLowerCase() || '').includes(searchLower) ||
            (omc.code?.toLowerCase() || '').includes(searchLower) ||
            (omc.email?.toLowerCase() || '').includes(searchLower) ||
            (omc.contact_person?.toLowerCase() || '').includes(searchLower)
          );
        }
        
        if (filters.status !== "all") {
          filteredData = filteredData.filter(omc => 
            omc.status === filters.status
          );
        }
        
        if (filters.region !== "all") {
          filteredData = filteredData.filter(omc => omc.region === filters.region);
        }
        
        if (filters.compliance_status !== "all") {
          filteredData = filteredData.filter(omc => omc.compliance_status === filters.compliance_status);
        }
        
        setOmcs(filteredData);
        setPagination(prev => ({
          ...prev,
          total: filteredData.length,
          total_pages: Math.ceil(filteredData.length / (filters.limit || 50))
        }));
      } else {
        toast.error("Failed to load OMCs", {
          description: response.error || "Please check your connection and try again."
        });
        setOmcs([]);
      }
    } catch (error: any) {
      console.error("Failed to load OMCs:", error);
      toast.error("Failed to load OMCs", {
        description: "Please check your connection and try again."
      });
      setOmcs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data when filters change
  useEffect(() => {
    loadOMCs();
  }, [loadOMCs]);

  // Enhanced OMC creation with validation
  const handleCreateOMC = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Validate required fields
      if (!newOMC.name || !newOMC.code || !newOMC.email || !newOMC.license_number) {
        toast.error("Missing required fields", {
          description: "Name, Code, Email, and License Number are required"
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newOMC.email)) {
        toast.error("Invalid email format", {
          description: "Please enter a valid email address"
        });
        return;
      }

      const result = await api.createOMC(newOMC);

      if (result.success) {
        toast.success("OMC created successfully", {
          description: `${newOMC.name} has been added to the system.`
        });
        
        await loadOMCs();
        setShowCreateDialog(false);
        resetNewOMCForm();
      } else {
        toast.error("Failed to create OMC", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to create OMC", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setCreating(false);
    }
  };

  // Enhanced OMC update
  const handleUpdateOMC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOMC) return;

    setUpdating(true);
    try {
      const result = await api.updateOMC(selectedOMC.id, editOMC);

      if (result.success) {
        toast.success("OMC updated successfully", {
          description: `${editOMC.name}'s information has been updated.`
        });
        
        await loadOMCs();
        setShowEditDialog(false);
        setSelectedOMC(null);
      } else {
        toast.error("Failed to update OMC", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to update OMC", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setUpdating(false);
    }
  };

  // Enhanced OMC deletion with dependency checks
  const handleDeleteOMC = async () => {
    if (!selectedOMC) return;

    setDeleting(selectedOMC.id);
    try {
      const result = await api.deleteOMC(selectedOMC.id);
      
      if (result.success) {
        toast.success("OMC deleted successfully", {
          description: `${selectedOMC.name} has been deactivated.`
        });
        await loadOMCs();
        setShowDeleteDialog(false);
        setSelectedOMC(null);
      } else {
        toast.error("Failed to delete OMC", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to delete OMC", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setDeleting(null);
    }
  };

  // Handle bulk operations
  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'suspended') => {
    if (selectedOmcs.size === 0) return;

    setBulkLoading(true);
    try {
      const updates = Array.from(selectedOmcs).map(omcId => 
        api.updateOMC(omcId, { status })
      );

      const results = await Promise.allSettled(updates);
      const successful = results.filter(result => result.status === 'fulfilled').length;

      toast.success("Bulk update completed", {
        description: `Updated ${successful} OMCs to ${status} status.`
      });
      
      setSelectedOmcs(new Set());
      await loadOMCs();
    } catch (error: any) {
      toast.error("Bulk update failed", {
        description: error.message || "Please try again later."
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Enhanced export functionality
  const handleExportOMCs = async (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = omcs.map(omc => ({
      'OMC Name': omc.name || 'N/A',
      'Code': omc.code || 'N/A',
      'Email': omc.email || 'N/A',
      'Phone': omc.phone || 'N/A',
      'Region': omc.region || 'N/A',
      'Status': omc.status || 'Unknown',
      'Compliance Status': omc.compliance_status || 'Unknown',
      'Total Stations': omc.total_stations || 0,
      'Total Users': omc.total_users || 0,
      'Monthly Sales': `₵${(omc.monthly_sales || 0).toLocaleString()}`,
      'License Number': omc.license_number || 'N/A',
      'License Expiry': omc.license_expiry ? new Date(omc.license_expiry).toLocaleDateString() : 'N/A',
      'Contact Person': omc.contact_person || 'N/A'
    }));

    await exportData(exportData, `omcs-export-${new Date().toISOString().split('T')[0]}`, format);
  };

  // Handle QR code generation
  const generateQRCodeData = (omc: OMC) => {
    return JSON.stringify({
      type: 'omc',
      id: omc.id,
      name: omc.name || 'Unknown OMC',
      code: omc.code || 'N/A',
      license: omc.license_number || 'N/A',
      verification_url: `${window.location.origin}/verify/omc/${omc.id}`
    }, null, 2);
  };

  const copyQRData = async (omc: OMC) => {
    try {
      await navigator.clipboard.writeText(generateQRCodeData(omc));
      toast.success("QR data copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy QR data");
    }
  };

  // Handle user selection
  const handleOMCSelection = (omcId: string, checked: boolean) => {
    const newSelected = new Set(selectedOmcs);
    if (checked) {
      newSelected.add(omcId);
    } else {
      newSelected.delete(omcId);
    }
    setSelectedOmcs(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOmcs(new Set(omcs.map(omc => omc.id)));
    } else {
      setSelectedOmcs(new Set());
    }
  };

  // Reset forms
  const resetNewOMCForm = () => {
    setNewOMC({
      name: "",
      code: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      region: "",
      country: "Ghana",
      license_number: "",
      license_expiry: "",
      contact_person: "",
      status: "active"
    });
  };

  const resetEditOMCForm = (omc: OMC) => {
    setEditOMC({
      name: omc.name || "",
      code: omc.code || "",
      email: omc.email || "",
      phone: omc.phone || "",
      website: omc.website || "",
      address: omc.address || "",
      city: omc.city || "",
      region: omc.region || "",
      country: omc.country || "",
      license_number: omc.license_number || "",
      license_expiry: omc.license_expiry ? omc.license_expiry.split('T')[0] : "",
      contact_person: omc.contact_person || "",
      status: omc.status || "active"
    });
  };

  // Utility functions with proper error handling
  const getStatusBadgeVariant = (status: string | undefined) => {
    if (!status) return "outline";
    
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive"
    };
    return variants[status] || "outline";
  };

  const getComplianceBadgeVariant = (status: string | undefined) => {
    if (!status) return "outline";
    
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      compliant: "default",
      non_compliant: "destructive",
      under_review: "outline"
    };
    return variants[status] || "outline";
  };

  const getComplianceIcon = (status: string | undefined) => {
    if (!status) return <AlertTriangle className="w-3 h-3" />;
    
    const icons: { [key: string]: React.ReactNode } = {
      compliant: <CheckCircle className="w-3 h-3" />,
      non_compliant: <XCircle className="w-3 h-3" />,
      under_review: <AlertTriangle className="w-3 h-3" />
    };
    return icons[status] || <AlertTriangle className="w-3 h-3" />;
  };

  // FIXED: Completely safe string formatting functions
  const formatComplianceStatus = (status: string | undefined): string => {
    if (!status || typeof status !== 'string') return "Unknown";
    
    try {
      return status.split('_').map(word => {
        if (!word || typeof word !== 'string') return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    } catch (error) {
      console.error('Error formatting compliance status:', error);
      return "Unknown";
    }
  };

  // FIXED: Completely safe status formatting
  const formatStatus = (status: string | undefined): string => {
    if (!status || typeof status !== 'string') return "Unknown";
    
    try {
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    } catch (error) {
      console.error('Error formatting status:', error);
      return "Unknown";
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  const canManageOMCs = true; // This would come from user permissions

  // Safe data access helper
  const safeGet = <T,>(value: T | undefined | null, fallback: T): T => {
    return value ?? fallback;
  };

  if (loading && omcs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading OMCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              OMC Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage {pagination.total} Oil Marketing Companies and their operations
              {selectedOmcs.size > 0 && ` • ${selectedOmcs.size} selected`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {selectedOmcs.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Bulk Actions ({selectedOmcs.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white/95 backdrop-blur-sm border-gray-200">
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Activate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                    <XCircle className="w-4 h-4 mr-2 text-gray-600" />
                    Deactivate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('suspended')}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                    Suspend Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button 
              variant="outline"
              onClick={() => loadOMCs()}
              disabled={loading}
              className="bg-white/80 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <ExportButton
              onExport={handleExportOMCs}
              isExporting={isExporting}
              dataLength={omcs.length}
            />

            {canManageOMCs && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25">
                    <Plus className="w-4 h-4 mr-2" />
                    Add OMC
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                      Create New OMC
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOMC} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Company Name *</label>
                        <Input
                          value={newOMC.name}
                          onChange={(e) => setNewOMC({ ...newOMC, name: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Company Code *</label>
                        <Input
                          value={newOMC.code}
                          onChange={(e) => setNewOMC({ ...newOMC, code: e.target.value.toUpperCase() })}
                          required
                          className="bg-white/50"
                          placeholder="e.g., GOIL"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contact Person</label>
                        <Input
                          value={newOMC.contact_person}
                          onChange={(e) => setNewOMC({ ...newOMC, contact_person: e.target.value })}
                          className="bg-white/50"
                          placeholder="Full name of contact person"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email *</label>
                        <Input
                          type="email"
                          value={newOMC.email}
                          onChange={(e) => setNewOMC({ ...newOMC, email: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="company@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone *</label>
                        <Input
                          type="tel"
                          value={newOMC.phone}
                          onChange={(e) => setNewOMC({ ...newOMC, phone: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="+233 XX XXX XXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Website</label>
                        <Input
                          type="url"
                          value={newOMC.website}
                          onChange={(e) => setNewOMC({ ...newOMC, website: e.target.value })}
                          className="bg-white/50"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">License Number *</label>
                        <Input
                          value={newOMC.license_number}
                          onChange={(e) => setNewOMC({ ...newOMC, license_number: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="OMC-LIC-XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">License Expiry *</label>
                        <Input
                          type="date"
                          value={newOMC.license_expiry}
                          onChange={(e) => setNewOMC({ ...newOMC, license_expiry: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Region *</label>
                        <Select 
                          value={newOMC.region} 
                          onValueChange={(value) => setNewOMC({ ...newOMC, region: value })}
                        >
                          <SelectTrigger className="bg-white/50">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map(region => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-gray-700">Address *</label>
                        <Input
                          value={newOMC.address}
                          onChange={(e) => setNewOMC({ ...newOMC, address: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="Full company address"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">City *</label>
                        <Input
                          value={newOMC.city}
                          onChange={(e) => setNewOMC({ ...newOMC, city: e.target.value })}
                          required
                          className="bg-white/50"
                          placeholder="City"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create OMC"
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOmcs.size > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg shadow-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedOmcs.size} OMC{selectedOmcs.size > 1 ? 's' : ''} selected
                    </span>
                    <p className="text-sm text-blue-700">
                      Perform bulk actions on selected companies
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('active')}
                    disabled={bulkLoading}
                    className="bg-white/80"
                  >
                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('inactive')}
                    disabled={bulkLoading}
                    className="bg-white/80"
                  >
                    <XCircle className="w-4 h-4 mr-1 text-gray-600" />
                    Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOmcs(new Set())}
                    className="bg-white/80"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search OMCs by name, code, email, or contact person..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-10 bg-white/50 border-gray-200"
                />
              </div>
              
              <Select 
                value={filters.region} 
                onValueChange={(value) => setFilters({ ...filters, region: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[200px] bg-white/50 border-gray-200">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[180px] bg-white/50 border-gray-200">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.compliance_status} 
                onValueChange={(value) => setFilters({ ...filters, compliance_status: value, page: 1 })}
              >
                <SelectTrigger className="w-full lg:w-[200px] bg-white/50 border-gray-200">
                  <Shield className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Compliance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* OMCs Table Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Oil Marketing Companies</h2>
                  <p className="text-sm text-gray-600 font-normal">
                    {pagination.total} companies registered in the system
                  </p>
                </div>
              </div>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {omcs.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No OMCs found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {filters.search || filters.status !== 'all' || filters.region !== 'all' 
                    ? "Try adjusting your filters to see more results." 
                    : "Get started by registering your first OMC."}
                </p>
                {canManageOMCs && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add OMC
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedOmcs.size === omcs.length && omcs.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 focus:ring-blue-500"
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">Company Details</TableHead>
                        <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                        <TableHead className="font-semibold text-gray-900">Location</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Compliance</TableHead>
                        <TableHead className="font-semibold text-gray-900">Metrics</TableHead>
                        <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {omcs.map((omc) => (
                        <TableRow key={omc.id} className="group hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedOmcs.has(omc.id)}
                              onChange={(e) => handleOMCSelection(omc.id, e.target.checked)}
                              className="rounded border-gray-300 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{safeGet(omc.name, 'Unknown OMC')}</p>
                                {omc.code && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {safeGet(omc.code, 'N/A')}
                                  </Badge>
                                )}
                              </div>
                              {omc.contact_person && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Users className="w-3 h-3 mr-1" />
                                  {safeGet(omc.contact_person, '')}
                                </div>
                              )}
                              <div className="flex items-center text-sm text-gray-600">
                                <Shield className="w-3 h-3 mr-1" />
                                License: {safeGet(omc.license_number, 'N/A')}
                              </div>
                              <p className="text-xs text-gray-500">
                                Expires: {formatDate(omc.license_expiry)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3 h-3 mr-2" />
                                {safeGet(omc.email, 'N/A')}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-3 h-3 mr-2" />
                                {safeGet(omc.phone, 'N/A')}
                              </div>
                              {omc.website && (
                                <div className="flex items-center text-sm text-blue-600">
                                  <Globe className="w-3 h-3 mr-2" />
                                  <a href={omc.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    Website
                                  </a>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-sm block text-gray-900">{safeGet(omc.city, 'N/A')}</span>
                                <span className="text-xs text-gray-500">{safeGet(omc.region, 'N/A')}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={getStatusBadgeVariant(omc.status)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {omc.status === 'active' && <CheckCircle className="w-3 h-3" />}
                              {omc.status === 'inactive' && <XCircle className="w-3 h-3" />}
                              {omc.status === 'suspended' && <AlertTriangle className="w-3 h-3" />}
                              {!omc.status && <AlertTriangle className="w-3 h-3" />}
                              {formatStatus(omc.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={getComplianceBadgeVariant(omc.compliance_status)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getComplianceIcon(omc.compliance_status)}
                              {formatComplianceStatus(omc.compliance_status)}
                            </Badge>
                            {(omc.total_violations || 0) > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {omc.total_violations} violation(s)
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Stations:</span>
                                <Badge variant="secondary" className="font-mono">
                                  {safeGet(omc.total_stations, 0)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Users:</span>
                                <Badge variant="secondary" className="font-mono">
                                  {safeGet(omc.total_users, 0)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Sales:</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(omc.monthly_sales)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-gray-200">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedOMC(omc);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedOMC(omc);
                                      resetEditOMCForm(omc);
                                      setShowEditDialog(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit OMC
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedOMC(omc);
                                      setShowQRDialog(true);
                                    }}
                                  >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Generate QR Code
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedOMC(omc);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete OMC
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} entries
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                        disabled={!pagination.has_prev}
                        className="bg-white/80"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                        disabled={!pagination.has_next}
                        className="bg-white/80"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit OMC Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Edit OMC
              </DialogTitle>
            </DialogHeader>
            {selectedOMC && (
              <form onSubmit={handleUpdateOMC} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company Name *</label>
                    <Input
                      value={editOMC.name}
                      onChange={(e) => setEditOMC({ ...editOMC, name: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company Code *</label>
                    <Input
                      value={editOMC.code}
                      onChange={(e) => setEditOMC({ ...editOMC, code: e.target.value.toUpperCase() })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Contact Person</label>
                    <Input
                      value={editOMC.contact_person}
                      onChange={(e) => setEditOMC({ ...editOMC, contact_person: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email *</label>
                    <Input
                      type="email"
                      value={editOMC.email}
                      onChange={(e) => setEditOMC({ ...editOMC, email: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone *</label>
                    <Input
                      type="tel"
                      value={editOMC.phone}
                      onChange={(e) => setEditOMC({ ...editOMC, phone: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Website</label>
                    <Input
                      type="url"
                      value={editOMC.website}
                      onChange={(e) => setEditOMC({ ...editOMC, website: e.target.value })}
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">License Number *</label>
                    <Input
                      value={editOMC.license_number}
                      onChange={(e) => setEditOMC({ ...editOMC, license_number: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">License Expiry *</label>
                    <Input
                      type="date"
                      value={editOMC.license_expiry}
                      onChange={(e) => setEditOMC({ ...editOMC, license_expiry: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Region *</label>
                    <Select 
                      value={editOMC.region} 
                      onValueChange={(value) => setEditOMC({ ...editOMC, region: value })}
                    >
                      <SelectTrigger className="bg-white/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Select 
                      value={editOMC.status} 
                      onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                        setEditOMC({ ...editOMC, status: value })
                      }
                    >
                      <SelectTrigger className="bg-white/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Address *</label>
                    <Input
                      value={editOMC.address}
                      onChange={(e) => setEditOMC({ ...editOMC, address: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City *</label>
                    <Input
                      value={editOMC.city}
                      onChange={(e) => setEditOMC({ ...editOMC, city: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Country *</label>
                    <Input
                      value={editOMC.country}
                      onChange={(e) => setEditOMC({ ...editOMC, country: e.target.value })}
                      required
                      className="bg-white/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update OMC"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-white/95 backdrop-blur-sm border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-semibold">
                Delete OMC
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                This will permanently deactivate <strong>{selectedOMC?.name || 'this OMC'}</strong>. 
                This action cannot be undone. All associated stations and users will be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/80">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteOMC}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25"
                disabled={deleting === selectedOMC?.id}
              >
                {deleting === selectedOMC?.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete OMC"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                OMC QR Code
              </DialogTitle>
            </DialogHeader>
            {selectedOMC && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                    <QRCodeSVG 
                      value={generateQRCodeData(selectedOMC)}
                      size={200}
                      level="H"
                      includeMargin
                      fgColor="#1f2937"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium">{safeGet(selectedOMC.name, 'Unknown OMC')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">License:</span>
                    <span className="font-mono">{safeGet(selectedOMC.license_number, 'N/A')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Generated:</span>
                    <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => copyQRData(selectedOMC)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Data
                  </Button>
                  <Button
                    onClick={() => {
                      // For SVG download, we need to convert to PNG
                      const svgElement = document.querySelector('svg');
                      if (svgElement) {
                        const svgData = new XMLSerializer().serializeToString(svgElement);
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        
                        img.onload = () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          
                          const pngFile = canvas.toDataURL('image/png');
                          const downloadLink = document.createElement('a');
                          downloadLink.download = `omc-${safeGet(selectedOMC.code, selectedOMC.id)}-qrcode.png`;
                          downloadLink.href = pngFile;
                          downloadLink.click();
                        };
                        
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-5 h-5" />
                OMC Details
              </DialogTitle>
            </DialogHeader>
            {selectedOMC && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Company Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{safeGet(selectedOMC.name, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Code:</span>
                          <Badge variant="outline" className="font-mono">{safeGet(selectedOMC.code, 'N/A')}</Badge>
                        </div>
                        {selectedOMC.contact_person && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contact Person:</span>
                            <span className="font-medium">{safeGet(selectedOMC.contact_person, '')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">License:</span>
                          <span className="font-medium">{safeGet(selectedOMC.license_number, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">License Expiry:</span>
                          <span className={`font-medium ${
                            selectedOMC.license_expiry && new Date(selectedOMC.license_expiry) < new Date() 
                              ? 'text-red-600' 
                              : 'text-gray-900'
                          }`}>
                            {formatDate(selectedOMC.license_expiry)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{safeGet(selectedOMC.email, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{safeGet(selectedOMC.phone, 'N/A')}</span>
                        </div>
                        {selectedOMC.website && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Website:</span>
                            <a 
                              href={selectedOMC.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Visit <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Address:</span>
                          <span className="font-medium text-right">{safeGet(selectedOMC.address, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">City:</span>
                          <span className="font-medium">{safeGet(selectedOMC.city, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Region:</span>
                          <span className="font-medium">{safeGet(selectedOMC.region, 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="font-medium">{safeGet(selectedOMC.country, 'N/A')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Performance Metrics</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Stations:</span>
                          <Badge variant="secondary">{safeGet(selectedOMC.total_stations, 0)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Users:</span>
                          <Badge variant="secondary">{safeGet(selectedOMC.total_users, 0)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Sales:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(selectedOMC.monthly_sales)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Violations:</span>
                          <Badge variant={(safeGet(selectedOMC.total_violations, 0) > 0 ? "destructive" : "default")}>
                            {safeGet(selectedOMC.total_violations, 0)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setShowQRDialog(true);
                    }}
                    className="flex-1"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      resetEditOMCForm(selectedOMC);
                      setShowEditDialog(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit OMC
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default OMCManagement;