
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
  Shield
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
}

interface UserProfile {
  id: string;
  role: 'admin' | 'omc' | 'dealer' | 'manager';
  omc_id?: string;
  dealer_id?: string;
  omc_name?: string;
}

export function StationsList() {
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
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sortField, setSortField] = useState<keyof Station>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [newStation, setNewStation] = useState<StationFormData>({
    name: "",
    code: "",
    address: "",
    city: "",
    region: "",
    omc_id: null,
    dealer_id: null,
    manager_id: null
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
    manager_id: ""
  });

  const ITEMS_PER_PAGE = 10;

  // Enhanced code generator that meets all constraint requirements
  const generateStationCode = (stationName: string): string => {
    // Extract meaningful part from name
    const baseCode = stationName
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .substring(0, 10);

    // Add timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    
    // Combine and ensure it meets constraints
    let finalCode = `${baseCode}_${timestamp}`;
    
    // Fallback if somehow still invalid
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
      manager_id: ""
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
        // Pre-fill OMC for OMC users
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
      
      // Apply filters based on user role
      if (userProfile?.role === 'admin') {
        if (omcFilter !== "all") filters.omc_id = omcFilter;
      }
      
      if (statusFilter !== "all") filters.status = statusFilter;
      if (regionFilter !== "all") filters.region = regionFilter;
      if (searchTerm) filters.search_term = searchTerm;
      if (complianceFilter !== "all") filters.compliance_status = complianceFilter;

      // Use your existing searchStations method with pagination
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

  const handleSort = (field: keyof Station) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
      // Generate a guaranteed valid station code
      const stationCode = generateStationCode(newStation.name);
      
      let stationData = { 
        ...newStation,
        code: stationCode // OVERRIDE with properly generated code
      };
      
      // Auto-detect OMC context for OMC users
      if (userProfile?.role === 'omc' && userProfile.omc_id) {
        stationData.omc_id = userProfile.omc_id;
      }

      console.log('Creating station with validated code:', stationCode);

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
      // Use your existing bulkUpdateStationStatus method
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
      // Get all stations with current filters
      const filters: any = {};
      
      if (userProfile?.role === 'omc' && userProfile.omc_id) {
        filters.omc_id = userProfile.omc_id;
      }
      
      const response = await api.searchStations(filters, 1, 10000); // Get all
      
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

        // Generate CSV and download
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
      manager_id: station.manager_id || ""
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (station: Station) => {
    setSelectedStation(station);
    setShowDeleteDialog(true);
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

  const canEditStation = (station: Station) => {
    if (userProfile?.role === 'admin') return true;
    if (userProfile?.role === 'omc' && station.omc_id === userProfile.omc_id) return true;
    if (userProfile?.role === 'dealer' && station.dealer_id === userProfile.dealer_id) return true;
    return false;
  };

  const canDeleteStation = (station: Station) => {
    if (userProfile?.role === 'admin') return true;
    if (userProfile?.role === 'omc' && station.omc_id === userProfile.omc_id) return true;
    return false;
  };

  const canCreateStation = () => {
    return userProfile?.role === 'admin' || userProfile?.role === 'omc';
  };

  const getSortIcon = (field: keyof Station) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const regions = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Northern", "Upper East", "Upper West", "Brong Ahafo"
  ];

  const filteredOmcs = userProfile?.role === 'omc' 
    ? omcs.filter(omc => omc.id === userProfile.omc_id)
    : omcs;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Station Management</h1>
              {userProfile && (
                <Badge variant={userProfile.role === 'admin' ? "default" : "secondary"} className="capitalize">
                  {userProfile.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                  {userProfile.role}
                  {userProfile.role === 'omc' && userProfile.omc_name && ` • ${userProfile.omc_name}`}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              {userProfile?.role === 'admin' 
                ? `Manage ${totalStations} fuel stations across all OMCs`
                : userProfile?.role === 'omc'
                ? `Manage ${totalStations} stations for ${userProfile.omc_name || 'your OMC'}`
                : `Viewing ${totalStations} stations`
              }
              {selectedStations.length > 0 && ` • ${selectedStations.length} selected`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {selectedStations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={bulkLoading}>
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MoreVertical className="w-4 h-4 mr-2" />
                    )}
                    Bulk Actions ({selectedStations.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Deactivate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('maintenance')}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Set as Maintenance
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleExportStations}
              disabled={exportLoading || stations.length === 0}
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {exportLoading ? "Exporting..." : "Export"}
            </Button>
            
            {canCreateStation() && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Station</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateStation} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Station Name *</label>
                        <Input
                          value={newStation.name}
                          onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                          placeholder="Enter station name"
                          required
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Station Code *</label>
                        <Input
                          value={newStation.code}
                          onChange={(e) => setNewStation({ ...newStation, code: e.target.value })}
                          placeholder="Unique station code"
                          required
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Region *</label>
                        <Select 
                          value={newStation.region} 
                          onValueChange={(value) => setNewStation({ ...newStation, region: value })}
                        >
                          <SelectTrigger className="mt-1">
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

                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <Input
                          value={newStation.city}
                          onChange={(e) => setNewStation({ ...newStation, city: e.target.value })}
                          placeholder="Enter city"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Address *</label>
                        <Input
                          value={newStation.address}
                          onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                          placeholder="Full station address"
                          required
                          className="mt-1"
                        />
                      </div>

                      {userProfile?.role === 'admin' && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">OMC</label>
                          <Select 
                            value={newStation.omc_id} 
                            onValueChange={(value) => setNewStation({ ...newStation, omc_id: value })}
                          >
                            <SelectTrigger className="mt-1">
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
                    
                    <DialogFooter>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Create Station
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search stations by name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {userProfile?.role === 'admin' && (
                <Select value={omcFilter} onValueChange={setOmcFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Building className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All OMCs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All OMCs</SelectItem>
                    {filteredOmcs.map((omc) => (
                      <SelectItem key={omc.id} value={omc.id}>{omc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

              <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Compliance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={loadStations}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stations Table Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                {userProfile?.role === 'admin' ? 'All Fuel Stations' : 'My Stations'}
                {totalStations > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalStations}
                  </Badge>
                )}
              </div>
              {stations.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-12">
                <Fuel className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stations found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || omcFilter !== 'all' || statusFilter !== 'all' 
                    ? "Try adjusting your filters to see more results." 
                    : "Get started by creating your first station."}
                </p>
                {canCreateStation() && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedStations.length === stations.length && stations.length > 0}
                            onChange={selectAllStations}
                            className="rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Station Details
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        {userProfile?.role === 'admin' && (
                          <TableHead>OMC</TableHead>
                        )}
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleSort('region')}
                        >
                          <div className="flex items-center gap-1">
                            Location
                            {getSortIcon('region')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {getSortIcon('status')}
                          </div>
                        </TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleSort('total_sales')}
                        >
                          <div className="flex items-center gap-1">
                            Sales
                            {getSortIcon('total_sales')}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stations.map((station) => {
                        const complianceStatus = station.compliance_status || 'compliant';
                        const ComplianceIcon = getComplianceIcon(complianceStatus);
                        const userCanEdit = canEditStation(station);
                        const userCanDelete = canDeleteStation(station);

                        return (
                          <TableRow key={station.id} className="group hover:bg-gray-50/50 transition-colors">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedStations.includes(station.id)}
                                onChange={() => toggleStationSelection(station.id)}
                                className="rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{station.name}</p>
                                <p className="text-sm text-gray-600">Code: {station.code}</p>
                                {station.manager_name && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                    <User className="w-3 h-3" />
                                    Manager: {station.manager_name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            {userProfile?.role === 'admin' && (
                              <TableCell>
                                {station.omc_name ? (
                                  <Badge variant="outline" className="font-medium">
                                    {station.omc_name}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">No OMC</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <div>
                                  <span className="text-sm block">{station.location}</span>
                                  <span className="text-xs text-gray-500">{station.region}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getStatusBadgeVariant(station.status)}
                                className="capitalize"
                              >
                                {station.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getComplianceBadgeVariant(complianceStatus)}
                                className="capitalize"
                              >
                                <ComplianceIcon className="w-3 h-3 mr-1" />
                                {complianceStatus.replace(/_/g, ' ')}
                              </Badge>
                              {station.total_violations > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {station.total_violations} open violation(s)
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900">
                                  ₵{station.total_sales?.toLocaleString() || '0'}
                                </p>
                                {station.last_inspection_date && (
                                  <p className="text-xs text-gray-500">
                                    Last inspected: {new Date(station.last_inspection_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <BarChart3 className="w-4 h-4 mr-2" />
                                      Performance
                                    </DropdownMenuItem>
                                    {userCanEdit && (
                                      <DropdownMenuItem onClick={() => openEditDialog(station)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Station
                                      </DropdownMenuItem>
                                    )}
                                    {userCanDelete && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => openDeleteDialog(station)}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Station
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalStations)} of{" "}
                      {totalStations} stations
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
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

        {/* Edit Station Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Station</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditStation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Station Name *</label>
                  <Input
                    value={editStation.name}
                    onChange={(e) => setEditStation({ ...editStation, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Station Code *</label>
                  <Input
                    value={editStation.code}
                    onChange={(e) => setEditStation({ ...editStation, code: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select 
                    value={editStation.status} 
                    onValueChange={(value: Station['status']) => 
                      setEditStation({ ...editStation, status: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">City</label>
                  <Input
                    value={editStation.city}
                    onChange={(e) => setEditStation({ ...editStation, city: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Region *</label>
                  <Select 
                    value={editStation.region} 
                    onValueChange={(value) => setEditStation({ ...editStation, region: value })}
                  >
                    <SelectTrigger className="mt-1">
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

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address *</label>
                  <Input
                    value={editStation.address}
                    onChange={(e) => setEditStation({ ...editStation, address: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                {userProfile?.role === 'admin' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">OMC</label>
                    <Select 
                      value={editStation.omc_id} 
                      onValueChange={(value) => setEditStation({ ...editStation, omc_id: value })}
                    >
                      <SelectTrigger className="mt-1">
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
              
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Update Station
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the station "{selectedStation?.name}". 
                This action cannot be undone. Any associated data like sales records and violations will be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteStation}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Station
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default StationsList;