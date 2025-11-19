import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  DropdownMenuSeparator,
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
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Fuel, 
  MapPin, 
  MoreVertical, 
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  X,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { api } from "../../lib/api";

interface Station {
  id: string;
  name: string;
  code: string;
  address: string;
  location: string;
  city?: string;
  region: string;
  omc_id?: string;
  omc_name?: string;
  dealer_id?: string;
  dealer_name?: string;
  manager_id?: string;
  manager_name?: string;
  status: 'active' | 'inactive' | 'maintenance';
  compliance_status: 'compliant' | 'non_compliant' | 'under_review';
  total_violations: number;
  total_sales: number;
  last_inspection_date?: string;
  gps_coordinates?: any;
  created_at: string;
  updated_at: string;
  contact_phone?: string;
  contact_email?: string;
}

interface StationFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  region: string;
  omc_id: string;
  dealer_id: string;
  manager_id: string;
  contact_phone: string;
  contact_email: string;
}

interface UserProfile {
  id: string;
  role: 'admin' | 'omc' | 'dealer' | 'manager';
  omc_id?: string;
  dealer_id?: string;
  omc_name?: string;
}

// Mobile-optimized Bottom Sheet Component
const BottomSheet = React.memo(({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children,
  className = ""
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`fixed bottom-0 left-0 right-0 mx-auto max-h-[90vh] rounded-t-2xl rounded-b-none border-0 shadow-2xl flex flex-col p-0 ${className}`}>
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl font-semibold text-black">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-gray-600">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

BottomSheet.displayName = 'BottomSheet';

// Mobile Action Sheet Component
const ActionSheet = React.memo(({
  open,
  onOpenChange,
  title,
  actions,
  destructiveIndex
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions: { label: string; action: () => void; icon?: React.ReactNode }[];
  destructiveIndex?: number;
}) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="max-w-lg"
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.action();
              onOpenChange(false);
            }}
            className={`w-full text-left p-4 rounded-xl text-base font-medium transition-colors touch-manipulation active:scale-95 ${
              index === destructiveIndex
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {action.icon}
              {action.label}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center p-4 rounded-xl text-base font-medium text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
});

ActionSheet.displayName = 'ActionSheet';

// Mobile Station Card Component
const StationCard = React.memo(({ 
  station, 
  isSelected, 
  onSelect, 
  onAction,
  userProfile 
}: {
  station: Station;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onAction: (station: Station) => void;
  userProfile: UserProfile | null;
}) => {
  const complianceStatus = station.compliance_status || 'compliant';
  const ComplianceIcon = getComplianceIcon(complianceStatus);
  const userCanEdit = canEditStation(station, userProfile);
  const userCanDelete = canDeleteStation(station, userProfile);

  return (
    <Card 
      className={`p-4 bg-white rounded-2xl border-2 transition-all duration-200 touch-manipulation active:scale-95 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(station.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            station.status === 'active' ? 'bg-green-50 border-green-200' :
            station.status === 'maintenance' ? 'bg-orange-50 border-orange-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <Fuel className={`w-6 h-6 ${
              station.status === 'active' ? 'text-green-600' :
              station.status === 'maintenance' ? 'text-orange-600' :
              'text-gray-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base truncate">
                {station.name}
              </h3>
              <Badge 
                variant={getStatusBadgeVariant(station.status)}
                className="text-xs capitalize"
              >
                {station.status}
              </Badge>
            </div>
            
            <p className="text-gray-600 text-sm truncate">
              {station.code} • {station.location}
            </p>
            
            {station.manager_name && (
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                <User className="w-3 h-3" />
                {station.manager_name}
              </p>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAction(station);
          }}
          className="h-8 w-8 p-0 touch-manipulation"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Sales</p>
          <p className="font-semibold text-gray-900 text-sm">
            ₵{(station.total_sales || 0).toLocaleString()}
          </p>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Violations</p>
          <p className="font-semibold text-gray-900 text-sm">
            {station.total_violations || 0}
          </p>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Compliance</p>
          <div className="flex items-center justify-center gap-1">
            <ComplianceIcon className="w-3 h-3" />
            <span className="font-semibold text-gray-900 text-xs capitalize">
              {complianceStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {(station.contact_phone || station.contact_email) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          {station.contact_phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{station.contact_phone}</span>
            </div>
          )}
          {station.contact_email && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{station.contact_email}</span>
            </div>
          )}
        </div>
      )}

      {/* Last Inspection */}
      {station.last_inspection_date && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          Inspected: {new Date(station.last_inspection_date).toLocaleDateString()}
        </div>
      )}
    </Card>
  );
});

StationCard.displayName = 'StationCard';

// Helper functions
const getStatusBadgeVariant = (status: string) => {
  const variants = {
    active: "default",
    inactive: "secondary",
    maintenance: "outline"
  };
  return variants[status as keyof typeof variants] || "default";
};

const getComplianceBadgeVariant = (status: string) => {
  const variants = {
    compliant: "default",
    non_compliant: "destructive",
    under_review: "outline"
  };
  return variants[status as keyof typeof variants] || "default";
};

const getComplianceIcon = (status: string) => {
  const icons = {
    compliant: CheckCircle,
    non_compliant: XCircle,
    under_review: AlertTriangle
  };
  return icons[status as keyof typeof icons] || CheckCircle;
};

const canEditStation = (station: Station, userProfile: UserProfile | null) => {
  if (!userProfile) return false;
  if (userProfile.role === 'admin') return true;
  if (userProfile.role === 'omc' && station.omc_id === userProfile.omc_id) return true;
  if (userProfile.role === 'dealer' && station.dealer_id === userProfile.dealer_id) return true;
  return false;
};

const canDeleteStation = (station: Station, userProfile: UserProfile | null) => {
  if (!userProfile) return false;
  if (userProfile.role === 'admin') return true;
  if (userProfile.role === 'omc' && station.omc_id === userProfile.omc_id) return true;
  return false;
};

const canCreateStation = (userProfile: UserProfile | null) => {
  return userProfile?.role === 'admin' || userProfile?.role === 'omc';
};

export function MobileStationsList() {
  const [stations, setStations] = useState<Station[]>([]);
  const [omcs, setOmcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [omcFilter, setOmcFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStations, setTotalStations] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sortField, setSortField] = useState<keyof Station>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Mobile-first: grid default

  const [newStation, setNewStation] = useState<StationFormData>({
    name: "",
    code: "",
    address: "",
    city: "",
    region: "",
    omc_id: "",
    dealer_id: "",
    manager_id: "",
    contact_phone: "",
    contact_email: ""
  });

  const [editStation, setEditStation] = useState<StationFormData & { status: Station['status'] }>({
    name: "",
    code: "",
    address: "",
    city: "",
    region: "",
    status: 'active',
    omc_id: "",
    dealer_id: "",
    manager_id: "",
    contact_phone: "",
    contact_email: ""
  });

  const ITEMS_PER_PAGE = 10;
  const regions = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Northern", "Upper East", "Upper West", "Brong Ahafo"
  ];

  // Enhanced code generator
  const generateStationCode = (stationName: string): string => {
    const baseCode = stationName
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10);
    
    const timestamp = Date.now().toString().slice(-6);
    let finalCode = `${baseCode}_${timestamp}`;
    
    if (!finalCode || finalCode.trim() === '') {
      finalCode = `STN_${timestamp}`;
    }
    
    return finalCode;
  };

  // Reset form function
  const resetNewStationForm = () => {
    setNewStation({
      name: "",
      code: "",
      address: "",
      city: "",
      region: "",
      omc_id: userProfile?.role === 'omc' ? userProfile.omc_id || "" : "",
      dealer_id: "",
      manager_id: "",
      contact_phone: "",
      contact_email: ""
    });
  };

  // Debounced search
  const debouncedLoadStations = useCallback(
    debounce(() => {
      loadStations();
    }, 300),
    []
  );

  useEffect(() => {
    loadStations();
    loadOMCs();
    loadUserProfile();
  }, [currentPage, omcFilter, statusFilter, regionFilter, complianceFilter]);

  useEffect(() => {
    debouncedLoadStations();
  }, [searchTerm]);

  const loadUserProfile = async () => {
    try {
      const response = await api.getCurrentUserProfile();
      if (response.success && response.data) {
        setUserProfile(response.data);
        if (response.data.role === 'omc' && response.data.omc_id) {
          setNewStation(prev => ({ ...prev, omc_id: response.data.omc_id }));
        }
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const loadStations = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      
      if (userProfile?.role === 'admin') {
        if (omcFilter !== "all") filters.omc_id = omcFilter;
      }
      
      if (statusFilter !== "all") filters.status = statusFilter;
      if (regionFilter !== "all") filters.region = regionFilter;
      if (searchTerm) filters.search_term = searchTerm;
      if (complianceFilter !== "all") filters.compliance_status = complianceFilter;

      const response = await api.searchStations(
        filters, 
        currentPage, 
        ITEMS_PER_PAGE
      );
      
      if (response.success) {
        setStations(response.data.stations || []);
        setTotalStations(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.total_pages || 1);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error("Failed to load stations:", error);
      toast.error("Failed to load stations");
      setStations([]);
      setTotalStations(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadOMCs = async () => {
    try {
      const response = await api.getOMCs();
      if (response.success) {
        setOmcs(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load OMCs:", error);
    }
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stationCode = generateStationCode(newStation.name);
      
      let stationData = { 
        ...newStation,
        code: stationCode
      };
      
      if (userProfile?.role === 'omc' && userProfile.omc_id) {
        stationData.omc_id = userProfile.omc_id;
      }

      const response = await api.createStation(stationData);

      if (response.success) {
        toast.success("Station created successfully!");
        setShowCreateDialog(false);
        resetNewStationForm();
        loadStations();
      } else {
        toast.error("Failed to create station", {
          description: response.error
        });
      }
    } catch (error) {
      console.error("Failed to create station:", error);
      toast.error("Failed to create station");
    }
  };

  const handleEditStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;

    try {
      const response = await api.updateStation(selectedStation.id, editStation);
      
      if (response.success) {
        toast.success("Station updated successfully!");
        setShowEditDialog(false);
        setSelectedStation(null);
        loadStations();
      } else {
        toast.error("Failed to update station", {
          description: response.error
        });
      }
    } catch (error) {
      console.error("Failed to update station:", error);
      toast.error("Failed to update station");
    }
  };

  const handleDeleteStation = async () => {
    if (!selectedStation) return;

    try {
      const response = await api.deleteStation(selectedStation.id);
      
      if (response.success) {
        toast.success("Station deleted successfully!");
        setShowDeleteDialog(false);
        setSelectedStation(null);
        loadStations();
      } else {
        toast.error("Failed to delete station", {
          description: response.error
        });
      }
    } catch (error) {
      console.error("Failed to delete station:", error);
      toast.error("Failed to delete station");
    }
  };

  const handleBulkStatusUpdate = async (status: Station['status']) => {
    if (selectedStations.length === 0) return;

    setBulkLoading(true);
    try {
      const response = await api.bulkUpdateStationStatus(selectedStations, status);
      
      if (response.success) {
        toast.success(`Updated ${response.data.success} stations successfully`);
        setSelectedStations([]);
        loadStations();
      } else {
        toast.error("Failed to update stations", {
          description: response.error
        });
      }
    } catch (error) {
      console.error("Failed to update stations:", error);
      toast.error("Failed to update stations");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportStations = async () => {
    setExportLoading(true);
    try {
      const filters: any = {};
      
      if (userProfile?.role === 'omc' && userProfile.omc_id) {
        filters.omc_id = userProfile.omc_id;
      }
      
      const response = await api.searchStations(filters, 1, 10000);
      
      if (response.success) {
        const data = response.data.stations.map((station: Station) => ({
          Name: station.name,
          Code: station.code,
          OMC: station.omc_name || 'N/A',
          Location: station.location,
          Region: station.region,
          Status: station.status,
          'Total Sales': station.total_sales,
          'Total Violations': station.total_violations,
          'Last Updated': new Date(station.updated_at).toLocaleDateString()
        }));

        const headers = Object.keys(data[0]).join(',');
        const csv = [headers, ...data.map((row: any) => Object.values(row).join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stations-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success("Stations exported successfully!");
      }
    } catch (error) {
      console.error("Failed to export stations:", error);
      toast.error("Failed to export stations");
    } finally {
      setExportLoading(false);
    }
  };

  const openEditDialog = (station: Station) => {
    setSelectedStation(station);
    setEditStation({
      name: station.name,
      code: station.code,
      address: station.address,
      city: station.city || "",
      region: station.region,
      status: station.status,
      omc_id: station.omc_id || "",
      dealer_id: station.dealer_id || "",
      manager_id: station.manager_id || "",
      contact_phone: station.contact_phone || "",
      contact_email: station.contact_email || ""
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (station: Station) => {
    setSelectedStation(station);
    setShowDeleteDialog(true);
  };

  const openStationActions = (station: Station) => {
    setSelectedStation(station);
    setShowActionSheet(true);
  };

  const toggleStationSelection = (stationId: string) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const selectAllStations = () => {
    setSelectedStations(
      selectedStations.length === stations.length ? [] : stations.map(s => s.id)
    );
  };

  const filteredOmcs = userProfile?.role === 'omc' 
    ? omcs.filter(omc => omc.id === userProfile.omc_id)
    : omcs;

  // Mobile-optimized Station Form Component
  const StationForm = React.memo(({ 
    isEdit = false, 
    onSubmit, 
    onCancel,
    station,
    userProfile 
  }: {
    isEdit?: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    station: StationFormData & { status?: Station['status'] };
    userProfile: UserProfile | null;
  }) => {
    const [formData, setFormData] = useState(station);

    const handleFieldChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-4">
          {/* Station Name */}
          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Station Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter station name"
              required
              className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
            />
          </div>

          {/* Code and Region */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Station Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                placeholder="Unique code"
                required
                className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Region <span className="text-red-500">*</span>
              </label>
              <Select 
                value={formData.region} 
                onValueChange={(value) => handleFieldChange('region', value)}
              >
                <SelectTrigger className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation">
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
          </div>

          {/* City and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">City</label>
              <Input
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="Enter city"
                className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
              />
            </div>

            {isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: Station['status']) => handleFieldChange('status', value)}
                >
                  <SelectTrigger className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="Full station address"
              required
              className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                placeholder="Contact phone"
                className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input
                value={formData.contact_email}
                onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                placeholder="Contact email"
                type="email"
                className="w-full px-3 py-2.5 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
              />
            </div>
          </div>

          {/* OMC Selection (Admin only) */}
          {userProfile?.role === 'admin' && (
            <div className="space-y-2">
              <label className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Building className="w-5 h-5" />
                OMC
              </label>
              <Select 
                value={formData.omc_id} 
                onValueChange={(value) => handleFieldChange('omc_id', value)}
              >
                <SelectTrigger className="w-full text-base px-4 py-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation">
                  <SelectValue placeholder="Select OMC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No OMC</SelectItem>
                  {filteredOmcs.map((omc) => (
                    <SelectItem key={omc.id} value={omc.id}>
                      {omc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-gray-300 hover:bg-gray-50 text-base py-3 rounded-xl font-medium touch-manipulation active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors text-base touch-manipulation active:scale-95"
          >
            {isEdit ? 'Update Station' : 'Create Station'}
          </Button>
        </div>
      </form>
    );
  });

  StationForm.displayName = 'StationForm';

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 pb-24"> {/* Added bottom padding for mobile */}
      <div className="max-w-7xl mx-auto">
        {/* Mobile-optimized Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">Stations</h1>
              {userProfile && (
                <Badge variant={userProfile.role === 'admin' ? "default" : "secondary"} className="capitalize text-xs">
                  {userProfile.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                  {userProfile.role}
                  {userProfile.role === 'omc' && userProfile.omc_name && ` • ${userProfile.omc_name}`}
                </Badge>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {totalStations} stations
              {selectedStations.length > 0 && ` • ${selectedStations.length} selected`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStations}
              disabled={loading}
              className="h-10 w-10 p-0 touch-manipulation active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 p-0 touch-manipulation active:scale-95"
            >
              <Filter className="w-4 h-4" />
            </Button>

            {canCreateStation(userProfile) && (
              <Button 
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation active:scale-95"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search stations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 py-3 text-base border-gray-300 rounded-xl focus:border-blue-500 focus:ring-blue-500 touch-manipulation"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <Card className="bg-white border border-gray-200 animate-in slide-in-from-top duration-200 mb-4">
            <CardContent className="p-4 space-y-4">
              {/* Station Filter */}
              {(userProfile?.role === 'admin') && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">OMC</label>
                  <Select value={omcFilter} onValueChange={setOmcFilter}>
                    <SelectTrigger className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation">
                      <SelectValue placeholder="All OMCs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OMCs</SelectItem>
                      {filteredOmcs.map((omc) => (
                        <SelectItem key={omc.id} value={omc.id}>{omc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Region</label>
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Compliance Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2">Compliance</label>
                <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                  <SelectTrigger className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white touch-manipulation">
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

              {/* Clear Filters */}
              {(searchTerm || omcFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all' || complianceFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setOmcFilter('all');
                    setStatusFilter('all');
                    setRegionFilter('all');
                    setComplianceFilter('all');
                  }}
                  className="w-full border-gray-300 hover:bg-gray-50 touch-manipulation active:scale-95"
                >
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedStations.length > 0 && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">
                    {selectedStations.length} selected
                  </Badge>
                  <span className="text-sm text-blue-700">
                    {selectedStations.length} station{selectedStations.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('active')}
                    disabled={bulkLoading}
                    className="h-8 text-xs touch-manipulation active:scale-95"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('inactive')}
                    disabled={bulkLoading}
                    className="h-8 text-xs touch-manipulation active:scale-95"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStations([])}
                    className="h-8 w-8 p-0 touch-manipulation active:scale-95"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stations Grid/List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                <span className="text-lg">
                  {userProfile?.role === 'admin' ? 'All Stations' : 'My Stations'}
                </span>
                {totalStations > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalStations}
                  </Badge>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-8 px-3 text-xs touch-manipulation active:scale-95 ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-8 px-3 text-xs touch-manipulation active:scale-95 ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  List
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-12">
                <Fuel className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stations found</h3>
                <p className="text-gray-500 mb-4 px-4">
                  {searchTerm || omcFilter !== 'all' || statusFilter !== 'all' 
                    ? "Try adjusting your filters to see more results." 
                    : "Get started by creating your first station."}
                </p>
                {canCreateStation(userProfile) && (
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 touch-manipulation active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              // Mobile-optimized Grid View
              <div className="grid grid-cols-1 gap-3 p-4">
                {stations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isSelected={selectedStations.includes(station.id)}
                    onSelect={toggleStationSelection}
                    onAction={openStationActions}
                    userProfile={userProfile}
                  />
                ))}
              </div>
            ) : (
              // Compact List View for mobile
              <div className="space-y-2 p-2">
                {stations.map((station) => {
                  const complianceStatus = station.compliance_status || 'compliant';
                  const ComplianceIcon = getComplianceIcon(complianceStatus);
                  
                  return (
                    <div
                      key={station.id}
                      className={`flex items-center gap-3 p-3 bg-white rounded-xl border-2 transition-all duration-200 touch-manipulation active:scale-95 ${
                        selectedStations.includes(station.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleStationSelection(station.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStations.includes(station.id)}
                        onChange={() => {}}
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {station.name}
                          </h3>
                          <Badge 
                            variant={getStatusBadgeVariant(station.status)}
                            className="text-xs capitalize"
                          >
                            {station.status}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-xs truncate">
                          {station.code} • {station.location}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <ComplianceIcon className="w-4 h-4 text-gray-400" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStationActions(station);
                          }}
                          className="h-8 w-8 p-0 touch-manipulation"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination - Mobile optimized */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="touch-manipulation active:scale-95"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="touch-manipulation active:scale-95"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile-optimized Bottom Sheets */}
        <BottomSheet 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          title="Create New Station"
          description="Add a new fuel station to the system"
        >
          <StationForm
            onSubmit={handleCreateStation}
            onCancel={() => setShowCreateDialog(false)}
            station={newStation}
            userProfile={userProfile}
          />
        </BottomSheet>

        <BottomSheet 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog}
          title="Edit Station"
          description="Update station details and information"
        >
          <StationForm
            isEdit={true}
            onSubmit={handleEditStation}
            onCancel={() => setShowEditDialog(false)}
            station={editStation}
            userProfile={userProfile}
          />
        </BottomSheet>

        {/* Action Sheet for Station Actions */}
        <ActionSheet
          open={showActionSheet}
          onOpenChange={setShowActionSheet}
          title="Station Actions"
          actions={[
            {
              label: 'View Details',
              action: () => selectedStation && console.log('View details', selectedStation),
              icon: <Eye className="w-5 h-5" />
            },
            {
              label: 'Performance',
              action: () => selectedStation && console.log('Performance', selectedStation),
              icon: <BarChart3 className="w-5 h-5" />
            },
            ...(selectedStation && canEditStation(selectedStation, userProfile) ? [{
              label: 'Edit Station',
              action: () => selectedStation && openEditDialog(selectedStation),
              icon: <Edit className="w-5 h-5" />
            }] : []),
            ...(selectedStation && canDeleteStation(selectedStation, userProfile) ? [{
              label: 'Delete Station',
              action: () => selectedStation && openDeleteDialog(selectedStation),
              icon: <Trash2 className="w-5 h-5" />
            }] : [])
          ]}
          destructiveIndex={selectedStation && canDeleteStation(selectedStation, userProfile) ? 3 : undefined}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md mx-4 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Station
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{selectedStation?.name}" and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-800 truncate">
                    {selectedStation?.name}
                  </p>
                  <p className="text-sm text-red-600 truncate">
                    {selectedStation?.code} • {selectedStation?.location}
                  </p>
                </div>
              </div>
            </div>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel className="flex-1 border-gray-300 hover:bg-gray-50 py-2.5 rounded-xl touch-manipulation active:scale-95">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteStation}
                className="flex-1 bg-red-600 hover:bg-red-700 py-2.5 rounded-xl touch-manipulation active:scale-95"
              >
                Delete Station
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Quick Action Button for Mobile */}
        {canCreateStation(userProfile) && (
          <div className="fixed bottom-20 right-4 z-50">
            <Button
              className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg touch-manipulation active:scale-95 transition-transform"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileStationsList;