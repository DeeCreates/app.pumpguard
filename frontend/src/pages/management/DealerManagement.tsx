// src/pages/management/dealermanagement.tsx
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
import { Separator } from "../../components/ui/separator";
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  MapPin, 
  MoreVertical,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  Building,
  QrCode,
  Copy,
  ExternalLink,
  Shield,
  Activity,
  CreditCard,
  Target,
  Percent,
  DollarSign,
  Calendar,
  FileText,
  Fuel,
  Store,
  Map,
  Link,
  Unlink,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ExportButton } from "../../components/export-button";
import { useExport } from "../../hooks/use-export";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../contexts/AuthContext";

interface Dealer {
  id: string;
  name: string;
  code?: string;
  email: string;
  phone: string;
  contact_person: string;
  contact_phone?: string;
  address: string;
  city: string;
  region: string;
  country: string;
  status: 'active' | 'inactive' | 'suspended';
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  license_number?: string;
  license_expiry?: string;
  business_registration?: string;
  tax_identification?: string;
  total_stations: number;
  total_employees: number;
  monthly_volume: number;
  performance_rating: number;
  created_at: string;
  updated_at: string;
  omc_id?: string;
  commission_rate?: number;
  commission_type: 'percentage' | 'fixed';
  fixed_commission_amount?: number;
  is_active: boolean;
  
  // Related data
  omc?: {
    id: string;
    name: string;
    code: string;
  };
  stations?: Station[];
}

interface Station {
  id: string;
  name: string;
  code: string;
  dealer_id?: string;
  omc_id?: string;
  address: string;
  city: string;
  region: string;
  is_active: boolean;
  fuel_capacity: number;
  current_fuel_level: number;
  pumps_count: number;
  contact_person?: string;
  contact_phone?: string;
  dealers?: {
    id: string;
    name: string;
  };
  omcs?: {
    id: string;
    name: string;
    code: string;
  };
}

interface DealerFilters {
  search?: string;
  status?: string;
  region?: string;
  compliance_status?: string;
  omc_id?: string;
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

export function DealerManagement() {
  const { user } = useAuth();
  
  // State management
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [omcs, setOmcs] = useState<any[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [assigningStations, setAssigningStations] = useState(false);
  
  // Filters and search
  const [filters, setFilters] = useState<DealerFilters>({
    page: 1,
    limit: 50,
    search: "",
    status: "all",
    region: "all",
    compliance_status: "all",
    omc_id: "all"
  });
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showStationsDialog, setShowStationsDialog] = useState(false);
  const [showAssignStationsDialog, setShowAssignStationsDialog] = useState(false);
  
  // Selected items
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [selectedDealers, setSelectedDealers] = useState<Set<string>>(new Set());
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  
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

  // Regions data
  const regions = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Northern", "Upper East", "Upper West", "Brong Ahafo"
  ];

  // Form states
  const [newDealer, setNewDealer] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    contact_person: "",
    contact_phone: "",
    address: "",
    city: "",
    region: "",
    country: "Ghana",
    license_number: "",
    license_expiry: "",
    business_registration: "",
    tax_identification: "",
    omc_id: "no-omc",
    commission_rate: 0.08,
    commission_type: "percentage" as 'percentage' | 'fixed',
    fixed_commission_amount: 0,
    status: "active" as 'active',
    station_ids: [] as string[]
  });

  const [editDealer, setEditDealer] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    contact_person: "",
    contact_phone: "",
    address: "",
    city: "",
    region: "",
    country: "",
    license_number: "",
    license_expiry: "",
    business_registration: "",
    tax_identification: "",
    omc_id: "no-omc",
    commission_rate: 0.08,
    commission_type: "percentage" as 'percentage' | 'fixed',
    fixed_commission_amount: 0,
    status: "active" as 'active' | 'inactive' | 'suspended',
    station_ids: [] as string[]
  });

  // Permission-based access control
  const isAdmin = user?.role === 'admin';
  const isOMC = user?.role === 'omc';
  const canManageDealers = isAdmin || isOMC;
  
  // Filter dealers based on user role
  const getFilteredDealers = useCallback((dealers: Dealer[]) => {
    if (isAdmin) {
      return dealers;
    } else if (isOMC) {
      return dealers.filter(dealer => dealer.omc_id === user?.omc_id);
    }
    return [];
  }, [isAdmin, isOMC, user?.omc_id]);

  // Generate dealer code automatically
  const generateDealerCode = (dealerName: string): string => {
    // Extract first letters of each word in dealer name
    const initials = dealerName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3);
    
    // Generate random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    return `${initials}${randomNum}`;
  };

  // Enhanced data loading with error handling
  const loadDealers = useCallback(async () => {
    setLoading(true);
    try {
      const [dealersResponse, omcsResponse] = await Promise.all([
        api.getDealers({ is_active: true }),
        api.getOMCs({ is_active: true })
      ]);
      
      if (dealersResponse.success) {
        const dealersData = (Array.isArray(dealersResponse.data) ? dealersResponse.data : []) as Dealer[];
        const roleFilteredData = getFilteredDealers(dealersData);
        
        // Apply client-side filtering
        let filteredData = roleFilteredData;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredData = filteredData.filter(dealer => 
            dealer.name.toLowerCase().includes(searchLower) ||
            (dealer.code && dealer.code.toLowerCase().includes(searchLower)) ||
            dealer.email.toLowerCase().includes(searchLower) ||
            (dealer.contact_person && dealer.contact_person.toLowerCase().includes(searchLower))
          );
        }
        
        if (filters.status !== "all") {
          filteredData = filteredData.filter(dealer => 
            (filters.status === 'active' && dealer.is_active) ||
            (filters.status === 'inactive' && !dealer.is_active)
          );
        }
        
        if (filters.region !== "all") {
          filteredData = filteredData.filter(dealer => dealer.region === filters.region);
        }

        if (filters.omc_id !== "all") {
          filteredData = filteredData.filter(dealer => dealer.omc_id === filters.omc_id);
        }
        
        setDealers(filteredData);
        setPagination(prev => ({
          ...prev,
          total: filteredData.length,
          total_pages: Math.ceil(filteredData.length / filters.limit!)
        }));
      } else {
        toast.error("Failed to load dealers", {
          description: dealersResponse.error || "Please check your connection and try again."
        });
        setDealers([]);
      }

      // Load OMCs for association
      if (omcsResponse.success && Array.isArray(omcsResponse.data)) {
        if (isOMC && user?.omc_id) {
          const userOmc = omcsResponse.data.find(omc => omc.id === user.omc_id);
          setOmcs(userOmc ? [userOmc] : []);
        } else {
          setOmcs(omcsResponse.data);
        }
      } else {
        setOmcs([]);
      }

      // Load stations for assignment - with error handling for station fetch
      try {
        const stationsResponse = await api.getStations();
        if (stationsResponse.success && Array.isArray(stationsResponse.data)) {
          const stationsData = stationsResponse.data as Station[];
          
          // Filter stations based on user role
          let filteredStations = stationsData;
          if (isOMC && user?.omc_id) {
            filteredStations = stationsData.filter(station => station.omc_id === user.omc_id);
          }
          
          setStations(filteredStations);
          setAvailableStations(filteredStations.filter(station => !station.dealer_id));
        } else {
          setStations([]);
          setAvailableStations([]);
        }
      } catch (stationError) {
        console.warn("Stations fetch failed, continuing without station data:", stationError);
        setStations([]);
        setAvailableStations([]);
      }

    } catch (error: any) {
      console.error("Failed to load dealers:", error);
      toast.error("Failed to load dealers", {
        description: "Please check your connection and try again."
      });
      setDealers([]);
      setOmcs([]);
      setStations([]);
      setAvailableStations([]);
    } finally {
      setLoading(false);
    }
  }, [filters, getFilteredDealers, isOMC, user?.omc_id]);

  // Load dealer stations with error handling
  const loadDealerStations = async (dealerId: string) => {
    if (!dealerId) return;
    
    setLoadingStations(true);
    try {
      const response = await api.getDealerStations(dealerId);
      if (response.success && Array.isArray(response.data)) {
        setSelectedDealer(prev => prev ? { ...prev, stations: response.data } : null);
      }
    } catch (error) {
      console.warn("Failed to load dealer stations:", error);
      // Continue without station data
    } finally {
      setLoadingStations(false);
    }
  };

  // Load available stations for assignment with error handling
  const loadAvailableStations = async () => {
    try {
      const response = await api.getStations();
      if (response.success && Array.isArray(response.data)) {
        let filteredStations = response.data as Station[];
        
        // Filter based on user role
        if (isOMC && user?.omc_id) {
          filteredStations = filteredStations.filter(station => station.omc_id === user.omc_id);
        }
        
        // Filter out stations already assigned to the current dealer
        const available = filteredStations.filter(station => 
          !station.dealer_id || station.dealer_id === selectedDealer?.id
        );
        
        setAvailableStations(available);
      }
    } catch (error) {
      console.warn("Failed to load available stations:", error);
      setAvailableStations([]);
    }
  };

  // Auto-generate dealer code when dealer name changes in create form
  useEffect(() => {
    if (newDealer.name && !newDealer.code && showCreateDialog) {
      const generatedCode = generateDealerCode(newDealer.name);
      setNewDealer(prev => ({ ...prev, code: generatedCode }));
    }
  }, [newDealer.name, showCreateDialog]);

  // Enhanced Dealer creation with validation
  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Validate required fields
      if (!newDealer.name || !newDealer.email || !newDealer.contact_person) {
        toast.error("Missing required fields", {
          description: "Name, Email, and Contact Person are required"
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newDealer.email)) {
        toast.error("Invalid email format", {
          description: "Please enter a valid email address"
        });
        return;
      }

      // Auto-generate code if not provided
      const dealerCode = newDealer.code || generateDealerCode(newDealer.name);

      // Prepare dealer data for API
      const dealerData: any = {
        name: newDealer.name,
        code: dealerCode,
        contact_person: newDealer.contact_person,
        email: newDealer.email,
        phone: newDealer.phone,
        address: newDealer.address,
        city: newDealer.city,
        region: newDealer.region,
        country: newDealer.country,
        license_number: newDealer.license_number || undefined,
        license_expiry: newDealer.license_expiry || undefined,
        business_registration: newDealer.business_registration || undefined,
        tax_identification: newDealer.tax_identification || undefined,
        commission_rate: newDealer.commission_rate,
        commission_type: newDealer.commission_type,
        fixed_commission_amount: newDealer.fixed_commission_amount,
      };

      // Handle OMC assignment
      if (newDealer.omc_id !== "no-omc") {
        dealerData.omc_id = newDealer.omc_id;
      }

      // If user is OMC, auto-assign their OMC
      if (isOMC && user?.omc_id) {
        dealerData.omc_id = user.omc_id;
      }

      // Handle station assignments
      if (newDealer.station_ids.length > 0) {
        dealerData.station_ids = newDealer.station_ids;
      }

      const result = await api.createDealer(dealerData);

      if (result.success) {
        toast.success("Dealer created successfully", {
          description: `${newDealer.name} has been registered in the system with code: ${dealerCode}.`
        });
        
        await loadDealers();
        setShowCreateDialog(false);
        resetNewDealerForm();
      } else {
        toast.error("Failed to create dealer", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to create dealer", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setCreating(false);
    }
  };

  // Enhanced Dealer update
  const handleUpdateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;

    setUpdating(true);
    try {
      // Prepare dealer data for API
      const dealerData: any = {
        name: editDealer.name,
        code: editDealer.code || undefined,
        contact_person: editDealer.contact_person,
        email: editDealer.email,
        phone: editDealer.phone,
        address: editDealer.address,
        city: editDealer.city,
        region: editDealer.region,
        country: editDealer.country,
        license_number: editDealer.license_number || undefined,
        license_expiry: editDealer.license_expiry || undefined,
        business_registration: editDealer.business_registration || undefined,
        tax_identification: editDealer.tax_identification || undefined,
        commission_rate: editDealer.commission_rate,
        commission_type: editDealer.commission_type,
        fixed_commission_amount: editDealer.fixed_commission_amount,
        is_active: editDealer.status === 'active'
      };

      // Handle OMC assignment
      if (editDealer.omc_id !== "no-omc") {
        dealerData.omc_id = editDealer.omc_id;
      }

      // If user is OMC, auto-assign their OMC
      if (isOMC && user?.omc_id) {
        dealerData.omc_id = user.omc_id;
      }

      // Handle station assignments
      if (editDealer.station_ids.length > 0) {
        dealerData.station_ids = editDealer.station_ids;
      }

      const result = await api.updateDealer(selectedDealer.id, dealerData);

      if (result.success) {
        toast.success("Dealer updated successfully", {
          description: `${editDealer.name}'s information has been updated.`
        });
        
        await loadDealers();
        setShowEditDialog(false);
        setSelectedDealer(null);
      } else {
        toast.error("Failed to update dealer", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to update dealer", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setUpdating(false);
    }
  };

  // Enhanced station assignment
  const handleAssignStations = async () => {
    if (!selectedDealer || selectedStations.size === 0) return;

    setAssigningStations(true);
    try {
      const stationIds = Array.from(selectedStations);
      const result = await api.updateDealer(selectedDealer.id, {
        station_ids: stationIds
      });

      if (result.success) {
        toast.success("Stations assigned successfully", {
          description: `${stationIds.length} station(s) assigned to ${selectedDealer.name}.`
        });
        
        await loadDealers();
        await loadDealerStations(selectedDealer.id);
        setShowAssignStationsDialog(false);
        setSelectedStations(new Set());
      } else {
        toast.error("Failed to assign stations", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to assign stations", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setAssigningStations(false);
    }
  };

  // Enhanced Dealer deletion with dependency checks
  const handleDeleteDealer = async () => {
    if (!selectedDealer) return;

    setDeleting(selectedDealer.id);
    try {
      const result = await api.deleteDealer(selectedDealer.id);
      
      if (result.success) {
        toast.success("Dealer deleted successfully", {
          description: `${selectedDealer.name} has been deactivated.`
        });
        await loadDealers();
        setShowDeleteDialog(false);
        setSelectedDealer(null);
      } else {
        toast.error("Failed to delete dealer", {
          description: result.error || "Please try again later."
        });
      }
    } catch (error: any) {
      toast.error("Failed to delete dealer", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setDeleting(null);
    }
  };

  // Handle bulk operations
  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    if (selectedDealers.size === 0) return;

    setBulkLoading(true);
    try {
      const updates = Array.from(selectedDealers).map(dealerId => 
        api.updateDealer(dealerId, { is_active: status === 'active' })
      );

      const results = await Promise.allSettled(updates);
      const successful = results.filter(result => result.status === 'fulfilled').length;

      toast.success("Bulk update completed", {
        description: `Updated ${successful} dealers to ${status} status.`
      });
      
      setSelectedDealers(new Set());
      await loadDealers();
    } catch (error: any) {
      toast.error("Bulk update failed", {
        description: error.message || "Please try again later."
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Enhanced export functionality
  const handleExportDealers = async (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = dealers.map(dealer => ({
      'Dealer Name': dealer.name,
      'Code': dealer.code || 'N/A',
      'Contact Person': dealer.contact_person,
      'Email': dealer.email,
      'Phone': dealer.phone,
      'Region': dealer.region,
      'OMC': dealer.omc?.name || 'N/A',
      'Status': dealer.is_active ? 'Active' : 'Inactive',
      'Total Stations': dealer.total_stations || 0,
      'Monthly Volume (L)': dealer.monthly_volume?.toLocaleString() || '0',
      'Performance Rating': dealer.performance_rating || 'N/A',
      'License Number': dealer.license_number || 'N/A',
      'Business Registration': dealer.business_registration || 'N/A',
      'Tax ID': dealer.tax_identification || 'N/A',
      'Commission Type': dealer.commission_type === 'percentage' ? 'Percentage' : 'Fixed',
      'Commission Rate': dealer.commission_type === 'percentage' 
        ? `${((dealer.commission_rate || 0) * 100).toFixed(1)}%`
        : `GHS ${(dealer.fixed_commission_amount || 0).toFixed(2)}/L`
    }));

    await exportData(exportData, `dealers-export-${new Date().toISOString().split('T')[0]}`, format);
  };

  // Handle QR code generation
  const generateQRCodeData = (dealer: Dealer) => {
    return JSON.stringify({
      type: 'dealer',
      id: dealer.id,
      name: dealer.name,
      code: dealer.code,
      license: dealer.license_number,
      contact: dealer.contact_person,
      verification_url: `${window.location.origin}/verify/dealer/${dealer.id}`
    }, null, 2);
  };

  const copyQRData = async (dealer: Dealer) => {
    try {
      await navigator.clipboard.writeText(generateQRCodeData(dealer));
      toast.success("QR data copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy QR data");
    }
  };

  // Handle dealer selection
  const handleDealerSelection = (dealerId: string, checked: boolean) => {
    const newSelected = new Set(selectedDealers);
    if (checked) {
      newSelected.add(dealerId);
    } else {
      newSelected.delete(dealerId);
    }
    setSelectedDealers(newSelected);
  };

  // Handle station selection for assignment
  const handleStationAssignmentSelection = (stationId: string, checked: boolean) => {
    const newSelected = new Set(selectedStations);
    if (checked) {
      newSelected.add(stationId);
    } else {
      newSelected.delete(stationId);
    }
    setSelectedStations(newSelected);
  };

  // Handle select all stations
  const handleSelectAllStations = (checked: boolean) => {
    if (checked) {
      setSelectedStations(new Set(availableStations.map(station => station.id)));
    } else {
      setSelectedStations(new Set());
    }
  };

  // Handle select all dealers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDealers(new Set(dealers.map(dealer => dealer.id)));
    } else {
      setSelectedDealers(new Set());
    }
  };

  // Handle station selection in forms
  const handleStationSelection = (stationId: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditDealer(prev => {
        const newStationIds = prev.station_ids.includes(stationId)
          ? prev.station_ids.filter(id => id !== stationId)
          : [...prev.station_ids, stationId];
        return { ...prev, station_ids: newStationIds };
      });
    } else {
      setNewDealer(prev => {
        const newStationIds = prev.station_ids.includes(stationId)
          ? prev.station_ids.filter(id => id !== stationId)
          : [...prev.station_ids, stationId];
        return { ...prev, station_ids: newStationIds };
      });
    }
  };

  // Reset forms
  const resetNewDealerForm = () => {
    setNewDealer({
      name: "",
      code: "",
      email: "",
      phone: "",
      contact_person: "",
      contact_phone: "",
      address: "",
      city: "",
      region: "",
      country: "Ghana",
      license_number: "",
      license_expiry: "",
      business_registration: "",
      tax_identification: "",
      omc_id: isOMC ? (user?.omc_id || "no-omc") : "no-omc",
      commission_rate: 0.08,
      commission_type: "percentage",
      fixed_commission_amount: 0,
      status: "active",
      station_ids: []
    });
  };

  const resetEditDealerForm = (dealer: Dealer) => {
    setEditDealer({
      name: dealer.name,
      code: dealer.code || "",
      email: dealer.email,
      phone: dealer.phone,
      contact_person: dealer.contact_person,
      contact_phone: dealer.contact_phone || "",
      address: dealer.address,
      city: dealer.city,
      region: dealer.region,
      country: dealer.country,
      license_number: dealer.license_number || "",
      license_expiry: dealer.license_expiry ? dealer.license_expiry.split('T')[0] : "",
      business_registration: dealer.business_registration || "",
      tax_identification: dealer.tax_identification || "",
      omc_id: dealer.omc_id || "no-omc",
      commission_rate: dealer.commission_rate || 0.08,
      commission_type: dealer.commission_type || "percentage",
      fixed_commission_amount: dealer.fixed_commission_amount || 0,
      status: dealer.is_active ? 'active' : 'inactive',
      station_ids: dealer.stations?.map(station => station.id) || []
    });
  };

  // Initialize station assignment
  const initializeStationAssignment = async (dealer: Dealer) => {
    setSelectedDealer(dealer);
    await loadAvailableStations();
    // Pre-select stations already assigned to this dealer
    const assignedStationIds = dealer.stations?.map(station => station.id) || [];
    setSelectedStations(new Set(assignedStationIds));
    setShowAssignStationsDialog(true);
  };

  // Utility functions
  const getStatusBadgeVariant = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive"
    };
    return variants[status] || "default";
  };

  const getComplianceBadgeVariant = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      compliant: "default",
      non_compliant: "destructive",
      under_review: "outline"
    };
    return variants[status] || "default";
  };

  const getComplianceIcon = (status: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      compliant: <CheckCircle className="w-3 h-3" />,
      non_compliant: <XCircle className="w-3 h-3" />,
      under_review: <AlertTriangle className="w-3 h-3" />
    };
    return icons[status] || <CheckCircle className="w-3 h-3" />;
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4.0) return "text-blue-600";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-GH').format(volume);
  };

  const formatCommissionRate = (dealer: Dealer) => {
    if (dealer.commission_type === 'percentage') {
      return `${((dealer.commission_rate || 0) * 100).toFixed(1)}%`;
    } else {
      return `GHS ${(dealer.fixed_commission_amount || 0).toFixed(2)}/L`;
    }
  };

  const handleCommissionTypeChange = (type: 'percentage' | 'fixed', isEdit: boolean = false) => {
    if (isEdit) {
      setEditDealer(prev => ({
        ...prev,
        commission_type: type,
        commission_rate: type === 'percentage' ? prev.commission_rate : 0,
        fixed_commission_amount: type === 'fixed' ? prev.fixed_commission_amount : 0
      }));
    } else {
      setNewDealer(prev => ({
        ...prev,
        commission_type: type,
        commission_rate: type === 'percentage' ? prev.commission_rate : 0,
        fixed_commission_amount: type === 'fixed' ? prev.fixed_commission_amount : 0
      }));
    }
  };

  // Load data when filters change
  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  if (loading && dealers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading dealers...</p>
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
              Dealer Management
            </h1>
            <p className="text-gray-600 mt-1">
              {isOMC ? "Managing your OMC's dealers" : "Managing all fuel dealers"} • {pagination.total} dealers
              {selectedDealers.size > 0 && ` • ${selectedDealers.size} selected`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {selectedDealers.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/80 backdrop-blur-sm">
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Bulk Actions ({selectedDealers.size})
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button 
              variant="outline"
              onClick={() => loadDealers()}
              disabled={loading}
              className="bg-white/80 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <ExportButton
              onExport={handleExportDealers}
              isExporting={isExporting}
              dataLength={dealers.length}
            />

            {canManageDealers && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dealer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                      Register New Dealer
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateDealer} className="space-y-6">
                    
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Dealer Name *</label>
                          <Input
                            value={newDealer.name}
                            onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="Enter dealer company name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Dealer Code
                            <span className="text-xs text-gray-500 ml-1">(Auto-generated, editable)</span>
                          </label>
                          <div className="relative">
                            <Input
                              value={newDealer.code}
                              onChange={(e) => setNewDealer({ ...newDealer, code: e.target.value.toUpperCase() })}
                              className="bg-white/50 pr-10"
                              placeholder="Code will auto-generate"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => {
                                if (newDealer.name) {
                                  const newCode = generateDealerCode(newDealer.name);
                                  setNewDealer(prev => ({ ...prev, code: newCode }));
                                  toast.success("Dealer code regenerated");
                                }
                              }}
                              disabled={!newDealer.name}
                            >
                              <Sparkles className="w-4 h-4 text-blue-600" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            Code will auto-generate when you enter dealer name. You can edit it if needed.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Contact Person *</label>
                          <Input
                            value={newDealer.contact_person}
                            onChange={(e) => setNewDealer({ ...newDealer, contact_person: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="Full name of contact person"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Contact Phone *</label>
                          <Input
                            type="tel"
                            value={newDealer.contact_phone}
                            onChange={(e) => setNewDealer({ ...newDealer, contact_phone: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="+233 XX XXX XXXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Email *</label>
                          <Input
                            type="email"
                            value={newDealer.email}
                            onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="dealer@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Phone *</label>
                          <Input
                            type="tel"
                            value={newDealer.phone}
                            onChange={(e) => setNewDealer({ ...newDealer, phone: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="+233 XX XXX XXXX"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Details Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">Business Details</h3>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Business Registration</label>
                          <Input
                            value={newDealer.business_registration}
                            onChange={(e) => setNewDealer({ ...newDealer, business_registration: e.target.value })}
                            className="bg-white/50"
                            placeholder="Company registration number"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Tax ID</label>
                          <Input
                            value={newDealer.tax_identification}
                            onChange={(e) => setNewDealer({ ...newDealer, tax_identification: e.target.value })}
                            className="bg-white/50"
                            placeholder="Tax Identification Number"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">License Number</label>
                          <Input
                            value={newDealer.license_number}
                            onChange={(e) => setNewDealer({ ...newDealer, license_number: e.target.value })}
                            className="bg-white/50"
                            placeholder="DLR-LIC-XXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">License Expiry</label>
                          <Input
                            type="date"
                            value={newDealer.license_expiry}
                            onChange={(e) => setNewDealer({ ...newDealer, license_expiry: e.target.value })}
                            className="bg-white/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Commission Settings Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">Commission Settings</h3>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Commission Type</label>
                          <Select 
                            value={newDealer.commission_type} 
                            onValueChange={(value: 'percentage' | 'fixed') => 
                              handleCommissionTypeChange(value, false)
                            }
                          >
                            <SelectTrigger className="bg-white/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount (GHS/L)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {newDealer.commission_type === 'percentage' ? 'Commission Rate (%)' : 'Fixed Amount (GHS/L)'}
                          </label>
                          <div className="relative">
                            {newDealer.commission_type === 'percentage' ? (
                              <>
                                <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={newDealer.commission_rate ? newDealer.commission_rate * 100 : ''}
                                  onChange={(e) => setNewDealer({ 
                                    ...newDealer, 
                                    commission_rate: parseFloat(e.target.value) / 100 || 0 
                                  })}
                                  className="bg-white/50 pl-10"
                                  placeholder="8.0"
                                />
                              </>
                            ) : (
                              <>
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newDealer.fixed_commission_amount || ''}
                                  onChange={(e) => setNewDealer({ 
                                    ...newDealer, 
                                    fixed_commission_amount: parseFloat(e.target.value) || 0 
                                  })}
                                  className="bg-white/50 pl-10"
                                  placeholder="0.50"
                                />
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {newDealer.commission_type === 'percentage' 
                              ? "Percentage of sales volume" 
                              : "Fixed amount per liter sold"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isAdmin && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Associated OMC</label>
                            <Select 
                              value={newDealer.omc_id} 
                              onValueChange={(value) => setNewDealer({ ...newDealer, omc_id: value })}
                            >
                              <SelectTrigger className="bg-white/50">
                                <SelectValue placeholder="Select OMC (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-omc">No OMC</SelectItem>
                                {omcs.map(omc => (
                                  <SelectItem key={omc.id} value={omc.id}>
                                    {omc.name} ({omc.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Region *</label>
                          <Select 
                            value={newDealer.region} 
                            onValueChange={(value) => setNewDealer({ ...newDealer, region: value })}
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
                            value={newDealer.address}
                            onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="Full business address"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">City *</label>
                          <Input
                            value={newDealer.city}
                            onChange={(e) => setNewDealer({ ...newDealer, city: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Country *</label>
                          <Input
                            value={newDealer.country}
                            onChange={(e) => setNewDealer({ ...newDealer, country: e.target.value })}
                            required
                            className="bg-white/50"
                            placeholder="Country"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Station Assignment Section - Only show if stations are available */}
                    {stations.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Fuel className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-medium text-gray-900">Station Assignment</h3>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">
                            Assign existing stations to this dealer ({stations.length} stations available)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                            {stations.map((station) => (
                              <div key={station.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  id={`station-${station.id}`}
                                  checked={newDealer.station_ids.includes(station.id)}
                                  onChange={() => handleStationSelection(station.id, false)}
                                  className="rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor={`station-${station.id}`} className="flex-1 cursor-pointer">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{station.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {station.code}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {station.city}, {station.region}
                                    {station.omcs && (
                                      <span> • {station.omcs.name}</span>
                                    )}
                                  </div>
                                  {station.dealer_id && (
                                    <div className="text-xs text-orange-600">
                                      Currently assigned to another dealer
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                          {newDealer.station_ids.length > 0 && (
                            <p className="text-sm text-green-600">
                              {newDealer.station_ids.length} station(s) selected
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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
                          "Register Dealer"
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

        {/* Role-based Access Notice */}
        {isOMC && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    OMC Management View
                  </p>
                  <p className="text-sm text-blue-700">
                    You are managing dealers and stations associated with your OMC only
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions Bar */}
        {selectedDealers.size > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg shadow-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedDealers.size} dealer{selectedDealers.size > 1 ? 's' : ''} selected
                    </span>
                    <p className="text-sm text-blue-700">
                      Perform bulk actions on selected dealers
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
                    onClick={() => setSelectedDealers(new Set())}
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
                  placeholder="Search dealers by name, code, or contact..."
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
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select 
                  value={filters.omc_id} 
                  onValueChange={(value) => setFilters({ ...filters, omc_id: value, page: 1 })}
                >
                  <SelectTrigger className="w-full lg:w-[200px] bg-white/50 border-gray-200">
                    <Building className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All OMCs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All OMCs</SelectItem>
                    {omcs.map(omc => (
                      <SelectItem key={omc.id} value={omc.id}>
                        {omc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dealers Table Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isOMC ? "Your OMC Dealers" : "All Fuel Dealers"}
                  </h2>
                  <p className="text-sm text-gray-600 font-normal">
                    {pagination.total} dealers registered in the system
                  </p>
                </div>
              </div>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dealers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No dealers found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {filters.search || filters.status !== 'all' || filters.region !== 'all' 
                    ? "Try adjusting your filters to see more results." 
                    : "Get started by registering your first dealer."}
                </p>
                {canManageDealers && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Dealer
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
                            checked={selectedDealers.size === dealers.length && dealers.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 focus:ring-blue-500"
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">Dealer Details</TableHead>
                        <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                        <TableHead className="font-semibold text-gray-900">Location & OMC</TableHead>
                        <TableHead className="font-semibold text-gray-900">Commission</TableHead>
                        <TableHead className="font-semibold text-gray-900">Stations</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Performance</TableHead>
                        <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dealers.map((dealer) => (
                        <TableRow key={dealer.id} className="group hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedDealers.has(dealer.id)}
                              onChange={(e) => handleDealerSelection(dealer.id, e.target.checked)}
                              className="rounded border-gray-300 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{dealer.name}</p>
                                {dealer.code && (
                                  <Badge variant="outline" className="text-xs font-mono bg-blue-50">
                                    {dealer.code}
                                  </Badge>
                                )}
                              </div>
                              {dealer.business_registration && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Reg: {dealer.business_registration}
                                </div>
                              )}
                              {dealer.license_number && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Shield className="w-3 h-3 mr-1" />
                                  License: {dealer.license_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <User className="w-3 h-3 mr-2" />
                                {dealer.contact_person}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-3 h-3 mr-2" />
                                {dealer.phone}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3 h-3 mr-2" />
                                {dealer.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <div>
                                  <span className="text-sm block text-gray-900">{dealer.city}</span>
                                  <span className="text-xs text-gray-500">{dealer.region}</span>
                                </div>
                              </div>
                              {dealer.omc && (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <Building className="w-3 h-3" />
                                  {dealer.omc.name}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge 
                                variant="outline" 
                                className="flex items-center gap-1 w-fit text-green-600 border-green-200"
                              >
                                <Target className="w-3 h-3" />
                                {formatCommissionRate(dealer)}
                              </Badge>
                              <div className="text-xs text-gray-500 capitalize">
                                {dealer.commission_type} based
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="font-mono">
                                  {dealer.total_stations || 0}
                                </Badge>
                                {canManageDealers && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => initializeStationAssignment(dealer)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Link className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              {dealer.total_stations > 0 && (
                                <div className="text-xs text-gray-500">
                                  Click to manage stations
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={getStatusBadgeVariant(dealer.is_active ? 'active' : 'inactive')}
                              className="flex items-center gap-1 w-fit"
                            >
                              {dealer.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {dealer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Volume:</span>
                                <span className="font-semibold text-blue-600">
                                  {formatVolume(dealer.monthly_volume || 0)}L
                                </span>
                              </div>
                              {dealer.performance_rating && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Rating:</span>
                                  <span className={`font-semibold ${getPerformanceColor(dealer.performance_rating)}`}>
                                    {dealer.performance_rating}/5
                                  </span>
                                </div>
                              )}
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
                                      setSelectedDealer(dealer);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {canManageDealers && (
                                    <>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedDealer(dealer);
                                          resetEditDealerForm(dealer);
                                          setShowEditDialog(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Dealer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => initializeStationAssignment(dealer)}
                                      >
                                        <Link className="w-4 h-4 mr-2" />
                                        Manage Stations
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedDealer(dealer);
                                          setShowQRDialog(true);
                                        }}
                                      >
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Generate QR Code
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedDealer(dealer);
                                          setShowDeleteDialog(true);
                                        }}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Dealer
                                      </DropdownMenuItem>
                                    </>
                                  )}
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

        {/* Assign Stations Dialog */}
        {canManageDealers && (
          <Dialog open={showAssignStationsDialog} onOpenChange={setShowAssignStationsDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  Manage Station Assignment
                </DialogTitle>
              </DialogHeader>
              {selectedDealer && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">{selectedDealer.name}</h3>
                        <p className="text-sm text-blue-700">
                          Assign or unassign stations to this dealer
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {selectedStations.size} stations selected
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Available Stations</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStations.size === availableStations.length && availableStations.length > 0}
                          onChange={(e) => handleSelectAllStations(e.target.checked)}
                          className="rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Select all</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                      {availableStations.length === 0 ? (
                        <div className="col-span-2 text-center py-8">
                          <Store className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500">No stations available for assignment</p>
                        </div>
                      ) : (
                        availableStations.map((station) => (
                          <div key={station.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                            <input
                              type="checkbox"
                              id={`assign-station-${station.id}`}
                              checked={selectedStations.has(station.id)}
                              onChange={(e) => handleStationAssignmentSelection(station.id, e.target.checked)}
                              className="rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor={`assign-station-${station.id}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-sm font-medium block">{station.name}</span>
                                  <span className="text-xs text-gray-500 block">{station.code}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {station.region}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {station.city} • {station.omcs?.name || 'No OMC'}
                              </div>
                              {station.dealer_id && station.dealer_id !== selectedDealer.id && (
                                <div className="text-xs text-orange-600 mt-1">
                                  Currently assigned to another dealer
                                </div>
                              )}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleAssignStations}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                      disabled={assigningStations || selectedStations.size === 0}
                    >
                      {assigningStations ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Assign {selectedStations.size} Station(s)
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAssignStationsDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dealer Dialog - Similar structure to Create Dialog but with edit data */}
        {canManageDealers && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Edit Dealer - {selectedDealer?.name}
                </DialogTitle>
              </DialogHeader>
              {selectedDealer && (
                <form onSubmit={handleUpdateDealer} className="space-y-6">
                  {/* Similar form structure as create dialog but with editDealer state */}
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Dealer Name *</label>
                        <Input
                          value={editDealer.name}
                          onChange={(e) => setEditDealer({ ...editDealer, name: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Dealer Code</label>
                        <div className="relative">
                          <Input
                            value={editDealer.code}
                            onChange={(e) => setEditDealer({ ...editDealer, code: e.target.value.toUpperCase() })}
                            className="bg-white/50 pr-10"
                            placeholder="Enter dealer code"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => {
                              const newCode = generateDealerCode(editDealer.name);
                              setEditDealer(prev => ({ ...prev, code: newCode }));
                              toast.success("Dealer code regenerated");
                            }}
                            disabled={!editDealer.name}
                          >
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contact Person *</label>
                        <Input
                          value={editDealer.contact_person}
                          onChange={(e) => setEditDealer({ ...editDealer, contact_person: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contact Phone *</label>
                        <Input
                          type="tel"
                          value={editDealer.contact_phone}
                          onChange={(e) => setEditDealer({ ...editDealer, contact_phone: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email *</label>
                        <Input
                          type="email"
                          value={editDealer.email}
                          onChange={(e) => setEditDealer({ ...editDealer, email: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone *</label>
                        <Input
                          type="tel"
                          value={editDealer.phone}
                          onChange={(e) => setEditDealer({ ...editDealer, phone: e.target.value })}
                          required
                          className="bg-white/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-gray-900">Status</h3>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <Select 
                          value={editDealer.status} 
                          onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                            setEditDealer({ ...editDealer, status: value })
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
                        "Update Dealer"
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
        )}

        {/* Delete Confirmation Dialog */}
        {canManageDealers && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="bg-white/95 backdrop-blur-sm border-gray-200">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-semibold">
                  Delete Dealer
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  This will permanently deactivate <strong>{selectedDealer?.name}</strong>. 
                  This action cannot be undone. All associated stations will be unassigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/80">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteDealer}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25"
                  disabled={deleting === selectedDealer?.id}
                >
                  {deleting === selectedDealer?.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Dealer"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Dealer QR Code
              </DialogTitle>
            </DialogHeader>
            {selectedDealer && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                    <QRCodeSVG 
                      value={generateQRCodeData(selectedDealer)}
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
                    <span className="text-gray-600">Dealer:</span>
                    <span className="font-medium">{selectedDealer.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Contact:</span>
                    <span className="font-medium">{selectedDealer.contact_person}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">License:</span>
                    <span className="font-mono">{selectedDealer.license_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Generated:</span>
                    <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => copyQRData(selectedDealer)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Data
                  </Button>
                  <Button
                    onClick={() => {
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
                          downloadLink.download = `dealer-${selectedDealer.code || selectedDealer.id}-qrcode.png`;
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
                <User className="w-5 h-5" />
                Dealer Details
              </DialogTitle>
            </DialogHeader>
            {selectedDealer && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Business Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{selectedDealer.name}</span>
                        </div>
                        {selectedDealer.code && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Code:</span>
                            <Badge variant="outline" className="font-mono">{selectedDealer.code}</Badge>
                          </div>
                        )}
                        {selectedDealer.business_registration && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Business Reg:</span>
                            <span className="font-medium">{selectedDealer.business_registration}</span>
                          </div>
                        )}
                        {selectedDealer.tax_identification && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax ID:</span>
                            <span className="font-medium">{selectedDealer.tax_identification}</span>
                          </div>
                        )}
                        {selectedDealer.license_number && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">License:</span>
                            <span className="font-medium">{selectedDealer.license_number}</span>
                          </div>
                        )}
                        {selectedDealer.license_expiry && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">License Expiry:</span>
                            <span className={`font-medium ${
                              new Date(selectedDealer.license_expiry) < new Date() 
                                ? 'text-red-600' 
                                : 'text-gray-900'
                            }`}>
                              {new Date(selectedDealer.license_expiry).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Commission:</span>
                          <span className="font-medium text-green-600">
                            {formatCommissionRate(selectedDealer)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Commission Type:</span>
                          <span className="font-medium capitalize">
                            {selectedDealer.commission_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contact Person:</span>
                          <span className="font-medium">{selectedDealer.contact_person}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contact Phone:</span>
                          <span className="font-medium">{selectedDealer.contact_phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Business Email:</span>
                          <span className="font-medium">{selectedDealer.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Business Phone:</span>
                          <span className="font-medium">{selectedDealer.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Address:</span>
                          <span className="font-medium text-right">{selectedDealer.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">City:</span>
                          <span className="font-medium">{selectedDealer.city}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Region:</span>
                          <span className="font-medium">{selectedDealer.region}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="font-medium">{selectedDealer.country}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Performance Metrics</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Stations:</span>
                          <Badge variant="secondary">{selectedDealer.total_stations || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Employees:</span>
                          <Badge variant="secondary">{selectedDealer.total_employees || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Volume:</span>
                          <span className="font-semibold text-blue-600">
                            {formatVolume(selectedDealer.monthly_volume || 0)} Liters
                          </span>
                        </div>
                        {selectedDealer.performance_rating && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Performance Rating:</span>
                            <span className={`font-semibold ${getPerformanceColor(selectedDealer.performance_rating)}`}>
                              {selectedDealer.performance_rating}/5 ⭐
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDealer.omc && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Associated OMC</h3>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <Building className="w-4 h-4 text-gray-600" />
                          <div>
                            <span className="font-medium">{selectedDealer.omc.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({selectedDealer.omc.code})</span>
                          </div>
                        </div>
                      </div>
                    )}
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
                  {canManageDealers && (
                    <>
                      <Button
                        onClick={() => initializeStationAssignment(selectedDealer)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Manage Stations
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDetailsDialog(false);
                          resetEditDealerForm(selectedDealer);
                          setShowEditDialog(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Dealer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default DealerManagement;